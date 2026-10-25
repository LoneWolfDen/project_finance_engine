// Forecast engine: PO validity dates, working days and bank holidays, FX rates, OT multipliers, resource rules.

// A PO's validity: PO_Validity_Year, which is a year (2025 → valid to 31 Dec) or a month
// ("06-26" / "06-2026" → valid to the end of that month). Older data used PO_Validity.
function poValidity(po) {
  return po.PO_Validity_Year || po.PO_Validity;
}

// Dates are handled as UTC midnight ("2025-11-17" → new Date("2025-11-17")), so weekdays and
// months must be read in UTC too; local time would shift them a day west of UTC.
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "2025-12-01" or a UTC-midnight Date → "Dec-25"
function monthKeyOf(date) {
  const iso = typeof date === "string" ? date : date.toISOString();
  return MONTH_NAMES[parseInt(iso.slice(5, 7)) - 1] + "-" + iso.slice(2, 4);
}

// Parse a validity value (see poValidity) → end date (UTC)
function parseValidityEnd(v) {
  if (!v) return new Date("2025-12-31");
  const s = String(v).trim();
  if (/^\d{4}$/.test(s)) return new Date(Date.UTC(parseInt(s), 11, 31)); // year → 31 Dec
  const parts = s.split("-");
  if (parts.length === 2) {
    let mm = parseInt(parts[0]),
      yy = parts[1];
    if (yy.length === 2) yy = "20" + yy;
    const yr = parseInt(yy);
    return new Date(Date.UTC(yr, mm, 0)); // last day of month mm in year yr
  }
  return new Date("2025-12-31");
}

// Format validity for display
function fmtValidity(v) {
  return v || "—";
}

// ─── FORECAST ENGINE ────────────────────────────────────────────────────────
const HOLIDAY_SETS = {};

Object.entries(HOLIDAYS_BY_LOC).forEach(([k, v]) => {
  HOLIDAY_SETS[k] = new Set(v);
});

function isWorkingDay(d, location) {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  const hols = HOLIDAY_SETS[location || "UK"] || HOLIDAY_SETS["UK"];
  return !hols.has(d.toISOString().slice(0, 10));
}

// ─── CURRENCY ───────────────────────────────────────────────────────────────
// fx_rates hold "units of this currency per 1 GBP" (GBP 1, USD 1.36, INR 88), effective-dated.

const CURRENCY_SYMBOLS = { GBP: "£", USD: "$", EUR: "€", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$", SGD: "S$" };
function currencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || (code ? code + " " : "");
}

// Converts with the rates effective on asOfDate
function convertCurrency(amount, from, to, fxRates, asOfDate) {
  if (amount == null || !from || !to || from === to) return amount;
  return (amount / fxRateAsOf(fxRates, from, asOfDate)) * fxRateAsOf(fxRates, to, asOfDate);
}

// Codes with no rate effective on asOfDate (fxRateAsOf would silently use 1)
function missingFxRates(fxRates, codes, asOfDate) {
  return [...new Set(codes.filter(Boolean))].filter(
    (code) => !fxRates.some((r) => r.code === code && r.effective <= asOfDate),
  );
}

// PO currency per PO_Team (first PO of the team wins)
function teamCurrencies(poDetails) {
  const map = {};
  (poDetails || []).forEach((p) => {
    const t = (p.PO_Team_Identifier || "").replace(/\s+/g, "");
    if (!map[t] && p.PO_Currency_Code) map[t] = p.PO_Currency_Code;
  });
  return map;
}

// The currencies the dashboard reports in:
//   normCurrency  the normalised currency: cfg.normalized_currency (chosen in the nav bar),
//                 else the first PO's Normalized_Currency_Code, else USD
//   currency      the selected POs' own currency when they all share one, else normCurrency
function resolveCurrencies(cfg, poList) {
  const normCurrency = cfg.normalized_currency || (poList[0] && poList[0].Normalized_Currency_Code) || "USD";
  const poCurrencies = [...new Set(poList.map((p) => p.PO_Currency_Code).filter(Boolean))];
  const currency = poCurrencies.length === 1 ? poCurrencies[0] : poCurrencies.length ? normCurrency : "GBP";
  return { currency, normCurrency, poCurrencies };
}

