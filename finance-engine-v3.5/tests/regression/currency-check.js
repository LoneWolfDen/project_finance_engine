// usage: node currency-check.js <appDir> <port>   (run by ./run.sh)
// Multi-currency check: three PO teams in GBP, INR and USD with resources, timesheet actuals,
// expenses and invoices in their own currencies. Each team on its own must report in its own
// currency; all teams together must equal the per-team figures converted to the normalised
// currency; and changing the normalised currency must rescale everything by the FX rate.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const [appDir, port] = process.argv.slice(2);

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
  })),
  resources: TEAMS.flatMap((t, i) => [
    {
      name: `Lead_${t.cur}`,
      empl_id: 100 + i * 2,
      role: "Lead",
      location: "UK",
      projectID: t.pid,
      po_team: t.team,
      start: "2025-07-01",
      end: "2026-06-30",
      bill_rate: t.rate,
      hour_mult: 8,
      alloc: 1,
    },
    {
      name: `Dev_${t.cur}`,
      empl_id: 101 + i * 2,
      role: "Dev",
      location: "UK",
      projectID: t.pid,
      po_team: t.team,
      start: "2025-09-01",
      end: "2026-12-31",
      bill_rate: t.rate / 2,
      hour_mult: 8,
      alloc: 0.5,
    },
  ]),
  expenses: [
    {
      name: "Lead_GBP",
      date: "2025-08-10",
      amount: 500,
      currency: "GBP",
      desc: "Travel",
      projectID: 111111,
      po_team: "111111_Alpha_GBP",
    },
    {
      name: "Lead_INR",
      date: "2025-08-12",
      amount: 44000,
      currency: "INR",
      desc: "Hotel",
      projectID: 222222,
      po_team: "222222_Beta_INR",
    },
    {
      name: "Lead_USD",
      date: "2025-09-03",
      amount: 720,
      currency: "USD",
      desc: "Flight",
      projectID: 333333,
      po_team: "333333_Gamma_USD",
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
};
// one day of timesheet per resource per month Jul–Oct 2025
const timesheet = config.resources.flatMap((r) =>
  ["07/15/2025", "08/14/2025", "09/16/2025", "10/15/2025"]
    .filter((d) => new Date(d) >= new Date(r.start))
    .map((d) => ({
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
  try {
    const page = await browser.newPage();
    await page.clock.setFixedTime(new Date("2025-11-15T10:00:00Z"));
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
    const result = await page.evaluate(
      ([config, timesheet, teams]) => {
        const cfg = loadWork();
        Object.assign(cfg, config);
        saveWork(cfg);
        aggregateActuals(timesheet); // costs timesheet rows with the resource rates
        const today = "2025-11-15";
        const fx = loadWork().fx_rates;
        const figures = (m) => ({
          currency: m.fc.currency,
          normCurrency: m.fc.normCurrency,
          poValue: m.fc.totalPOValue,
          forecast: m.fc.total,
          actuals: m.totalActuals,
          expenses: m.totalExpenses,
          remaining: m.remaining,
          normPO: m.fc.normPO,
        });
        const perTeam = teams.map((t) => {
          selectedPoTeams = [t.team];
          return figures(buildData());
        });
        const all = {};
        for (const code of ["GBP", "USD", "INR"]) {
          const c = loadWork();
          c.normalized_currency = code;
          saveWork(c);
          selectedPoTeams = [];
          all[code] = figures(buildData());
          // HTML that must show the right symbol
          show("overview");
          all[code].overviewText = document.getElementById("app").textContent.replace(/\s+/g, " ").slice(0, 400);
          show("invoices");
          all[code].invoicedCard = [...document.querySelectorAll("#app .card")][1].textContent;
          show("burndown");
          all[code].burndownTitle = document.querySelector("#app h2").textContent;
        }
        const expected = (code, key) =>
          perTeam.reduce((s, f) => s + convertCurrency(f[key], f.currency, code, fx, today), 0);
        return {
          perTeam,
          all,
          expected: Object.fromEntries(
            ["GBP", "USD", "INR"].map((code) => [
              code,
              Object.fromEntries(
                ["poValue", "forecast", "actuals", "expenses", "remaining"].map((k) => [k, expected(code, k)]),
              ),
            ]),
          ),
          rate: { GBP: 1, USD: fxRateAsOf(fx, "USD", today), INR: fxRateAsOf(fx, "INR", today) },
        };
      },
      [config, timesheet, TEAMS],
    );
    const close = (a, b) => Math.abs(a - b) <= Math.max(0.05, Math.abs(b) * 1e-9) + 0.01;
    const check = (ok, msg) => (ok ? console.log("  ✓ " + msg) : (failures.push(msg), console.log("  ✗ " + msg)));

    console.log("Each team alone reports in its own currency:");
    result.perTeam.forEach((f, i) =>
      check(
        f.currency === TEAMS[i].cur && f.poValue === TEAMS[i].value,
        `${TEAMS[i].team}: ${f.currency} PO ${f.poValue}, forecast ${f.forecast}, actuals ${f.actuals}, expenses ${f.expenses}`,
      ),
    );
    for (const code of ["GBP", "USD", "INR"]) {
      const a = result.all[code];
      console.log(`All teams, normalised = ${code}:`);
      check(a.currency === code && a.normCurrency === code, `reported in ${a.currency}`);
      for (const k of ["poValue", "forecast", "actuals", "expenses", "remaining"])
        check(
          close(a[k], result.expected[code][k]),
          `${k} ${a[k].toFixed(2)} = sum of converted per-team figures ${result.expected[code][k].toFixed(2)}`,
        );
    }
    console.log("Changing the normalised currency rescales by the FX rate:");
    for (const k of ["poValue", "forecast", "actuals", "expenses"])
      check(
        close(result.all.USD[k], result.all.GBP[k] * result.rate.USD),
        `${k}: USD ${result.all.USD[k].toFixed(2)} = GBP ${result.all.GBP[k].toFixed(2)} × ${result.rate.USD}`,
      );
    console.log("Symbols:");
    check(
      result.all.GBP.overviewText.includes("£") && !result.all.GBP.overviewText.includes("₹"),
      "GBP overview shows £",
    );
    check(result.all.INR.overviewText.includes("Total Actuals₹"), "INR overview shows ₹ totals");
    check(
      result.all.USD.invoicedCard.startsWith("Total Invoiced$"),
      `USD invoices card: ${result.all.USD.invoicedCard}`,
    );
    check(result.all.GBP.burndownTitle.includes("converted to GBP"), `burndown title: ${result.all.GBP.burndownTitle}`);
    check(!errors.length, "no page errors" + (errors.length ? ": " + errors[0] : ""));
  } finally {
    await browser.close();
    srv.kill();
  }
  console.log(failures.length ? `Currency check FAILED (${failures.length})` : "Currency check passed");
  process.exitCode = failures.length ? 1 : 0;
})();
