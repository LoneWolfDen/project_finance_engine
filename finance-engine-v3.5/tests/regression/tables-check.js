// usage: node tables-check.js <appDir> <port>   (run by ./run.sh)
// Settings → Edit data: saving unchanged tables leaves the config identical; edits through the
// inputs (change, add, delete) are saved; invalid values are blocked; values a date/number input
// can't show are flagged instead of being lost; fields that aren't columns are kept.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const [appDir, port] = process.argv.slice(2);
const json = (f) => JSON.parse(fs.readFileSync(path.join(appDir, f)));

(async () => {
  fs.rmSync(path.join(appDir, "finance_engine.db"), { force: true });
  const srv = spawn("python3", ["server.py"], { cwd: appDir, env: { ...process.env, PORT: port }, stdio: "ignore" });
  process.on("exit", () => srv.kill()); // also when the run fails part-way
  await new Promise((r) => setTimeout(r, 1200));
  const browser = await chromium.launch();
  const failures = [];
  const check = (ok, msg) => (ok ? console.log("  ✓ " + msg) : (failures.push(msg), console.log("  ✗ " + msg)));
  try {
    const page = await browser.newPage();
    await page.clock.setFixedTime(new Date("2025-11-15T10:00:00Z"));
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
    const settle = () => page.evaluate(() => new Promise((r) => setTimeout(r, 450)));
    const pos = json("test_PO_Details.json"); // has Normalized_Currency_RateMultiplier, not a column
    await page.evaluate(
      ([pos, invoices, expenses]) => {
        const cfg = loadWork();
        Object.assign(cfg, { po_details: pos, invoices, expenses });
        saveWork(cfg);
      },
      [pos, json("test_Invoices.json"), json("test_Expenses.json")],
    );
    // open Settings with one table's section open
    const openTable = (key) =>
      page.evaluate((key) => {
        show("config");
        document.getElementById("te_" + key).closest("details").open = true;
      }, key);
    const save = async (key) => {
      const ok = await page.evaluate((key) => saveTableEditor(key), key);
      await settle();
      return ok;
    };
    const section = (key) =>
      page.evaluate((key) => {
        const c = loadWork();
        return JSON.stringify(key === "holidays" ? c.holidays || HOLIDAYS_BY_LOC : c[key]);
      }, key);

    console.log("Saving without changes keeps every section identical:");
    for (const key of ["po_details", "invoices", "expenses", "fx_rates", "ot_params", "holidays"]) {
      const before = await section(key);
      await openTable(key);
      const rows = await page.evaluate((key) => document.querySelectorAll(`#te_${key} tbody tr`).length, key);
      const ok = await save(key);
      check(ok && (await section(key)) === before, `${key}: ${rows} rows, saved unchanged`);
    }

    console.log("Edits through the inputs:");
    const fcBefore = await page.evaluate(() => buildData().fc.totalPOValue);
    await openTable("po_details");
    await page.fill('#te_po_details tbody tr[data-i="0"] [data-f="PO_WO_value"]', "350000");
    check((await page.textContent("#te_status_po_details")).includes("unsaved"), "unsaved changes shown");
    await save("po_details");
    const po0 = await page.evaluate(() => loadWork().po_details[0]);
    check(po0.PO_WO_value === 350000, `PO value changed to ${po0.PO_WO_value}`);
    check(
      po0.Normalized_Currency_RateMultiplier === pos[0].Normalized_Currency_RateMultiplier,
      "field that isn't a column kept",
    );
    check((await page.evaluate(() => buildData().fc.totalPOValue)) === fcBefore + 50000, "PO total +50,000");

    await openTable("invoices");
    await page.evaluate(() => addEditorRow("invoices"));
    const newRow = '#te_invoices tbody tr[data-i="new"]';
    await page.selectOption(`${newRow} [data-f="po_team"]`, "222222_ProjectBeta_GCP");
    await page.fill(`${newRow} [data-f="invoice_number"]`, "INV-NEW-1");
    await page.fill(`${newRow} [data-f="period_from"]`, "2025-10-01");
    await page.fill(`${newRow} [data-f="period_to"]`, "2025-10-31");
    await page.fill(`${newRow} [data-f="amount"]`, "12500.5");
    await page.selectOption(`${newRow} [data-f="status"]`, "Submitted");
    await save("invoices");
    const inv = await page.evaluate(() => loadWork().invoices.find((i) => i.invoice_number === "INV-NEW-1"));
    check(
      JSON.stringify(inv) ===
        JSON.stringify({
          po_team: "222222_ProjectBeta_GCP",
          invoice_number: "INV-NEW-1",
          period_from: "2025-10-01",
          period_to: "2025-10-31",
          amount: 12500.5,
          status: "Submitted",
        }),
      `invoice added: ${JSON.stringify(inv)}`,
    );

    await openTable("expenses");
    const nExp = await page.evaluate(() => loadWork().expenses.length);
    await page.click('#te_expenses tbody tr[data-i="0"] .te-del');
    await save("expenses");
    check((await page.evaluate(() => loadWork().expenses.length)) === nExp - 1, "expense row deleted");

    await openTable("fx_rates");
    const usdRow = await page.evaluate(() =>
      loadWork().fx_rates.findIndex((r) => r.code === "USD" && r.effective === "2025-09-01"),
    );
    await page.fill(`#te_fx_rates tbody tr[data-i="${usdRow}"] [data-f="rate"]`, "1.5");
    await save("fx_rates");
    const norm = await page.evaluate(() => buildData().fc);
    check(
      Math.abs(norm.normPO - norm.totalPOValue * 1.5) < 0.01,
      `FX rate edited: USD PO value ${norm.normPO} = × 1.5`,
    );

    await openTable("holidays");
    await page.evaluate(() => addEditorRow("holidays"));
    await page.fill('#te_holidays tbody tr[data-i="new"] [data-f="location"]', "UK");
    await page.fill('#te_holidays tbody tr[data-i="new"] [data-f="date"]', "2026-01-12");
    await save("holidays");
    check(await page.evaluate(() => loadWork().holidays.UK.includes("2026-01-12")), "holiday added");

    console.log("Invalid values are blocked:");
    const fxBefore = await section("fx_rates");
    await openTable("fx_rates");
    await page.fill('#te_fx_rates tbody tr[data-i="0"] [data-f="code"]', "pounds");
    await page.fill('#te_fx_rates tbody tr[data-i="1"] [data-f="rate"]', "");
    const saved = await page.evaluate(() => saveTableEditor("fx_rates"));
    const shown = await page.evaluate(() => ({
      text: document.getElementById("te_errors_fx_rates").textContent,
      flagged: document.querySelectorAll("#te_fx_rates .te-err").length,
    }));
    check(
      !saved && shown.text.includes("3-letter currency code") && shown.text.includes("required"),
      `errors listed: ${shown.text.slice(0, 120)}…`,
    );
    check(shown.flagged === 2, `${shown.flagged} cells highlighted`);
    check((await section("fx_rates")) === fxBefore, "FX rates unchanged");

    console.log("A value the date input can't show is flagged, not lost:");
    await page.evaluate(() => {
      const c = loadWork();
      c.expenses[0].date = "15/07/2025";
      saveWork(c);
    });
    await openTable("expenses");
    const cell = await page.evaluate(() => {
      const el = document.querySelector('#te_expenses tbody tr[data-i="0"] [data-f="date"]');
      return { type: el.type, value: el.value, flagged: el.classList.contains("te-err") };
    });
    check(cell.type === "text" && cell.value === "15/07/2025" && cell.flagged, `shown as ${JSON.stringify(cell)}`);
    check(!(await page.evaluate(() => saveTableEditor("expenses"))), "save blocked until it is fixed");
    await page.fill('#te_expenses tbody tr[data-i="0"] [data-f="date"]', "2025-07-15");
    await save("expenses");
    check((await page.evaluate(() => loadWork().expenses[0].date)) === "2025-07-15", "fixed value saved");

    check(!errors.length, "no page errors" + (errors.length ? ": " + errors[0] : ""));
  } finally {
    await browser.close();
    srv.kill();
  }
  console.log(failures.length ? `Tables check FAILED (${failures.length})` : "Tables check passed");
  process.exitCode = failures.length ? 1 : 0;
})();
