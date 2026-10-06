// Builds a dataset v1 from the import draft (IMP-005; DATA_AND_STORAGE §5 steps 7–9, ADR-016, DEC-006).
// Registers CFE.store.buildDataset and CFE.store.diffDatasets; needs app/cfe.js, Continuum.ref and
// Continuum.provenance, CFE.calc.actuals, CFE.data.schema and CFE.data.calendars.
//
//   var b = CFE.store.buildDataset(draft, {nowUtc, publisher, reportingCurrency, displayName, published})
//   // → {dataset, manifestDraft, report}
//   CFE.store.datasetTotals(dataset)   // → {<ref>: {po_value, actual_cost, invoiced, expenses}}
//
// (a) references come from references-crosswalk-v1 records (ref normalised by Continuum.ref);
// (b) POs, resource rules, timesheet rows, invoices and expenses are matched to a ref through the
//     crosswalk's po_team_identifiers (spaces ignored) and peoplesoft_project_ids; unmatched rows are
//     counted in the report with up to 5 examples, and left out;
// (c) each timesheet row is costed with CFE.calc.actuals.rowCost (the legacy rule) and aggregated to
//     actuals per ref + person + month + hours type: daily rows are never published (ADR-016);
// (d) people (real names, DEC-006) come from resource rules and timesheet rows;
// (e) FX rates and OT rules are copied; calendars come from app/data/calendars.js;
// (f) the dataset is validated with CFE.data.schema;
// (g) a diff against the published dataset (opts.published, default CFE.state.published) gives
//     entity counts added/removed and per-ref totals before and after.
// The manifest draft has everything except payload_sha256, which publishing adds (PUB-001).
(function (CFE) {
  'use strict';

  var EXAMPLES = 5;

  function teamKey(v) { return String(v == null ? '' : v).replace(/\s+/g, ''); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function validityEnd(po) {
    var m = /^(\d{1,2})-(\d{2}|\d{4})$/.exec(String(po.validity || '').trim());
    if (m) {
      var y = m[2].length === 2 ? 2000 + +m[2] : +m[2], mo = +m[1];
      if (mo >= 1 && mo <= 12) return y + '-' + pad(mo) + '-' + pad(new Date(Date.UTC(y, mo, 0)).getUTCDate());
    }
    if (typeof po.validity_year === 'number' && po.validity_year > 1900) return po.validity_year + '-12-31';
    return null;
  }

  function buildDataset(draft, opts) {
    opts = opts || {};
    var R = (draft && draft.records) || {};
    var nowIso = (opts.nowUtc ? new Date(opts.nowUtc) : new Date()).toISOString().replace(/\.\d+Z$/, 'Z');
    var currency = opts.reportingCurrency || 'GBP';
    var fileById = {};
    ((draft && draft.files) || []).forEach(function (f) { fileById[f.file_id] = f; });
    var report = { counts: {}, unmatched: {}, problems: [], notes: [], schema: null, diff: null };

    function src(rec) {
      var f = fileById[rec._file];
      return Object.assign({}, Continuum.provenance.rowRef(rec._file || 'unknown', f ? f.sheet : null, rec._row >= 1 ? rec._row : 1));
    }
    function miss(entity, rec, why) {
      var u = report.unmatched[entity] || (report.unmatched[entity] = { count: 0, examples: [] });
      u.count++;
      if (u.examples.length < EXAMPLES) u.examples.push(why + (rec._row ? ' (row ' + rec._row + (fileById[rec._file] ? ' of ' + fileById[rec._file].name : '') + ')' : ''));
    }
    function problem(text) { if (report.problems.indexOf(text) < 0) report.problems.push(text); }

    // (a) references and the lookups
    var references = [], byRef = {}, teamToRef = {}, projectToRef = {};
    (R.references || []).forEach(function (rec) {
      var n = Continuum.ref.normalise(rec.ref);
      if (!n.ok) { miss('references', rec, 'Reference "' + rec.ref + '": ' + n.error.message); return; }
      if (byRef[n.ref]) { miss('references', rec, 'Reference ' + n.ref + ' appears twice; the first is used'); return; }
      var opp = [n.ref];
      (rec.opportunity_numbers || []).forEach(function (o) { var x = Continuum.ref.normalise(o); if (x.ok && opp.indexOf(x.ref) < 0) opp.push(x.ref); });
      var teams = (rec.po_team_identifiers || []).map(teamKey).filter(Boolean);
      var projects = (rec.peoplesoft_project_ids || []).map(String);
      var r = { ref: n.ref, name: rec.name, status: 'active', opportunity_numbers: opp, links: { po_team_identifiers: teams, peoplesoft_project_ids: projects }, src: src(rec) };
      if (rec.client) r.client = rec.client;
      byRef[n.ref] = r;
      references.push(r);
      teams.forEach(function (t) { if (teamToRef[t] && teamToRef[t] !== n.ref) problem('PO team ' + t + ' is linked to both ' + teamToRef[t] + ' and ' + n.ref + '; ' + teamToRef[t] + ' is used.'); else teamToRef[t] = n.ref; });
      projects.forEach(function (p) { if (projectToRef[p] && projectToRef[p] !== n.ref) problem('PeopleSoft project ' + p + ' is linked to both ' + projectToRef[p] + ' and ' + n.ref + '; ' + projectToRef[p] + ' is used.'); else projectToRef[p] = n.ref; });
    });
    if (!references.length) problem('No project references: import a references file (ref, name, po_team_identifiers, peoplesoft_project_ids) so records can be matched to projects.');

    function refFor(team, project) {
      return (team && teamToRef[teamKey(team)]) || (project != null && project !== '' && projectToRef[String(project)]) || null;
    }

    // POs
    var purchase_orders = [];
    (R.purchase_orders || []).forEach(function (rec) {
      var ref = refFor(rec.po_team_identifier, rec.project_id);
      if (!ref) { miss('purchase_orders', rec, 'PO ' + rec.po_number + ' (team ' + rec.po_team_identifier + ') matches no project'); return; }
      var end = validityEnd(rec);
      if (!end) { miss('purchase_orders', rec, 'PO ' + rec.po_number + ' has no validity (mm-yy or year)'); return; }
      purchase_orders.push({ po_number: String(rec.po_number), ref: ref, po_team_identifier: teamKey(rec.po_team_identifier), value: rec.value,
        currency: rec.currency, start: rec.start, validity_end: end, rollover_allowed: rec.rollover_allowed === true,
        approval_status: rec.approval_status, src: src(rec) });
    });

    // (d) people, and resource rules
    var people = [], personByKey = {};
    function person(id, name, rec) {
      var key = 'E' + String(id).trim();
      if (!personByKey[key]) {
        var p = { person_key: key, display_name: name || key, employee_id: String(id).trim(), src: src(rec) };
        personByKey[key] = p; people.push(p);
      }
      return key;
    }
    // rule_id is stable across republishes (person, PO team, start), so a diff shows only real changes.
    var resource_rules = [], legacyRules = [], ruleIds = {};
    (R.resource_rules || []).forEach(function (rec) {
      var ref = refFor(rec.po_team_identifier, rec.project_id);
      legacyRules.push({ empl_id: parseInt(rec.employee_id, 10) || 0, start: rec.start, end: rec.end, bill_rate: rec.bill_rate,
        hour_mult: rec.hour_multiplier || 1, po_team: teamKey(rec.po_team_identifier) });   // the legacy rowCost shape
      if (!ref) { miss('resource_rules', rec, rec.employee_name + ' (team ' + rec.po_team_identifier + ') matches no project'); return; }
      var pk = person(rec.employee_id, rec.employee_name, rec), id = pk + '@' + teamKey(rec.po_team_identifier) + '@' + rec.start;
      if (ruleIds[id]) { miss('resource_rules', rec, rec.employee_name + ' has two rules starting ' + rec.start + ' for ' + rec.po_team_identifier + '; the first is used'); return; }
      ruleIds[id] = true;
      var r = { rule_id: id, ref: ref, person_key: pk };
      if (rec.role) r.role = rec.role;
      Object.assign(r, { location: rec.location, start: rec.start, end: rec.end, bill_rate: rec.bill_rate, currency: currency, rate_unit: 'hour',
        allocation: rec.allocation, po_team_identifier: teamKey(rec.po_team_identifier), src: src(rec) });
      resource_rules.push(r);
    });

    // (c) actuals: cost each timesheet row with the legacy rule, aggregate per ref, person, month, type
    var ot_rules = (R.ot_rules || []).map(function (rec) { return { type: rec.type, effective: rec.effective, multiplier: rec.multiplier, src: src(rec) }; });
    var legacyCfg = { resources: legacyRules, ot_params: (R.ot_rules || []).map(function (o) { return { type: o.type, effective: o.effective, multiplier: o.multiplier, trc: o.trc || '' }; }) };
    var rowCost = CFE.require('calc.actuals').rowCost;
    var agg = {}, latest = '', costed = 0;
    (R.timesheet_rows || []).forEach(function (rec) {
      var ref = refFor(null, rec.project_id);
      if (!ref) { miss('timesheet_rows', rec, 'PeopleSoft project ' + rec.project_id + ' matches no project'); return; }
      var pk = person(rec.employee_id, rec.employee_name, rec), used = false;
      [['regular', rec.regular_hours], ['overtime', rec.overtime_hours]].forEach(function (h) {
        var hours = +h[1] || 0;
        if (!hours) return;
        var cost = rowCost(legacyCfg, { 'Empl ID': rec.employee_id, 'Regular Hours': h[0] === 'regular' ? hours : 0, 'Overtime Hours': h[0] === 'overtime' ? hours : 0 }, rec.reported_date);
        if (cost === null) { miss('timesheet_rows', rec, 'No resource rule for employee ' + rec.employee_id); return; }
        var month = rec.reported_date.slice(0, 7), key = [ref, pk, month, h[0]].join('|');
        var a = agg[key] || (agg[key] = { ref: ref, person_key: pk, month: month, hours_type: h[0], hours: 0, cost: 0, currency: currency, src: { files: [], rows: 0 } });
        a.hours += hours; a.cost += cost; a.src.rows++;
        if (a.src.files.indexOf(rec._file) < 0) a.src.files.push(rec._file);
        used = true;
      });
      if (used) { costed++; if (rec.reported_date > latest) latest = rec.reported_date; }
    });
    var actuals = Object.keys(agg).sort().map(function (k) { var a = agg[k]; a.hours = round2(a.hours); a.cost = round2(a.cost); return a; });

    var STATUS = { draft: 'Draft', submitted: 'Submitted', paid: 'Paid' };
    var invoices = [];
    (R.invoices || []).forEach(function (rec) {
      var ref = refFor(rec.po_team_identifier, null);
      if (!ref) { miss('invoices', rec, 'Invoice ' + rec.invoice_number + ' (team ' + rec.po_team_identifier + ') matches no project'); return; }
      var status = STATUS[String(rec.status || '').toLowerCase()];
      if (!status) { miss('invoices', rec, 'Invoice ' + rec.invoice_number + ' has status "' + rec.status + '" (expected Draft, Submitted or Paid)'); return; }
      var r = { invoice_id: String(rec.invoice_number), ref: ref, period_from: rec.period_from, period_to: rec.period_to, amount: rec.amount, currency: rec.currency || currency, status: status };
      if (rec.paid_date) r.paid_date = rec.paid_date;
      if (rec.notes) r.notes = rec.notes;
      r.src = src(rec);
      invoices.push(r);
    });

    var nameToKey = {};
    people.forEach(function (p) { nameToKey[p.display_name] = p.person_key; });
    var expenses = [];
    (R.expenses || []).forEach(function (rec) {
      var ref = refFor(rec.po_team_identifier, rec.project_id);
      if (!ref) { miss('expenses', rec, 'Expense of ' + rec.employee_name + ' on ' + rec.date + ' matches no project'); return; }
      var r = { expense_id: (rec._file || 'x') + '-' + (rec._row || expenses.length + 1), ref: ref };
      if (nameToKey[rec.employee_name]) r.person_key = nameToKey[rec.employee_name];
      Object.assign(r, { date: rec.date, amount: rec.amount, currency: rec.currency });
      if (rec.description) r.description = rec.description;
      r.src = src(rec);
      expenses.push(r);
    });

    var fx_rates = (R.fx_rates || []).map(function (rec) { return { currency: rec.currency, effective: rec.effective, rate: rec.rate, src: src(rec) }; });
    var cal = CFE.require('data.calendars');
    var calendars = Object.keys(cal.locations).sort().map(function (loc) { return { location: loc, source: cal.source, valid_years: cal.valid_years.slice(), holidays: cal.locations[loc].slice() }; });

    var dataset = {
      schema: 'cfe.dataset', schema_version: 1, data_as_of: latest || nowIso.slice(0, 10),
      references: references, purchase_orders: purchase_orders, resource_rules: resource_rules, people: people, actuals: actuals,
      invoices: invoices, expenses: expenses, fx_rates: fx_rates, ot_rules: ot_rules, calendars: calendars
    };
    if (!latest) report.notes.push('No costed timesheet rows: "data as of" is today.');
    report.notes.push('Published: monthly actuals per person and project (daily timesheet rows stay out), real names (DEC-006), POs, resource rules, invoices, expenses, FX and OT rules.');

    var timesheetIn = (R.timesheet_rows || []).length;
    report.counts = { references: references.length, po: purchase_orders.length, resource_rules: resource_rules.length, people: people.length,
      actual_rows_in: timesheetIn, actual_rows_costed: costed, actual_aggregates: actuals.length, invoices: invoices.length,
      expenses: expenses.length, fx_rates: fx_rates.length, ot_rules: ot_rules.length, calendars: calendars.length };
    report.schema = CFE.require('data.schema').validateDataset(dataset);

    var unmatchedWarnings = Object.keys(report.unmatched).map(function (e) { return report.unmatched[e].count + ' ' + e.replace(/_/g, ' ') + ' not included'; });
    var manifestDraft = {
      schema: 'cfe.manifest', schema_version: 1, publication_id: 'pub-' + nowIso.replace(/[-:]/g, '').replace('T', '-').slice(0, 15),
      published_utc: nowIso, publisher: opts.publisher || 'Publisher', app_version: (CFE.version && CFE.version.app) || '',
      dataset_schema_version: 1, data_as_of: dataset.data_as_of, sources: ((draft && draft.files) || []).map(function (f) { return Object.assign({}, f); }),
      counts: report.counts, validation: { errors: report.schema.errors.length, warnings: unmatchedWarnings.concat(report.problems) },
      minimisation: { policy: 'Actuals published as monthly aggregates per person and project (ADR-016); daily rows and dropped columns are not published', person_names: 'included' },
      deployment: { display_name: opts.displayName || 'Finance Engine', reporting_currency: currency },
      publications: []
    };

    var published = opts.published !== undefined ? opts.published : (CFE.state && CFE.state.published);
    report.diff = published && published.dataset ? diffDatasets(published.dataset, dataset) : null;
    return { dataset: dataset, manifestDraft: manifestDraft, report: report };
  }

  // Per-ref totals used by the diff: PO value, actual cost, invoiced, expenses.
  function totals(ds) {
    var t = {};
    function add(ref, field, n) { var x = t[ref] || (t[ref] = { po_value: 0, actual_cost: 0, invoiced: 0, expenses: 0 }); x[field] = round2(x[field] + (+n || 0)); }
    (ds.references || []).forEach(function (r) { add(r.ref, 'po_value', 0); });
    (ds.purchase_orders || []).forEach(function (r) { add(r.ref, 'po_value', r.value); });
    (ds.actuals || []).forEach(function (r) { add(r.ref, 'actual_cost', r.cost); });
    (ds.invoices || []).forEach(function (r) { add(r.ref, 'invoiced', r.amount); });
    (ds.expenses || []).forEach(function (r) { add(r.ref, 'expenses', r.amount); });
    return t;
  }

  function diffDatasets(before, after) {
    var entities = CFE.require('data.schema').entities, out = { entities: {}, kpis: [], changes: 0 };
    Object.keys(entities).forEach(function (name) {
      var key = entities[name].key;
      function keys(list) { return (list || []).map(function (r) { return JSON.stringify(key.map(function (k) { return r[k] === undefined ? null : r[k]; })); }); }
      var b = keys(before[name]), a = keys(after[name]);
      var added = a.filter(function (k) { return b.indexOf(k) < 0; }).length, removed = b.filter(function (k) { return a.indexOf(k) < 0; }).length;
      out.entities[name] = { before: b.length, after: a.length, added: added, removed: removed };
      out.changes += added + removed;
    });
    var tb = totals(before), ta = totals(after);
    Object.keys(tb).concat(Object.keys(ta)).filter(function (r, i, all) { return all.indexOf(r) === i; }).sort().forEach(function (ref) {
      ['po_value', 'actual_cost', 'invoiced', 'expenses'].forEach(function (f) {
        var x = (tb[ref] || {})[f] || 0, y = (ta[ref] || {})[f] || 0;
        if (Math.abs(y - x) >= 0.005) { out.kpis.push({ ref: ref, field: f, before: x, after: y, delta: round2(y - x) }); out.changes++; }
      });
    });
    return out;
  }

  CFE.store.datasetTotals = totals;
  CFE.store.buildDataset = buildDataset;
  CFE.store.diffDatasets = diffDatasets;
})(CFE);
