// Funding of resource plans (Resources tab → versions): how far the budget left today stretches
// over a plan's remaining working days, and how much more money the plan needs.

const normTeam = (t) => (t || "").replace(/\s+/g, "");

// Cost of each working day after asOf for the resources of these teams, in the model currency,
// as [["2025-11-17", cost], ...] in date order. Each rule runs to its own end date: work planned
// past a PO's validity is exactly what needs extra funding, so it is not cut off there.
function planDailyCosts(resources, model, teams, asOf) {
  const inView = new Set(teams);
  const firstDay = new Date(new Date(asOf).getTime() + 86400000);
  const daily = {};
  resources.forEach((r) => {
    const team = normTeam(r.po_team);
    if (!inView.has(team) || !r.bill_rate || !r.alloc) return;
    const cost = model.toBase(r.bill_rate * r.alloc * 8, model.teamCurrency[team]);
    const end = new Date(r.end);
    let d = new Date(Math.max(new Date(r.start), firstDay));
    if (isNaN(d) || isNaN(end)) return;
    while (d <= end) {
      if (isWorkingDay(d, r.location)) {
        const k = d.toISOString().slice(0, 10);
        daily[k] = (daily[k] || 0) + cost;
      }
      d = new Date(d.getTime() + 86400000);
    }
  });
  return Object.entries(daily).sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

// How a plan is funded by `budget` (money left today):
//   cost          cost of all its working days after asOf
//   daysPlanned   working days with work after asOf; daysCovered of them are fully paid for
//   fundedUntil   last fully paid working day; runsOut the first one that is not (null if funded)
//   shortfall     additional amount needed; surplus what is left over at the end
function planCoverage(resources, model, teams, budget, asOf) {
  const days = planDailyCosts(resources, model, teams, asOf);
  const cost = days.reduce((s, [, c]) => s + c, 0);
  let spent = 0,
    covered = 0;
  for (const [, c] of days) {
    if (spent + c > budget + 0.005) break;
    spent += c;
    covered++;
  }
  const round = (v) => Math.round(v * 100) / 100;
  return {
    cost: round(cost),
    budget: round(budget),
    daysPlanned: days.length,
    daysCovered: covered,
    fundedUntil: covered ? days[covered - 1][0] : null,
    runsOut: covered < days.length ? days[covered][0] : null,
    planEnd: days.length ? days[days.length - 1][0] : null,
    shortfall: round(Math.max(0, cost - budget)),
    surplus: round(Math.max(0, budget - cost)),
    days,
  };
}

// Budget left today for one PO_Team: its PO value − actuals − expenses (model currency).
// actuals is null when the loaded actuals can't be split by team.
function teamBudgetLeft(model, team) {
  const cfg = model.cfg;
  const poValue = (cfg.po_details || [])
    .filter((p) => normTeam(p.PO_Team_Identifier) === team)
    .reduce((s, p) => s + model.toBase(p.PO_WO_value, p.PO_Currency_Code), 0);
  const sumActuals = (months) => months.reduce((s, m) => s + (m.actuals || 0), 0);
  let actuals = null;
  if (cfg.actuals_by_project) actuals = sumActuals(computeActualsFromCache(cfg, [team], model.projToTeam, model.money));
  else if (cfg.raw_actuals && cfg.raw_actuals.length)
    actuals = sumActuals(computeActualsMonthly(cfg, [team], model.projToTeam, model.money));
  else if (model.allPoTeams.length === 1) actuals = model.totalActuals; // monthly actuals of the only team
  const expenses = (cfg.expenses || [])
    .filter((e) => normTeam(e.po_team) === team)
    .reduce((s, e) => s + model.toBase(e.amount, e.currency), 0);
  return { poValue, actuals, expenses, left: poValue - (actuals || 0) - expenses };
}

// PO_Teams the dashboard is showing (PO_Team slicer, else every team with a PO in the year filter)
function teamsInView(model) {
  return selectedPoTeams.length ? selectedPoTeams.map(normTeam) : model.allPoTeams;
}
