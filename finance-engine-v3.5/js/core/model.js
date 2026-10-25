// Year / PO_Team filter state and the model every tab renders from (buildData), plus actuals aggregation.

// Year filter state
let selectedYear = ""; // empty = all years

// ─── SLICER STATE ───────────────────────────────────────────────────────────
let selectedPoTeams = []; // empty = all

// Builds the model every tab renders from, for the current Year and PO_Team filters:
//   cfg            working config limited to the selected year's POs
//   fc             forecast from computeForecast() (totals, burndown, rate, days, ...)
//   actuals        monthly actuals; totalActuals / totalExpenses / remaining are summed from them
//   filteredExpenses, allPoTeams, allYears
//   toBase(amount, code), teamCurrency   money is in fc.currency; toBase converts into it,
//                                        teamCurrency maps PO_Team -> its PO currency
function buildData() {
  const cfg = loadWork();
  // Year filter: filter PO_details by selected year before computing
  const allYears = [
    ...new Set(
      (cfg.po_details || []).map((p) => {
        const e = parseValidityEnd(poValidity(p));
        return e.getFullYear();
      }),
    ),
  ].sort();
  let filteredCfg = cfg;
  if (selectedYear) {
    filteredCfg = JSON.parse(JSON.stringify(cfg));
    filteredCfg.po_details = cfg.po_details.filter((p) => {
      const e = parseValidityEnd(poValidity(p));
      return e.getFullYear() === parseInt(selectedYear);
    });
  }
  const fc = computeForecast(filteredCfg, selectedPoTeams);
  // Convert every amount into fc.currency at today's rates
  const today = new Date().toISOString().slice(0, 10);
  const toBase = (amount, code) => convertCurrency(amount, code || fc.currency, fc.currency, cfg.fx_rates, today);
  const teamCurrency = teamCurrencies(cfg.po_details);
  const money = { toBase, teamCurrency };
  moneySymbol = currencySymbol(fc.currency);
  const normFilter = selectedPoTeams.length ? selectedPoTeams.map((t) => t.replace(/\s+/g, "")) : null;
  const projToTeam = {};
  cfg.resources.forEach((r) => {
    const t = (r.po_team || "").replace(/\s+/g, "");
    if (r.projectID && t) projToTeam[r.projectID] = t;
  });
  (cfg.po_details || []).forEach((p) => {
    const t = (p.PO_Team_Identifier || "").replace(/\s+/g, "");
    if (p.ProjectID && t) projToTeam[p.ProjectID] = t;
  });

  let filteredActuals;
  if (cfg.actuals_by_project) {
    filteredActuals = computeActualsFromCache(cfg, normFilter, projToTeam, money);
  } else if (cfg.raw_actuals && cfg.raw_actuals.length) {
    filteredActuals = computeActualsMonthly(cfg, normFilter, projToTeam, money);
  } else {
    filteredActuals = cfg.actuals_monthly || [];
  }

  const totalActuals = filteredActuals.reduce((s, m) => s + (m.actuals || 0), 0);
  const normFilterExp = selectedPoTeams.length ? selectedPoTeams.map((t) => t.replace(/\s+/g, "")) : null;
  const filteredExpenses = cfg.expenses.filter((e) => {
    const t = (e.po_team || "").replace(/\s+/g, "");
    return normFilterExp ? normFilterExp.includes(t) : true;
  });
  const totalExpenses = filteredExpenses.reduce((s, e) => s + toBase(e.amount, e.currency), 0);
  const fxWarnings = [
    ...new Set([
      ...fc.fxWarnings,
      ...missingFxRates(
        cfg.fx_rates,
        filteredExpenses.map((e) => e.currency),
        today,
      ),
    ]),
  ];
  const fromPO = (filteredCfg.po_details || [])
    .map((p) => (p.PO_Team_Identifier || "").replace(/\s+/g, ""))
    .filter(Boolean);
  const allPoTeams = [...new Set(fromPO)].sort();
  return {
    cfg: filteredCfg,
    fc,
    totalActuals: Math.round(totalActuals * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    remaining: Math.round((fc.totalPOValue - totalActuals - totalExpenses) * 100) / 100,
    allPoTeams,
    actuals: filteredActuals,
    filteredExpenses,
    allYears,
    toBase,
    teamCurrency,
    fxWarnings,
    projToTeam,
    money,
  };
}

// Without `money` amounts stay in each team's PO currency
const SAME_CURRENCY = { toBase: (amount) => amount, teamCurrency: {} };

// Compute actuals from raw timesheet data, filtered by PO_Team; costs are converted with money.toBase
function computeActualsMonthly(cfg, normFilter, projToTeam, money = SAME_CURRENCY) {
  if (!cfg.raw_actuals || !cfg.raw_actuals.length) return cfg.actuals_monthly || [];
  const monthly = {};
  cfg.raw_actuals.forEach((row) => {
    const projId = parseInt(row["Project ID"] || row.project_id || 0);
    const team = projToTeam[projId] || "";
    if (normFilter && !normFilter.includes(team)) return;
    const dtRaw = row["Reported Dt"] || row.reported_dt || "";
    const dt = parseDate(dtRaw, "us");
    if (!dt) return;
    const d = new Date(dt);
    if (isNaN(d.getTime())) return;
    const key = d.toLocaleString("en", { month: "short" }) + "-" + String(d.getFullYear()).slice(2);
    const regHrs = parseFloat(row["Regular Hours"] || 0);
    const otHrs = parseFloat(row["Overtime Hours"] || 0);
    const emplId = parseInt(row["Empl ID"] || 0);
    // Find matching resource rule (effective-dated)
    const rule =
      cfg.resources.find((r) => r.empl_id === emplId && r.start <= dt && r.end >= dt) ||
      cfg.resources.find((r) => r.empl_id === emplId);
    const rate = rule ? rule.bill_rate : 0;
    const hourMult = rule ? rule.hour_mult : 1;
    const poTeam = rule ? (rule.po_team || "").replace(/\s+/g, "") : "";
    const otMult = otMultiplier(cfg.ot_params, poTeam, "Overtime_Hours", dt);
    const cost = money.toBase(regHrs * hourMult * rate + otHrs * hourMult * rate * otMult, money.teamCurrency[poTeam]);
    if (!monthly[key]) monthly[key] = 0;
    monthly[key] += cost;
  });
  const poVal = (cfg.po_details || []).reduce((s, p) => {
    const t = (p.PO_Team_Identifier || "").replace(/\s+/g, "");
    return normFilter && !normFilter.includes(t) ? s : s + money.toBase(p.PO_WO_value, p.PO_Currency_Code);
  }, 0);
  let cum = 0;
  return Object.entries(monthly)
    .sort((a, b) => new Date("1 " + a[0]) - new Date("1 " + b[0]))
    .map(([m, v]) => {
      cum += v;
      return {
        month: m,
        actuals: Math.round(v * 100) / 100,
        forecast: null,
        actuals_burn: Math.round((poVal - cum) * 100) / 100,
        forecast_burn: null,
      };
    });
}

function aggregateActuals(data) {
  const cfg = loadWork();
  cfg.raw_actuals = data;
  // Pre-compute actuals PER PROJECT for fast slicer filtering
  const projToTeam = {};
  cfg.resources.forEach((r) => {
    const t = (r.po_team || "").replace(/\s+/g, "");
    if (r.projectID && t) projToTeam[r.projectID] = t;
  });
  (cfg.po_details || []).forEach((p) => {
    const t = (p.PO_Team_Identifier || "").replace(/\s+/g, "");
    if (p.ProjectID && t) projToTeam[p.ProjectID] = t;
  });

  const byProject = {}; // {projectID: {month: cost}}
  let matched = 0,
    unmatched = 0;
  data.forEach((row) => {
    const dtRaw = row["Reported Dt"] || "";
    const dt = parseDate(dtRaw, "us");
    if (!dt) return;
    const d = new Date(dt);
    if (isNaN(d.getTime())) return;
    const key = d.toLocaleString("en", { month: "short" }) + "-" + String(d.getFullYear()).slice(2);
    const emplId = parseInt(row["Empl ID"] || 0);
    const projId = parseInt(row["Project ID"] || 0);
    const rule =
      cfg.resources.find((r) => r.empl_id === emplId && r.start <= dt && r.end >= dt) ||
      cfg.resources.find((r) => r.empl_id === emplId);
    if (rule) matched++;
    else {
      unmatched++;
      return;
    }
    const rate = rule.bill_rate;
    const hm = rule.hour_mult;
    const poTeam = (rule.po_team || "").replace(/\s+/g, "");
    const otMult = otMultiplier(cfg.ot_params, poTeam, "Overtime_Hours", dt);
    const reg = parseFloat(row["Regular Hours"] || 0);
    const ot = parseFloat(row["Overtime Hours"] || 0);
    const cost = reg * hm * rate + ot * hm * rate * otMult;
    if (!byProject[projId]) byProject[projId] = {};
    byProject[projId][key] = (byProject[projId][key] || 0) + cost;
  });
  cfg.actuals_by_project = byProject;
  cfg.actuals_monthly = computeActualsFromCache(cfg, null, projToTeam);
  saveWork(cfg);
  toast(
    `✓ ${data.length} rows: ${matched} matched, ${unmatched} unmatched → ${Object.keys(byProject).length} projects`,
  );
  setTimeout(render, 400);
}

// Fast actuals from pre-computed cache (no re-parsing raw data)
function computeActualsFromCache(cfg, normFilter, projToTeam, money = SAME_CURRENCY) {
  const byProject = cfg.actuals_by_project || {};
  const monthly = {};
  Object.entries(byProject).forEach(([projId, months]) => {
    const team = projToTeam[parseInt(projId)] || "";
    if (normFilter && !normFilter.includes(team)) return;
    Object.entries(months).forEach(([m, cost]) => {
      monthly[m] = (monthly[m] || 0) + money.toBase(cost, money.teamCurrency[team]);
    });
  });
  const poVal = (cfg.po_details || []).reduce((s, p) => {
    const t = (p.PO_Team_Identifier || "").replace(/\s+/g, "");
    return normFilter && !normFilter.includes(t) ? s : s + money.toBase(p.PO_WO_value, p.PO_Currency_Code);
  }, 0);
  let cum = 0;
  return Object.entries(monthly)
    .sort((a, b) => new Date("1 " + a[0]) - new Date("1 " + b[0]))
    .map(([m, v]) => {
      cum += v;
      return {
        month: m,
        actuals: Math.round(v * 100) / 100,
        actuals_burn: Math.round((poVal - cum) * 100) / 100,
      };
    });
}

// Symbol of the currency a resource's bill rate is in (its team's PO currency)
function rateSymbol(model, r) {
  return currencySymbol(model.teamCurrency[(r.po_team || "").replace(/\s+/g, "")] || model.fc.currency);
}

// Forecast and actuals side by side for each month ("Jul-25"), in date order.
// A month missing from either side has null values there and hasForecast/hasActuals false.
function mergeMonthly(model) {
  const fcMap = {};
  model.fc.burndown.forEach((m) => (fcMap[m.month] = m));
  const actMap = {};
  model.actuals.forEach((m) => (actMap[m.month] = m));
  const months = [...new Set([...Object.keys(fcMap), ...Object.keys(actMap)])].sort(
    (a, b) => new Date("1 " + a) - new Date("1 " + b),
  );
  return months.map((month) => {
    const fc = fcMap[month],
      ac = actMap[month];
    return {
      month,
      hasForecast: !!fc,
      hasActuals: !!ac,
      forecast: fc ? fc.forecast : null,
      forecast_burn: fc ? fc.forecast_burn : null,
      actuals: ac ? ac.actuals : null,
      actuals_burn: ac ? ac.actuals_burn : null,
    };
  });
}
