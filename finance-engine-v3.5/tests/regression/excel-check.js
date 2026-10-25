// usage: node excel-check.js <appDir> <port>   (run by ./run.sh; needs python3 with openpyxl)
// Excel workbook: export (sheets, native charts, currency formats), import it back unchanged,
// import edits made in Excel (incl. a real Excel date), block invalid data, and fall back to the
// in-browser workbook when the server can't build one.
const { chromium } = require("playwright");
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const [appDir, port] = process.argv.slice(2);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "excel-check-"));
const python = (code) => {
  const r = spawnSync("python3", ["-c", code], { encoding: "utf8" });
  if (r.status) throw new Error(r.stderr);
  return r.stdout.trim();
};

const TEAMS = [
  { team: "111111_Alpha_GBP", pid: 111111, cur: "GBP", value: 300000, rate: 120 },
  { team: "222222_Beta_INR", pid: 222222, cur: "INR", value: 20000000, rate: 6000 },
  { team: "333333_Gamma_USD", pid: 333333, cur: "USD", value: 400000, rate: 150 },
];
const config = {
  po_details: TEAMS.map((t) => ({
    PO_Team_Identifier: t.team,
    PO_WO_value: t.value,
    PO_Currency_Code: t.cur,
    Normalized_Currency_Code: "USD",
    PO_Validity_Year: 2026,
    WO_StartDate: "2025-07-01",
    WO_Approval_Status: "Approved",
    ProjectID: t.pid,
    rollover_allowed: t.cur === "GBP",
  })),
  resources: TEAMS.map((t, i) => ({
    name: `Lead_${t.cur}`,
    empl_id: 100 + i,
    role: "Lead",
    location: "UK",
    projectID: t.pid,
    po_team: t.team,
    start: "2025-07-01",
    end: "2026-06-30",
    bill_rate: t.rate,
    hour_mult: 8,
    alloc: 1,
  })),
  expenses: [
    {
      name: "Lead_INR",
      date: "2025-08-12",
      amount: 44000,
      currency: "INR",
      desc: "Hotel",
      projectID: 222222,
      po_team: "222222_Beta_INR",
    },
  ],
  invoices: TEAMS.map((t) => ({
    po_team: t.team,
    invoice_number: "INV-" + t.cur,
    period_from: "2025-07-01",
    period_to: "2025-07-31",
    amount: t.value / 10,
    status: "Paid",
    paid_date: "2025-08-15",
    notes: "",
  })),
  actuals_monthly: [],
  normalized_currency: "GBP",
};
const timesheet = config.resources.flatMap((r) =>
  ["07/15/2025", "08/14/2025"].map((d) => ({
    "Empl Name": r.name,
    "Empl ID": r.empl_id,
    "Reported Dt": d,
    "Project ID": r.projectID,
    "Regular Hours": 1,
    "Overtime Hours": 0,
  })),
);

