// ⚙️ Settings tab: JSON editors per config section, import/export, validation, PIN-protected master save.

const MASTER_PIN = "1234"; // Change this PIN

function renderSettings(model) {
  let html = '<div class="box"><h2>⚙️ Working Config</h2>';
  html +=
    '<p style="font-size:.78rem;color:#666;margin-bottom:.8rem">Edit and save freely — this is your working copy. Use "Restore from Master" to undo experiments.</p>';
  html += '<div style="margin-bottom:1rem;display:flex;gap:.5rem;flex-wrap:wrap">';
  html += '<button class="btn btn-orange" onclick="restoreFromMaster();render()">↩️ Restore from Master</button>';
  html += '<button class="btn btn-blue" onclick="promptMasterSave()">🔒 Save as Master (PIN required)</button>';
  html += '<button class="btn btn-green" onclick="exportFullConfig()">📦 Export Full Config (JSON)</button>';
  html += '<button class="btn btn-green" onclick="exportExcel()">📊 Export Excel</button>';
  html += '<button class="btn btn-red" onclick="exportPDF()">📄 Export PDF</button>';
  html += "</div>";
  // File import helper
  html += '<details class="cfg-section"><summary>📂 Import XLSX/CSV → JSON</summary><div class="inner">';
  html +=
    '<p style="font-size:.75rem;margin-bottom:.5rem">Select a file and target section. The file will be parsed and JSON pasted into the corresponding textarea below.</p>';
  html += '<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">';
  const importTargets = [
    ["po_details", "PO Details"],
    ["resources", "Resources"],
    ["invoices", "Invoices"],
    ["fx_rates", "FX Rates"],
    ["ot_params", "OT Params"],
    ["expenses", "Expenses"],
    ["actuals_monthly", "Monthly Actuals"],
  ];
  html +=
    '<select id="cfgImportTarget" style="padding:4px 8px;font-size:.78rem;border:1px solid #ddd;border-radius:4px">';
  html += importTargets.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  html += "</select>";
  html += '<input type="file" id="cfgImportFile" accept=".xlsx,.csv,.json" style="font-size:.75rem">';
  html += '<button class="btn btn-green" onclick="cfgImportFile()">⬆️ Import</button>';
  html += '</div><div id="cfgImportStatus" style="margin-top:.5rem;font-size:.75rem"></div>';
  html += "</div></details>";
  const sections = [
    { key: "po_details", label: "PO Details", data: model.cfg.po_details },
    {
      key: "resources",
      label: "Resources (" + model.cfg.resources.length + ")",
      data: model.cfg.resources,
      tall: true,
    },
    { key: "invoices", label: "Invoices (" + (model.cfg.invoices || []).length + ")", data: model.cfg.invoices || [] },
    { key: "fx_rates", label: "FX Rates", data: model.cfg.fx_rates },
    { key: "ot_params", label: "OT Params", data: model.cfg.ot_params },
    { key: "expenses", label: "Expenses", data: model.cfg.expenses },
    { key: "actuals_monthly", label: "Monthly Actuals", data: model.cfg.actuals_monthly, tall: true },
  ];
  sections.forEach((s, i) => {
    const textareaStyle = s.tall ? ' style="min-height:350px"' : "";
    html += `<details class="cfg-section"${i === 0 ? " open" : ""}><summary>${s.label}</summary><div class="inner">`;
    html += `<textarea id="cfg_${s.key}"${textareaStyle}>${JSON.stringify(s.data, null, 2)}</textarea>`;
    html += `<button class="btn btn-green" onclick="doSave('${s.key}')">💾 Save ${s.label}</button>`;
    html += "</div></details>";
  });
  html += '<details class="cfg-section"><summary>🔄 Reset</summary><div class="inner">';
  html += '<p style="font-size:.8rem;margin-bottom:.5rem">Reset working config to master data (no PIN needed):</p>';
  html += '<button class="btn btn-orange" onclick="restoreFromMaster();render()">↩️ Restore from Master</button>';
  html += '<p style="font-size:.8rem;margin:1rem 0 .5rem">Reset everything to factory defaults (PIN required):</p>';
  html += '<button class="btn btn-red" onclick="promptFactoryReset()">⚠️ Factory Reset</button>';
  html += "</div></details>";
  html += '<details class="cfg-section" style="margin-top:1.5rem;border:1px solid #c5cae9">';
  html += '<summary style="background:#e8eaf6;font-size:.9rem">📖 README — Definitions & Logic</summary>';
  html += '<div class="inner" style="font-size:.75rem;line-height:1.6;color:#333">';
  html += '<h3 style="font-size:.85rem;margin-bottom:.5rem">Core Concepts</h3>';
  html += '<table style="font-size:.72rem;margin-bottom:1rem"><tbody>';
  const glossary = [
    [
      "PO_Team",
      "Unique identifier linking a Project to a Purchase Order. Format: <code>ProjectID_Client_Identifier</code>",
    ],
    ["PO_Validity", 'End month of PO validity in <code>mm-yy</code> format (e.g. "12-25" = Dec 2025)'],
    ["Rollover", "When <code>rollover_allowed=true</code>, unused budget from one PO year carries forward to the next"],
    ["Bill Rate", "Hourly rate for a resource in PO currency"],
    ["Hour Mult", "Hours multiplier per timesheet entry. Use 8 for day-rate resources, 1 for hourly"],
    ["Alloc", "Allocation percentage (0-1). 0.5 = 50% allocated to this PO_Team"],
  ];
  glossary.forEach(([term, definition]) => {
    html += `<tr><td style="font-weight:600;padding:3px 12px 3px 0">${term}</td><td>${definition}</td></tr>`;
  });
  html += "</tbody></table>";
  html += '<h3 style="font-size:.85rem;margin-bottom:.5rem">Forecast Calculation</h3>';
  html +=
    "<p><code>Daily Cost = Bill_Rate × Allocation × 8hrs</code> for each working day (excludes weekends + bank holidays by location).</p>";
  html += "<p>Forecast is bounded by the PO validity end date — resources are not forecast beyond PO expiry.</p>";
  html += '<h3 style="font-size:.85rem;margin:.8rem 0 .5rem">Actuals Calculation</h3>';
  html +=
    "<p><code>Cost = (Regular_Hours × Hour_Mult × Bill_Rate) + (OT_Hours × Hour_Mult × Bill_Rate × OT_Multiplier)</code></p>";
  html +=
    "<p>Resource rules are matched by <code>Empl_ID</code> + effective date range. OT multipliers are effective-dated.</p>";
  html += '<h3 style="font-size:.85rem;margin:.8rem 0 .5rem">Filters</h3>';
  html +=
    "<p><strong>Year</strong> (primary): Filters PO_Details by validity end year → defines which PO_Teams are visible.<br>";
  html += "<strong>PO_Team</strong> (secondary): Further filters within the year-selected teams.</p>";
  html += '<h3 style="font-size:.85rem;margin:.8rem 0 .5rem">FX Rates</h3>';
  html +=
    "<p>Effective-dated: the latest rate on or before the reference date is used. Normalized values convert from PO currency to a common reporting currency.</p>";
  html += '<h3 style="font-size:.85rem;margin:.8rem 0 .5rem">Data Flow</h3>';
  html +=
    "<p>Upload → Working Config (editable) → Save as Master (PIN-protected backup). Restore from Master to undo changes.</p>";
  html +=
    '<p style="margin-top:1rem;color:#888;font-style:italic">🐺 Built by Vamsi Yedlapalli | <a href="https://github.com/LoneWolfDen" style="color:#5c6bc0">github.com/LoneWolfDen</a></p>';
  html += "</div></details>";
  html += "</div>";
  return html;
}

