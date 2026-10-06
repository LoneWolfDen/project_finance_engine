// Import a legacy v3.5 backup into the Publish page (IMP-006; DATA_AND_STORAGE §8 "From legacy v3.5").
// Registers CFE.store.legacyImport; needs app/cfe.js, Continuum.hash/provenance, CFE.calc.dates and
// CFE.data.mapping (+ profiles).
//
//   CFE.store.legacyImport(text, {name, size, lastModified, sha256})
//   // → Promise of {ok:true, entries:[file entry per section], notices:[text]} or {ok:false, message}
//
// Accepts the backup written by Settings → Export Full Config (format "cfe-legacy-backup", with a
// SHA-256 of {working, master, scenarios}, which is verified) and older exports that are a bare
// config (no checksum: a notice says so). The working config is converted section by section:
//   po_details → po-details-v1; resources → resource rules (already normalised by the legacy app);
//   raw_actuals → peoplesoft-timesheet-v1 (dates read as the legacy app read them: month first);
//   invoices, expenses, fx_rates, ot_params → their profiles.
// Each section becomes one file entry (sheet = section name) with provenance
// (sourceSystem "Legacy Finance Engine v3.5 backup"), ready for Keep in draft and Check the dataset.
// Not converted, with a notice: sections marked as sample data (_sample_sections), monthly totals
// without timesheet rows, scenarios, the master copy. The legacy data itself is never changed.
(function (CFE) {
  'use strict';

  var FORMAT = 'cfe-legacy-backup', SOURCE = 'Legacy Finance Engine v3.5 backup';
  var SECTIONS = [
    ['po_details', 'po-details-v1'], ['resources', 'resource-rules-v1'], ['raw_actuals', 'peoplesoft-timesheet-v1'],
    ['invoices', 'invoices-v1'], ['expenses', 'expenses-v1'], ['fx_rates', 'fx-rates-v1'], ['ot_params', 'ot-rules-v1']
  ];

  function header(list) {
    var h = [];
    list.forEach(function (o) { if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (h.indexOf(k) < 0) h.push(k); }); });
    return h;
  }

  // Legacy resources are already normalised (ISO dates, numbers): map their fields directly.
  function resources(list) {
    var out = { records: [], recordRows: [], errors: [], warnings: [], unmappedColumns: [], droppedColumns: [] };
    list.forEach(function (r, i) {
      if (!r || !r.start || !r.end) { out.errors.push({ row: i + 1, column: 'start/end', message: 'resource rule without start or end date' }); return; }
      out.records.push({ employee_name: r.name || '', employee_id: String(r.empl_id || ''), project_id: r.projectID ? String(r.projectID) : null,
        po_team_identifier: String(r.po_team || '').replace(/\s+/g, ''), role: r.role || null, location: r.location || 'UK', start: r.start, end: r.end,
        bill_rate: +r.bill_rate || 0, hour_multiplier: +r.hour_mult || 1, allocation: r.alloc === undefined ? 1 : +r.alloc });
      out.recordRows.push(i + 1);
    });
    return out;
  }

  // Timesheet dates exactly as the legacy app read them (parseDate 'us'), written M/D/YYYY for the profile.
  function timesheetRows(list) {
    var parseDate = CFE.require('calc.dates').parseDate;
    return list.map(function (row) {
      var iso = parseDate(row['Reported Dt'] || '', 'us');
      if (!iso) return row;
      var p = iso.split('-');
      return Object.assign({}, row, { 'Reported Dt': +p[1] + '/' + +p[2] + '/' + p[0] });
    });
  }

  function legacyImport(text, file) {
    file = file || {};
    var data;
    try { data = JSON.parse(text); } catch (e) { return Promise.resolve({ ok: false, message: 'The file is not valid JSON.' }); }
    if (!data || typeof data !== 'object') return Promise.resolve({ ok: false, message: 'This is not a legacy backup.' });
    var notices = [], check;
    if (data.format === FORMAT) {
      if (data.schema_version !== 1) return Promise.resolve({ ok: false, message: 'This backup needs a newer version of the app.' });
      if (data.hash_unavailable || !data.sha256) {
        notices.push('This backup has no checksum (the browser could not make one), so it could not be verified.');
        check = Promise.resolve(true);
      } else {
        check = Continuum.hash.sha256Hex(JSON.stringify({ working: data.working, master: data.master, scenarios: data.scenarios }))
          .then(function (h) { return h === data.sha256; });
      }
    } else if (Array.isArray(data.po_details) || Array.isArray(data.resources) || Array.isArray(data.raw_actuals)) {
      data = { working: data, master: null, scenarios: {} };
      notices.push('This is an older Full Config export without a checksum, so it could not be verified.');
      check = Promise.resolve(true);
    } else {
      return Promise.resolve({ ok: false, message: 'This is not a legacy backup or Full Config export.' });
    }

    return check.then(function (ok) {
      if (!ok) return { ok: false, message: 'The backup has been changed or damaged: its checksum does not match. Export a new backup from the legacy app.' };
      var cfg = data.working;
      if (!cfg || typeof cfg !== 'object') return { ok: false, message: 'The backup holds no working data.' };
      var sample = Array.isArray(cfg._sample_sections) ? cfg._sample_sections : [];
      if (sample.length) notices.push('Sample data was left out: ' + sample.join(', ') + '.');
      if ((!cfg.raw_actuals || !cfg.raw_actuals.length) && cfg.actuals_monthly && cfg.actuals_monthly.length) {
        notices.push('Monthly totals without timesheet rows cannot be attributed to people; re-import the PeopleSoft files.');
      }
      if (data.master) notices.push('The backup also holds a master copy; only the working data is imported.');
      if (data.scenarios && Object.keys(data.scenarios).length) notices.push('Scenarios are not imported.');

      var M = CFE.require('data.mapping'), sha = file.sha256 || '', entries = [];
      SECTIONS.forEach(function (s) {
        var list = cfg[s[0]];
        if (sample.indexOf(s[0]) >= 0 || !Array.isArray(list) || !list.length) return;
        var profile = CFE.data.mappings[s[1]];
        var result = s[0] === 'resources' ? resources(list) : M.apply(profile, header(list), s[0] === 'raw_actuals' ? timesheetRows(list) : list);
        var provenance = Continuum.provenance.fileRecord({
          fileId: (sha.slice(0, 12) || 'legacy') + '-' + s[0], name: file.name || 'legacy-backup.json', size: file.size || 0, lastModified: file.lastModified,
          sha256: sha, sourceSystem: SOURCE, parser: 'json', parserVersion: '1', mappingProfile: profile.id, sheet: s[0], headerRow: null,
          rowsRead: list.length, rowsUsed: result.records.length, importedUtc: new Date().toISOString().replace(/\.\d+Z$/, 'Z')
        });
        entries.push({ name: (file.name || 'legacy backup') + ' › ' + s[0], legacy: true, sha256: sha, profile: profile, result: result, provenance: provenance,
          acknowledged: false, parsed: { rows: list, sheets: [], sheet: s[0], problems: [] } });
      });
      if (!entries.length) return { ok: false, message: 'The backup holds no data to import (only sample data or empty sections).', notices: notices };
      return { ok: true, entries: entries, notices: notices };
    });
  }

  CFE.store.legacyImport = legacyImport;
})(CFE);
