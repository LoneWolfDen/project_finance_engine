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
// Everything stays in memory on this page. Nothing is stored: leaving the page discards it
// (saving a draft arrives in IMP-008).
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

  function cardHtml(f, i) {
    var t = H().t, raw = H().raw;
    var p = f.parsed, r = f.result;
    var profiles = Object.keys(CFE.data.mappings).sort();
    var profileSelect = t`<label>Mapping <select data-action="choose-profile" data-file="${i}">${raw(profiles.map(function (id) {
      return String(t`<option value="${id}"${raw(f.profile && f.profile.id === id ? ' selected' : '')}>${id}</option>`);
    }).join(''))}${raw(f.profile ? '' : '<option value="" selected>(none matches)</option>')}</select></label>`;
    var sheetSelect = p.sheets.length > 1 ? t` <label>${p.parser === 'json' ? 'List' : 'Sheet'} <select data-action="choose-sheet" data-file="${i}">${raw(p.sheets.map(function (s) {
      return String(t`<option${raw(s === p.sheet ? ' selected' : '')}>${s}</option>`);
    }).join(''))}</select></label>` : '';
    var errors = (p.problems || []).concat(r ? r.errors.map(function (e) { return 'Row ' + e.row + (e.column ? ', ' + e.column : '') + ': ' + e.message; }) : []);
    var warnings = r ? r.warnings.map(function (w) { return w.message; }) : [];
    var status = !r ? 'Not imported' : errors.length ? errors.length + (errors.length === 1 ? ' error' : ' errors') + ' (rows with errors are left out)' : 'No errors';
    var cols = r && r.records.length ? Object.keys(f.profile.columns) : [];
    var preview = r && r.records.length ? t`<div class="tw"><table class="simple preview"><thead><tr>${raw(cols.map(function (c) { return String(t`<th>${c}</th>`); }).join(''))}</tr></thead><tbody>${raw(r.records.slice(0, PREVIEW_ROWS).map(function (rec) {
      return String(t`<tr>${raw(cols.map(function (c) { var v = rec[c]; return String(t`<td>${v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : String(v)}</td>`); }).join(''))}</tr>`);
    }).join(''))}</tbody></table></div>` : '';
    var prov = f.provenance;
    return String(t`<section class="card" aria-label="${f.name}">
<h2>${f.name}</h2>
<p>${profileSelect}${sheetSelect}</p>
<p><strong>${status}.</strong> Rows read: ${p.rows.length}. Rows used: ${r ? r.records.length : 0}.${raw(r && r.droppedColumns.length ? String(t` Columns not imported (not needed): ${r.droppedColumns.join(', ')}.`) : '')}</p>
${raw(errors.length ? String(t`<details class="errors" open><summary>Errors (${errors.length})</summary><ul>${raw(errors.slice(0, SHOWN_ERRORS).map(function (e) { return String(t`<li>${e}</li>`); }).join(''))}</ul>${raw(errors.length > SHOWN_ERRORS ? String(t`<p>…and ${errors.length - SHOWN_ERRORS} more.</p>`) : '')}</details>`) : '')}
${raw(warnings.length ? String(t`<div class="warnings"><ul>${raw(warnings.map(function (w) { return String(t`<li>${w}</li>`); }).join(''))}</ul><label><input type="checkbox" data-action="acknowledge" data-file="${i}"${raw(f.acknowledged ? ' checked' : '')}> I have read these warnings</label></div>`) : '')}
${raw(preview ? String(t`<h3>First ${Math.min(PREVIEW_ROWS, r.records.length)} rows as imported</h3>${preview}`) : '')}
${raw(prov ? String(t`<details><summary>Where this came from</summary><dl class="facts"><dt>File ID</dt><dd>${prov.file_id}</dd><dt>SHA-256</dt><dd>${prov.sha256}</dd><dt>Size</dt><dd>${prov.size} bytes</dd><dt>Read with</dt><dd>${prov.parser} ${prov.parser_version}</dd><dt>Mapping</dt><dd>${prov.mapping_profile}</dd>${raw(prov.sheet ? String(t`<dt>Sheet</dt><dd>${prov.sheet}</dd>`) : '')}</dl></details>`) : '')}
${raw(f.provenanceError ? String(t`<p class="errors">Provenance could not be recorded: ${f.provenanceError}</p>`) : '')}
</section>`);
  }

  function pageHtml(state) {
    var t = H().t, raw = H().raw;
    return t`<h1>Publish</h1>
<p>Choose the files exported from PeopleSoft and the other sources. Each file is checked and previewed here. Nothing is saved yet: leaving this page discards the preview.</p>
<div class="dropzone" data-action="drop-files"><p><label class="btn">Choose files…<input type="file" multiple accept=".csv,.xlsx,.json" class="visually-hidden" data-action="pick-files"></label> or drop files here (.csv, .xlsx, .json).</p></div>
${raw(state.busy ? '<p role="status">Reading files…</p>' : '')}
${raw(files.map(cardHtml).join(''))}`;
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

  function render(doc) {
    discard();   // a fresh page: nothing is carried over
    var main = doc.getElementById('main');
    var state = { busy: false };
    function draw() { H().setHtml(main, pageHtml(state)); }

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

    function onChange(e) {
      var a = e.target.getAttribute('data-action'), i = +e.target.getAttribute('data-file');
      if (a === 'pick-files') addFiles(e.target.files);
      else if (a === 'choose-profile') redo(i, { profileId: e.target.value || null, sheet: files[i].parsed.sheet });
      else if (a === 'choose-sheet') redo(i, { sheet: e.target.value });
      else if (a === 'acknowledge') files[i].acknowledged = e.target.checked;
    }
    function onDragOver(e) { if (e.target.closest('[data-action="drop-files"]')) e.preventDefault(); }
    function onDrop(e) {
      if (!e.target.closest('[data-action="drop-files"]')) return;
      e.preventDefault();
      addFiles(e.dataTransfer && e.dataTransfer.files);
    }
    main.addEventListener('change', onChange);
    main.addEventListener('dragover', onDragOver);
    main.addEventListener('drop', onDrop);
    detach = function () {
      main.removeEventListener('change', onChange);
      main.removeEventListener('dragover', onDragOver);
      main.removeEventListener('drop', onDrop);
    };
    draw();
    return { addFiles: addFiles, files: function () { return files; } };
  }

  CFE.views.publish = { render: render, discard: discard, parse: parse, mapFile: mapFile, processFile: processFile, previewRows: PREVIEW_ROWS,
    current: function () { return files; } };
})(CFE);
