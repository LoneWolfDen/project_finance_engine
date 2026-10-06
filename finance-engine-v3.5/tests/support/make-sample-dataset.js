// Builds the synthetic sample publication in samples/published/ (STO-003; DATA_AND_STORAGE §3).
//
//   node tests/support/make-sample-dataset.js          // writes the four files
//   require('./make-sample-dataset.js').build()        // → {'manifest.json': text, …} (no writing)
//
// Input: tests/fixtures/legacy-config-basic.json only (synthetic, TST-002). The app modules
// (Continuum.ref/hash/provenance, CFE.calc.*, CFE.data.*) run in a vm context, as in the browser.
// The output is deterministic: fixed times, no randomness, fixed key order. The fixture is hashed
// with line endings normalised to LF, so a Windows checkout gives the same files.
// Refs: O-0000001 = Project Alpha (PO team 111111_ProjectAlpha_AWS);
//       O-0000002 = Projects Beta and Gamma (222222_ProjectBeta_GCP, 333333_ProjectGamma_Azure).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP_DIR = path.resolve(__dirname, '..', '..');
const FIXTURE = 'tests/fixtures/legacy-config-basic.json';
const OUT_DIR = path.join(APP_DIR, 'samples', 'published');
const PUBLISHED_UTC = '2026-10-05T09:00:00Z';
const PUBLICATION_ID = 'sample-2026-10-05';
const MODULES = [
  'app/continuum-core/ref.js', 'app/continuum-core/hash.js', 'app/continuum-core/provenance.js',
  'app/cfe.js', 'app/calc/dates.js', 'app/data/calendars.js', 'app/calc/calendar.js', 'app/calc/fx.js',
  'app/calc/actuals.js', 'app/data/schema.js'
];
const PROJECTS = [
  { ref: 'O-0000001', name: 'Project Alpha (sample)', teams: ['111111_ProjectAlpha_AWS'] },
  { ref: 'O-0000002', name: 'Projects Beta and Gamma (sample)', teams: ['222222_ProjectBeta_GCP', '333333_ProjectGamma_Azure'] }
];

function load() {
  const ctx = vm.createContext({ console });
  ctx.globalThis = ctx;
  for (const m of MODULES) vm.runInContext(fs.readFileSync(path.join(APP_DIR, m), 'utf8'), ctx, { filename: m });
  return { C: ctx.Continuum, CFE: ctx.CFE };
}

const round2 = n => Math.round(n * 100) / 100;
const pad = n => (n < 10 ? '0' : '') + n;

// Legacy PO_Validity "mm-yy" → last day of that month as YYYY-MM-DD.
function validityEnd(v) {
  const m = /^(\d{1,2})-(\d{2}|\d{4})$/.exec(String(v));
  if (!m) throw new Error('Unexpected PO_Validity ' + v);
  const y = m[2].length === 2 ? 2000 + +m[2] : +m[2], mo = +m[1];
  return y + '-' + pad(mo) + '-' + pad(new Date(Date.UTC(y, mo, 0)).getUTCDate());
}

