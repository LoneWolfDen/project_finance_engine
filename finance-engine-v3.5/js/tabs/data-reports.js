// 📤 Data & Reports tab: export buttons, file uploads (timesheets, resource rules), Smart Parser.

function renderActualsSummary(model) {
  const cfg = model.cfg;
  const fullCfg = loadWork();
  const rawCount = fullCfg.raw_actuals ? fullCfg.raw_actuals.length : 0;
  const normFilter = selectedPoTeams.length ? selectedPoTeams.map((t) => t.replace(/\s+/g, "")) : null;
  const validTeamsAct = new Set((cfg.po_details || []).map((p) => (p.PO_Team_Identifier || "").replace(/\s+/g, "")));
  const projToTeam = {};
  (fullCfg.resources || []).forEach((r) => {
    const t = (r.po_team || "").replace(/\s+/g, "");
    if (r.projectID && t) projToTeam[r.projectID] = t;
  });
  (fullCfg.po_details || []).forEach((p) => {
    const t = (p.PO_Team_Identifier || "").replace(/\s+/g, "");
    if (p.ProjectID && t) projToTeam[p.ProjectID] = t;
  });
  const filtered = (fullCfg.raw_actuals || []).filter((row) => {
    const projId = parseInt(row["Project ID"] || 0);
    const team = projToTeam[projId] || "";
    if (!validTeamsAct.has(team)) return false;
    return normFilter ? normFilter.includes(team) : true;
  });
  const isMatched = (row) => cfg.resources.some((res) => res.empl_id === parseInt(row["Empl ID"] || 0));
  const matchedCount = filtered.filter(isMatched).length;
  let html = '<div class="cards">';
  html += statCard("b", "Total Raw Rows", rawCount.toLocaleString());
  html += statCard("g", "Filtered Rows", filtered.length.toLocaleString());
  html += statCard("o", "Matched to Resources", matchedCount.toLocaleString());
  html += statCard("r", "Unmatched", (filtered.length - matchedCount).toLocaleString());
  html += "</div>";
  if (filtered.length) {
    const cols = ["Name", "Empl ID", "Date", "Project", "Reg Hrs", "OT Hrs"];
    html += `<div class="tw" style="margin-top:.5rem"><table>${tableHead(cols)}<tbody>`;
    filtered.slice(0, 10).forEach((row) => {
      html += tableRow([
        row["Empl Name"] || "",
        row["Empl ID"] || "",
        row["Reported Dt"] || "",
        row["Project ID"] || "",
        row["Regular Hours"] || 0,
        row["Overtime Hours"] || 0,
      ]);
    });
    html += "</tbody></table></div>";
    if (filtered.length > 10)
      html += `<p style="font-size:.7rem;color:#888;margin-top:.3rem">Showing 10 of ${filtered.length} rows</p>`;
  } else {
    html += '<p style="font-size:.75rem;color:#888">No actuals data loaded yet.</p>';
  }
  return html;
}

// ─── FILE UPLOAD TAB ────────────────────────────────────────────────────────
// Opens one upload panel; the caller closes it with "</div></div>".
function uploadSection(background, title) {
  const summaryStyle = `padding:.6rem 1rem;background:${background};font-weight:600;font-size:.85rem`;
  return `<div class="cfg-section"><summary style="${summaryStyle}">${title}</summary><div class="inner">`;
}

