// Figures for the Overview, Burndown and Variance views (UI-001). Registers CFE.views.model; needs
// app/cfe.js, CFE.store.toCalcInput, CFE.calc.dates/fx/forecast.
//
//   var D = CFE.views.model.build(dataset, {ref, year, poTeams}, asOf)   // asOf 'YYYY-MM-DD', default today
//
// D holds what the legacy buildData(), rOV(), rBD(), rMo() and drawCharts() computed: the same
// arithmetic, moved here unchanged (known defect C-01 included; FIX-001 handles it). Views only format
// and draw D. NOTE: the KPI, team-card and burndown-series arithmetic lived in the legacy view code,
// not in CFE.calc; it is kept together here so views compute nothing, and should move to app/calc in a
// later SRC item (app/calc may not change in UI-001).
(function (CFE) {
  'use strict';

  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function teamKey(v) { return String(v == null ? '' : v).replace(/\s+/g, ''); }
  function byMonth(a, b) { return new Date('1 ' + a) - new Date('1 ' + b); }

  function build(dataset, filters, asOf) {
    filters = filters || {};
    var toCalc = CFE.require('store.toCalcInput');
    var calc = CFE.require('calc.forecast'), dates = CFE.require('calc.dates'), fx = CFE.require('calc.fx');
    var today = asOf || new Date().toISOString().slice(0, 10);
    var teams = filters.poTeams && filters.poTeams.length ? filters.poTeams : [];
    var normFilter = teams.length ? teams.map(teamKey) : null;

    // buildData(): the year filter applies to POs; actuals and expenses use the unfiltered config.
    var cfg = toCalc(dataset, { ref: filters.ref });
    var filteredCfg = filters.year ? toCalc(dataset, { ref: filters.ref, year: filters.year }) : cfg;
    var allYears = cfg.po_details.map(function (p) { return dates.parseValidityEnd(p.PO_Validity).getFullYear(); })
      .filter(function (y, i, a) { return a.indexOf(y) === i; }).sort();
    var fc = calc.computeForecast(filteredCfg, teams, today);
    var actuals = teams.length ? toCalc(dataset, { ref: filters.ref, poTeams: teams }).actuals_monthly : cfg.actuals_monthly;
    var tAct = actuals.reduce(function (s, m) { return s + (m.actuals || 0); }, 0);
    var filteredExpenses = cfg.expenses.filter(function (e) { return normFilter ? normFilter.indexOf(teamKey(e.po_team)) >= 0 : true; });
    var tExp = filteredExpenses.reduce(function (s, e) { return s + e.amount; }, 0);
    var allPoTeams = filteredCfg.po_details.map(function (p) { return teamKey(p.PO_Team_Identifier); }).filter(Boolean)
      .filter(function (t, i, a) { return a.indexOf(t) === i; }).sort();
    tAct = Math.round(tAct * 100) / 100; tExp = Math.round(tExp * 100) / 100;
    var rem = Math.round((fc.totalPOValue - tAct - tExp) * 100) / 100;

    // rOV(): KPI cards and PO-team cards.
    var kpi = {
      pctUsed: fc.totalPOValue ? Math.round((tAct + tExp) / fc.totalPOValue * 100) : 0,
      fcVsAct: fc.total ? Math.round(tAct / fc.total * 100) : 0,
      daysRem: fc.rate > 0 ? Math.round(rem / fc.rate) : 0,
      risk: rem > 0 ? 'Low' : 'Over Budget'
    };
    var budgets = {};
    filteredCfg.po_details.forEach(function (p) {
      var t = teamKey(p.PO_Team_Identifier);
      if (!budgets[t]) budgets[t] = { po: 0, status: p.WO_Approval_Status || 'Approved' };
      budgets[t].po += p.PO_WO_value;
    });
    var perTeam = calc.forecastPerTeam(filteredCfg);
    var teamCards = Object.keys(budgets).map(function (t) {
      var b = budgets[t], f = perTeam[t] || 0, over = f > b.po, pct = b.po ? Math.round(f / b.po * 100) : 0;
      return { team: t, po: b.po, status: b.status, forecast: f, pct: pct, overBudget: over, level: over ? 'r' : pct > 85 ? 'o' : 'g' };
    });

    // rBD()/rMo(): forecast and actuals merged by month.
    var fcMap = {}, actMap = {};
    fc.burndown.forEach(function (m) { fcMap[m.month] = { forecast: m.forecast, forecast_burn: m.forecast_burn }; });
    actuals.forEach(function (m) { actMap[m.month] = { actuals: m.actuals, actuals_burn: m.actuals_burn }; });
    var months = Object.keys(fcMap).concat(Object.keys(actMap)).filter(function (m, i, a) { return a.indexOf(m) === i; }).sort(byMonth);
    var rows = months.map(function (m) {
      var f = fcMap[m] || {}, a = actMap[m] || {};
      var v = (a.actuals != null && f.forecast != null) ? Math.round((a.actuals - f.forecast) * 100) / 100 : null;
      return { month: m, forecast: f.forecast != null ? f.forecast : null, actuals: a.actuals != null ? a.actuals : null, variance: v,
        forecast_burn: f.forecast_burn != null ? f.forecast_burn : null, actuals_burn: a.actuals_burn != null ? a.actuals_burn : null };
    });

    // drawCharts('burndown'): spend bars, burn lines against the PO value available each month (expenses
    // count as actuals).
    var expByMonth = {};
    filteredExpenses.forEach(function (e) {
      var d = new Date(e.date); if (isNaN(d)) return;
      var key = d.toLocaleString('en', { month: 'short' }) + '-' + String(d.getFullYear()).slice(2);
      expByMonth[key] = (expByMonth[key] || 0) + e.amount;
    });
    var bdMonths = actuals.map(function (m) { return m.month; }).concat(fc.burndown.map(function (m) { return m.month; }))
      .filter(function (m, i, a) { return a.indexOf(m) === i; });
    Object.keys(expByMonth).forEach(function (m) { if (bdMonths.indexOf(m) < 0) bdMonths.push(m); });
    bdMonths.sort(byMonth);
    var cumPO = bdMonths.map(function (mKey) {
      var parts = mKey.split('-'), yr = parseInt('20' + parts[1], 10), monthEnd = new Date(yr, MON.indexOf(parts[0]) + 1, 0), total = 0;
      cfg.po_details.forEach(function (p) {
        if (normFilter && normFilter.indexOf(teamKey(p.PO_Team_Identifier)) < 0) return;
        if (new Date(p.WO_StartDate) <= monthEnd && dates.parseValidityEnd(p.PO_Validity) >= monthEnd) total += p.PO_WO_value;
      });
      return total;
    });
    var cumAct = 0, cumFc = 0;
    var actBurn = bdMonths.map(function (l, i) {
      var m = actuals.filter(function (x) { return x.month === l; })[0], exp = expByMonth[l] || 0;
      if (m && m.actuals) { cumAct += m.actuals + exp; return cumPO[i] - cumAct; }
      if (exp) { cumAct += exp; return cumPO[i] - cumAct; }
      return cumPO[i] ? cumPO[i] - cumAct : null;
    });
    var fcBurn = bdMonths.map(function (l, i) {
      var m = fc.burndown.filter(function (x) { return x.month === l; })[0];
      if (m) { cumFc += m.forecast; return cumPO[i] - cumFc; }
      return cumPO[i] ? cumPO[i] - cumFc : null;
    });
    var fcSpend = bdMonths.map(function (l) { var m = fc.burndown.filter(function (x) { return x.month === l; })[0]; return m ? m.forecast : null; });
    var actSpend = bdMonths.map(function (l) { var m = actuals.filter(function (x) { return x.month === l; })[0]; return m ? m.actuals : null; });

    // Normalised currency (rBD): converted at today's rates.
    var fxF = fx.fxRateAsOf(cfg.fx_rates, fc.currency || 'GBP', today), fxT = fx.fxRateAsOf(cfg.fx_rates, fc.normCurrency || 'USD', today);

    return {
      asOf: today, filters: { ref: filters.ref || null, year: filters.year || null, poTeams: teams.slice() },
      fc: fc, currency: fc.currency || 'GBP', normCurrency: fc.normCurrency || 'USD',
      tAct: tAct, tExp: tExp, rem: rem, allYears: allYears, allPoTeams: allPoTeams, kpi: kpi, teamCards: teamCards,
      actuals: actuals, filteredExpenses: filteredExpenses, rows: rows,
      burndown: { labels: bdMonths, fcSpend: fcSpend, actSpend: actSpend, actBurn: actBurn, fcBurn: fcBurn, cumPO: cumPO },
      fxFrom: fxF, fxTo: fxT, hasActuals: actuals.length > 0
    };
  }

  // Legacy normalisation: rBD tables round to cents, the chart rounds to units.
  function normalise(D, v, units) { return v == null ? null : units ? Math.round(v / D.fxFrom * D.fxTo) : Math.round(v / D.fxFrom * D.fxTo * 100) / 100; }

  CFE.views.model = { build: build, normalise: normalise };
})(CFE);
