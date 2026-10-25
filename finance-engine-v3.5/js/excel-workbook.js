// Excel workbook: report sheets with native (editable) Excel charts, plus every config section as
// its own sheet so the workbook can be edited in Excel and imported back (Settings → Import workbook).
// The page builds the content; server.py (excel_export.py, openpyxl) writes the .xlsx.

const WORKBOOK_FORMAT = "finance-engine-workbook";
const WORKBOOK_VERSION = 1;

// Config sections stored as one table each (rows = array items, columns = their fields)
const CONFIG_SHEETS = [
  { key: "po_details", sheet: "PO Details" },
  { key: "resources", sheet: "Resources" },
  { key: "invoices", sheet: "Invoices" },
  { key: "expenses", sheet: "Expenses" },
  { key: "fx_rates", sheet: "FX Rates" },
  { key: "ot_params", sheet: "OT Params" },
  { key: "actuals_monthly", sheet: "Monthly Actuals" },
  { key: "raw_actuals", sheet: "Timesheet" },
];
// ...and these with their own layout
const HOLIDAYS_SHEET = "Holidays"; // Location | Date
const VERSIONS_SHEET = "Resource Versions"; // version_id | version_name | version_saved | resource fields
const SETTINGS_SHEET = "Settings"; // Setting | Value (single values such as normalized_currency)
const META_SHEET = "_meta";
// Config keys the import rebuilds instead of reading (derived from the timesheet)
const DERIVED_KEYS = ["actuals_by_project"];

// Columns: every field of every row, in first-seen order
function tableFromObjects(rows) {
  const header = [];
  rows.forEach((r) => Object.keys(r).forEach((k) => header.includes(k) || header.push(k)));
  const cellValue = (v) => (v === undefined || v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);
  return { header, rows: rows.map((r) => header.map((k) => cellValue(r[k]))) };
}

function configSheets(cfg) {
  const sheets = CONFIG_SHEETS.map(({ key, sheet }) => ({ name: sheet, ...tableFromObjects(cfg[key] || []) }));
  const holidays = cfg.holidays || HOLIDAYS_BY_LOC;
  sheets.push({
    name: HOLIDAYS_SHEET,
    header: ["Location", "Date"],
    rows: Object.entries(holidays).flatMap(([loc, days]) => days.map((d) => [loc, d])),
  });
  const versionRows = (cfg.resource_versions || []).flatMap((v) =>
    v.resources.map((r) => ({ version_id: v.id, version_name: v.name, version_saved: v.saved, ...r })),
  );
  sheets.push({ name: VERSIONS_SHEET, ...tableFromObjects(versionRows) });
  const handled = new Set([...CONFIG_SHEETS.map((s) => s.key), "holidays", "resource_versions", ...DERIVED_KEYS]);
  const settings = Object.entries(cfg).filter(([k, v]) => !handled.has(k) && (v === null || typeof v !== "object"));
  sheets.push({ name: SETTINGS_SHEET, header: ["Setting", "Value"], rows: settings });
  return sheets;
}