function renderDataAndReports(model) {
  let html = "";
  // ── EXPORT REPORTS (collapsible) ──
  html += '<div class="box" style="margin-bottom:1rem">';
  html += collapsibleHeader("📥 Export Reports");
  html += '<div class="collapsible-body">';
  html +=
    '<p style="font-size:.78rem;color:#666;margin-bottom:.8rem">Select sections to include, then export in your preferred format.</p>';
  html +=
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:4px;margin-bottom:.8rem;font-size:.75rem">';
  html += '<label><input type="checkbox" id="exp_summary" checked> 📊 Summary</label>';
  html += '<label><input type="checkbox" id="exp_monthly" checked> 📈 Monthly Burndown</label>';
  html += '<label><input type="checkbox" id="exp_chart_spend" checked> 📊 Spend Chart</label>';
  html += '<label><input type="checkbox" id="exp_chart_burn" checked> 📉 Burndown Chart</label>';
  html += '<label><input type="checkbox" id="exp_resources" checked> 👥 Resources</label>';
  html += '<label><input type="checkbox" id="exp_invoices" checked> 🧾 Invoices</label>';
  html += '<label><input type="checkbox" id="exp_expenses" checked> 💳 Expenses</label>';
  html += '<label><input type="checkbox" id="exp_rollover" checked> 📅 PO Rollover</label>';
  html += "</div>";
  html += '<div style="display:flex;gap:.8rem;flex-wrap:wrap">';
  html += '<button class="btn btn-green" onclick="exportExcel()">📊 Excel (.xlsx)</button>';
  html += '<button class="btn btn-red" onclick="exportPDF()">📄 PDF</button>';
  html += '<button class="btn btn-blue" onclick="exportPPTX()">📽️ PowerPoint (.pptx)</button>';
  html += '<button class="btn btn-green" onclick="exportFullConfig()">📦 Full Config (JSON)</button>';
  html += "</div></div></div>";
  // ── IMPORT SECTION ──
  html += '<div class="box"><h2>📤 Upload & Import Data</h2>';
  html +=
    '<p style="font-size:.8rem;color:#666;margin-bottom:1rem">Import your project data here. Start with <strong>Full Config</strong> if you have a shared JSON, or upload individual files below.</p>';
  // Full Config Import (top priority)
  html +=
    '<div class="cfg-section" style="border:2px solid #1a1a2e;margin-bottom:1.2rem"><summary style="padding:.8rem 1rem;background:#1a1a2e;color:#fff;font-weight:700;font-size:.9rem">📦 Import Full Config (JSON) — Start Here</summary><div class="inner">';
  html +=
    '<p style="font-size:.78rem;margin-bottom:.5rem">Load a complete config file (exported via <strong>Config → Export Full Config</strong>). This replaces all sections at once: PO Details, Resources, FX Rates, OT Params, Expenses, Invoices, and Monthly Actuals.</p>';
  html += '<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">';
  html += '<input type="file" id="fullCfgImport" accept=".json" style="font-size:.78rem">';
  html += '<button class="btn btn-blue" onclick="importFullConfig()">⬆️ Import & Apply</button>';
  html += "</div>";
  html += '<div id="fullCfgStatus" style="margin-top:.5rem;font-size:.75rem"></div>';
  html += "</div></div>";
  // Excel workbook exported by this app (possibly edited in Excel)
  html +=
    '<div class="cfg-section" style="border:2px solid #2e7d32;margin-bottom:1.2rem"><summary style="padding:.8rem 1rem;background:#2e7d32;color:#fff;font-weight:700;font-size:.9rem">📥 Import Excel workbook</summary><div class="inner">';
  html +=
    '<p style="font-size:.78rem;margin-bottom:.5rem">Load a workbook exported with <strong>Excel (.xlsx)</strong>, after editing its configuration sheets (PO Details, Resources, FX Rates, Holidays…) in Excel. You see what changes before anything is saved.</p>';
  html += '<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">';
  html += '<input type="file" id="wbImport" accept=".xlsx" style="font-size:.78rem">';
  html += '<button class="btn btn-blue" onclick="previewWorkbookImport()">🔍 Preview import</button>';
  html += "</div>";
  html += '<div id="wbImportPreview" style="margin-top:.5rem;font-size:.75rem"></div>';
  html += "</div></div>";
  // Guided steps
  html +=
    '<div style="margin-bottom:1rem;padding:.8rem 1rem;background:#f3e5f5;border-radius:8px;border:1px solid #ce93d8;font-size:.75rem">';
  html +=
    "<strong>💡 First time?</strong> Follow these steps: ① Import Full Config (above) OR ② Upload Resource Rules → ③ Upload Timesheet Actuals → ④ Save as Master to protect your data.";
  html += "</div>";
  html += '<div style="display:grid;gap:1rem;grid-template-columns:1fr 1fr">';
  // Actuals upload
  html += uploadSection("#e3f2fd", "② Timesheet Actuals (CSV/JSON/XLSX)");
  html +=
    '<p style="font-size:.75rem;margin-bottom:.3rem"><strong>What is this?</strong> Your timesheet export from PeopleSoft or similar system.</p>';
  html +=
    '<p style="font-size:.72rem;color:#666;margin-bottom:.5rem">Required columns: <code>Empl ID</code>, <code>Reported Dt</code>, <code>Regular Hours</code>. Optional: Overtime Hours, Project ID</p>';
  html +=
    '<input type="file" accept=".csv,.json,.xlsx" onchange="handleUpload(this,\'actuals\')" style="margin-bottom:.5rem"><br>';
  html += `<span style="font-size:.7rem;color:#888">Currently loaded: ${(model.cfg.raw_actuals || []).length} rows | ${Object.keys(model.cfg.actuals_by_project || {}).length} projects | ${model.cfg.actuals_monthly.length} months</span>`;
  html += "</div></div>";
  // Resources upload
  html += uploadSection("#e8f5e9", "③ Resource Rules (CSV/JSON/XLSX)");
  html +=
    '<p style="font-size:.75rem;margin-bottom:.3rem"><strong>What is this?</strong> Your team allocation rules — who works on what, at what rate, for which dates.</p>';
  html +=
    '<p style="font-size:.72rem;color:#666;margin-bottom:.5rem">Required columns: <code>name</code>, <code>empl_id</code>, <code>start</code>, <code>end</code>, <code>bill_rate</code>, <code>po_team</code></p>';
  html +=
    '<input type="file" accept=".csv,.json,.xlsx" onchange="handleUpload(this,\'resources\')" style="margin-bottom:.5rem"><br>';
  html += `<span style="font-size:.7rem;color:#888">Currently loaded: ${model.cfg.resources.length} resource rules</span>`;
  html += "</div></div>";
  // Smart Solution Excel Parser
  html += uploadSection("#fce4ec", "③b 🧠 Smart Resource Parser (Solution Excel)");
  html +=
    '<p style="font-size:.75rem;margin-bottom:.3rem"><strong>For non-standard Excel files</strong> with section headers, merged cells, or column headers not in row 1.</p>';
  html +=
    '<p style="font-size:.72rem;color:#666;margin-bottom:.5rem">The parser scans all rows to find column headers (name, empl_id, rate, etc.) then extracts resource data below them.</p>';
  html += '<input type="file" id="solutionExcel" accept=".xlsx,.xls" style="margin-bottom:.5rem"><br>';
  html += '<button class="btn btn-blue" onclick="parseSolutionExcel()">🧠 Parse & Preview</button>';
  html += '<div id="solutionPreview" style="margin-top:.5rem"></div>';
  html += "</div></div>";
  html += "</div>";
  // Save as Master button
  html += '<div style="margin-top:1rem;padding:1rem;background:#fff3e0;border-radius:8px;border:1px solid #ffe0b2">';
  html +=
    '<p style="font-size:.8rem;margin-bottom:.5rem"><strong>④ 💾 Save as Master</strong> — Protects your data. Auto-deduplicates actuals on save. PIN: ask your team lead.</p>';
  html += '<button class="btn btn-blue" onclick="promptMasterSave()">🔒 Save As Master (PIN)</button>';
  html += "</div>";
  // Preview area
  html += '<div id="uploadPreview" style="margin-top:1rem"></div>';
  html +=
    '<details class="cfg-section" style="margin-top:1rem"><summary style="padding:.8rem 1rem;background:#f5f5f5;font-weight:700">📋 Actuals Data Summary (click to expand)</summary><div class="inner">';
  html += renderActualsSummary(model);
  html += "</div></details>";
  html += "</div>";
  return html;
}

