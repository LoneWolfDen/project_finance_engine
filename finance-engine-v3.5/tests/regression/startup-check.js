// usage: node startup-check.js <appDir> <port>   (run by ./run.sh)
// Startup chart check: server has test POs and doubled actuals, browser cache has the defaults.
// After load the visible Overview chart must match a fresh render of the server data.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const app = process.argv[2],
  port = process.argv[3];
fs.rmSync(app + "/finance_engine.db", { force: true });
(async () => {
  const srv = spawn("python3", ["server.py"], { cwd: app, env: { ...process.env, PORT: port }, stdio: "ignore" });
  process.on("exit", () => srv.kill()); // also when the run fails part-way
  await new Promise((r) => setTimeout(r, 1200));
  const b = await chromium.launch();
  try {
    const chartData = () =>
      Object.values(Chart.instances)
        .filter((c) => c.canvas.isConnected)
        .map((c) => JSON.stringify(c.data.datasets.map((d) => d.data)));
    let fails = 0;
    for (let run = 0; run < 5; run++) {
      const ctx = await b.newContext();
      const p = await ctx.newPage();
      const errs = [];
      p.on("pageerror", (e) => errs.push(e.message));
      // put the test POs on the server
      await p.goto(`http://localhost:${port}`, { waitUntil: "networkidle" });
      await p.evaluate(
        async (pos) => {
          const cfg = loadWork();
          cfg.po_details = pos;
          cfg.actuals_monthly = cfg.actuals_monthly.map((m) => ({ ...m, actuals: m.actuals * 2 })); // visibly different
          await fetch("/api/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cfg),
          });
          localStorage.clear(); // the browser cache keeps only defaults
        },
        JSON.parse(fs.readFileSync(app + "/test_PO_Details.json")),
      );
      await p.reload({ waitUntil: "networkidle" });
      await p.evaluate(() => new Promise((r) => setTimeout(r, 500)));
      const shown = await p.evaluate(chartData);
      await p.evaluate(() => render());
      await p.evaluate(() => new Promise((r) => setTimeout(r, 500)));
      const fresh = await p.evaluate(chartData);
      const ok = JSON.stringify(shown) === JSON.stringify(fresh) && !errs.length;
      if (!ok) fails++;
      console.log(
        `run ${run + 1}: chart matches server data: ${JSON.stringify(shown) === JSON.stringify(fresh)}, page errors: ${errs.length ? errs[0].slice(0, 60) : 0}`,
      );
      await ctx.close();
    }
    console.log(
      fails ? `Startup check FAILED (${fails}/5)` : "Startup check passed: charts show server data after load",
    );
    process.exitCode = fails ? 1 : 0;
  } finally {
    await b.close();
    srv.kill();
  }
})();