// Report sheets for the current filters, in the model currency
function reportSheets(model, sel) {
  const sym = moneySymbol;
  const cur = model.fc.currency;
  const sheets = [];
  const filters = [
    "Generated " + new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    "Year: " +
      (selectedYear || "All") +
      " · PO_Teams: " +
      (selectedPoTeams.length ? selectedPoTeams.join(", ") : "All"),
    `Amounts in ${cur}` + (model.fc.normCurrency !== cur ? `; normalised currency ${model.fc.normCurrency}` : ""),
  ];
  if (sel.summary) {
    const pctUsed = model.fc.totalPOValue
      ? Math.round(((model.totalActuals + model.totalExpenses) / model.fc.totalPOValue) * 100) + "%"
      : "—";
    const rows = [
      [`PO Value (${cur})`, model.fc.totalPOValue],
      // normalised PO value only when it is a different currency
      ...(model.fc.normCurrency !== cur
        ? [
            [
              `PO Value (${model.fc.normCurrency})`,
              { value: model.fc.normPO, symbol: currencySymbol(model.fc.normCurrency) },
            ],
          ]
        : []),
      ["Total Forecast", model.fc.total],
      ["Total Actuals", model.totalActuals],
      ["Total Expenses", model.totalExpenses],
      ["Remaining Budget", model.remaining],
      ["Burn Rate/Day", model.fc.rate],
      ["Budget Used", pctUsed],
      ["Forecast Days", String(model.fc.days)],
      ...model.fxWarnings.map((c) => ["Warning", `No FX rate for ${c}`]),
      ...model.holidayWarnings.map((w) => ["Warning", `Bank holidays missing: ${w}`]),
    ];
    sheets.push({
      name: "Summary",
      title: "Project Finance Engine — Report",
      notes: filters,
      header: ["Metric", "Value"],
      rows,
      formats: ["text", "money"],
      widths: [28, 20],
    });
  }
  const months = mergeMonthly(model);
  if (sel.monthly || sel.chart_spend) {
    sheets.push({
      name: "Monthly",
      title: `Forecast vs Actuals by month (${cur})`,
      notes: filters,
      header: ["Month", "Forecast", "Actuals", "Variance", "Forecast Burn", "Actuals Burn"],
      rows: months.map((m) => [
        m.month,
        m.forecast,
        m.actuals,
        m.hasActuals && m.hasForecast ? Math.round((m.actuals - m.forecast) * 100) / 100 : null,
        m.forecast_burn,
        m.actuals_burn,
      ]),
      formats: ["text", "money", "money", "money", "money", "money"],
      charts: sel.chart_spend
        ? [
            {
              type: "bar",
              title: "Monthly: Forecast vs Actuals",
              y_title: cur,
              series: [
                { col: 2, color: "2196F3" },
                { col: 3, color: "4CAF50" },
              ],
              anchor: "H5",
            },
            {
              type: "bar",
              title: "Variance (Actuals − Forecast)",
              y_title: cur,
              series: [{ col: 4, color: "F44336" }],
              anchor: "H30",
            },
          ]
        : [],
    });
  }
  if (sel.chart_burn) {
    const s = burndownSeries(model);
    const burnSheet = (name, conv, code) => ({
      name,
      title: `PO Burndown (${code})`,
      notes: ["Bars: monthly spend (left axis). Lines: PO value available minus cumulative spend (right axis)."],
      header: ["Month", "Forecast Spend", "Actuals Spend", "Forecast Burn", "Actuals Burn", "PO Available"],
      rows: s.allMonths.map((m, i) =>
        [m, s.fcSpend[i], s.actSpend[i], s.fcBurn[i], s.actBurn[i], s.cumPO[i]].map((v, j) => (j ? conv(v) : v)),
      ),
      formats: ["text", "money", "money", "money", "money", "money"],
      symbols: [null, ...Array(5).fill(currencySymbol(code))],
      charts: [
        {
          type: "bar",
          title: `Burndown (${code})`,
          y_title: "Monthly spend",
          y2_title: "PO burn",
          series: [
            { col: 2, color: "90CAF9" },
            { col: 3, color: "A5D6A7" },
            { col: 4, type: "line", secondary: true, color: "2196F3" },
            { col: 5, type: "line", secondary: true, color: "4CAF50" },
            { col: 6, type: "line", secondary: true, color: "F44336", dash: true },
          ],
          anchor: "H4",
          width: 28,
          height: 14,
        },
      ],
    });
    sheets.push(burnSheet("Burndown", (v) => v, cur));
    if (model.fc.normCurrency !== cur) {
      const today = new Date().toISOString().slice(0, 10);
      const norm = (v) =>
        v == null ? null : convertCurrency(v, cur, model.fc.normCurrency, model.cfg.fx_rates, today);
      sheets.push(burnSheet(`Burndown (${model.fc.normCurrency})`, norm, model.fc.normCurrency));
    }
  }
  // Per PO_Team, in the team's own currency
  const teams = teamsInView(model);
  sheets.push({
    name: "PO Teams",
    title: "PO_Team budget status (each in its PO currency)",
    notes: filters,
    header: ["PO_Team", "Currency", "PO Value", "Forecast", "Forecast % of PO", `Budget left today (${cur})`],
    rows: teams.map((team) => {
      const f = computeForecast(model.cfg, [team]);
      const b = teamBudgetLeft(model, team);
      const teamSym = currencySymbol(f.currency);
      return [
        team,
        f.currency,
        { value: f.totalPOValue, symbol: teamSym },
        { value: f.total, symbol: teamSym },
        f.totalPOValue ? f.total / f.totalPOValue : null,
        b.actuals === null ? null : b.left,
      ];
    }),
    formats: ["text", "text", "money", "money", "pct", "money"],
  });
  // Resource versions: funding per plan, and budget left per month (chart)
  const cfg = loadWork();
  const asOf = new Date().toISOString().slice(0, 10);
  const plans = resourcePlans(cfg).map((p) => ({
    ...p,
    cov: planCoverage(p.resources, model, teams, model.remaining, asOf),
  }));
  sheets.push({
    name: "Version Funding",
    title: `Resource plans funded from today (${asOf}): budget left ${sym}${Math.round(model.remaining).toLocaleString("en-GB")}`,
    notes: [
      "Budget left = PO value − actuals − expenses. Cost counts working days after today to each rule's end date.",
    ],
    header: [
      "Plan",
      "Saved",
      "Cost from today",
      "Funded until",
      "Working days covered",
      "Working days planned",
      "Additional needed",
      "Left over",
    ],
    rows: plans.map((p) => [
      p.name,
      p.saved || "",
      p.cov.cost,
      p.cov.runsOut ? p.cov.fundedUntil : p.cov.planEnd ? `${p.cov.planEnd} (plan end)` : "",
      p.cov.daysCovered,
      p.cov.daysPlanned,
      p.cov.shortfall,
      p.cov.surplus,
    ]),
    formats: ["text", "text", "money", "text", "int", "int", "money", "money"],
  });
  const monthKeys = [...new Set(plans.flatMap((p) => p.cov.days.map(([d]) => monthKeyOf(d))))];
  if (monthKeys.length) {
    const lines = plans.map((p) => {
      const byMonth = {};
      p.cov.days.forEach(([d, c]) => (byMonth[monthKeyOf(d)] = (byMonth[monthKeyOf(d)] || 0) + c));
      let left = model.remaining;
      return [Math.round(left), ...monthKeys.map((m) => Math.round((left -= byMonth[m] || 0)))];
    });
    const colors = ["1A1A2E", "2196F3", "E65100", "8E24AA", "26A69A", "C62828", "5C6BC0"];
    sheets.push({
      name: "Version Budget",
      title: "Budget left after each month, per plan (below zero = additional funding needed)",
      header: ["Month", ...plans.map((p) => p.name)],
      rows: ["Today", ...monthKeys].map((m, i) => [m, ...lines.map((l) => l[i])]),
      formats: ["text", ...plans.map(() => "money")],
      charts: [
        {
          type: "line",
          title: "Budget left per plan",
          y_title: cur,
          series: plans.map((p, i) => ({ col: i + 2, type: "line", color: colors[i % colors.length], dash: i > 0 })),
          anchor: "B" + (monthKeys.length + 6),
          width: 26,
          height: 12,
        },
      ],
    });
  }
  if (sel.rollover && model.fc.rolloverByYear && Object.keys(model.fc.rolloverByYear).length) {
    sheets.push({
      name: "PO Rollover",
      title: "Multi-year PO rollover",
      header: ["Year", "PO Value", "Carry-In", "Available", "Forecast Spend", "Unused", "Rollover allowed"],
      rows: Object.entries(model.fc.rolloverByYear)
        .sort((a, b) => a[0] - b[0])
        .map(([yr, d]) => [
          Number(yr),
          d.poValue,
          d.carryIn,
          d.available,
          d.spent,
          d.unused,
          d.rollover_allowed ? "Yes" : "No",
        ]),
      formats: ["text", "money", "money", "money", "money", "money", "text"],
    });
  }
  return sheets;
}