// Effective-dated FX lookup: latest rate on or before asOfDate
function fxRateAsOf(fxRates, code, asOfDate) {
  let best = null,
    bestDt = "";
  fxRates.forEach((r) => {
    if (r.code === code && r.effective <= asOfDate && r.effective > bestDt) {
      best = r.rate;
      bestDt = r.effective;
    }
  });
  return best || 1;
}

// Effective-dated rate lookup for a resource: find the rule where start<=date<=end
function findResourceRule(resources, emplId, poTeam, asOfDate) {
  // Find the rule with latest start date that is <= asOfDate and end >= asOfDate
  let best = null;
  resources.forEach((r) => {
    if (r.empl_id === emplId && (r.po_team || "") === (poTeam || "") && r.start <= asOfDate && r.end >= asOfDate) {
      if (!best || r.start > best.start) best = r;
    }
  });
  return best;
}

// OT multiplier lookup
function otMultiplier(otParams, poTeam, otType, asOfDate) {
  let best = null,
    bestDt = "";
  otParams.forEach((r) => {
    if (r.type === otType && r.effective <= asOfDate && r.effective > bestDt) {
      best = r.multiplier;
      bestDt = r.effective;
    }
  });
  return best || 1;
}

// Parse date: handles dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd, m/d/yyyy
// format hint: 'uk'=dd/mm/yyyy, 'us'=mm/dd/yyyy, auto=detect
function parseDate(s, format) {
  if (!s) return "";
  s = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); // already ISO
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    let a = parseInt(parts[0]),
      b = parseInt(parts[1]),
      y = parts[2];
    if (y.length === 2) y = "20" + y;
    if (y.length === 4) {
      if (format === "uk") return `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
      if (format === "us") return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
      // Auto-detect: if first part > 12, it must be day (dd/mm)
      if (a > 12) return `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
      // If second part > 12, first must be month (mm/dd)
      if (b > 12) return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
      // Ambiguous: default to US (m/d/yyyy) since timesheets are larger dataset
      return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    }
  }
  const d = new Date(s);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}

