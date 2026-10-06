// Dataset v1 → the config shape CFE.calc expects (UI-007): the one bridge between a publication and
// the figures leaders see. Registers CFE.store.toCalcInput; needs app/cfe.js.
//
//   var cfg = CFE.store.toCalcInput(dataset, {ref, year, poTeams})
//   CFE.calc.forecast.computeForecast(cfg, poTeams)   // as the legacy app does with its own config
//
// Options: ref (only that project), year (only POs whose validity ends in that year, as the legacy
// year filter), poTeams (only those PO teams; spaces ignored). Without options: everything.
//
// Field mapping (dataset field → legacy config field):
//   purchase_orders
//     po_team_identifier   → PO_Team_Identifier
//     po_number            → PO_WO_Number
//     value                → PO_WO_value
//     currency             → PO_Currency_Code
//     normalized_currency  → Normalized_Currency_Code   (falls back to currency)
//     validity_end         → PO_Validity "MM-YYYY" (parseValidityEnd gives the same last day)
//     start                → WO_StartDate
//     approval_status      → WO_Approval_Status
//     rollover_allowed     → rollover_allowed
//     ref                  → (kept as ref)
//   resource_rules (+ people for the name and employee ID)
//     people.display_name  → name
//     people.employee_id   → empl_id (number)
//     role, location, start, end, bill_rate → same names
//     allocation           → alloc
//     po_team_identifier   → po_team
//     (none)               → hour_mult = 1: only the legacy timesheet costing used it, and actual
//                            costs arrive already costed in actuals (IMP-005)
//   fx_rates      currency → code; effective, rate → same
//   ot_rules      type, effective, multiplier → same
//   expenses      people.display_name → name; date, amount, currency → same; description → desc;
//                 ref → po_team = the project's first PO team (expenses belong to a project)
//   invoices      invoice_id → invoice_number; period_from, period_to, amount, status, paid_date,
//                 notes → same; ref → po_team = the project's first PO team
//   actuals       → actuals_monthly [{month 'Mmm-yy', actuals, actuals_burn}] in month order, summed
//                 over people and hours types; actuals_burn = PO value of the selected POs − running
//                 total. Actuals are per project (ref), not per PO team: with a poTeams filter, a
//                 project's actuals count when any of its teams is selected (cfg.actualsScope = 'ref').
//   raw_actuals   → [] (daily rows are never published)
(function (CFE) {
  'use strict';

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function teamKey(v) { return String(v == null ? '' : v).replace(/\s+/g, ''); }
  function round2(n) { return Math.round(n * 100) / 100; }

  function toCalcInput(dataset, opts) {
    opts = opts || {};
    var ds = dataset || {};
    var teams = opts.poTeams && opts.poTeams.length ? opts.poTeams.map(teamKey) : null;
    var refOk = function (ref) { return !opts.ref || ref === opts.ref; };
    var people = {};
    (ds.people || []).forEach(function (p) { people[p.person_key] = p; });
    var firstTeam = {};
    (ds.references || []).forEach(function (r) { firstTeam[r.ref] = (r.links && r.links.po_team_identifiers || [])[0] || ''; });
    (ds.purchase_orders || []).forEach(function (p) { if (!firstTeam[p.ref]) firstTeam[p.ref] = p.po_team_identifier; });

    var allPos = (ds.purchase_orders || []).filter(function (p) { return refOk(p.ref); });
    var po_details = allPos.filter(function (p) { return !opts.year || +p.validity_end.slice(0, 4) === +opts.year; }).map(function (p) {
      return {
        PO_Team_Identifier: p.po_team_identifier, PO_WO_Number: p.po_number, PO_WO_value: p.value, PO_Currency_Code: p.currency,
        Normalized_Currency_Code: p.normalized_currency || p.currency, PO_Validity: p.validity_end.slice(5, 7) + '-' + p.validity_end.slice(0, 4),
        WO_StartDate: p.start, WO_Approval_Status: p.approval_status, rollover_allowed: !!p.rollover_allowed, ref: p.ref
      };
    });

    var resources = (ds.resource_rules || []).filter(function (r) { return refOk(r.ref); }).map(function (r) {
      var p = people[r.person_key] || {};
      return { name: p.display_name || r.person_key, empl_id: parseInt(p.employee_id, 10) || 0, role: r.role || '', location: r.location,
        start: r.start, end: r.end, bill_rate: r.bill_rate, hour_mult: 1, alloc: r.allocation, po_team: r.po_team_identifier || firstTeam[r.ref] || '', ref: r.ref };
    });

    var expenses = (ds.expenses || []).filter(function (e) { return refOk(e.ref); }).map(function (e) {
      var p = people[e.person_key] || {};
      return { name: p.display_name || '', date: e.date, amount: e.amount, currency: e.currency, desc: e.description || '', po_team: firstTeam[e.ref] || '', ref: e.ref };
    });

    var invoices = (ds.invoices || []).filter(function (i) { return refOk(i.ref); }).map(function (i) {
      return { po_team: firstTeam[i.ref] || '', invoice_number: i.invoice_id, period_from: i.period_from, period_to: i.period_to, amount: i.amount,
        status: i.status, paid_date: i.paid_date || '', notes: i.notes || '', ref: i.ref };
    });

    // Actuals per month for the selected projects (and, with poTeams, projects having a selected team).
    var refTeams = {};
    allPos.forEach(function (p) { (refTeams[p.ref] = refTeams[p.ref] || []).push(teamKey(p.po_team_identifier)); });
    (ds.references || []).forEach(function (r) { ((r.links && r.links.po_team_identifiers) || []).forEach(function (t) { (refTeams[r.ref] = refTeams[r.ref] || []).push(teamKey(t)); }); });
    var byMonth = {};
    (ds.actuals || []).forEach(function (a) {
      if (!refOk(a.ref)) return;
      if (teams && !(refTeams[a.ref] || []).some(function (t) { return teams.indexOf(t) >= 0; })) return;
      byMonth[a.month] = (byMonth[a.month] || 0) + a.cost;
    });
    var poVal = po_details.reduce(function (s, p) { return teams && teams.indexOf(teamKey(p.PO_Team_Identifier)) < 0 ? s : s + p.PO_WO_value; }, 0);
    var cum = 0;
    var actuals_monthly = Object.keys(byMonth).sort().map(function (m) {
      cum += byMonth[m];
      return { month: MONTHS[+m.slice(5, 7) - 1] + '-' + m.slice(2, 4), actuals: round2(byMonth[m]), actuals_burn: round2(poVal - cum) };
    });

    return {
      po_details: po_details, resources: resources,
      fx_rates: (ds.fx_rates || []).map(function (f) { return { code: f.currency, effective: f.effective, rate: f.rate }; }),
      ot_params: (ds.ot_rules || []).map(function (o) { return { type: o.type, effective: o.effective, multiplier: o.multiplier }; }),
      expenses: expenses, invoices: invoices, actuals_monthly: actuals_monthly, raw_actuals: [], actualsScope: 'ref'
    };
  }

  CFE.store.toCalcInput = toCalcInput;
})(CFE);