function build() {
  const { C, CFE } = load();
  const text = fs.readFileSync(path.join(APP_DIR, FIXTURE), 'utf8').replace(/\r\n/g, '\n');
  const cfg = JSON.parse(text);
  const sha = C.hash.sha256HexSync(text);
  const refOfTeam = {};
  PROJECTS.forEach(p => p.teams.forEach(t => { refOfTeam[t] = p.ref; }));
  const teamOfProject = {};
  cfg.resources.forEach(r => { teamOfProject[String(r.projectID)] = r.po_team; });
  const sectionRows = ['po_details', 'resources', 'fx_rates', 'ot_params', 'expenses', 'invoices', 'raw_actuals'].reduce((n, k) => n + cfg[k].length, 0);
  const file = C.provenance.fileRecord({
    name: path.basename(FIXTURE), size: Buffer.byteLength(text), sha256: sha,
    sourceSystem: 'Synthetic test fixture (TST-002)', parser: 'json', parserVersion: '1',
    mappingProfile: 'legacy-config', rowsRead: sectionRows, rowsUsed: sectionRows, importedUtc: PUBLISHED_UTC
  });
  const src = (section, i) => Object.assign({}, C.provenance.rowRef(file.file_id, section, i + 1));
  const person = id => 'E' + id;
  const dates = CFE.calc.dates, actuals = CFE.calc.actuals;

  const references = PROJECTS.map(p => ({
    ref: p.ref, name: p.name, client: 'TestCo', status: 'active', opportunity_numbers: [p.ref],
    links: {
      po_team_identifiers: p.teams.slice(),
      peoplesoft_project_ids: [...new Set(cfg.po_details.filter(d => p.teams.includes(d.PO_Team_Identifier)).map(d => String(d.ProjectID)))]
    }
  }));

  const purchase_orders = cfg.po_details.map((d, i) => ({
    po_number: String(d.PO_WO_Number), ref: refOfTeam[d.PO_Team_Identifier], po_team_identifier: d.PO_Team_Identifier,
    value: d.PO_WO_value, currency: d.PO_Currency_Code, normalized_currency: d.Normalized_Currency_Code, start: d.WO_StartDate, validity_end: validityEnd(d.PO_Validity),
    rollover_allowed: !!d.rollover_allowed, approval_status: d.WO_Approval_Status, src: src('po_details', i)
  }));

  // rule_id as CFE.store.buildDataset makes it: person, PO team, start.
  const resource_rules = cfg.resources.map((r, i) => {
    const rule = {
      rule_id: person(r.empl_id) + '@' + r.po_team.replace(/\s+/g, '') + '@' + r.start, ref: refOfTeam[r.po_team], person_key: person(r.empl_id), role: r.role, location: r.location,
      start: r.start, end: r.end, bill_rate: r.bill_rate, currency: 'GBP', rate_unit: 'hour', allocation: r.alloc,
      po_team_identifier: r.po_team, src: src('resources', i)
    };
    return rule;
  });

  const seenPeople = {};
  const people = [];
  cfg.resources.forEach((r, i) => {
    if (seenPeople[r.empl_id]) return;
    seenPeople[r.empl_id] = true;
    people.push({ person_key: person(r.empl_id), display_name: r.name, employee_id: String(r.empl_id), src: src('resources', i) });
  });

  // Actuals: one aggregate per ref, person, month and hours type, costed with the legacy rule
  // (CFE.calc.actuals.rowCost), so the sample matches what the legacy app shows for the same rows.
  const agg = {};
  let latest = '';
  cfg.raw_actuals.forEach(row => {
    const dt = dates.parseDate(row['Reported Dt'], 'us');
    const ref = refOfTeam[teamOfProject[String(row['Project ID'])]];
    if (!dt || !ref) return;
    if (dt > latest) latest = dt;
    [['regular', 'Regular Hours'], ['overtime', 'Overtime Hours']].forEach(([type, col]) => {
      const hours = parseFloat(row[col] || 0);
      if (!hours) return;
      const only = Object.assign({}, row, { 'Regular Hours': type === 'regular' ? hours : 0, 'Overtime Hours': type === 'overtime' ? hours : 0 });
      const cost = actuals.rowCost(cfg, only, dt);
      if (cost === null) return;
      const key = [ref, person(row['Empl ID']), dt.slice(0, 7), type].join('|');
      const a = agg[key] || (agg[key] = { ref, person_key: person(row['Empl ID']), month: dt.slice(0, 7), hours_type: type, hours: 0, cost: 0, currency: 'GBP', src: { files: [file.file_id], rows: 0 } });
      a.hours += hours; a.cost += cost; a.src.rows++;
    });
  });
  const actualsList = Object.keys(agg).sort().map(k => Object.assign(agg[k], { hours: round2(agg[k].hours), cost: round2(agg[k].cost) }));

  const invoices = cfg.invoices.map((v, i) => {
    const rec = { invoice_id: v.invoice_number, ref: refOfTeam[v.po_team], period_from: v.period_from, period_to: v.period_to, amount: v.amount, currency: 'GBP', status: v.status };
    if (v.paid_date) rec.paid_date = v.paid_date;
    if (v.notes) rec.notes = v.notes;
    rec.src = src('invoices', i);
    return rec;
  });

  const expenses = cfg.expenses.map((e, i) => {
    const pk = cfg.resources.find(r => r.name === e.name);
    const rec = { expense_id: 'EX-' + pad(i + 1), ref: refOfTeam[e.po_team] };
    if (pk) rec.person_key = person(pk.empl_id);
    Object.assign(rec, { date: e.date, amount: e.amount, currency: e.currency });
    if (e.desc) rec.description = e.desc;
    rec.src = src('expenses', i);
    return rec;
  });

  const fx_rates = cfg.fx_rates.map((f, i) => ({ currency: f.code, effective: f.effective, rate: f.rate, src: src('fx_rates', i) }));
  const ot_rules = cfg.ot_params.map((o, i) => ({ type: o.type, effective: o.effective, multiplier: o.multiplier, src: src('ot_params', i) }));
  const cal = CFE.data.calendars;
  const calendars = Object.keys(cal.locations).sort().map(loc => ({ location: loc, source: cal.source, valid_years: cal.valid_years.slice(), holidays: cal.locations[loc].slice() }));

  const dataset = {
    schema: 'cfe.dataset', schema_version: 1, data_as_of: latest,
    references, purchase_orders, resource_rules, people, actuals: actualsList, invoices, expenses, fx_rates, ot_rules, calendars
  };
  const canonical = JSON.stringify(dataset);
  const counts = {
    references: references.length, po: purchase_orders.length, resource_rules: resource_rules.length, people: people.length,
    actual_rows_in: cfg.raw_actuals.length, actual_aggregates: actualsList.length, invoices: invoices.length,
    expenses: expenses.length, fx_rates: fx_rates.length, ot_rules: ot_rules.length, calendars: calendars.length
  };
  const manifest = {
    schema: 'cfe.manifest', schema_version: 1, publication_id: PUBLICATION_ID, published_utc: PUBLISHED_UTC,
    publisher: 'Sample data generator', app_version: 'sample-generator 1', dataset_schema_version: 1, data_as_of: latest,
    payload_sha256: C.hash.sha256HexSync(canonical), sources: [Object.assign({}, file)], counts,
    validation: { errors: 0, warnings: [] },
    minimisation: { policy: 'Synthetic sample: fictitious names and amounts; actuals published as monthly aggregates (ADR-016)', person_names: 'included' },
    deployment: { display_name: 'Finance Engine (sample)', reporting_currency: 'GBP' },
    publications: [{ publication_id: PUBLICATION_ID, published_utc: PUBLISHED_UTC, publisher: 'Sample data generator', action: 'publish', counts }],
    sample: true
  };

  const schemaCheck = { dataset: CFE.data.schema.validateDataset(dataset), manifest: CFE.data.schema.validateManifest(manifest) };
  const manifestJson = JSON.stringify(manifest, null, 2) + '\n';
  const datasetJson = JSON.stringify(dataset, null, 2) + '\n';
  return {
    files: {
      'manifest.json': manifestJson,
      'manifest.js': '// SAMPLE DATA – synthetic, not real. Generated by tests/support/make-sample-dataset.js (STO-003).\nwindow.CFE_PUBLISHED_MANIFEST = ' + JSON.stringify(manifest, null, 2) + ';\n',
      'dataset.json': datasetJson,
      'dataset.js': '// SAMPLE DATA – synthetic, not real. Generated by tests/support/make-sample-dataset.js (STO-003).\nwindow.CFE_PUBLISHED_DATASET = ' + JSON.stringify(dataset, null, 2) + ';\n'
    },
    dataset, manifest, schemaCheck
  };
}

module.exports = { build, OUT_DIR };

if (require.main === module) {
  const out = build();
  const bad = out.schemaCheck.dataset.errors.concat(out.schemaCheck.manifest.errors);
  if (bad.length) { console.error('Schema errors:', JSON.stringify(bad, null, 2)); process.exit(1); }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, content] of Object.entries(out.files)) fs.writeFileSync(path.join(OUT_DIR, name), content);
  console.log('Wrote ' + Object.keys(out.files).join(', ') + ' to ' + path.relative(process.cwd(), OUT_DIR));
}