function computeForecast(cfg, filterPoTeams) {
  const poArr = cfg.po_details;
  const poByTeam = {};
  poArr.forEach((po) => {
    const key = (po.PO_Team_Identifier || "").replace(/\s+/g, "");
    const endDt = parseValidityEnd(poValidity(po));
    if (!poByTeam[key])
      poByTeam[key] = {
        PO_WO_value: 0,
        maxEnd: new Date(0),
        WO_StartDate: "9999-12-31",
        PO_Currency_Code: po.PO_Currency_Code,
        Normalized_Currency_Code: po.Normalized_Currency_Code,
        WO_Approval_Status: po.WO_Approval_Status,
        PO_Team_Identifier: key,
        pos: [],
        rollover_allowed: false,
      };
    poByTeam[key].PO_WO_value += po.PO_WO_value;
    if (endDt > poByTeam[key].maxEnd) poByTeam[key].maxEnd = endDt;
    if (po.WO_StartDate < poByTeam[key].WO_StartDate) poByTeam[key].WO_StartDate = po.WO_StartDate;
    if (po.rollover_allowed) poByTeam[key].rollover_allowed = true;
    poByTeam[key].pos.push(po);
  });

  const normFilter = filterPoTeams && filterPoTeams.length ? filterPoTeams.map((t) => t.replace(/\s+/g, "")) : null;
  const activeTeams = normFilter || Object.keys(poByTeam);
  const activePOs = activeTeams.map((t) => poByTeam[t]).filter(Boolean);

  // All amounts below are in `currency`, converted at today's rates (see resolveCurrencies)
  const today = new Date().toISOString().slice(0, 10);
  const activePOList = activePOs.flatMap((team) => team.pos);
  const { currency, normCurrency, poCurrencies } = resolveCurrencies(cfg, activePOList);
  const toBase = (amount, from) => convertCurrency(amount, from || currency, currency, cfg.fx_rates, today);
  const fxWarnings = missingFxRates(cfg.fx_rates, [...poCurrencies, normCurrency], today);

  const totalPOValue = activePOs.reduce(
    (s, team) => s + team.pos.reduce((a, po) => a + toBase(po.PO_WO_value, po.PO_Currency_Code), 0),
    0,
  );
  const maxEnd = activePOs.reduce((m, p) => (p.maxEnd > m ? p.maxEnd : m), new Date(0));
  const earliestStart = activePOs.reduce(
    (m, p) => (p.WO_StartDate && p.WO_StartDate < m ? p.WO_StartDate : m),
    "9999-12-31",
  );
  const firstPO = activePOs[0] || {};

  const poStart = new Date(earliestStart !== "9999-12-31" ? earliestStart : "2025-01-01");
  const poEnd = maxEnd > new Date(0) ? maxEnd : new Date("2025-12-31");
  const daily = {};
  const STD_HOURS = 8;

  const resources = cfg.resources.filter((r) => {
    const rTeam = (r.po_team || "").replace(/\s+/g, "");
    return normFilter ? normFilter.includes(rTeam) : true;
  });

  resources.forEach((r) => {
    if (!r.bill_rate) return;
    const rTeam = (r.po_team || "").replace(/\s+/g, "");
    const teamPO = poByTeam[rTeam];
    const teamEnd = teamPO ? teamPO.maxEnd : poEnd;
    const rStart = new Date(Math.max(new Date(r.start), poStart));
    const rEnd = new Date(Math.min(new Date(r.end), teamEnd));
    if (rStart > rEnd || isNaN(rStart.getTime()) || isNaN(rEnd.getTime())) return;
    // bill rates are in the team's PO currency
    const dailyCost = toBase(r.bill_rate * r.alloc * STD_HOURS, teamPO ? teamPO.PO_Currency_Code : currency);
    let d = new Date(rStart);
    while (d <= rEnd) {
      if (isWorkingDay(d, r.location)) {
        const k = d.toISOString().slice(0, 10);
        daily[k] = (daily[k] || 0) + dailyCost;
      }
      d = new Date(d.getTime() + 86400000);
    }
  });

  const monthly = {};
  Object.entries(daily)
    .sort()
    .forEach(([d, c]) => {
      const key = monthKeyOf(d);
      monthly[key] = (monthly[key] || 0) + c;
    });

  let remFc = totalPOValue;
  const burndown = Object.entries(monthly).map(([m, c]) => {
    remFc -= c;
    return { month: m, forecast: Math.round(c * 100) / 100, forecast_burn: Math.round(remFc * 100) / 100 };
  });
  const total = Object.values(monthly).reduce((a, b) => a + b, 0);
  const days = Object.keys(daily).length;

  const normPO = convertCurrency(totalPOValue, currency, normCurrency, cfg.fx_rates, today);

  // Multi-year PO rollover (only for POs with rollover_allowed=true)
  // Group POs by validity end year
  const posByYear = {};
  activePOs.forEach((team) => {
    team.pos.forEach((po) => {
      if (normFilter && !normFilter.includes((po.PO_Team_Identifier || "").replace(/\s+/g, ""))) return;
      const endDt = parseValidityEnd(poValidity(po));
      const yr = endDt.getUTCFullYear();
      if (!posByYear[yr]) posByYear[yr] = [];
      posByYear[yr].push(po);
    });
  });
  const spendByYear = {};
  Object.entries(daily).forEach(([d, c]) => {
    const yr = parseInt(d.slice(0, 4));
    spendByYear[yr] = (spendByYear[yr] || 0) + c;
  });
  const years = Object.keys(posByYear).map(Number).sort();
  const rolloverByYear = {};
  let carryForward = 0;
  years.forEach((yr) => {
    const yrPOs = posByYear[yr];
    const yrPOValue = yrPOs.reduce((s, p) => s + toBase(p.PO_WO_value, p.PO_Currency_Code), 0);
    const available = yrPOValue + carryForward;
    const spent = spendByYear[yr] || 0;
    const unused = Math.max(0, available - spent);
    const anyRollover = yrPOs.some((p) => p.rollover_allowed);
    rolloverByYear[yr] = {
      poValue: yrPOValue,
      carryIn: carryForward,
      available,
      spent: Math.round(spent * 100) / 100,
      unused: Math.round(unused * 100) / 100,
      rollover_allowed: anyRollover,
    };
    // Only carry forward if rollover is allowed for this year's POs
    carryForward = anyRollover ? unused : 0;
  });

  return {
    monthly,
    burndown,
    total: Math.round(total * 100) / 100,
    days,
    rate: days ? Math.round((total / days) * 100) / 100 : 0,
    normPO: Math.round(normPO * 100) / 100,
    totalPOValue,
    currency,
    normCurrency,
    poCurrencies,
    fxWarnings,
    status: firstPO.WO_Approval_Status || "Approved",
    rolloverByYear,
    posByYear,
  };
}
