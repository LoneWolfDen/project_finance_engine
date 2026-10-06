// Turns a legacy config (a test fixture) into an import draft, as the Publish page would (Node only).
//   const draft = require('./fixture-draft.js').build(CFE, Continuum, cfg)
// Sections go through their mapping profiles; resources are already normalised (as legacyImport does);
// the references crosswalk is generated: one project per PO team ("REF-1", "REF-2", … in team order),
// linked to that team and to the PeopleSoft project IDs the legacy config ties to it.
'use strict';

function build(CFE, Continuum, cfg) {
  const M = CFE.data.mapping;
  const draft = { schema_version: 1, saved_utc: '2026-10-06T00:00:00Z', files: [], records: {} };
  const team = t => String(t || '').replace(/\s+/g, '');
  function file(id) { draft.files.push({ file_id: id, name: id, sheet: null, sha256: 'a'.repeat(64) }); }
  function header(list) { const h = []; list.forEach(o => Object.keys(o).forEach(k => { if (!h.includes(k)) h.push(k); })); return h; }
  function add(id, profileId, list) {
    if (!list || !list.length) return;
    const p = CFE.data.mappings[profileId], r = M.apply(p, header(list), list);
    if (r.errors.length) throw new Error(profileId + ': ' + JSON.stringify(r.errors.slice(0, 3)));
    file(id);
    draft.records[p.entity] = r.records.map((x, i) => Object.assign({}, x, { _file: id, _row: r.recordRows[i] }));
  }
  const teams = [...new Set((cfg.po_details || []).map(p => team(p.PO_Team_Identifier)).concat((cfg.resources || []).map(r => team(r.po_team))).filter(Boolean))].sort();
  const projects = {};
  (cfg.resources || []).forEach(r => { if (r.projectID && r.po_team) projects[r.projectID] = team(r.po_team); });
  (cfg.po_details || []).forEach(p => { if (p.ProjectID && p.PO_Team_Identifier) projects[p.ProjectID] = team(p.PO_Team_Identifier); });
  file('refs');
  draft.records.references = teams.map((t, i) => ({ ref: 'REF-' + (i + 1), name: t, po_team_identifiers: [t],
    peoplesoft_project_ids: Object.keys(projects).filter(p => projects[p] === t), _file: 'refs', _row: i + 2 }));
  add('po', 'po-details-v1', cfg.po_details);
  const parseDate = CFE.calc.dates.parseDate;
  add('ts', 'peoplesoft-timesheet-v1', (cfg.raw_actuals || []).map(row => {
    const iso = parseDate(row['Reported Dt'] || '', 'us');
    if (!iso) return row;
    const p = iso.split('-');
    return Object.assign({}, row, { 'Reported Dt': +p[1] + '/' + +p[2] + '/' + p[0] });
  }));
  add('inv', 'invoices-v1', cfg.invoices);
  add('exp', 'expenses-v1', cfg.expenses);
  add('fx', 'fx-rates-v1', cfg.fx_rates);
  add('ot', 'ot-rules-v1', cfg.ot_params);
  file('rr');
  draft.records.resource_rules = (cfg.resources || []).map((r, i) => ({ employee_name: r.name, employee_id: String(r.empl_id), project_id: r.projectID ? String(r.projectID) : null,
    po_team_identifier: team(r.po_team), role: r.role, location: r.location, start: r.start, end: r.end, bill_rate: r.bill_rate,
    hour_multiplier: r.hour_mult, allocation: r.alloc, _file: 'rr', _row: i + 1 }));
  return draft;
}

module.exports = { build };
