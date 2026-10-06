// Publish page, #/publish: import V1 (IMP-004, amended by V-17). Registers CFE.views.publish; needs
// app/cfe.js, Continuum.html/csv/hash/provenance, CFE.data.mapping (+ profiles) and, for .xlsx, SheetJS.
//
// The user picks or drops .csv, .xlsx or .json files. For each file the page:
//   1. reads the bytes and hashes them (SHA-256);
//   2. parses: CSV with Continuum.csv; XLSX with SheetJS (first sheet, or the one chosen); JSON as a
//      list of objects, or an object whose lists can be chosen like sheets (e.g. a legacy backup);
//   3. detects the mapping profile (the user can choose another);
//   4. applies the mapping (CFE.data.mapping.apply);
//   5. shows a card: rows read and used, errors (blocking), warnings (to acknowledge), the first 10
//      mapped rows (escaped) and the provenance record.
// Previews stay in memory: leaving the page discards them. **Keep in draft** stores the mapped
// records and provenance in the browser (CFE.store.draft, IMP-008); the page restores that draft on
// load ("Draft from … restored") and offers **Discard draft**. Keep needs every file free of errors
// (remove a file to drop it) and its warnings acknowledged. If storage is full, the page says so and
// offers **Save draft to file**; **Load draft from file…** reads such a file back.
// **Check the dataset** (IMP-005) builds the dataset from the draft (CFE.store.buildDataset) and shows
// the counts, rows left out (warnings to acknowledge; they block nothing), schema problems and the
// changes against the published data. Publishing itself arrives in PUB-001.
// **Import a legacy backup…** (IMP-006) turns a backup from the legacy app into one card per section
// (CFE.store.legacyImport); add a references file in the same session so the rows match projects.
//
// Pure parts, also used by tests:
//   CFE.views.publish.parse({name, bytes, sheet}) → {parser, parserVersion, sheets, sheet, header, rows, problems}
//   CFE.views.publish.mapFile(parsed, profileId)  → {profile, result}
//   CFE.views.publish.processFile({name, size, lastModified, bytes}, {sheet, profileId}) → Promise of a file entry
(function (CFE) {
  'use strict';

  var PREVIEW_ROWS = 10, SHOWN_ERRORS = 20;
  var files = [];   // file entries on the page now (memory only)
  var detach = null;   // removes the page's listeners from #main

  function ext(name) { var m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; }

  function utf8(bytes) { return new TextDecoder('utf-8').decode(bytes); }

  // A real Excel date cell → {excelDate:'YYYY-MM-DD'} (the date is exact; it is written in the
  // profile's own format just before mapping, so nothing is guessed).
  function xlsxRows(XLSX, ws) {
    var ref = ws['!ref'];
    if (!ref) return { header: [], rows: [] };
    var range = XLSX.utils.decode_range(ref), header = [], rows = [];
    for (var c = range.s.c; c <= range.e.c; c++) {
      var h = ws[XLSX.utils.encode_cell({ r: range.s.r, c: c })];
      header.push(h ? String(h.w !== undefined ? h.w : h.v).trim() : '');
    }
    for (var r = range.s.r + 1; r <= range.e.r; r++) {
      var row = {}, any = false;
      for (var k = 0; k < header.length; k++) {
        if (!header[k]) continue;
        var cell = ws[XLSX.utils.encode_cell({ r: r, c: range.s.c + k })];
        var v = '';
        if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
          if (cell.t === 'n' && cell.z && XLSX.SSF.is_date(cell.z)) {
            var d = XLSX.SSF.parse_date_code(cell.v);
            v = { excelDate: d.y + '-' + (d.m < 10 ? '0' : '') + d.m + '-' + (d.d < 10 ? '0' : '') + d.d };
          } else if (cell.t === 'n' || cell.t === 'b') v = cell.v;
          else v = String(cell.w !== undefined ? cell.w : cell.v);
          any = true;
        }
        row[header[k]] = v;
      }
      if (any) rows.push(row);
    }
    return { header: header.filter(Boolean), rows: rows };
  }

  function jsonTable(list) {
    var header = [];
    list.forEach(function (o) { if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (header.indexOf(k) < 0) header.push(k); }); });
    return { header: header, rows: list.filter(function (o) { return o && typeof o === 'object' && !Array.isArray(o); }) };
  }

  function parse(input) {
    var kind = ext(input.name);
    if (kind === 'csv') {
      var c = Continuum.csv.parse(utf8(input.bytes));
      return { parser: 'continuum-csv', parserVersion: Continuum.csv.version || '1', sheets: [], sheet: null, header: c.header, rows: c.rows,
        problems: c.errors.map(function (e) { return 'Line ' + e.line + ': ' + e.message; }) };
    }
    if (kind === 'xlsx') {
      var XLSX = (typeof globalThis !== 'undefined' ? globalThis : window).XLSX;
      if (!XLSX) return { parser: 'sheetjs', parserVersion: '', sheets: [], sheet: null, header: [], rows: [], problems: ['The Excel reader (SheetJS) is not loaded.'] };
      var wb = XLSX.read(input.bytes, { type: 'array', cellNF: true });   // cellNF keeps number formats: date cells are recognised
      var sheet = input.sheet && wb.SheetNames.indexOf(input.sheet) >= 0 ? input.sheet : wb.SheetNames[0];
      var t = xlsxRows(XLSX, wb.Sheets[sheet]);
      return { parser: 'sheetjs', parserVersion: XLSX.version, sheets: wb.SheetNames.slice(), sheet: sheet, header: t.header, rows: t.rows, problems: [] };
    }
    if (kind === 'json') {
      var data;
      try { data = JSON.parse(utf8(input.bytes)); } catch (e) {
        return { parser: 'json', parserVersion: '1', sheets: [], sheet: null, header: [], rows: [], problems: ['The file is not valid JSON.'] };
      }
      if (Array.isArray(data)) { var a = jsonTable(data); return { parser: 'json', parserVersion: '1', sheets: [], sheet: null, header: a.header, rows: a.rows, problems: [] }; }
      var lists = data && typeof data === 'object' ? Object.keys(data).filter(function (k) { return Array.isArray(data[k]) && data[k].length && typeof data[k][0] === 'object'; }) : [];
      if (!lists.length) return { parser: 'json', parserVersion: '1', sheets: [], sheet: null, header: [], rows: [], problems: ['The JSON file holds no list of records.'] };
      var part = input.sheet && lists.indexOf(input.sheet) >= 0 ? input.sheet : lists[0];
      var o = jsonTable(data[part]);
      return { parser: 'json', parserVersion: '1', sheets: lists, sheet: part, header: o.header, rows: o.rows, problems: [] };
    }
    return { parser: 'none', parserVersion: '', sheets: [], sheet: null, header: [], rows: [], problems: ['Only .csv, .xlsx and .json files can be imported.'] };
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Excel date cells in the profile's own date format (first one listed).
  function forProfile(profile, rows) {
    var dateFormat = {};
    Object.keys(profile.columns).forEach(function (f) {
      var c = profile.columns[f];
      if (c.type === 'date') c.aliases.forEach(function (a) { dateFormat[a.toLowerCase().replace(/[\s_]+/g, '')] = Array.isArray(c.dateFormat) ? c.dateFormat[0] : c.dateFormat; });
    });
    return rows.map(function (row) {
      var out = {};
      Object.keys(row).forEach(function (k) {
        var v = row[k];
        if (v && typeof v === 'object' && v.excelDate) {
          var p = v.excelDate.split('-'), fmt = dateFormat[k.toLowerCase().replace(/[\s_]+/g, '')] || 'YYYY-MM-DD';
          v = fmt === 'M/D/YYYY' ? +p[1] + '/' + +p[2] + '/' + p[0] : fmt === 'D/M/YYYY' ? +p[2] + '/' + +p[1] + '/' + p[0] : v.excelDate;
        }
        out[k] = v;
      });
      return out;
    });
  }

  function mapFile(parsed, profileId) {
    var M = CFE.require('data.mapping');
    var id = profileId;
    if (!id) { var best = M.detect(parsed.header)[0]; id = best ? best.id : null; }
    var profile = id ? CFE.data.mappings[id] : null;
    if (!profile) return { profile: null, result: null };
    return { profile: profile, result: M.apply(profile, parsed.header, forProfile(profile, parsed.rows)) };
  }

  function processFile(file, opts) {
    opts = opts || {};
    return Continuum.hash.sha256Hex(file.bytes).then(function (sha) {
      var parsed = parse({ name: file.name, bytes: file.bytes, sheet: opts.sheet });
      var mapped = parsed.problems.length && !parsed.rows.length ? { profile: null, result: null } : mapFile(parsed, opts.profileId);
      var entry = { name: file.name, size: file.size, lastModified: file.lastModified, bytes: file.bytes, sha256: sha, parsed: parsed,
        profile: mapped.profile, result: mapped.result, acknowledged: false, provenance: null, provenanceError: null };
      if (mapped.result) {
        try {
          entry.provenance = Continuum.provenance.fileRecord({
            name: file.name, size: file.size, lastModified: file.lastModified, sha256: sha,
            sourceSystem: mapped.profile.sourceSystem || 'unknown', parser: parsed.parser, parserVersion: String(parsed.parserVersion || '1'),
            mappingProfile: mapped.profile.id, sheet: parsed.sheet, headerRow: 1,
            rowsRead: parsed.rows.length, rowsUsed: mapped.result.records.length, importedUtc: new Date().toISOString().replace(/\.\d+Z$/, 'Z')
          });
        } catch (e) { entry.provenanceError = e.message; }
      }
      return entry;
    });
  }

  // ─── page ──────────────────────────────────────────────────────────────
  function H() { return Continuum.html; }

  function when(utc) {
    var d = CFE.calc && CFE.calc.dates ? CFE.calc.dates.toDisplayDate(utc) : String(utc).slice(0, 10);
    return d + ' ' + String(utc).slice(11, 16) + ' UTC';
  }

  // Why Keep in draft is not possible yet, or '' when it is.
  function keepBlocker() {
    if (!files.length) return 'Choose files first.';
    var bad = files.filter(function (f) { return !f.result || f.result.errors.length || (f.parsed.problems || []).length; });
    if (bad.length) return 'Fix or remove the files with errors: ' + bad.map(function (f) { return f.name; }).join(', ') + '.';
    var unread = files.filter(function (f) { return f.result.warnings.length && !f.acknowledged; });
    if (unread.length) return 'Tick "I have read these warnings" for: ' + unread.map(function (f) { return f.name; }).join(', ') + '.';
    return '';
  }

  function draftHtml(state) {
    var t = H().t, raw = H().raw, d = state.draft;
    if (!d) return '';
    var counts = Object.keys(d.records).sort().map(function (e) { return e.replace(/_/g, ' ') + ': ' + d.records[e].length; }).join(', ');
    return String(t`<section class="draft" aria-label="Draft">
<p><strong>${state.draftNote || 'Draft from ' + when(d.saved_utc)}</strong>: ${d.files.length} ${d.files.length === 1 ? 'file' : 'files'}${raw(counts ? String(t`; ${counts}`) : '')}.</p>
<ul>${raw(d.files.map(function (f) { return String(t`<li>${f.name} · ${f.mapping_profile} · ${f.rows_used} of ${f.rows_read} rows</li>`); }).join(''))}</ul>
<p><button type="button" class="btn" data-action="build-dataset">Check the dataset</button> <button type="button" class="btn btn-danger" data-action="discard-draft">Discard draft</button> The draft holds the imported rows on this computer until you discard it.</p>
${raw(buildHtml(state))}
</section>`);
  }

  var FIELD_LABELS = { po_value: 'PO value', actual_cost: 'Actual cost', invoiced: 'Invoiced', expenses: 'Expenses' };

  function money(n) { return (Math.round(n * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // PO value, actual cost, invoiced and expenses per project, to compare with the legacy Overview.
  function totalsHtml(dataset) {
    var t = H().t, raw = H().raw, tot = CFE.require('store.datasetTotals')(dataset), refs = Object.keys(tot).sort();
    var names = {};
    dataset.references.forEach(function (r) { names[r.ref] = r.name; });
    var sum = { po_value: 0, actual_cost: 0, invoiced: 0, expenses: 0 };
    refs.forEach(function (r) { Object.keys(sum).forEach(function (f) { sum[f] += tot[r][f]; }); });
    return String(t`<table class="simple totals"><thead><tr><th>Project</th>${raw(Object.keys(FIELD_LABELS).map(function (f) { return String(t`<th>${FIELD_LABELS[f]}</th>`); }).join(''))}</tr></thead><tbody>${raw(refs.map(function (r) {
      return String(t`<tr><td>${r} ${names[r] || ''}</td>${raw(Object.keys(FIELD_LABELS).map(function (f) { return String(t`<td>${money(tot[r][f])}</td>`); }).join(''))}</tr>`);
    }).join(''))}<tr><td><strong>All projects</strong></td>${raw(Object.keys(FIELD_LABELS).map(function (f) { return String(t`<td><strong>${money(sum[f])}</strong></td>`); }).join(''))}</tr></tbody></table>`);
  }

  function buildHtml(state) {
    var t = H().t, raw = H().raw, b = state.build;
    if (!b) return '';
    var rep = b.report, c = rep.counts;
    var unmatched = Object.keys(rep.unmatched);
    var errors = rep.schema.errors;
    var rows = [['Projects (references)', c.references], ['Purchase orders', c.po], ['Resource rules', c.resource_rules], ['People', c.people],
      ['Timesheet rows read', c.actual_rows_in], ['Timesheet rows costed', c.actual_rows_costed], ['Monthly actuals published', c.actual_aggregates],
      ['Invoices', c.invoices], ['Expenses', c.expenses], ['FX rates', c.fx_rates], ['OT rules', c.ot_rules]];
    var diff = rep.diff;
    return String(t`<div class="report" aria-label="Dataset check">
<h3>Dataset check</h3>
<p class="${errors.length ? 'errors' : ''}"><strong>${errors.length ? errors.length + ' schema ' + (errors.length === 1 ? 'problem' : 'problems') + ': this dataset cannot be published yet.' : 'The dataset is valid.'}</strong> Data as of ${CFE.calc && CFE.calc.dates ? CFE.calc.dates.toDisplayDate(b.dataset.data_as_of) : b.dataset.data_as_of}.</p>
${raw(errors.length ? String(t`<ul class="errors">${raw(errors.slice(0, 20).map(function (e) { return String(t`<li>${e.path}: ${e.message}</li>`); }).join(''))}</ul>`) : '')}
${raw(rep.problems.length ? String(t`<ul class="errors">${raw(rep.problems.map(function (p) { return String(t`<li>${p}</li>`); }).join(''))}</ul>`) : '')}
<table class="simple"><tbody>${raw(rows.map(function (r) { return String(t`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`); }).join(''))}</tbody></table>
${raw(unmatched.length ? String(t`<div class="warnings"><p>Rows left out because they match no project or rule:</p><ul>${raw(unmatched.map(function (e) {
      var u = rep.unmatched[e];
      return String(t`<li>${e.replace(/_/g, ' ')}: ${u.count}<ul>${raw(u.examples.map(function (x) { return String(t`<li>${x}</li>`); }).join(''))}</ul></li>`);
    }).join(''))}</ul><label><input type="checkbox" data-action="acknowledge-build"${raw(state.buildAck ? ' checked' : '')}> I have read these warnings</label></div>`) : '')}
${raw(diff ? String(t`<h3>Changes against the published data</h3>${raw(diff.changes ? String(t`<table class="simple"><thead><tr><th>Project</th><th>Figure</th><th>Published</th><th>New</th><th>Change</th></tr></thead><tbody>${raw(diff.kpis.map(function (k) {
      return String(t`<tr><td>${k.ref}</td><td>${FIELD_LABELS[k.field]}</td><td>${money(k.before)}</td><td>${money(k.after)}</td><td>${(k.delta > 0 ? '+' : '') + money(k.delta)}</td></tr>`);
    }).join(''))}</tbody></table><p>${Object.keys(diff.entities).filter(function (e) { return diff.entities[e].added || diff.entities[e].removed; }).map(function (e) {
      var x = diff.entities[e]; return e.replace(/_/g, ' ') + ': ' + x.added + ' added, ' + x.removed + ' removed';
    }).join('; ')}</p>`) : '<p>No changes.</p>')}`) : '<p>No published data loaded, so there is nothing to compare with.</p>')}
<h3>Totals per project</h3>${raw(totalsHtml(b.dataset))}
<p>${rep.notes.join(' ')}</p>
</div>`);
  }

  function cardHtml(f, i) {
    var t = H().t, raw = H().raw;
    var p = f.parsed, r = f.result;
    var profiles = Object.keys(CFE.data.mappings).sort();
    var profileSelect = f.legacy ? t`Mapping: ${f.profile.id} (from the legacy backup) ` : t`<label>Mapping <select data-action="choose-profile" data-file="${i}">${raw(profiles.map(function (id) {
      return String(t`<option value="${id}"${raw(f.profile && f.profile.id === id ? ' selected' : '')}>${id}</option>`);
    }).join(''))}${raw(f.profile ? '' : '<option value="" selected>(none matches)</option>')}</select></label>`;
    var sheetSelect = p.sheets.length > 1 ? t` <label>${p.parser === 'json' ? 'List' : 'Sheet'} <select data-action="choose-sheet" data-file="${i}">${raw(p.sheets.map(function (s) {
      return String(t`<option${raw(s === p.sheet ? ' selected' : '')}>${s}</option>`);
    }).join(''))}</select></label>` : '';
    var errors = (p.problems || []).concat(r ? r.errors.map(function (e) { return 'Row ' + e.row + (e.column ? ', ' + e.column : '') + ': ' + e.message; }) : []);
    var warnings = r ? r.warnings.map(function (w) { return w.message; }) : [];
    if (!p.rows) p.rows = [];
    var status = !r ? 'Not imported' : errors.length ? errors.length + (errors.length === 1 ? ' error' : ' errors') + ' (rows with errors are left out)' : 'No errors';
    var cols = r && r.records.length ? Object.keys(f.profile.columns) : [];
    var preview = r && r.records.length ? t`<div class="tw"><table class="simple preview"><thead><tr>${raw(cols.map(function (c) { return String(t`<th>${c}</th>`); }).join(''))}</tr></thead><tbody>${raw(r.records.slice(0, PREVIEW_ROWS).map(function (rec) {
      return String(t`<tr>${raw(cols.map(function (c) { var v = rec[c]; return String(t`<td>${v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : String(v)}</td>`); }).join(''))}</tr>`);
    }).join(''))}</tbody></table></div>` : '';
    var prov = f.provenance;
    return String(t`<section class="card" aria-label="${f.name}">
<h2>${f.name}</h2>
<p>${profileSelect}${sheetSelect}<button type="button" class="btn btn-small" data-action="remove-file" data-file="${i}">Remove</button></p>
<p><strong>${status}.</strong> Rows read: ${p.rows.length}. Rows used: ${r ? r.records.length : 0}.${raw(r && r.droppedColumns.length ? String(t` Columns not imported (not needed): ${r.droppedColumns.join(', ')}.`) : '')}</p>
${raw(errors.length ? String(t`<details class="errors" open><summary>Errors (${errors.length})</summary><ul>${raw(errors.slice(0, SHOWN_ERRORS).map(function (e) { return String(t`<li>${e}</li>`); }).join(''))}</ul>${raw(errors.length > SHOWN_ERRORS ? String(t`<p>…and ${errors.length - SHOWN_ERRORS} more.</p>`) : '')}</details>`) : '')}
${raw(warnings.length ? String(t`<div class="warnings"><ul>${raw(warnings.map(function (w) { return String(t`<li>${w}</li>`); }).join(''))}</ul><label><input type="checkbox" data-action="acknowledge" data-file="${i}"${raw(f.acknowledged ? ' checked' : '')}> I have read these warnings</label></div>`) : '')}
${raw(preview ? String(t`<h3>First ${Math.min(PREVIEW_ROWS, r.records.length)} rows as imported</h3>${preview}`) : '')}
${raw(prov ? String(t`<details><summary>Where this came from</summary><dl class="facts"><dt>File ID</dt><dd>${prov.file_id}</dd><dt>SHA-256</dt><dd>${prov.sha256}</dd><dt>Size</dt><dd>${prov.size} bytes</dd><dt>Read with</dt><dd>${prov.parser} ${prov.parser_version}</dd><dt>Mapping</dt><dd>${prov.mapping_profile}</dd>${raw(prov.sheet ? String(t`<dt>Sheet</dt><dd>${prov.sheet}</dd>`) : '')}</dl></details>`) : '')}
${raw(f.provenanceError ? String(t`<p class="errors">Provenance could not be recorded: ${f.provenanceError}</p>`) : '')}
</section>`);
  }

  function pageHtml(state) {
    var t = H().t, raw = H().raw, blocker = keepBlocker();
    return t`<h1>Publish</h1>
<p>Choose the files exported from PeopleSoft and the other sources. Each file is checked and previewed here. Nothing is saved until you click <strong>Keep in draft</strong>: leaving this page discards the preview.</p>
${raw(draftHtml(state))}
<div class="dropzone" data-action="drop-files"><p><label class="btn">Choose files…<input type="file" multiple accept=".csv,.xlsx,.json" class="visually-hidden" data-action="pick-files"></label> or drop files here (.csv, .xlsx, .json).</p></div>
<p class="draft-file"><label class="btn btn-small">Import a legacy backup…<input type="file" accept=".json" class="visually-hidden" data-action="pick-legacy"></label> <label class="btn btn-small">Load draft from file…<input type="file" accept=".json" class="visually-hidden" data-action="load-draft-file"></label></p>
${raw(state.notices.length ? String(t`<ul class="warnings">${raw(state.notices.map(function (n) { return String(t`<li>${n}</li>`); }).join(''))}</ul>`) : '')}
${raw(state.busy ? '<p role="status">Reading files…</p>' : '')}
${raw(files.map(cardHtml).join(''))}
${raw(files.length ? String(t`<p class="keep"><button type="button" class="btn" data-action="keep-draft"${raw(blocker ? ' disabled' : '')}>Keep in draft</button> ${blocker}</p>`) : '')}
<p class="message" role="status">${state.message || ''}</p>
${raw(state.saveFailed ? String(t`<p class="errors">The draft could not be saved in the browser (${state.saveFailed}). Save it to a file instead, and load it from there later. <button type="button" class="btn btn-small" data-action="save-draft-file">Save draft to file</button></p>`) : '')}`;
  }

  function download(doc, name, text) {
    var win = doc.defaultView || window;
    var url = win.URL.createObjectURL(new win.Blob([text], { type: 'application/json' }));
    var a = doc.createElement('a');
    a.href = url; a.download = name; a.className = 'offscreen';
    doc.body.appendChild(a); a.click(); a.remove();
    win.setTimeout(function () { win.URL.revokeObjectURL(url); }, 1000);
  }

  function readBytes(file) {
    if (file.arrayBuffer) return file.arrayBuffer().then(function (b) { return new Uint8Array(b); });
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.addEventListener('load', function () { resolve(new Uint8Array(r.result)); });
      r.addEventListener('error', function () { reject(r.error); });
      r.readAsArrayBuffer(file);
    });
  }

  // Called when the user leaves the page (views/shell.js): the preview is dropped from memory.
  function discard() {
    files = [];
    if (detach) { detach(); detach = null; }
  }

  // opts.store: another draft store (tests use their own key so a real draft is never touched).
  function render(doc, opts) {
    discard();   // a fresh page: nothing is carried over
    var main = doc.getElementById('main');
    var state = { busy: false, draft: null, draftNote: '', message: '', saveFailed: '', pending: null, notices: [] };
    var store = (opts && opts.store) || CFE.require('store.draft');
    function draw() { H().setHtml(main, pageHtml(state)); }

    var restored = store.load().then(function (d) {
      if (d && detach === myDetach) { state.draft = d; state.draftNote = 'Draft from ' + when(d.saved_utc) + ' restored'; draw(); }
      return d;
    });

    function keep() {
      if (keepBlocker()) return Promise.resolve();
      var d = store.build(files);
      state.pending = d;
      return store.save(d).then(function (r) {
        if (r.ok) {
          state.draft = d; state.build = null; state.draftNote = 'Draft saved ' + when(d.saved_utc); state.message = 'Kept in draft.'; state.saveFailed = ''; state.pending = null;
          Continuum.log.info('publish', 'Draft saved', { files: d.files.length });
        } else {
          state.saveFailed = r.error.kind === 'quota' ? 'the browser storage is full' : r.error.kind === 'unavailable' ? 'browser storage is not available' : 'unexpected storage error';
          state.message = '';
          Continuum.log.warn('publish', 'Draft not saved', { kind: r.error.kind });
        }
        draw();
      });
    }

    function addLegacy(file) {
      if (!file) return Promise.resolve();
      state.busy = true; draw();
      return readBytes(file).then(function (bytes) {
        return Continuum.hash.sha256Hex(bytes).then(function (sha) {
          return CFE.require('store.legacyImport')(utf8(bytes), { name: file.name, size: file.size, lastModified: file.lastModified, sha256: sha });
        });
      }).then(function (r) {
        state.busy = false;
        state.notices = (r.notices || []).slice();
        if (r.ok) {
          r.entries.forEach(function (e) { files.push(e); });
          state.message = 'Legacy backup read: ' + r.entries.length + ' sections. Add your references file so the rows match projects.';
          Continuum.log.info('publish', 'Legacy backup read', { sections: r.entries.length, notices: state.notices.length });
        } else {
          state.message = r.message;
          Continuum.log.warn('publish', 'Legacy backup refused');
        }
        draw();
      }, function () { state.busy = false; state.message = 'The file could not be read. Choose it again.'; draw(); });
    }

    function checkDataset() {
      if (!state.draft) return null;
      state.build = CFE.require('store.buildDataset')(state.draft, { publisher: 'Publisher' });
      state.buildAck = false;
      Continuum.log.info('publish', 'Dataset checked', { errors: state.build.report.schema.errors.length, unmatched: Object.keys(state.build.report.unmatched).length });
      draw();
      return state.build;
    }

    function discardDraft() {
      var win = doc.defaultView || window;
      if (win.confirm && !win.confirm('Discard the draft? The imported rows are removed from this computer. Your source files are not changed.')) return Promise.resolve();
      return store.discard().then(function (r) {
        if (r.ok) { state.draft = null; state.build = null; state.message = 'Draft discarded.'; Continuum.log.info('publish', 'Draft discarded'); }
        else state.message = 'The draft could not be discarded: ' + r.error.message;
        draw();
      });
    }

    function saveToFile() {
      var d = state.pending || state.draft;
      if (!d) return Promise.resolve();
      return store.toFile(d).then(function (f) { download(doc, f.name, f.text); state.message = 'Saved ' + f.name + '. Keep it safe: it holds the imported rows.'; draw(); });
    }

    function loadFromFile(file) {
      if (!file) return Promise.resolve();
      return (file.text ? file.text() : Promise.reject(new Error('no text'))).then(store.fromFileText).then(function (r) {
        if (!r.ok) { state.message = r.message; draw(); return; }
        state.draft = r.draft; state.draftNote = 'Draft from ' + when(r.draft.saved_utc) + ' loaded from file';
        state.message = 'Draft loaded from the file.';
        return store.save(r.draft).then(function (s) {
          if (!s.ok) state.message += ' It could not be kept in the browser (' + s.error.kind + '); it stays on this page only.';
          draw();
        });
      }, function () { state.message = 'The file could not be read.'; draw(); });
    }

    function addFiles(list) {
      var chosen = Array.prototype.slice.call(list || []);
      if (!chosen.length) return Promise.resolve();
      state.busy = true; draw();
      return chosen.reduce(function (p, f) {
        return p.then(function () {
          return readBytes(f).then(function (bytes) {
            return processFile({ name: f.name, size: f.size, lastModified: f.lastModified, bytes: bytes });
          }).then(function (entry) {
            files.push(entry);
            Continuum.log.info('publish', 'File previewed', { kind: ext(f.name), rows: entry.parsed.rows.length, used: entry.result ? entry.result.records.length : 0, errors: entry.result ? entry.result.errors.length : entry.parsed.problems.length });
          }, function (e) {
            Continuum.log.warn('publish', 'File could not be read', { type: (e && e.name) || 'Error' });
            files.push({ name: f.name, parsed: { rows: [], sheets: [], problems: ['The file could not be read. Choose it again.'] }, result: null, profile: null });
          });
        });
      }, Promise.resolve()).then(function () { state.busy = false; draw(); });
    }

    function redo(i, opts) {
      var f = files[i];
      return processFile({ name: f.name, size: f.size, lastModified: f.lastModified, bytes: f.bytes }, opts).then(function (entry) { files[i] = entry; draw(); });
    }

    function onClick(e) {
      var el = e.target.closest('[data-action]');
      if (!el) return;
      var a = el.getAttribute('data-action');
      if (a === 'keep-draft') keep();
      else if (a === 'discard-draft') discardDraft();
      else if (a === 'build-dataset') checkDataset();
      else if (a === 'save-draft-file') saveToFile();
      else if (a === 'remove-file') { files.splice(+el.getAttribute('data-file'), 1); draw(); }
    }
    function onChange(e) {
      var a = e.target.getAttribute('data-action'), i = +e.target.getAttribute('data-file');
      if (a === 'pick-files') addFiles(e.target.files);
      else if (a === 'load-draft-file') loadFromFile(e.target.files && e.target.files[0]);
      else if (a === 'pick-legacy') addLegacy(e.target.files && e.target.files[0]);
      else if (a === 'choose-profile') redo(i, { profileId: e.target.value || null, sheet: files[i].parsed.sheet });
      else if (a === 'choose-sheet') redo(i, { sheet: e.target.value });
      else if (a === 'acknowledge') { files[i].acknowledged = e.target.checked; draw(); }
      else if (a === 'acknowledge-build') state.buildAck = e.target.checked;
    }
    function onDragOver(e) { if (e.target.closest('[data-action="drop-files"]')) e.preventDefault(); }
    function onDrop(e) {
      if (!e.target.closest('[data-action="drop-files"]')) return;
      e.preventDefault();
      addFiles(e.dataTransfer && e.dataTransfer.files);
    }
    main.addEventListener('click', onClick);
    main.addEventListener('change', onChange);
    main.addEventListener('dragover', onDragOver);
    main.addEventListener('drop', onDrop);
    var myDetach = detach = function () {
      main.removeEventListener('click', onClick);
      main.removeEventListener('change', onChange);
      main.removeEventListener('dragover', onDragOver);
      main.removeEventListener('drop', onDrop);
    };
    draw();
    return { addFiles: addFiles, files: function () { return files; }, restored: restored, keep: keep, discardDraft: discardDraft,
      saveToFile: saveToFile, loadFromFile: loadFromFile, checkDataset: checkDataset, addLegacy: addLegacy, state: state };
  }

  CFE.views.publish = { render: render, discard: discard, parse: parse, mapFile: mapFile, processFile: processFile, previewRows: PREVIEW_ROWS,
    current: function () { return files; } };
})(CFE);