(async () => {
  fs.rmSync(path.join(appDir, "finance_engine.db"), { force: true });
  const srv = spawn("python3", ["server.py"], { cwd: appDir, env: { ...process.env, PORT: port }, stdio: "ignore" });
  process.on("exit", () => srv.kill()); // also when the run fails part-way
  await new Promise((r) => setTimeout(r, 1200));
  const browser = await chromium.launch();
  const failures = [];
  const check = (ok, msg) => (ok ? console.log("  ✓ " + msg) : (failures.push(msg), console.log("  ✗ " + msg)));
  try {
    const page = await (await browser.newContext({ acceptDownloads: true })).newPage();
    await page.clock.setFixedTime(new Date("2025-11-15T10:00:00Z"));
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
    const settle = () => page.evaluate(() => new Promise((r) => setTimeout(r, 450)));
    await page.evaluate(
      ([config, timesheet]) => {
        const cfg = loadWork();
        Object.assign(cfg, config);
        saveWork(cfg);
        aggregateActuals(timesheet);
      },
      [config, timesheet],
    );
    await settle();
    await page.evaluate(() => {
      show("resources");
      document.getElementById("verName").value = "Baseline";
      saveResourceVersion();
    });
    await settle();
    const exportFile = async (file) => {
      await page.evaluate(() => show("upload"));
      const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => exportExcel())]);
      await dl.saveAs(file);
      return dl.suggestedFilename();
    };
    // what a config looks like for comparison: no derived cache, no empty fields
    const comparable = () =>
      page.evaluate(() => {
        const clean = (v) =>
          Array.isArray(v)
            ? v.map(clean)
            : v && typeof v === "object"
              ? Object.fromEntries(
                  Object.entries(v)
                    .filter(([, x]) => x !== null && x !== "" && x !== undefined)
                    .map(([k, x]) => [k, clean(x)]),
                )
              : v;
        const { actuals_by_project, ...cfg } = loadWork();
        cfg.holidays = cfg.holidays || HOLIDAYS_BY_LOC; // no holidays key = the defaults
        cfg.resource_versions = cfg.resource_versions || []; // no versions key = none
        return clean(cfg);
      });
    const figures = () =>
      page.evaluate(() => {
        const m = buildData();
        return { po: m.fc.totalPOValue, fc: m.fc.total, act: m.totalActuals, exp: m.totalExpenses, rem: m.remaining };
      });

    console.log("Export:");
    const wbFile = path.join(tmp, "workbook.xlsx");
    const name = await exportFile(wbFile);
    check(name.startsWith("Finance_Workbook_"), `downloaded ${name}`);
    const info = JSON.parse(
      python(`
import json
from openpyxl import load_workbook
wb = load_workbook(${JSON.stringify(wbFile)})
teams = wb["PO Teams"]
fmt = {r[0].value: r[2].number_format for r in teams.iter_rows(min_row=1) if r[0].value and r[0].value.startswith(("111", "222", "333"))}
print(json.dumps({"sheets": wb.sheetnames, "charts": {ws.title: len(ws._charts) for ws in wb.worksheets if ws._charts},
                  "hidden": [ws.title for ws in wb.worksheets if ws.sheet_state == "hidden"], "formats": fmt}))
`),
    );
    const expected = [
      "Summary",
      "Monthly",
      "Burndown",
      "PO Teams",
      "Version Funding",
      "Version Budget",
      "PO Rollover",
      "PO Details",
      "Resources",
      "Invoices",
      "Expenses",
      "FX Rates",
      "OT Params",
      "Monthly Actuals",
      "Timesheet",
      "Holidays",
      "Resource Versions",
      "Settings",
    ];
    const missing = expected.filter((s) => !info.sheets.includes(s));
    check(!missing.length, `report and config sheets present${missing.length ? " — missing " + missing : ""}`);
    check(
      info.charts.Monthly === 2 && info.charts.Burndown === 1 && info.charts["Version Budget"] === 1,
      `native charts: ${JSON.stringify(info.charts)}`,
    );
    check(JSON.stringify(info.hidden) === '["_meta"]', "format marker sheet hidden");
    check(
      info.formats["222222_Beta_INR"].includes("₹") && info.formats["333333_Gamma_USD"].includes("$"),
      `team PO values in their own currency: ${JSON.stringify(info.formats)}`,
    );

    console.log("Import the same workbook into a fresh app:");
    const original = await comparable();
    const originalFigures = await figures();
    const importFile = async (file) => {
      await page.evaluate(() => show("upload"));
      await page.setInputFiles("#wbImport", file);
      await page.evaluate(() => previewWorkbookImport());
      await page.waitForFunction(() => {
        const t = document.getElementById("wbImportPreview").textContent;
        return t.length > 20 && !t.startsWith("Reading");
      });
      return page.evaluate(() => document.getElementById("wbImportPreview").textContent);
    };
    await page.evaluate(() => {
      saveWork(JSON.parse(JSON.stringify(DEFAULTS)));
      render();
    });
    await settle();
    const preview = await importFile(wbFile);
    check(preview.includes("Apply import"), "preview offers Apply");
    await page.evaluate(() => applyWorkbookImport());
    await settle();
    const roundTrip = await comparable();
    const diff = Object.keys({ ...original, ...roundTrip }).filter(
      (k) => JSON.stringify(original[k]) !== JSON.stringify(roundTrip[k]),
    );
    check(!diff.length, `config identical after export → import${diff.length ? " — differs: " + diff.join(", ") : ""}`);
    const rtFigures = await figures();
    check(
      JSON.stringify(rtFigures) === JSON.stringify(originalFigures),
      `totals identical: ${JSON.stringify(rtFigures)}`,
    );

    console.log("Edits made in Excel:");
    const edited = path.join(tmp, "edited.xlsx");
    python(`
import datetime
from openpyxl import load_workbook
wb = load_workbook(${JSON.stringify(wbFile)})
res = wb["Resources"]; head = [c.value for c in res[1]]
res.cell(row=2, column=head.index("bill_rate") + 1, value=130)          # GBP lead 120 -> 130
hol = wb["Holidays"]; hol.append(["UK", datetime.datetime(2026, 1, 12)])  # typed as a real Excel date
hol.cell(row=hol.max_row, column=2).number_format = "dd/mm/yyyy"
inv = wb["Invoices"]; inv.delete_rows(4)                                   # drop the USD invoice
wb.save(${JSON.stringify(edited)})
`);
    await importFile(edited);
    await page.evaluate(() => applyWorkbookImport());
    await settle();
    const after = await page.evaluate(() => {
      const c = loadWork();
      return {
        rate: c.resources[0].bill_rate,
        holiday: c.holidays.UK.includes("2026-01-12"),
        invoices: c.invoices.map((i) => i.invoice_number),
      };
    });
    check(after.rate === 130, `bill rate edited in Excel: ${after.rate}`);
    check(after.holiday, "holiday typed as an Excel date imported as 2026-01-12");
    check(JSON.stringify(after.invoices) === '["INV-GBP","INV-INR"]', `deleted invoice row: ${after.invoices}`);
    const fcAfter = (await figures()).fc;
    check(
      fcAfter > originalFigures.fc,
      `forecast recalculated with the new rate (${originalFigures.fc.toFixed(0)} → ${fcAfter.toFixed(0)})`,
    );

    console.log("Invalid data is not imported:");
    const broken = path.join(tmp, "broken.xlsx");
    python(`
from openpyxl import load_workbook
wb = load_workbook(${JSON.stringify(wbFile)})
po = wb["PO Details"]; head = [c.value for c in po[1]]
po.cell(row=2, column=head.index("PO_Validity_Year") + 1, value="Dec 2026")
wb.save(${JSON.stringify(broken)})
`);
    const before = await page.evaluate(() => JSON.stringify(loadWork().po_details));
    const brokenPreview = await importFile(broken);
    check(
      brokenPreview.includes("PO_Validity_Year must be a year") && !brokenPreview.includes("Apply import"),
      "preview lists the error and offers no Apply",
    );
    check((await page.evaluate(() => JSON.stringify(loadWork().po_details))) === before, "config unchanged");

    console.log("Round trip with the repo's test files (CSV timesheet, resource rules):");
    await page.evaluate(() => {
      saveWork(JSON.parse(JSON.stringify(DEFAULTS)));
      show("upload");
    });
    for (const [type, file] of [
      ["resources", "test_ResourceRules.csv"],
      ["actuals", "test_Timesheet.csv"],
    ]) {
      await page.evaluate(() => show("upload"));
      await page.setInputFiles(`input[onchange*="'${type}'"]`, path.join(appDir, file));
      await page.waitForFunction(() => (document.getElementById("uploadPreview")?.innerHTML || "").length > 50);
      await settle();
    }
    await page.evaluate(
      ([inv, exp]) => {
        const c = loadWork();
        c.invoices = inv;
        c.expenses = exp;
        saveWork(c);
      },
      [
        JSON.parse(fs.readFileSync(path.join(appDir, "test_Invoices.json"))),
        JSON.parse(fs.readFileSync(path.join(appDir, "test_Expenses.json"))),
      ],
    );
    const real = await comparable();
    const realFigures = await figures();
    const realFile = path.join(tmp, "real.xlsx");
    await exportFile(realFile);
    await page.evaluate(() => {
      saveWork(JSON.parse(JSON.stringify(DEFAULTS)));
      render();
    });
    await importFile(realFile);
    await page.evaluate(() => applyWorkbookImport());
    await settle();
    const realBack = await comparable();
    const realDiff = Object.keys({ ...real, ...realBack }).filter(
      (k) => JSON.stringify(real[k]) !== JSON.stringify(realBack[k]),
    );
    check(
      !realDiff.length,
      `${real.raw_actuals.length} timesheet rows, ${real.resources.length} rules: config identical${realDiff.length ? " — differs: " + realDiff.join(", ") : ""}`,
    );
    check(
      JSON.stringify(await figures()) === JSON.stringify(realFigures),
      `totals identical: ${JSON.stringify(realFigures)}`,
    );

    console.log("Fallback without the server workbook:");
    await page.route("**/api/export/xlsx", (route) =>
      route.fulfill({
        status: 501,
        contentType: "application/json",
        body: JSON.stringify({ error: "needs openpyxl" }),
      }),
    );
    const basic = await exportFile(path.join(tmp, "basic.xlsx"));
    const toast = await page.evaluate(() => [...document.querySelectorAll(".toast")].pop().textContent);
    check(
      basic.startsWith("Finance_Report_") && toast.includes("needs openpyxl"),
      `basic workbook + warning: ${toast}`,
    );
    check(!errors.length, "no page errors" + (errors.length ? ": " + errors[0] : ""));
  } finally {
    await browser.close();
    srv.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(failures.length ? `Excel check FAILED (${failures.length})` : "Excel check passed");
  process.exitCode = failures.length ? 1 : 0;
})();