function handleUpload(input, type) {
  const file = input.files[0];
  if (!file) return;
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "xlsx" || ext === "xls") {
    file.arrayBuffer().then((buf) => {
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      processUpload(data, type);
    });
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    let data;
    if (file.name.endsWith(".json")) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        toast("✗ Invalid JSON: " + err.message, false);
        return;
      }
    } else {
      // Parse CSV
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map((html) => html.trim().replace(/"/g, ""));
      data = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
        const obj = {};
        headers.forEach((html, i) => {
          obj[html] = vals[i] || "";
        });
        return obj;
      });
    }
    processUpload(data, type);
  };
  reader.readAsText(file);
}

// "Data Quality" heading + bullet list in the upload report. Leaves its <div> open
// (the caller closes it), matching the original markup.
function dataQualityList(items) {
  const lis = items.map((item) => `<li>${item}</li>`).join("");
  return `<div><h3 style="font-size:.8rem;margin-bottom:.3rem">Data Quality</h3><ul style="font-size:.72rem;margin-left:1rem">${lis}</ul>`;
}

function processUpload(data, type) {
  if (type === "resources") {
    // Validate upload
    const uploadErrs = [];
    if (!data.length) {
      uploadErrs.push("File is empty");
    }
    const sample = data[0] || {};
    const hasName = sample.name || sample["Empl Name"] || sample.EmplName;
    const hasStart = sample.start || sample.RateEffectiveDt;
    const hasEnd = sample.end || sample.ContractEndDt;
    if (!hasName) uploadErrs.push("Missing name/Empl Name column");
    if (!hasStart) uploadErrs.push("Missing start/RateEffectiveDt column");
    if (!hasEnd) uploadErrs.push("Missing end/ContractEndDt column");
    // Row-level validation
    const rowErrs = [];
    data.forEach((r, i) => {
      const rate = parseFloat(r.bill_rate || r.BillRate || 0);
      const alloc = parseFloat(r.alloc || r.Allocation_Percentage || 1);
      const startRaw = r.start || r.RateEffectiveDt || "";
      const endRaw = r.end || r.ContractEndDt || "";
      if (rate < 0) rowErrs.push(`Row ${i + 2}: negative bill_rate (${rate})`);
      if (alloc < 0 || alloc > 1) rowErrs.push(`Row ${i + 2}: alloc ${alloc} outside 0-1 range`);
      if (startRaw && endRaw) {
        const s = parseDate(startRaw, "uk"),
          e = parseDate(endRaw, "uk");
        if (s && e && s > e) rowErrs.push(`Row ${i + 2}: start (${s}) > end (${e})`);
      }
      if (!parseInt(r.empl_id || r["Empl ID"] || r.EmplID || 0)) rowErrs.push(`Row ${i + 2}: missing/invalid empl_id`);
      if (!(r.po_team || r.PO_Team_Identifier || "").trim()) rowErrs.push(`Row ${i + 2}: missing po_team`);
    });
    if (rowErrs.length > 10) uploadErrs.push(...rowErrs.slice(0, 10), `...and ${rowErrs.length - 10} more row errors`);
    else uploadErrs.push(...rowErrs);
    if (uploadErrs.length) {
      toast("✗ Upload validation failed: " + uploadErrs.slice(0, 3).join("; "), false);
      document.getElementById("uploadPreview").innerHTML =
        '<div class="val-err"><strong>⚠️ Upload Errors (' +
        uploadErrs.length +
        "):</strong><ul>" +
        uploadErrs.map((e) => "<li>" + e + "</li>").join("") +
        "</ul></div>";
      return;
    }
    // Normalize resource data
    const resources = data
      .map((r) => {
        const startRaw = r.start || r.RateEffectiveDt || "";
        const endRaw = r.end || r.ContractEndDt || "";
        return {
          name: r.name || r["Empl Name"] || "",
          empl_id: parseInt(r.empl_id || r["Empl ID"] || r.EmplID) || 0,
          role: r.role || r.Role || "",
          location: r.location || r.Location || "UK",
          start: parseDate(startRaw, "uk"),
          end: parseDate(endRaw, "uk"),
          bill_rate: parseFloat(r.bill_rate || r.BillRate) || 0,
          hour_mult: parseFloat(r.hour_mult || r.HourMultiplier_TimeEntry || r.Hour_Multiplier) || 1,
          alloc: parseFloat(r.alloc || r.Allocation_Percentage) || 1,
          projectID: parseInt(r.projectID || r.ProjectID) || 0,
          po_team: (r.po_team || r.PO_Team_Identifier || "").replace(/\s+/g, ""),
        };
      })
      .filter((r) => r.start && r.end);
    const cfg = loadWork();
    // Cross-check: detect resources that duplicate existing PO team assignments
    const existingPOs = new Set((cfg.po_details || []).map((p) => (p.PO_Team_Identifier || "").replace(/\s+/g, "")));
    const orphanTeams = new Set(resources.map((r) => r.po_team).filter((t) => t && !existingPOs.has(t)));
    if (
      cfg.resources.length &&
      !confirm(
        "⚠️ This will replace " +
          cfg.resources.length +
          " existing resource rules with " +
          resources.length +
          " new ones. Continue?",
      )
    )
      return;
    cfg.resources = resources;
    saveWork(cfg);
    // Validation warnings
    const warnings = [];
    const poTeams = new Set((cfg.po_details || []).map((p) => (p.PO_Team_Identifier || "").replace(/\s+/g, "")));
    const unmatchedTeams = new Set(resources.map((r) => r.po_team).filter((t) => !poTeams.has(t)));
    if (unmatchedTeams.size)
      warnings.push(
        unmatchedTeams.size + " resource PO_Teams not in PO_Details: " + [...unmatchedTeams].slice(0, 3).join(", "),
      );
    if (orphanTeams.size)
      warnings.push(
        orphanTeams.size + " resource PO_Teams not found in PO Details: " + [...orphanTeams].slice(0, 3).join(", "),
      );
    const invalidDates = resources.filter((r) => r.start > r.end);
    if (invalidDates.length) warnings.push(invalidDates.length + " resources have start > end date");
    const zeroRate = resources.filter((r) => r.bill_rate === 0);
    if (zeroRate.length) warnings.push(zeroRate.length + " resources with zero rate (excluded from forecast)");
    // Duplicate detection
    const dupeMap = {};
    resources.forEach((r) => {
      const k = `${r.empl_id}|${r.po_team}|${r.start}|${r.end}`;
      dupeMap[k] = (dupeMap[k] || 0) + 1;
    });
    const dupes = Object.entries(dupeMap).filter(([, c]) => c > 1);
    if (dupes.length) warnings.push(dupes.length + " duplicate resource rules detected");
    toast(`✓ ${resources.length} resources uploaded` + (warnings.length ? " ⚠️ " + warnings.join("; ") : ""));
    // Show quality report
    const cols = Object.keys(data[0] || {});
    const mapped = {
      name: "name/Empl Name",
      empl_id: "empl_id/Empl ID",
      start: "start/RateEffectiveDt",
      end: "end/ContractEndDt",
      bill_rate: "bill_rate/BillRate",
      alloc: "alloc/Allocation_Percentage",
      po_team: "po_team/PO_Team_Identifier",
    };
    let report = '<div class="box"><h2>📋 Upload Report</h2>';
    report += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">';
    report +=
      '<div><h3 style="font-size:.8rem;margin-bottom:.3rem">Column Mapping</h3><table style="font-size:.7rem"><tbody>';
    Object.entries(mapped).forEach(([field, src]) => {
      const found = cols.find((c) => src.split("/").some((s) => c.toLowerCase().includes(s.toLowerCase())));
      report += `<tr><td style="font-weight:600">${field}</td><td>${found ? "✅ " + found : "❌ not found"}</td></tr>`;
    });
    report += "</tbody></table></div>";
    const firstStart = resources.length
      ? resources.reduce((m, r) => (r.start < m ? r.start : m), resources[0].start)
      : "-";
    const lastEnd = resources.length ? resources.reduce((m, r) => (r.end > m ? r.end : m), resources[0].end) : "-";
    report += dataQualityList([
      `Total rows: ${data.length}`,
      `Valid resources: ${resources.length}`,
      `Unique people: ${[...new Set(resources.map((r) => r.name))].length}`,
      `Date range: ${firstStart} → ${lastEnd}`,
      `Duplicates: ${dupes.length}`,
    ]);
    if (warnings.length)
      report +=
        '<div class="val-err" style="margin-top:.5rem"><ul>' +
        warnings.map((w) => "<li>" + w + "</li>").join("") +
        "</ul></div>";
    report += "</div></div></div>";
    document.getElementById("uploadPreview").innerHTML = report;
    setTimeout(render, 400);
  } else if (type === "actuals") {
    // Validate actuals upload
    const uploadErrs = [];
    if (!data.length) {
      uploadErrs.push("File is empty");
    }
    const sample = data[0] || {};
    if (!sample["Empl ID"] && !sample.empl_id) uploadErrs.push('Missing "Empl ID" column');
    if (!sample["Reported Dt"] && !sample.reported_dt) uploadErrs.push('Missing "Reported Dt" column');
    if (!sample["Regular Hours"] && sample["Regular Hours"] !== "0") uploadErrs.push('Missing "Regular Hours" column');
    // Row-level validation
    const rowErrs = [];
    data.forEach((r, i) => {
      const emplId = r["Empl ID"] || r.empl_id || "";
      const dt = r["Reported Dt"] || r.reported_dt || "";
      const regHrs = parseFloat(r["Regular Hours"] || 0);
      const otHrs = parseFloat(r["Overtime Hours"] || 0);
      if (!emplId) rowErrs.push(`Row ${i + 2}: missing Empl ID`);
      if (!dt) rowErrs.push(`Row ${i + 2}: missing Reported Dt`);
      else if (!parseDate(dt, "us")) rowErrs.push(`Row ${i + 2}: invalid date "${dt}"`);
      if (regHrs < 0) rowErrs.push(`Row ${i + 2}: negative Regular Hours (${regHrs})`);
      if (otHrs < 0) rowErrs.push(`Row ${i + 2}: negative Overtime Hours (${otHrs})`);
      if (regHrs > 24) rowErrs.push(`Row ${i + 2}: Regular Hours > 24 (${regHrs})`);
    });
    if (rowErrs.length > 10) uploadErrs.push(...rowErrs.slice(0, 10), `...and ${rowErrs.length - 10} more row errors`);
    else uploadErrs.push(...rowErrs);
    if (uploadErrs.length) {
      toast("✗ Upload validation failed: " + uploadErrs.slice(0, 3).join("; "), false);
      document.getElementById("uploadPreview").innerHTML =
        '<div class="val-err"><strong>⚠️ Upload Errors (' +
        uploadErrs.length +
        "):</strong><ul>" +
        uploadErrs.map((e) => "<li>" + e + "</li>").join("") +
        "</ul></div>";
      return;
    }
    // Duplicate detection for actuals
    const actDupeMap = {};
    data.forEach((row) => {
      const k = `${row["Empl ID"] || ""}|${row["Reported Dt"] || ""}|${row["Project ID"] || ""}`;
      actDupeMap[k] = (actDupeMap[k] || 0) + 1;
    });
    const actDupes = Object.values(actDupeMap).filter((c) => c > 1).length;
    if (
      actDupes &&
      !confirm("⚠️ " + actDupes + " duplicate timesheet entries detected (same employee+date+project). Import anyway?")
    )
      return;
    // Store raw actuals for processing
    const cfg = loadWork();
    let mode = "replace";
    if ((cfg.raw_actuals || []).length) {
      const choice = prompt(
        "Existing " +
          cfg.raw_actuals.length +
          " rows found.\n\nType:\n  A = Append & Deduplicate (recommended for weekly adds)\n  R = Replace all\n  Cancel = abort",
        "A",
      );
      if (!choice) return;
      mode = choice.trim().toUpperCase() === "A" ? "append" : "replace";
    }
    if (mode === "append") {
      cfg.raw_actuals = (cfg.raw_actuals || []).concat(data);
      const { removed } = deduplicateActuals(cfg);
      toast(`✓ Appended ${data.length} rows, ${removed} duplicates removed → ${cfg.raw_actuals.length} total`);
    } else {
      cfg.raw_actuals = data;
    }
    saveWork(cfg);
    aggregateActuals(cfg.raw_actuals);
    // Quality report for actuals
    const cols = Object.keys(sample);
    const dateRange = data
      .map((r) => parseDate(r["Reported Dt"] || "", "us"))
      .filter(Boolean)
      .sort();
    let report = '<div class="box"><h2>📋 Upload Report</h2>';
    report += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">';
    report +=
      '<div><h3 style="font-size:.8rem;margin-bottom:.3rem">Columns Detected</h3><ul style="font-size:.72rem;margin-left:1rem">';
    cols.forEach((c) => {
      report += `<li>✅ ${c}</li>`;
    });
    report += "</ul></div>";
    report += dataQualityList([
      `Total rows: ${data.length}`,
      `Unique employees: ${new Set(data.map((r) => r["Empl ID"])).size}`,
      `Date range: ${dateRange[0] || "?"} → ${dateRange[dateRange.length - 1] || "?"}`,
      `Duplicate rows: ${actDupes}`,
      `Projects: ${new Set(data.map((r) => r["Project ID"])).size}`,
    ]);
    if (actDupes)
      report += `<div class="val-err" style="margin-top:.5rem">⚠️ ${actDupes} duplicate timesheet entries detected (same employee+date+project)</div>`;
    report += "</div></div></div>";
    document.getElementById("uploadPreview").innerHTML = report;
  }
}

