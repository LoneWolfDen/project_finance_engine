// Regression harness: drives finance-engine-v3.5 in Chromium and dumps a JSON snapshot
// usage: node harness.js <appDir> <port> <out.json>   (normally run via ./run.sh)
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const LIBS = path.join(__dirname, "node_modules");
const XLSX = require(path.join(LIBS, "xlsx"));
const [appDir, port, outFile] = process.argv.slice(2);
const CDN = {
  "chart.umd.min.js": "chart.js/dist/chart.umd.js",
  "chartjs-plugin-datalabels.min.js": "chartjs-plugin-datalabels/dist/chartjs-plugin-datalabels.min.js",
  "xlsx.full.min.js": "xlsx/dist/xlsx.full.min.js",
  "jspdf.umd.min.js": "jspdf/dist/jspdf.umd.min.js",
  "jspdf.plugin.autotable.min.js": "jspdf-autotable/dist/jspdf.plugin.autotable.min.js",
  "pptxgen.bundle.js": "pptxgenjs/dist/pptxgen.bundle.js",
};
const TABS = ["overview","burndown","monthly","po","invoices","resources","utilization","expenses","scenarios","upload","config"];

(async () => {
  // Refuse to run against a server that is already up (it would have stale data)
  const inUse = await fetch(`http://localhost:${port}/api/health`).then(() => true, () => false);
  if (inUse) throw new Error(`port ${port} is already in use; stop that server first`);
  fs.rmSync(path.join(appDir, "finance_engine.db"), { force: true });
  const srv = spawn("python3", ["server.py"], { cwd: appDir, env: { ...process.env, PORT: port }, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 1200));
  const out = { errors: [], snaps: {}, downloads: {} };
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, locale: "en-GB", timezoneId: "UTC" });
  await ctx.route(/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/, (route) => {
    const file = route.request().url().split("/").pop();
    route.fulfill({ path: path.join(LIBS, CDN[file]), contentType: "text/javascript" });
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date("2025-11-15T10:00:00Z"));
  page.on("pageerror", (e) => out.errors.push(e.message));
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? "1234" : undefined));
  // Wait on the page's own timer queue: a timer scheduled now fires after every shorter
  // timer the app already scheduled (e.g. drawCharts at 60ms, re-render at 400ms), however slow the machine.
  const settle = async () => {
    await page.evaluate(() => new Promise((r) => setTimeout(r, 450)));
    await page.waitForLoadState("networkidle");
  };
  await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
  await settle();

  // Chart.js rewrites canvas size attributes in timing-dependent order; keep only the id
  const norm = (html) => html.replace(/<canvas[^>]*?id="([^"]*)"[^>]*>/g, '<canvas id="$1">');
  const snap = async (name, tabs = TABS) => {
    const res = {};
    for (const t of tabs) {
      await page.evaluate((t) => show(t), t);
      await settle();
      res[t] = await page.evaluate(() => ({
        nav: document.getElementById("nav").innerHTML,
        app: document.getElementById("app").innerHTML.replace(/<canvas[^>]*?id="([^"]*)"[^>]*>/g, '<canvas id="$1">'),
        // only charts on the page (a draw timer from an earlier render can leave a detached one)
        charts: Object.values(Chart.instances).filter((c) => c.canvas.isConnected).map((c) => ({
          type: c.config.type,
          labels: c.data.labels,
          datasets: c.data.datasets.map((d) => ({ label: d.label, data: d.data, type: d.type })),
        })),
      }));
    }
    out.snaps[name] = res;
  };
  // An upload writes a report into #uploadPreview, then re-renders the page (which drops it).
  // Record the report with a MutationObserver and wait for that re-render to finish.
  const upload = async (selector, file, key) => {
    await page.evaluate(() => {
      const el = document.getElementById("uploadPreview");
      window.__previewEl = el;
      window.__preview = "";
      new MutationObserver(() => {
        if (el.innerHTML.length > 50) window.__preview = el.innerHTML;
      }).observe(el, { childList: true, subtree: true, characterData: true });
    });
    await page.setInputFiles(selector, path.join(appDir, file));
    await page.waitForFunction(() => window.__preview.length > 50 && !document.contains(window.__previewEl), null, {
      timeout: 10000,
    });
    out.snaps[key] = await page.evaluate(() => window.__preview);
    await page.waitForLoadState("networkidle");
  };
  const download = async (name, fn) => {
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.evaluate(fn)]);
    const p = await dl.path();
    const buf = fs.readFileSync(p);
    let content = buf.length;
    if (name === "excel") {
      const wb = XLSX.read(buf);
      content = Object.fromEntries(wb.SheetNames.map((s) => [s, XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1 })]));
    } else if (name === "config") content = JSON.parse(buf.toString());
    out.downloads[name] = { file: dl.suggestedFilename(), content };
  };
  const step = async (label, fn) => {
    try { await fn(); } catch (e) { out.errors.push(`[harness] ${label}: ${e.message.split("\n")[0]}`); }
  };

  await snap("1_defaults");

  // Upload timesheet + resource rules on the Data & Reports tab
  await step("upload", async () => {
    await page.evaluate(() => show("upload"));
    await upload("input[onchange*=\"'resources'\"]", "test_ResourceRules.csv", "preview_resources");
    await page.evaluate(() => show("upload"));
    await upload("input[onchange*=\"'actuals'\"]", "test_Timesheet.csv", "preview_actuals");
  });
  // Settings: import PO details, invoices, expenses into textareas and save each
  for (const [target, file] of [["po_details","test_PO_Details.json"],["invoices","test_Invoices.json"],["expenses","test_Expenses.json"]]) {
    await step("cfg " + target, async () => {
      await page.evaluate(() => show("config"));
      await page.evaluate((t) => (document.getElementById("cfgImportTarget").value = t), target);
      await page.setInputFiles("#cfgImportFile", fs.existsSync(path.join(__dirname, "fixtures", file)) ? path.join(__dirname, "fixtures", file) : path.join(appDir, file));
      await page.evaluate(() => cfgImportFile());
      // the file is read asynchronously; save only once it is in the textarea
      await page.waitForFunction(() => document.getElementById("cfgImportStatus").textContent.includes("loaded into"), null, {
        timeout: 10000,
      });
      await page.evaluate((t) => doSave(t), target);
      await settle(); // doSave re-renders after 400ms
    });
  }
  await snap("2_uploaded");

  // Filters
  await step("labels", () => page.evaluate(() => { showDataLabels = true; render(); }));
  await settle();
  await step("year", () => page.evaluate(() => setYear("2025")));
  await settle();
  await snap("3_year_labels", ["overview", "burndown", "monthly", "utilization"]);
  await step("slicer", () => page.evaluate(() => { setYear(""); const D = buildData(); togglePoTeam(D.allPoTeams[0], true); }));
  await settle();
  await snap("4_slicer", ["overview", "burndown", "monthly", "po", "invoices", "resources", "utilization", "expenses"]);
  await step("slicer reset", () => page.evaluate(() => { selectAllPO(); showDataLabels = false; render(); }));
  await settle();

  // Sort a table + group toggles
  await step("sort", async () => {
    await page.evaluate(() => show("resources"));
    await page.locator("#app th[data-sort]").first().click();
    out.snaps.sorted = norm(await page.evaluate(() => document.getElementById("app").innerHTML));
  });

  // Resources editing: add row, then save
  await step("res edit", async () => {
    await page.evaluate(() => { show("resources"); addResRow(); saveResTable(); });
    await settle();
  });
  await snap("5_res_added", ["resources", "overview", "utilization"]);

  // Scenarios
  await step("scenario", async () => {
    await page.evaluate(() => show("scenarios"));
    await page.fill("#scenName", "BaseCase");
    await page.evaluate(() => saveScenario());
    await settle();
    await page.evaluate(() => typeof compareScenarios === "function" && compareScenarios());
    await settle();
    out.snaps.scenarios = await page.evaluate(() => document.getElementById("app").innerHTML);
  });

  // Exports
  await step("excel", () => download("excel", () => exportExcel()));
  await step("pdf", () => download("pdf", () => exportPDF()));
  await step("pptx", () => download("pptx", () => exportPPTX()));
  await step("config", () => download("config", () => exportFullConfig()));

  // Chat (smart/local mode)
  await step("chat", async () => {
    await page.evaluate(() => toggleChatPanel());
    for (const q of ["budget", "burn rate", "R1_Lead", "invoices"]) {
      await page.fill("#chatIn", q);
      await page.evaluate(() => sendChat());
      await settle();
    }
    out.snaps.chat = await page.evaluate(() => document.getElementById("chatMsgs").innerHTML);
    // Ollama mode: builds a context string from the model, then calls /api/chat (no Ollama here -> error reply)
    await page.evaluate(() => switchChatMode());
    await page.fill("#chatIn", "summarise the budget");
    await page.evaluate(() => sendChat());
    out.snaps.chatOllama = await page.evaluate(() => document.getElementById("chatMsgs").lastElementChild.outerHTML);
  });

  // Smart Solution Excel parser preview
  await step("solution", async () => {
    await page.evaluate(() => show("upload"));
    await page.setInputFiles("#solutionExcel", path.join(__dirname, "fixtures/solution.xlsx"));
    await page.evaluate(() => parseSolutionExcel());
    await page.waitForFunction(() => document.getElementById("solutionPreview").innerHTML.length > 50, null, {
      timeout: 10000,
    });
    out.snaps.solution = await page.evaluate(() => document.getElementById("solutionPreview").innerHTML);
  });
  await step("factory modal", async () => {
    await page.evaluate(() => promptFactoryReset());
    out.snaps.factoryModal = await page.evaluate(() => document.body.lastElementChild.outerHTML);
    await page.evaluate(() => document.body.lastElementChild.remove());
  });

  // Master save (PIN) + factory reset paths
  await step("master", async () => {
    await page.evaluate(() => promptMasterSave());
    await settle();
    out.snaps.masterModal = await page.evaluate(() => document.body.lastElementChild.outerHTML);
  });

  fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
  console.log(`errors=${out.errors.length} snaps=${Object.keys(out.snaps).length} downloads=${Object.keys(out.downloads).join(",")}`);
  out.errors.forEach((e) => console.log("  ", e));
  await browser.close();
  srv.kill();
})();
