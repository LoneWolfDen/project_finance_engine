// Declarative mapping of source columns to fields (IMP-003; DATA_AND_STORAGE §5 step 5).
// Human-readable list of profiles: docs/schema/MAPPING_PROFILES.md.
// Registers CFE.data.mapping (the engine) and CFE.data.mappings (the profiles, by id); needs app/cfe.js.
// Profiles live in app/data/mappings/<id>.js and call CFE.data.mapping.register(profile).
//
//   var p = CFE.data.mappings['peoplesoft-timesheet-v1'];
//   var r = CFE.data.mapping.apply(p, csv.header, csv.rows);
//   // → {records, recordRows, errors:[{row, column, message}], warnings, unmappedColumns, droppedColumns}
//   //   recordRows[i] is the file row number of records[i] (header = row 1), for provenance (IMP-005)
//   CFE.data.mapping.detect(csv.header)   // → profiles ranked by how many required columns are present
//
// Profile: {id, version, sourceSystem, entity, dropUnmapped, columns: {<field>: {aliases:[…], type, required,
//   dateFormat?, separator?}}}. Types: 'string', 'int', 'number', 'date', 'bool', 'list' (text split on
//   `separator`). Date formats: 'M/D/YYYY', 'D/M/YYYY' (1–2 digit day and month, separated by '/' or '-')
//   and 'YYYY-MM-DD'. dateFormat may list several formats only if they cannot be confused, so a list never
//   holds both 'M/D/YYYY' and 'D/M/YYYY' (DEC-041).
// Dates are never guessed: a value that does not match the profile's format(s) is an error for that row.
// `row` in errors is the row number in the file (the header is row 1). Rows with errors are left out.
(function (CFE) {
  'use strict';

  var TYPES = ['string', 'int', 'number', 'date', 'bool', 'list'];
  var DATE_FORMATS = {
    'M/D/YYYY': { re: /^(\d{1,2})([\/-])(\d{1,2})\2(\d{4})$/, m: 1, d: 3, y: 4 },
    'D/M/YYYY': { re: /^(\d{1,2})([\/-])(\d{1,2})\2(\d{4})$/, m: 3, d: 1, y: 4 },
    'YYYY-MM-DD': { re: /^(\d{4})-(\d{2})-(\d{2})$/, m: 2, d: 3, y: 1 }
  };

  // Column names are compared ignoring case, spaces and underscores ("Empl ID" = "EmplID" = "empl_id").
  function canon(name) { return String(name == null ? '' : name).toLowerCase().replace(/[\s_]+/g, ''); }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function formatList(format) { return Array.isArray(format) ? format : [format]; }

  function toDate(text, format) {
    var list = formatList(format), f, m;
    for (var i = 0; i < list.length && !m; i++) { f = DATE_FORMATS[list[i]]; m = f.re.exec(text); }
    if (!m) return { error: 'expected a date as ' + list.join(' or ') };
    format = list[i - 1];
    var y = +m[f.y], mo = +m[f.m], d = +m[f.d];
    var days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    if (mo < 1 || mo > 12 || d < 1 || d > days) return { error: 'not a real date as ' + format };
    return { value: y + '-' + pad(mo) + '-' + pad(d) };
  }

  // Converts one cell; returns {value} (null when empty) or {error}.
  function convert(raw, col) {
    if (raw === undefined || raw === null) return { value: null };
    if (typeof raw === 'number' && (col.type === 'int' || col.type === 'number')) {
      if (!isFinite(raw)) return { error: 'not a number' };
      if (col.type === 'int' && Math.floor(raw) !== raw) return { error: 'expected a whole number' };
      return { value: raw };
    }
    if (typeof raw === 'boolean' && col.type === 'bool') return { value: raw };
    var text = String(raw).trim();
    if (text === '') return { value: null };
    switch (col.type) {
      case 'string': return { value: text };
      case 'int': return /^-?\d+$/.test(text) ? { value: parseInt(text, 10) } : { error: 'expected a whole number' };
      case 'number': return /^-?(\d+\.?\d*|\.\d+)$/.test(text) ? { value: parseFloat(text) } : { error: 'expected a number (no currency symbols or thousands separators)' };
      case 'date': return toDate(text, col.dateFormat);
      case 'bool':
        if (/^(true|yes|y|1)$/i.test(text)) return { value: true };
        if (/^(false|no|n|0)$/i.test(text)) return { value: false };
        return { error: 'expected true/false or yes/no' };
      case 'list': return { value: text.split(col.separator || ';').map(function (s) { return s.trim(); }).filter(Boolean) };
    }
    return { error: 'unknown type ' + col.type };
  }

  function checkProfile(p) {
    var problems = [];
    if (!p || typeof p.id !== 'string' || !p.id) problems.push('id');
    if (!p || typeof p.version !== 'number') problems.push('version');
    if (!p || !p.columns || typeof p.columns !== 'object') problems.push('columns');
    else Object.keys(p.columns).forEach(function (f) {
      var c = p.columns[f];
      if (!Array.isArray(c.aliases) || !c.aliases.length) problems.push(f + '.aliases');
      if (TYPES.indexOf(c.type) < 0) problems.push(f + '.type');
      if (c.type === 'date') {
        var list = formatList(c.dateFormat);
        if (!list.length || list.some(function (x) { return !DATE_FORMATS[x]; }) ||
            (list.indexOf('M/D/YYYY') >= 0 && list.indexOf('D/M/YYYY') >= 0)) problems.push(f + '.dateFormat');
      }
    });
    if (problems.length) throw new Error('Invalid mapping profile ' + (p && p.id) + ': ' + problems.join(', '));
  }

  // Which header column feeds each field: {field: headerName}, plus warnings for ambiguous headers.
  function matchHeader(profile, header) {
    var byCanon = {}, warnings = [], used = {};
    header.forEach(function (h) { var k = canon(h); if (!(k in byCanon)) byCanon[k] = h; });
    var map = {};
    Object.keys(profile.columns).forEach(function (field) {
      var hits = [];   // distinct header columns matching any alias, in alias order
      profile.columns[field].aliases.forEach(function (a) {
        var h = byCanon[canon(a)];
        if (h !== undefined && hits.indexOf(h) < 0) hits.push(h);
      });
      if (!hits.length) return;
      if (hits.length > 1) warnings.push({ column: field, message: 'Several columns could be ' + field + ': ' + hits.join(', ') + '. Using ' + hits[0] + '.' });
      map[field] = hits[0];
      used[hits[0]] = true;
    });
    return { map: map, warnings: warnings, unmapped: header.filter(function (h) { return !used[h]; }) };
  }

  function apply(profile, header, rows) {
    checkProfile(profile);
    header = header || []; rows = rows || [];
    var m = matchHeader(profile, header);
    var out = { records: [], recordRows: [], errors: [], warnings: m.warnings, unmappedColumns: m.unmapped, droppedColumns: profile.dropUnmapped ? m.unmapped.slice() : [] };

    Object.keys(profile.columns).forEach(function (field) {
      if (profile.columns[field].required && !m.map[field]) {
        out.errors.push({ row: 1, column: field, message: 'Required column missing: ' + field + ' (expected one of: ' + profile.columns[field].aliases.join(', ') + '). Nothing was imported.' });
      }
    });
    if (out.errors.length) return out;   // a missing required column blocks the whole file

    rows.forEach(function (row, i) {
      var rowNumber = i + 2, rec = {}, ok = true;
      Object.keys(profile.columns).forEach(function (field) {
        var col = profile.columns[field];
        var source = m.map[field];
        var c = convert(source === undefined ? undefined : row[source], col);
        if (c.error) {
          ok = false;
          out.errors.push({ row: rowNumber, column: source || field, message: c.error + ' (value: ' + JSON.stringify(String(row[source])) + ')' });
          return;
        }
        if (c.value === null && col.required) {
          ok = false;
          out.errors.push({ row: rowNumber, column: source || field, message: field + ' is empty' });
          return;
        }
        rec[field] = c.value;
      });
      if (!profile.dropUnmapped && m.unmapped.length) {
        rec._extra = {};
        m.unmapped.forEach(function (h) { rec._extra[h] = row[h]; });
      }
      if (ok) { out.records.push(rec); out.recordRows.push(rowNumber); }
    });
    return out;
  }

  // Profiles ranked by the share of their required columns present in the header (best first).
  function detect(header) {
    var have = {};
    (header || []).forEach(function (h) { have[canon(h)] = true; });
    return Object.keys(CFE.data.mappings).map(function (id) {
      var p = CFE.data.mappings[id];
      var required = Object.keys(p.columns).filter(function (f) { return p.columns[f].required; });
      var present = required.filter(function (f) { return p.columns[f].aliases.some(function (a) { return have[canon(a)]; }); });
      return { id: id, entity: p.entity, coverage: required.length ? present.length / required.length : 0, missing: required.filter(function (f) { return present.indexOf(f) < 0; }) };
    }).filter(function (c) { return c.coverage > 0; }).sort(function (a, b) { return b.coverage - a.coverage || a.missing.length - b.missing.length || (a.id < b.id ? -1 : 1); });
  }

  function register(profile) {
    checkProfile(profile);
    CFE.data.mappings[profile.id] = Object.freeze(profile);
  }

  CFE.data.mappings = CFE.data.mappings || {};
  CFE.data.mapping = { apply: apply, detect: detect, register: register, dateFormats: Object.keys(DATE_FORMATS), types: TYPES };
})(CFE);
