// usage: node robustness-check.js <appDir> <port>   (run by ./run.sh)
// Data-safety checks: bank-holiday warnings and editable holidays, duplicate resource rules,
// the server refusing writes from other websites, and save history with restore.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const [appDir, port] = process.argv.slice(2);
const TEAM = "600000_Robust_GBP";
const rule = (over) => ({
  name: "Lead",
  empl_id: 1,
  role: "Lead",
  location: "UK",
  projectID: 600000,
  po_team: TEAM,
  start: "2026-01-05",
  end: "2026-01-30",
  bill_rate: 100,
  hour_mult: 8,
  alloc: 1,
  ...over,
});

(async () => {
  fs.rmSync(path.join(appDir, "finance_engine.db"), { force: true });
  const srv = spawn("python3", ["server.py"], { cwd: appDir, env: { ...process.env, PORT: port }, stdio: "ignore" });
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
    const setConfig = (changes) =>
      page.evaluate((changes) => {
        const cfg = loadWork();
        Object.assign(cfg, changes);
        saveWork(cfg);
        render();
      }, changes);
    const banner = () => page.evaluate(() => (document.querySelector("#app .tab > .val-err") || {}).textContent || "");

    console.log("Bank holidays:");
    await setConfig({
      po_details: [
        {
          PO_Team_Identifier: TEAM,
          PO_WO_value: 50000,
          PO_Currency_Code: "GBP",
          Normalized_Currency_Code: "USD",
          PO_Validity_Year: 2027,
          WO_StartDate: "2025-07-01",
          ProjectID: 600000,
        },
      ],
      resources: [rule()],
      expenses: [],
      invoices: [],
      actuals_monthly: [],
      raw_actuals: [],
    });
    await settle();
    // January 2026 has 20 weekdays and one UK bank holiday (1 Jan, before the rule starts): 20 days × £800
    const fc1 = await page.evaluate(() => buildData().fc.total);
    check(fc1 === 16000, `forecast for 5–30 Jan 2026 = 20 working days × £800 = ${fc1}`);
    check((await banner()) === "", "no warning while the rule is within listed holiday years");
    await setConfig({ resources: [rule({ end: "2027-01-29" })] });
    check((await banner()).includes("no UK holidays for 2027"), `2027 work warns: "${(await banner()).slice(0, 80)}…"`);
    await setConfig({ resources: [rule({ location: "Atlantis" })] });
    check((await banner()).includes('location "Atlantis" is not in the list'), "unknown location warns");
    // A holiday added in Settings → Holidays is deducted
    await setConfig({ resources: [rule()] });
    const saved = await page.evaluate(() => {
      show("config");
      const h = JSON.parse(JSON.stringify(HOLIDAYS_BY_LOC));
      h.UK.push("2026-01-12");
      document.getElementById("cfg_holidays").value = JSON.stringify(h);
      doSave("holidays");
      return [...document.querySelectorAll(".toast")].pop().textContent;
    });
    await settle();
    const fc2 = await page.evaluate(() => buildData().fc.total);
    check(
      saved.includes("Saved holidays") && fc2 === 15200,
      `holiday added on 12 Jan 2026 → forecast ${fc2} (one day less)`,
    );
    const bad = await page.evaluate(() => validateData("holidays", { UK: ["12/01/2026"] }));
    check(bad.length === 1 && bad[0].includes("not a yyyy-mm-dd date"), `bad holiday date rejected: ${bad[0]}`);

    console.log("Duplicate resource rules:");
    await setConfig({ resources: [rule(), rule(), rule({ bill_rate: 120 })] });
    const dup = await page.evaluate(() => {
      show("resources");
      return {
        text: [...document.querySelectorAll("#app .val-err")].map((e) => e.textContent).join(" "),
        highlighted: document.querySelectorAll('#app tr[title="Duplicate rule"]').length,
      };
    });
    check(
      dup.text.includes("2 duplicate rule(s)") && dup.highlighted === 3,
      `warning + ${dup.highlighted} rows highlighted`,
    );
    await page.evaluate(() => removeExactDuplicates());
    await settle();
    const left = await page.evaluate(() => loadWork().resources.map((r) => r.bill_rate));
    check(
      JSON.stringify(left) === "[100,120]",
      `exact duplicate removed, differing rule kept: rates ${JSON.stringify(left)}`,
    );

    console.log("Server refuses writes from other websites:");
    const status = await page.evaluate(async () => {
      const post = (headers) => fetch("/api/config", { method: "POST", headers, body: "{}" }).then((r) => r.status);
      return {
        textPlain: await post({ "Content-Type": "text/plain" }),
        json: await post({ "Content-Type": "application/json" }),
      };
    });
    check(status.textPlain === 403, `text/plain POST (what another site can send) → ${status.textPlain}`);
    const evil = await (
      await fetch(`http://localhost:${port}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://evil.example" },
        body: "{}",
      })
    ).status;
    check(evil === 403, `JSON POST from another origin → ${evil}`);
    check(status.json === 200, `JSON POST from the app → ${status.json}`);

    console.log("Saving:");
    // 20 saves in a row: the server must end up with the last one
    const last = await page.evaluate(async () => {
      for (let i = 1; i <= 20; i++) {
        const cfg = loadWork();
        cfg.normalized_currency = "S" + i;
        saveWork(cfg);
      }
      await saveQueue;
      return (await (await fetch("/api/config")).json()).normalized_currency;
    });
    check(last === "S20", `20 quick saves arrive in order (server has ${last})`);
    // Browser storage full: the save must still reach the server
    const quota = await page.evaluate(async () => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        throw new DOMException("full", "QuotaExceededError");
      };
      try {
        const cfg = loadWork();
        cfg.normalized_currency = "GBP";
        saveWork(cfg);
        await saveQueue;
      } finally {
        Storage.prototype.setItem = original;
      }
      return (await (await fetch("/api/config")).json()).normalized_currency;
    });
    check(quota === "GBP", `save reaches the server when browser storage is full (server has ${quota})`);

    console.log("Save history:");
    const names = async () =>
      page.evaluate(() =>
        loadWork()
          .resources.map((r) => r.name)
          .join("+"),
      );
    for (const name of ["Alpha", "Beta", "Gamma"]) await setConfig({ resources: [rule({ name })] });
    await page.evaluate(() => saveQueue);
    const list = await page.evaluate(async () => {
      show("config");
      const d = [...document.querySelectorAll("details")].find((x) => x.textContent.includes("Save history"));
      d.open = true;
      await loadHistory();
      return [...document.querySelectorAll("#tblHistory tbody tr")].map((tr) => tr.cells[2].textContent);
    });
    check(list.length >= 3, `history lists earlier versions (${list.length})`);
    // newest history entry is the version before the current one (Beta)
    const ids = await page.evaluate(async () => (await (await fetch("/api/history")).json()).map((h) => h.id));
    await page.evaluate((id) => restoreHistory(id), ids[0]);
    await settle();
    check((await names()) === "Beta", `restore → working config is the earlier version: ${await names()}`);
    const server = await page.evaluate(async () => (await (await fetch("/api/config")).json()).resources[0].name);
    check(server === "Beta", `server has the restored version: ${server}`);
    const after = await page.evaluate(async () => (await (await fetch("/api/history")).json())[0]);
    await page.evaluate((id) => restoreHistory(id), after.id);
    await settle();
    check((await names()) === "Gamma", "the replaced version is in the history, so the restore can be undone");

    check(!errors.length, "no page errors" + (errors.length ? ": " + errors[0] : ""));
  } finally {
    await browser.close();
    srv.kill();
  }
  console.log(failures.length ? `Robustness check FAILED (${failures.length})` : "Robustness check passed");
  process.exitCode = failures.length ? 1 : 0;
})();
