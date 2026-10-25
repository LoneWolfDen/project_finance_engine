// usage: node versions-check.js <appDir> <port>   (run by ./run.sh)
// Resource versions: save, edit, compare, details, apply, delete, and the funding numbers
// (cost from today, funded until, working days covered, additional needed) checked against
// an independent count of UK working days.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const L = path.join(__dirname, "node_modules");
const CDN = {
  "chart.umd.min.js": "chart.js/dist/chart.umd.js",
  "chartjs-plugin-datalabels.min.js": "chartjs-plugin-datalabels/dist/chartjs-plugin-datalabels.min.js",
  "xlsx.full.min.js": "xlsx/dist/xlsx.full.min.js",
  "jspdf.umd.min.js": "jspdf/dist/jspdf.umd.min.js",
  "jspdf.plugin.autotable.min.js": "jspdf-autotable/dist/jspdf.plugin.autotable.min.js",
  "pptxgen.bundle.js": "pptxgenjs/dist/pptxgen.bundle.js",
};
const [appDir, port] = process.argv.slice(2);
const TODAY = "2025-11-15";
const TEAM = "500000_Plan_GBP";

// Expected numbers, worked out here without the app: UK working days after TODAY up to `end`
const holidaysSrc = fs.readFileSync(path.join(appDir, "data/holidays.js"), "utf8");
const ukHolidays = new Set(
  holidaysSrc
    .slice(holidaysSrc.indexOf("UK:"), holidaysSrc.indexOf("]", holidaysSrc.indexOf("UK:")))
    .match(/\d{4}-\d{2}-\d{2}/g),
);
function workingDays(from, to) {
  const days = [];
  for (let d = new Date(from + "T00:00:00Z"); d <= new Date(to + "T00:00:00Z"); d = new Date(d.getTime() + 86400000)) {
    const iso = d.toISOString().slice(0, 10);
    if (d.getUTCDay() % 6 !== 0 && !ukHolidays.has(iso)) days.push(iso);
  }
  return days;
}
const lead = {
  name: "Lead",
  empl_id: 1,
  role: "Lead",
  location: "UK",
  projectID: 500000,
  po_team: TEAM,
  start: "2025-07-01",
  end: "2026-03-31",
  bill_rate: 100,
  hour_mult: 8,
  alloc: 1,
}; // £800/day
const dev = {
  name: "Dev",
  empl_id: 2,
  role: "Dev",
  location: "UK",
  projectID: 500000,
  po_team: TEAM,
  start: "2026-01-01",
  end: "2026-06-30",
  bill_rate: 50,
  hour_mult: 8,
  alloc: 0.5,
}; // £200/day
const budget = 100000 - 2000 - 500; // PO − actuals − expenses
function expectedCoverage(rules) {
  const daily = {};
  rules.forEach((r) =>
    workingDays(r.start > "2025-11-16" ? r.start : "2025-11-16", r.end).forEach(
      (d) => (daily[d] = (daily[d] || 0) + r.bill_rate * r.alloc * 8),
    ),
  );
  const days = Object.entries(daily).sort();
  const cost = days.reduce((s, [, c]) => s + c, 0);
  let spent = 0,
    covered = 0;
  for (const [, c] of days) {
    if (spent + c > budget) break;
    spent += c;
    covered++;
  }
  return {
    cost,
    daysPlanned: days.length,
    daysCovered: covered,
    fundedUntil: covered ? days[covered - 1][0] : null,
    shortfall: Math.max(0, cost - budget),
    surplus: Math.max(0, budget - cost),
  };
}

