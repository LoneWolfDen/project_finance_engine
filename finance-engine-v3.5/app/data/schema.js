// Published manifest and dataset, schema version 1 (STO-001; DATA_AND_STORAGE §3, §7, §8).
// Human-readable field table: docs/schema/DATASET_V1.md (keep the two in step).
// Registers CFE.data.schema; needs app/cfe.js and app/continuum-core/ref.js first.
//
//   var r = CFE.data.schema.validateDataset(ds);   // → {errors:[{code, path, message}], warnings:[…]}
//   if (r.errors.length) … refuse to publish / load …
//
// Error codes: wrong-schema, missing-field, wrong-type, bad-value, duplicate-key.
// Warning codes: unknown-entity, unknown-field (readers tolerate unknown fields, §8).
(function (CFE, Continuum) {
  'use strict';

  // ─── field types ────────────────────────────────────────────────────────
  var ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  var ISO_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
  var ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
  var CURRENCY = /^[A-Z]{3}$/;
  var SHA256 = /^[0-9a-f]{64}$/;

  function isText(v) { return typeof v === 'string' && v.trim() !== ''; }
  function isNumber(v) { return typeof v === 'number' && isFinite(v); }
  function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

  // Each type: test(value) → true, or a message saying what was expected.
  var TYPES = {
    text: function (v) { return isText(v) || 'text'; },
    ref: function (v) { return (typeof v === 'string' && Continuum.ref.isValid(v)) || 'a normalised reference (Continuum.ref)'; },
    date: function (v) { return (typeof v === 'string' && ISO_DATE.test(v)) || 'a date as YYYY-MM-DD'; },
    month: function (v) { return (typeof v === 'string' && ISO_MONTH.test(v)) || 'a month as YYYY-MM'; },
    utc: function (v) { return (typeof v === 'string' && ISO_UTC.test(v)) || 'a UTC time such as 2026-10-05T09:30:00Z'; },
    currency: function (v) { return (typeof v === 'string' && CURRENCY.test(v)) || 'a three-letter currency code such as GBP'; },
    money: function (v) { return isNumber(v) || 'a number (no currency symbol)'; },
    number: function (v) { return isNumber(v) || 'a number'; },
    count: function (v) { return (isNumber(v) && v >= 0 && Math.floor(v) === v) || 'a whole number, 0 or more'; },
    share: function (v) { return (isNumber(v) && v >= 0 && v <= 1) || 'a number from 0 to 1'; },
    positive: function (v) { return (isNumber(v) && v > 0) || 'a number above 0'; },
    bool: function (v) { return typeof v === 'boolean' || 'true or false'; },
    sha256: function (v) { return (typeof v === 'string' && SHA256.test(v)) || '64 lower-case hex characters'; },
    textList: function (v) { return (Array.isArray(v) && v.every(isText)) || 'a list of text values'; },
    yearList: function (v) { return (Array.isArray(v) && v.every(function (y) { return isNumber(y) && Math.floor(y) === y; })) || 'a list of years'; },
    dateList: function (v) { return (Array.isArray(v) && v.every(function (d) { return typeof d === 'string' && ISO_DATE.test(d); })) || 'a list of YYYY-MM-DD dates'; },
    object: function (v) { return isObject(v) || 'an object'; },
    list: function (v) { return Array.isArray(v) || 'a list'; },
    // Provenance of a record: one source row {file, sheet, row}, or an aggregate {files:[…], rows}.
    src: function (v) {
      if (isObject(v) && isText(v.file) && isNumber(v.row) && v.row >= 1) return true;
      if (isObject(v) && Array.isArray(v.files) && v.files.length && v.files.every(isText) && isNumber(v.rows) && v.rows >= 0) return true;
      return 'a source: {file, sheet, row} or {files:[…], rows}';
    }
  };
  function oneOf(values) { return function (v) { return values.indexOf(v) >= 0 || 'one of ' + values.join(', '); }; }

  // ─── field specifications ───────────────────────────────────────────────
  // field: [type, required]. key: the fields that identify a record (must be unique).
  var R = true, O = false;
  var ENTITIES = {
    references: { key: ['ref'], fields: {
      ref: ['ref', R], name: ['text', R], client: ['text', O], status: [oneOf(['active', 'closed', 'retired']), R],
      opportunity_numbers: ['textList', O], links: ['object', O], src: ['src', O] } },
    purchase_orders: { key: ['po_number', 'ref'], fields: {
      po_number: ['text', R], ref: ['ref', R], po_team_identifier: ['text', R], value: ['money', R], currency: ['currency', R],
      normalized_currency: ['currency', O],   // second display currency of the PO value (legacy Normalized_Currency_Code; UI-007)
      start: ['date', R], validity_end: ['date', R], rollover_allowed: ['bool', R], approval_status: ['text', R], src: ['src', R] } },
    resource_rules: { key: ['rule_id'], fields: {
      rule_id: ['text', R], ref: ['ref', R], person_key: ['text', R], role: ['text', O], location: ['text', R],
      start: ['date', R], end: ['date', R], bill_rate: ['money', R], currency: ['currency', R],
      rate_unit: [oneOf(['hour', 'day']), R], allocation: ['share', R], po_team_identifier: ['text', O], src: ['src', R] } },
    people: { key: ['person_key'], fields: {
      person_key: ['text', R], display_name: ['text', R], employee_id: ['text', O], src: ['src', R] } },
    actuals: { key: ['ref', 'person_key', 'month', 'hours_type'], fields: {
      ref: ['ref', R], person_key: ['text', R], month: ['month', R], hours_type: [oneOf(['regular', 'overtime']), R],
      hours: ['number', R], cost: ['money', R], currency: ['currency', R], src: ['src', R] } },
    invoices: { key: ['invoice_id'], fields: {
      invoice_id: ['text', R], ref: ['ref', R], po_number: ['text', O], period_from: ['date', R], period_to: ['date', R],
      amount: ['money', R], currency: ['currency', R], status: [oneOf(['Draft', 'Submitted', 'Paid']), R], paid_date: ['date', O],
      notes: ['text', O], src: ['src', R] } },
    expenses: { key: ['expense_id'], fields: {
      expense_id: ['text', R], ref: ['ref', R], person_key: ['text', O], date: ['date', R], amount: ['money', R],
      currency: ['currency', R], converted_amount: ['money', O], converted_currency: ['currency', O], fx_rate_used: ['positive', O],
      description: ['text', O], src: ['src', R] } },
    fx_rates: { key: ['currency', 'effective'], fields: {
      currency: ['currency', R], effective: ['date', R], rate: ['positive', R], src: ['src', R] } },
    ot_rules: { key: ['type', 'effective', 'po_team_identifier'], fields: {
      type: ['text', R], effective: ['date', R], multiplier: ['positive', R], po_team_identifier: ['text', O], src: ['src', R] } },
    calendars: { key: ['location'], fields: {
      location: ['text', R], source: ['text', R], valid_years: ['yearList', R], holidays: ['dateList', R], src: ['src', O] } }
  };

  var MANIFEST = {
    schema: [oneOf(['cfe.manifest']), R], schema_version: [oneOf([1]), R],
    publication_id: ['text', R], published_utc: ['utc', R], publisher: ['text', R], app_version: ['text', R],
    dataset_schema_version: [oneOf([1]), R], data_as_of: ['date', R], payload_sha256: ['sha256', R],
    sources: ['list', R], counts: ['object', R], validation: ['object', R], minimisation: ['object', R],
    deployment: ['object', R], publications: ['list', R]
  };
  var MANIFEST_PARTS = {
    validation: { errors: ['count', R], warnings: ['list', R] },
    minimisation: { policy: ['text', R], person_names: [oneOf(['included', 'pseudonymised']), R] },
    deployment: { display_name: ['text', R], reporting_currency: ['currency', R] }
  };

  // ─── validation ─────────────────────────────────────────────────────────
  function checkFields(obj, spec, path, out) {
    Object.keys(spec).forEach(function (name) {
      var type = spec[name][0], required = spec[name][1];
      var test = typeof type === 'function' ? type : TYPES[type];
      var value = obj[name];
      if (value === undefined || value === null) {
        if (required) out.errors.push({ code: 'missing-field', path: path + '.' + name, message: name + ' is required' });
        return;
      }
      var ok = test(value);
      if (ok !== true) out.errors.push({ code: 'wrong-type', path: path + '.' + name, message: name + ' must be ' + ok });
    });
    Object.keys(obj).forEach(function (name) {
      if (!spec[name]) out.warnings.push({ code: 'unknown-field', path: path + '.' + name, message: 'Unknown field ' + name + ' (kept, not used)' });
    });
  }

  function result() { return { errors: [], warnings: [] }; }

  function validateManifest(m) {
    var out = result();
    if (!isObject(m)) { out.errors.push({ code: 'wrong-schema', path: '$', message: 'A manifest must be an object' }); return out; }
    checkFields(m, MANIFEST, '$', out);
    Object.keys(MANIFEST_PARTS).forEach(function (part) {
      if (isObject(m[part])) checkFields(m[part], MANIFEST_PARTS[part], '$.' + part, out);
    });
    if (isObject(m.counts)) Object.keys(m.counts).forEach(function (k) {
      if (TYPES.count(m.counts[k]) !== true) out.errors.push({ code: 'wrong-type', path: '$.counts.' + k, message: k + ' must be a whole number, 0 or more' });
    });
    if (Array.isArray(m.sources)) m.sources.forEach(function (s, i) {
      if (!isObject(s) || TYPES.sha256(s.sha256) !== true || !isText(s.name)) out.errors.push({ code: 'bad-value', path: '$.sources[' + i + ']', message: 'Each source must be a provenance record with name and sha256 (Continuum.provenance.fileRecord)' });
    });
    if (Array.isArray(m.publications) && m.publications.length > 100) out.errors.push({ code: 'bad-value', path: '$.publications', message: 'At most the last 100 publication events are kept' });
    return out;
  }

  function validateDataset(ds) {
    var out = result();
    if (!isObject(ds)) { out.errors.push({ code: 'wrong-schema', path: '$', message: 'A dataset must be an object' }); return out; }
    if (ds.schema !== 'cfe.dataset') out.errors.push({ code: 'wrong-schema', path: '$.schema', message: 'schema must be "cfe.dataset"' });
    if (ds.schema_version !== 1) out.errors.push({ code: 'wrong-schema', path: '$.schema_version', message: 'schema_version must be 1 (migrate older data first)' });
    if (TYPES.date(ds.data_as_of) !== true) out.errors.push({ code: ds.data_as_of == null ? 'missing-field' : 'wrong-type', path: '$.data_as_of', message: 'data_as_of must be a date as YYYY-MM-DD' });

    Object.keys(ds).forEach(function (k) {
      if (!ENTITIES[k] && ['schema', 'schema_version', 'data_as_of'].indexOf(k) < 0) {
        out.warnings.push({ code: 'unknown-entity', path: '$.' + k, message: 'Unknown entity ' + k + ' (kept, not used)' });
      }
    });

    Object.keys(ENTITIES).forEach(function (name) {
      var spec = ENTITIES[name], list = ds[name], path = '$.' + name;
      if (list === undefined) { out.errors.push({ code: 'missing-field', path: path, message: name + ' is required (use [] when empty)' }); return; }
      if (!Array.isArray(list)) { out.errors.push({ code: 'wrong-type', path: path, message: name + ' must be a list' }); return; }
      var seen = {};
      list.forEach(function (rec, i) {
        var p = path + '[' + i + ']';
        if (!isObject(rec)) { out.errors.push({ code: 'wrong-type', path: p, message: 'Each ' + name + ' entry must be an object' }); return; }
        checkFields(rec, spec.fields, p, out);
        var k = JSON.stringify(spec.key.map(function (f) { return rec[f] === undefined ? null : rec[f]; }));
        if (seen[k] !== undefined) out.errors.push({ code: 'duplicate-key', path: p, message: 'Same ' + spec.key.join(' + ') + ' as ' + path + '[' + seen[k] + ']' });
        else seen[k] = i;
      });
    });
    return out;
  }

  CFE.data.schema = {
    version: 1,
    entities: ENTITIES,
    manifest: MANIFEST,
    manifestParts: MANIFEST_PARTS,
    validateManifest: validateManifest,
    validateDataset: validateDataset
  };
})(CFE, Continuum);