function parseSolutionExcel() {
  const file = document.getElementById("solutionExcel").files[0];
  const preview = document.getElementById("solutionPreview");
  if (!file) {
    preview.innerHTML = '<span style="color:#c62828">Select a file first</span>';
    return;
  }
  file.arrayBuffer().then((buf) => {
    const wb = XLSX.read(buf);
    // Scan all sheets for resource-like data
    const aliases = {
      name: ["name", "resource", "empl name", "employee name", "consultant", "person"],
      empl_id: ["empl id", "employee id", "empl_id", "emplid", "emp id", "id"],
      role: ["role", "designation", "title", "job title", "position"],
      location: ["location", "country", "loc", "region"],
      start: ["start", "start date", "from", "effective date", "rateeffectivedt", "allocation start"],
      end: ["end", "end date", "to", "contract end", "contractenddt", "allocation end"],
      bill_rate: ["bill rate", "rate", "billrate", "day rate", "hourly rate", "cost rate"],
      alloc: ["alloc", "allocation", "allocation_percentage", "%", "fte", "utilization"],
      po_team: ["po_team", "po team", "po_team_identifier", "project", "team", "engagement"],
      projectID: ["project id", "projectid", "proj id", "project_id", "proj"],
      hour_mult: ["hour_mult", "hour multiplier", "hourmultiplier_timeentry", "hrs mult"],
    };
    const normalize = (s) =>
      (s || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[_\-\.]/g, " ");
    const matchField = (header) => {
      const html = normalize(header);
      for (const [field, names] of Object.entries(aliases)) {
        if (names.some((n) => html === n || html.includes(n))) return field;
      }
      return null;
    };
    let bestSheet = "",
      bestHeaderRow = -1,
      bestMapping = {},
      bestScore = 0;
    wb.SheetNames.forEach((sheetName) => {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      // Scan each row as potential header
      for (let r = 0; r < Math.min(rows.length, 50); r++) {
        const row = rows[r];
        if (!row || !row.length) continue;
        const mapping = {};
        let score = 0;
        row.forEach((cell, c) => {
          const field = matchField(cell);
          if (field && !mapping[field]) {
            mapping[field] = c;
            score++;
          }
        });
        if (score > bestScore && score >= 3) {
          // need at least 3 matches
          bestScore = score;
          bestSheet = sheetName;
          bestHeaderRow = r;
          bestMapping = mapping;
        }
      }
    });
    if (bestScore < 3) {
      preview.innerHTML =
        '<div class="val-err">Could not find resource headers in any sheet. Need at least: name, start, end. Found ' +
        bestScore +
        " matches.</div>";
      return;
    }
    // Extract data rows below the header
    const ws = wb.Sheets[bestSheet];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const resources = [];
    for (let r = bestHeaderRow + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row.length) continue;
      const nameVal = bestMapping.name != null ? row[bestMapping.name] : "";
      if (!nameVal || normalize(nameVal) === "") continue; // skip empty rows
      if (normalize(nameVal).match(/^(total|subtotal|grand|sum|section|header)/)) continue;
      const res = {
        name: String(nameVal).trim(),
        empl_id: parseInt(bestMapping.empl_id != null ? row[bestMapping.empl_id] : 0) || 0,
        role: bestMapping.role != null ? String(row[bestMapping.role] || "").trim() : "",
        location: bestMapping.location != null ? String(row[bestMapping.location] || "").trim() : "UK",
        start: bestMapping.start != null ? parseDate(String(row[bestMapping.start] || ""), "uk") || "" : "",
        end: bestMapping.end != null ? parseDate(String(row[bestMapping.end] || ""), "uk") || "" : "",
        bill_rate: bestMapping.bill_rate != null ? parseFloat(row[bestMapping.bill_rate]) || 0 : 0,
        alloc:
          bestMapping.alloc != null
            ? (parseFloat(row[bestMapping.alloc]) || 0) > 1
              ? parseFloat(row[bestMapping.alloc]) / 100
              : parseFloat(row[bestMapping.alloc]) || 1
            : 1,
        po_team: bestMapping.po_team != null ? String(row[bestMapping.po_team] || "").trim() : "",
        projectID: bestMapping.projectID != null ? parseInt(row[bestMapping.projectID]) || 0 : 0,
        hour_mult: bestMapping.hour_mult != null ? parseFloat(row[bestMapping.hour_mult]) || 1 : 1,
      };
      if (res.name) resources.push(res);
    }
    // Show preview
    const title = `🧠 Parsed: ${resources.length} resources from "${bestSheet}" (header row ${bestHeaderRow + 1})`;
    let html = `<div class="box" style="margin-top:.5rem"><h2>${title}</h2>`;
    html += `<p style="font-size:.72rem;color:#666">Matched ${bestScore} columns: ${Object.keys(bestMapping).join(", ")}</p>`;
    const cols = ["Name", "EmplID", "Role", "Start", "End", "Rate", "Alloc", "PO_Team"];
    html += `<div class="tw" style="max-height:200px;overflow:auto"><table>${tableHead(cols)}<tbody>`;
    resources.slice(0, 15).forEach((r) => {
      html += tableRow([r.name, r.empl_id, r.role, r.start, r.end, r.bill_rate, r.alloc, r.po_team]);
    });
    html += "</tbody></table></div>";
    if (resources.length > 15) html += `<p style="font-size:.7rem;color:#888">Showing 15 of ${resources.length}</p>`;
    html += '<div style="margin-top:.5rem;display:flex;gap:.5rem">';
    html += '<button class="btn btn-green" onclick="applySolutionResources()">✅ Apply to Dashboard</button>';
    html += `<button class="btn btn-orange" onclick="document.getElementById('solutionPreview').innerHTML=''">Cancel</button>`;
    html += "</div></div>";
    preview.innerHTML = html;
    // Store parsed for apply
    window.__parsedSolutionResources = resources;
  });
}

function applySolutionResources() {
  const resources = window.__parsedSolutionResources;
  if (!resources || !resources.length) {
    toast("No parsed resources", false);
    return;
  }
  const cfg = loadWork();
  const existing = cfg.resources.length;
  if (existing && !confirm(`Replace ${existing} existing resources with ${resources.length} parsed ones?`)) return;
  cfg.resources = resources;
  saveWork(cfg);
  toast(`✓ ${resources.length} resources applied from Solution Excel`);
  setTimeout(render, 400);
}
