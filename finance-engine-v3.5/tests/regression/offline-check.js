// usage: node offline-check.js <appDir> <port>   (run by ./run.sh)
// Works without internet: every request that isn't to the local server is blocked; all tabs
// render with their charts and every export works, with no page errors.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const [appDir, port] = process.argv.slice(2);

(async () => {
  fs.rmSync(path.join(appDir, "finance_engine.db"), { force: true });
  const srv = spawn("python3", ["server.py"], { cwd: appDir, env: { ...process.env, PORT: port }, stdio: "ignore" });
  process.on("exit", () => srv.kill()); // also when the run fails part-way
  await new Promise((r) => setTimeout(r, 1200));
  const browser = await chromium.launch();
  const failures = [];
  const check = (ok, msg) => (ok ? console.log("  ✓ " + msg) : (failures.push(msg), console.log("  ✗ " + msg)));
  try {
    const ctx = await browser.newContext({ acceptDownloads: true });
    const external = [];
    await ctx.route("**/*", (route) => {
      const host = new URL(route.request().url()).hostname;
      if (host === "localhost" || host === "127.0.0.1") return route.continue();
      external.push(route.request().url());
      return route.abort();
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
    const libs = await page.evaluate(() =>
      ["Chart", "ChartDataLabels", "XLSX", "jspdf", "PptxGenJS"].filter((g) => typeof window[g] === "undefined"),
    );
    check(!libs.length, `libraries loaded from vendor/${libs.length ? " — missing " + libs : ""}`);
    const tabs = await page.evaluate(() => TABS.map((t) => t.id));
    const charted = {};
    for (const t of tabs) {
      await page.evaluate((t) => show(t), t);
      await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
      charted[t] = await page.evaluate(() => Object.values(Chart.instances).filter((c) => c.canvas.isConnected).length);
    }
    check(charted.overview >= 1 && charted.burndown >= 1 && charted.monthly >= 1, `charts drawn: ${JSON.stringify(charted)}`);
    for (const [label, fn] of [
      ["Excel workbook", () => exportExcel()],
      ["PDF", () => exportPDF()],
      ["PowerPoint", () => exportPPTX()],
    ]) {
      const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 20000 }), page.evaluate(fn)]);
      const size = fs.statSync(await dl.path()).size;
      check(size > 1000, `${label} export: ${dl.suggestedFilename()} (${size} bytes)`);
    }
    check(!external.length, `no requests outside localhost${external.length ? ": " + external.slice(0, 3) : ""}`);
    check(!errors.length, "no page errors" + (errors.length ? ": " + errors[0] : ""));
  } finally {
    await browser.close();
    srv.kill();
  }
  console.log(failures.length ? `Offline check FAILED (${failures.length})` : "Offline check passed");
  process.exitCode = failures.length ? 1 : 0;
})();