function doSave(key) {
  const raw = document.getElementById("cfg_" + key).value;
  let val;
  try {
    val = JSON.parse(raw);
  } catch (e) {
    toast("✗ Invalid JSON: " + e.message, false);
    return;
  }
  const errs = validateData(key, val);
  if (errs.length) {
    toast("✗ Validation failed — see errors below", false);
    document
      .getElementById("cfg_" + key)
      .insertAdjacentHTML(
        "afterend",
        '<div class="val-err"><strong>⚠️ Validation Errors:</strong><ul>' +
          errs.map((e) => "<li>" + e + "</li>").join("") +
          "</ul></div>",
      );
    return;
  }
  // Clear previous errors
  const prev = document.getElementById("cfg_" + key).parentElement.querySelector(".val-err");
  if (prev) prev.remove();
  const cfg = loadWork();
  cfg[key] = val;
  saveWork(cfg);
  toast("✓ Saved " + key);
  setTimeout(render, 400);
}

function exportFullConfig() {
  const cfg = loadWork();
  const exportData = {
    po_details: cfg.po_details,
    resources: cfg.resources,
    fx_rates: cfg.fx_rates,
    ot_params: cfg.ot_params,
    expenses: cfg.expenses,
    invoices: cfg.invoices || [],
    actuals_monthly: cfg.actuals_monthly,
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "finance_config_" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  toast("✓ Config exported as JSON");
}

function importFullConfig() {
  const file = document.getElementById("fullCfgImport").files[0];
  const status = document.getElementById("fullCfgStatus");
  if (!file) {
    status.innerHTML = '<span style="color:#c62828">⚠️ Please select a JSON file first.</span>';
    return;
  }
  file.text().then((t) => {
    let data;
    try {
      data = JSON.parse(t);
    } catch (e) {
      status.innerHTML = '<span style="color:#c62828">❌ Invalid JSON: ' + e.message + "</span>";
      return;
    }
    if (typeof data !== "object" || Array.isArray(data)) {
      status.innerHTML =
        '<span style="color:#c62828">❌ File must be a JSON object with sections (po_details, resources, etc.)</span>';
      return;
    }
    const cfg = loadWork();
    const keys = ["po_details", "resources", "fx_rates", "ot_params", "expenses", "invoices", "actuals_monthly"];
    const existing = [];
    keys.forEach((k) => {
      if (data[k] && Array.isArray(data[k]) && cfg[k] && cfg[k].length)
        existing.push(k + " (" + cfg[k].length + " rows)");
    });
    if (
      existing.length &&
      !confirm("⚠️ This will OVERWRITE existing data in:\n\n• " + existing.join("\n• ") + "\n\nContinue?")
    )
      return;
    const loaded = [];
    keys.forEach((k) => {
      if (data[k] && Array.isArray(data[k])) {
        cfg[k] = data[k];
        loaded.push(k + " (" + data[k].length + ")");
      }
    });
    if (!loaded.length) {
      status.innerHTML =
        '<span style="color:#c62828">❌ No recognized sections found. Expected: ' + keys.join(", ") + "</span>";
      return;
    }
    saveWork(cfg);
    status.innerHTML = '<span style="color:#2e7d32">✅ Imported: ' + loaded.join(", ") + ". Dashboard updated!</span>";
    toast("✓ Full config imported — " + loaded.length + " sections loaded");
    setTimeout(render, 500);
  });
}

function cfgImportFile() {
  const file = document.getElementById("cfgImportFile").files[0];
  const target = document.getElementById("cfgImportTarget").value;
  const status = document.getElementById("cfgImportStatus");
  if (!file) {
    status.innerHTML = '<span style="color:#c62828">Select a file first</span>';
    return;
  }
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "json") {
    file.text().then((t) => {
      try {
        const d = JSON.parse(t);
        const ta = document.getElementById("cfg_" + target);
        if (ta) {
          ta.value = JSON.stringify(d, null, 2);
          status.innerHTML = `<span style="color:#2e7d32">✅ ${Array.isArray(d) ? d.length + " rows" : "object"} loaded into ${target}. Click Save to apply.</span>`;
        } else {
          status.innerHTML = '<span style="color:#c62828">Open the "' + target + '" section first</span>';
        }
      } catch (e) {
        status.innerHTML = '<span style="color:#c62828">Invalid JSON: ' + e.message + "</span>";
      }
    });
  } else if (ext === "csv") {
    file.text().then((t) => {
      const lines = t.trim().split("\n");
      const headers = lines[0].split(",").map((html) => html.trim().replace(/"/g, ""));
      const data = lines
        .slice(1)
        .filter((l) => l.trim())
        .map((line) => {
          const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
          const obj = {};
          headers.forEach((html, i) => {
            const v = vals[i] || "";
            obj[html] = isNaN(v) || v === "" ? v : Number(v);
          });
          return obj;
        });
      const ta = document.getElementById("cfg_" + target);
      if (ta) {
        ta.value = JSON.stringify(data, null, 2);
        status.innerHTML = `<span style="color:#2e7d32">✅ ${data.length} rows from CSV loaded into ${target}. Click Save to apply.</span>`;
      } else {
        status.innerHTML = '<span style="color:#c62828">Open the "' + target + '" section first</span>';
      }
    });
  } else if (ext === "xlsx" || ext === "xls") {
    file.arrayBuffer().then((buf) => {
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      const ta = document.getElementById("cfg_" + target);
      if (ta) {
        ta.value = JSON.stringify(data, null, 2);
        status.innerHTML = `<span style="color:#2e7d32">✅ ${data.length} rows from sheet "${wb.SheetNames[0]}" loaded into ${target}. Click Save to apply.</span>`;
      } else {
        status.innerHTML = '<span style="color:#c62828">Open the "' + target + '" section first</span>';
      }
    });
  } else {
    status.innerHTML = '<span style="color:#c62828">Unsupported file type: .' + ext + "</span>";
  }
}

function validateData(key, data) {
  const errs = [];
  if (!Array.isArray(data)) {
    errs.push("Data must be a JSON array");
    return errs;
  }
  if (key === "po_details") {
    const req = ["PO_Team_Identifier", "PO_WO_value", "PO_Currency_Code", "PO_Validity", "WO_StartDate"];
    data.forEach((p, i) => {
      req.forEach((f) => {
        if (!p[f] && p[f] !== 0) errs.push(`Row ${i + 1}: missing required field "${f}"`);
      });
      if (p.PO_WO_value && (typeof p.PO_WO_value !== "number" || p.PO_WO_value <= 0))
        errs.push(`Row ${i + 1}: PO_WO_value must be a positive number`);
      if (p.PO_Validity && !/^\d{1,2}-\d{2,4}$/.test(String(p.PO_Validity)))
        errs.push(`Row ${i + 1}: PO_Validity must be mm-yy format (e.g. "12-25")`);
      if (p.WO_StartDate && !/^\d{4}-\d{2}-\d{2}$/.test(p.WO_StartDate))
        errs.push(`Row ${i + 1}: WO_StartDate must be yyyy-mm-dd`);
      if (p.rollover_allowed !== undefined && typeof p.rollover_allowed !== "boolean")
        errs.push(`Row ${i + 1}: rollover_allowed must be true/false`);
    });
  } else if (key === "resources") {
    data.forEach((r, i) => {
      if (!r.name && !r["Empl Name"]) errs.push(`Row ${i + 1}: missing name`);
      if (!r.po_team && !r.PO_Team_Identifier) errs.push(`Row ${i + 1}: missing po_team`);
      if (!r.start && !r.RateEffectiveDt) errs.push(`Row ${i + 1}: missing start date`);
      if (!r.end && !r.ContractEndDt) errs.push(`Row ${i + 1}: missing end date`);
      if (r.bill_rate !== undefined && isNaN(parseFloat(r.bill_rate)))
        errs.push(`Row ${i + 1}: bill_rate must be a number`);
      if (r.alloc !== undefined && (parseFloat(r.alloc) < 0 || parseFloat(r.alloc) > 1))
        errs.push(`Row ${i + 1}: alloc must be 0-1`);
    });
  } else if (key === "invoices") {
    data.forEach((inv, i) => {
      if (!inv.po_team) errs.push(`Row ${i + 1}: missing po_team`);
      if (!inv.invoice_number) errs.push(`Row ${i + 1}: missing invoice_number`);
      if (!inv.amount || typeof inv.amount !== "number") errs.push(`Row ${i + 1}: amount must be a number`);
      if (!inv.period_from || !/^\d{4}-\d{2}-\d{2}$/.test(inv.period_from))
        errs.push(`Row ${i + 1}: period_from must be yyyy-mm-dd`);
      if (!inv.period_to || !/^\d{4}-\d{2}-\d{2}$/.test(inv.period_to))
        errs.push(`Row ${i + 1}: period_to must be yyyy-mm-dd`);
      if (inv.status && !["Paid", "Submitted", "Draft"].includes(inv.status))
        errs.push(`Row ${i + 1}: status must be Paid/Submitted/Draft`);
    });
  } else if (key === "fx_rates") {
    data.forEach((r, i) => {
      if (!r.code) errs.push(`Row ${i + 1}: missing currency code`);
      if (!r.effective || !/^\d{4}-\d{2}-\d{2}$/.test(r.effective))
        errs.push(`Row ${i + 1}: effective must be yyyy-mm-dd`);
      if (r.rate === undefined || typeof r.rate !== "number") errs.push(`Row ${i + 1}: rate must be a number`);
    });
  } else if (key === "expenses") {
    data.forEach((e, i) => {
      if (!e.name) errs.push(`Row ${i + 1}: missing name`);
      if (!e.date || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) errs.push(`Row ${i + 1}: date must be yyyy-mm-dd`);
      if (e.amount === undefined || typeof e.amount !== "number") errs.push(`Row ${i + 1}: amount must be a number`);
    });
  }
  return errs;
}

// PIN prompt modal; the confirm button calls checkPin(action).
function showPinModal({ title, message, action, confirmLabel, confirmCls, cancelCls }) {
  const d = document.createElement("div");
  d.className = "modal-bg";
  d.innerHTML =
    `<div class="modal"><h3>${title}</h3>` +
    `<p style="font-size:.82rem;margin-bottom:.8rem">${message}</p>` +
    '<input type="password" id="pinInput" placeholder="Enter PIN" maxlength="10">' +
    `<div><button class="btn ${confirmCls}" onclick="checkPin('${action}')">${confirmLabel}</button>` +
    `<button class="btn ${cancelCls}" onclick="this.closest('.modal-bg').remove()">Cancel</button></div>` +
    "</div>";
  document.body.appendChild(d);
  d.querySelector("input").focus();
}

function promptMasterSave() {
  showPinModal({
    title: "🔒 Save as Master",
    message: "This overwrites the master config. Enter PIN:",
    action: "save",
    confirmLabel: "Confirm",
    confirmCls: "btn-green",
    cancelCls: "btn-red",
  });
}

function promptFactoryReset() {
  showPinModal({
    title: "⚠️ Factory Reset",
    message: "This resets BOTH master and working config to defaults. Enter PIN:",
    action: "reset",
    confirmLabel: "Reset All",
    confirmCls: "btn-red",
    cancelCls: "btn-blue",
  });
}

function deduplicateActuals(cfg) {
  if (!cfg.raw_actuals || !cfg.raw_actuals.length) return cfg;
  const seen = new Map();
  cfg.raw_actuals.forEach((row) => {
    const key = `${row["Empl ID"] || ""}|${row["Reported Dt"] || ""}|${row["Project ID"] || ""}`;
    seen.set(key, row); // last wins
  });
  const before = cfg.raw_actuals.length;
  cfg.raw_actuals = [...seen.values()];
  const removed = before - cfg.raw_actuals.length;
  if (removed > 0) console.log(`Dedup: removed ${removed} duplicate actuals (${before}→${cfg.raw_actuals.length})`);
  return { cfg, removed };
}

function checkPin(action) {
  const pin = document.getElementById("pinInput").value;
  document.querySelector(".modal-bg").remove();
  if (pin !== MASTER_PIN) {
    toast("✗ Incorrect PIN", false);
    return;
  }
  if (action === "save") {
    const cfg = loadWork();
    const { removed } = deduplicateActuals(cfg);
    saveWork(cfg); // save deduped back to working too
    saveMaster(cfg);
    toast("✓ Master saved!" + (removed ? ` (${removed} duplicates removed)` : ""));
    if (removed) setTimeout(render, 400);
  }
  if (action === "reset") {
    localStorage.removeItem(K_WORK);
    localStorage.removeItem(K_MASTER);
    toast("✓ Factory reset complete!");
    setTimeout(render, 400);
  }
}