function workbookSpec(model, sel) {
  const cfg = loadWork();
  const readme = {
    name: "README",
    title: "Project Finance Engine workbook",
    notes: [
      "Report sheets (Summary, Monthly, Burndown, PO Teams, Version Funding/Budget, PO Rollover) reflect the filters when exported; their charts are native Excel charts.",
      "Configuration sheets hold the complete working config: " +
        [...CONFIG_SHEETS.map((s) => s.sheet), HOLIDAYS_SHEET, VERSIONS_SHEET, SETTINGS_SHEET].join(", ") +
        ".",
      "Edit the configuration sheets in Excel and import the workbook back via Settings → Import workbook. Keep the column headers; dates as yyyy-mm-dd.",
    ],
    header: [],
    rows: [],
  };
  return {
    currency_symbol: moneySymbol,
    sheets: [
      readme,
      ...reportSheets(model, sel),
      ...configSheets(cfg),
      {
        name: META_SHEET,
        header: ["Key", "Value"],
        rows: [
          ["format", WORKBOOK_FORMAT],
          ["version", WORKBOOK_VERSION],
        ],
        hidden: true,
      },
    ],
  };
}

// Data & Reports / Settings → Excel: full workbook from the server, or the simpler in-browser one
async function exportExcel() {
  const { model, sel } = getExportData();
  try {
    await saveQueue;
    const res = await fetch("/api/export/xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workbookSpec(model, sel)),
    });
    if (!res.ok) throw new Error(((await res.json().catch(() => ({}))).error || res.status) + "");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await res.blob());
    a.download = "Finance_Workbook_" + new Date().toISOString().slice(0, 10) + ".xlsx";
    a.click();
    toast("✓ Excel workbook exported (reports, charts and full configuration)");
  } catch (e) {
    exportExcelBasic();
    toast("⚠️ Exported without charts or configuration: " + e.message, false);
  }
}