(async () => {
  fs.rmSync(path.join(appDir, "finance_engine.db"), { force: true });
  const srv = spawn("python3", ["server.py"], { cwd: appDir, env: { ...process.env, PORT: port }, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 1200));
  const browser = await chromium.launch();
  const failures = [];
  const check = (ok, msg) => (ok ? console.log("  ✓ " + msg) : (failures.push(msg), console.log("  ✗ " + msg)));
  try {
    const page = await browser.newPage();
    await page.clock.setFixedTime(new Date(TODAY + "T10:00:00Z"));
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await page.route(/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/, (route) =>
      route.fulfill({
        path: path.join(L, CDN[route.request().url().split("/").pop()]),
        contentType: "text/javascript",
      }),
    );
    await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
    const settle = () => page.evaluate(() => new Promise((r) => setTimeout(r, 450)));
    // One PO with £2,000 of actuals and £500 of expenses, and one resource
    await page.evaluate(
      ([team, lead]) => {
        const cfg = loadWork();
        cfg.po_details = [
          {
            PO_Team_Identifier: team,
            PO_WO_value: 100000,
            PO_Currency_Code: "GBP",
            Normalized_Currency_Code: "USD",
            PO_Validity_Year: 2026,
            WO_StartDate: "2025-07-01",
            ProjectID: 500000,
          },
        ];
        cfg.resources = [lead];
        cfg.expenses = [
          {
            name: "Lead",
            date: "2025-09-01",
            amount: 500,
            currency: "GBP",
            desc: "Travel",
            projectID: 500000,
            po_team: team,
          },
        ];
        cfg.invoices = [];
        cfg.resource_versions = [];
        delete cfg.raw_actuals;
        delete cfg.actuals_by_project;
        saveWork(cfg);
        aggregateActuals([
          {
            "Empl ID": 1,
            "Reported Dt": "10/01/2025",
            "Project ID": 500000,
            "Regular Hours": 2.5,
            "Overtime Hours": 0,
          },
        ]);
      },
      [TEAM, lead],
    );
    await settle();
    const versionsTable = () =>
      page.evaluate(() => {
        show("resources");
        return [...document.querySelectorAll("#tblVersions tbody tr")].map((tr) =>
          [...tr.cells].map((c) => c.textContent.trim()),
        );
      });
    const money = (n) => "£" + Math.round(n).toLocaleString("en-GB");
    const fmtDay = (iso) =>
      new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const expectRow = (row, rules, label) => {
      const e = expectedCoverage(rules);
      console.log(
        `${label}: expected cost ${money(e.cost)}, ${e.daysCovered} of ${e.daysPlanned} days, funded until ${e.fundedUntil}, needs ${money(e.shortfall)}, left over ${money(e.surplus)}`,
      );
      check(row[4] === money(e.cost), `cost from today ${row[4]}`);
      check(row[6] === `${e.daysCovered} of ${e.daysPlanned}`, `working days covered ${row[6]}`);
      check(
        row[5].startsWith(
          e.shortfall
            ? fmtDay(e.fundedUntil)
            : fmtDay(
                rules
                  .map((r) => r.end)
                  .sort()
                  .pop(),
              ),
        ),
        `funded until ${row[5]}`,
      );
      check(row[7] === (e.shortfall ? money(e.shortfall) : "—"), `additional needed ${row[7]}`);
      check(row[8] === (e.surplus ? money(e.surplus) : "—"), `left over ${row[8]}`);
    };

    let rows = await versionsTable();
    const header = await page.evaluate(
      () => document.querySelector("#tblVersions").closest(".inner").querySelector("p").textContent,
    );
    check(header.includes(`Budget left on 15 Nov 2025: ${money(budget)}`), `budget line: ${header.slice(0, 110)}`);
    expectRow(rows[0], [lead], "Current (lead only)");

    // Save it as a version, add a developer in the working resources, save a second version
    await page.evaluate(() => {
      document.getElementById("verName").value = "Lead only";
      saveResourceVersion();
    });
    await settle();
    await page.evaluate((dev) => {
      const c = loadWork();
      c.resources.push(dev);
      saveWork(c);
      render();
    }, dev);
    await settle();
    await page.evaluate(() => {
      show("resources");
      document.getElementById("verName").value = "Lead + dev";
      saveResourceVersion();
    });
    await settle();
    rows = await versionsTable();
    check(
      rows.length === 3 && rows[1][0] === "Lead only" && rows[2][0] === "Lead + dev",
      `plans listed: ${rows.map((r) => r[0]).join(", ")}`,
    );
    expectRow(rows[1], [lead], "Version 'Lead only'");
    expectRow(rows[2], [lead, dev], "Version 'Lead + dev'");
    expectRow(rows[0], [lead, dev], "Current (lead + dev)");

    // Details: per-team table and the diff against current
    const details = await page.evaluate(() => {
      showVersionDetails(1);
      show("resources");
      const box = [...document.querySelectorAll("#app .box")].find((b) => b.textContent.includes("details"));
      return box ? box.textContent.replace(/\s+/g, " ") : "";
    });
    check(
      details.includes("0 added, 1 removed, 0 changed") && details.includes("➖ Dev"),
      "details of 'Lead only' vs current: dev removed",
    );
    check(details.includes(money(budget)), "per-team budget left shown");
    await settle(); // charts are drawn 60ms after render
    const chart = await page.evaluate(() => {
      const c = Object.values(Chart.instances).find((x) => x.canvas.id === "cVersions" && x.canvas.isConnected);
      return c ? c.data.datasets.map((d) => [d.label, d.data[0], d.data[d.data.length - 1]]) : null;
    });
    check(
      !!chart && chart[0][1] === budget,
      `budget chart starts at budget left: ${JSON.stringify(chart && chart.slice(0, 3))}`,
    );
    check(
      !!chart && chart[0][2] === Math.round(budget - expectedCoverage([lead, dev]).cost),
      "budget chart ends at budget left − plan cost (current)",
    );

    // Apply 'Lead only': current gets auto-saved, resources become the lead only
    await page.evaluate(() => applyResourceVersion(1));
    await settle();
    const afterApply = await page.evaluate(() => ({
      resources: loadWork().resources.map((r) => r.name),
      versions: loadWork().resource_versions.map((v) => v.name),
    }));
    check(
      JSON.stringify(afterApply.resources) === '["Lead"]',
      `apply → working resources ${JSON.stringify(afterApply.resources)}`,
    );
    check(
      afterApply.versions.includes('Before applying "Lead only"'),
      `current auto-saved: ${afterApply.versions.join(" | ")}`,
    );
    rows = await versionsTable();
    expectRow(rows[0], [lead], "Current after apply");
    check(Number(await page.evaluate(() => buildData().fc.total)) > 0, "forecast recalculated");

    // Delete
    await page.evaluate(() => deleteResourceVersion(2));
    await settle();
    rows = await versionsTable();
    check(!rows.some((r) => r[0] === "Lead + dev"), "deleted 'Lead + dev'");

    // Versions persist on the server and are part of the full config export
    const saved = await page.evaluate(async () => (await (await fetch("/api/config")).json()).resource_versions.length);
    check(saved === 2, `versions stored on the server: ${saved}`);
    check(!errors.length, "no page errors" + (errors.length ? ": " + errors[0] : ""));
  } finally {
    await browser.close();
    srv.kill();
  }
  console.log(failures.length ? `Versions check FAILED (${failures.length})` : "Versions check passed");
  process.exitCode = failures.length ? 1 : 0;
})();
