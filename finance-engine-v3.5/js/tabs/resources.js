// 👥 Resources tab: editable resource rules per PO_Team and the resource Gantt.

// Editable columns, in table order; saveResTable() reads them back by data-field.
const RES_FIELDS = [
  "name",
  "empl_id",
  "role",
  "location",
  "projectID",
  "start",
  "end",
  "bill_rate",
  "hour_mult",
  "alloc",
];

const RES_TABLE_COLS = [
  "Name ⇅",
  "EmplID ⇅",
  "Role ⇅",
  "Location",
  "ProjectID",
  "Start ⇅",
  "End ⇅",
  "Rate ⇅",
  "HrMult",
  "Alloc ⇅",
  "Fc/day",
  "Del",
];

const NEW_RES_ROW = {
  name: "New_Resource",
  empl_id: 0,
  role: "Role",
  location: "UK",
  projectID: "",
  start: "2025-07-01",
  end: "2025-12-31",
  bill_rate: 100,
  hour_mult: 8,
  alloc: 1,
};

const RES_DELETE_BTN =
  '<button onclick="delResRow(this)" style="background:none;border:none;cursor:pointer;font-size:1rem">🗑️</button>';

function editableResCells(values) {
  return RES_FIELDS.map((k) => `<td contenteditable="true" data-field="${k}">${values[k]}</td>`).join("");
}

function renderResources(model) {
  const normFilter = selectedPoTeams.length ? selectedPoTeams.map((t) => t.replace(/\s+/g, "")) : null;
  const allRes = normFilter
    ? model.cfg.resources.filter((r) => normFilter.includes((r.po_team || "").replace(/\s+/g, "")))
    : model.cfg.resources;
  // All rules are shown: duplicates are highlighted, not hidden, because the forecast counts every copy
  const res = allRes;
  const dupes = duplicateRules(res);
  let html = '<div class="cards">';
  html += statCard("b", "People", [...new Set(res.map((r) => r.name))].length);
  html += statCard("g", "Rules", res.length);
  html += statCard("o", "Forecast Days", model.fc.days);
  html += statCard("r", "Total Forecast", fmtMoney(model.fc.total));
  html += "</div>";
  html += renderResourceVersions(model);
  if (dupes.count) {
    html +=
      '<div class="val-err" style="margin-bottom:.8rem">⚠️ ' + dupes.count + " duplicate rule(s), highlighted below";
    html += " (same person, project, team and dates). The forecast counts every copy.";
    if (dupes.exact)
      html += ` <button class="btn btn-orange" style="font-size:.65rem" onclick="removeExactDuplicates()">Remove ${dupes.exact} exact duplicate(s)</button>`;
    if (dupes.count > dupes.exact) html += " Rules that differ (e.g. rate) need fixing by hand.";
    html += "</div>";
  }
  html += '<div style="margin-bottom:.5rem;display:flex;gap:.5rem;align-items:center">';
  html += '<button class="btn btn-blue" onclick="saveResTable()">💾 Save All (recalculates forecast)</button>';
  html += '<button class="btn btn-orange" onclick="restoreFromMaster();render()">↩️ Restore from Master</button>';
  html += '<span style="font-size:.7rem;color:#888">Click cell to edit · Each group has its own Add Row</span>';
  html += "</div>";
  // Per-group independent tables with headers, add row, sort
  const resGroups = {};
  res.forEach((r) => {
    const t = r.po_team || "Unknown";
    if (!resGroups[t]) resGroups[t] = [];
    resGroups[t].push(r);
  });
  Object.entries(resGroups).forEach(([team, members]) => {
    const tid = team.replace(/[^a-zA-Z0-9]/g, "_");
    const people = [...new Set(members.map((r) => r.name))].length;
    html += '<div class="box" style="margin-bottom:.8rem">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">';
    html += `<h2 style="font-size:.85rem;margin:0">${team} <span style="font-size:.7rem;color:#888">(${members.length} rules, ${people} people)</span></h2>`;
    html += `<div><button class="btn btn-green" style="font-size:.65rem" onclick="addResRowTo('${tid}','${team}')">➕ Add</button> `;
    html += `<button class="btn btn-blue" style="font-size:.65rem" onclick="saveResTable()">💾 Save</button></div>`;
    html += "</div>";
    html += `<div class="tw"><table class="resGrpTable" id="res_${tid}">${tableHead(RES_TABLE_COLS)}<tbody>`;
    members.forEach((r) => {
      const dailyCost = r.bill_rate * r.alloc * 8; // in the team's PO currency
      const values = { ...r, empl_id: r.empl_id || 0, projectID: r.projectID || "" };
      html += `<tr${dupes.rows.has(r) ? ' style="background:#ffebee" title="Duplicate rule"' : ""}>${editableResCells(values)}<td style="font-weight:600">${fmtMoney(dailyCost, rateSymbol(model, r))}</td><td>${RES_DELETE_BTN}</td></tr>`;
    });
    html += `</tbody></table></div></div>`;
  });
  html += '<details class="cfg-section" style="margin-top:1rem">';
  html +=
    '<summary style="padding:.8rem 1rem;background:#e8eaf6;font-weight:700">📅 Resource Timeline (Gantt)</summary>';
  html += '<div class="inner" id="ganttContainer">';
  html += renderResourceGantt(model);
  html += "</div></details>";
  return html;
}

// Rules for the same person, project, team and dates. count = rules beyond the first of each set;
// exact = those identical in every field (safe to remove); rows = every rule in a duplicate set
function duplicateRules(resources) {
  const ruleKey = (r) => `${r.empl_id}|${r.projectID}|${(r.po_team || "").replace(/\s+/g, "")}|${r.start}|${r.end}`;
  const groups = {};
  resources.forEach((r) => (groups[ruleKey(r)] = groups[ruleKey(r)] || []).push(r));
  const rows = new Set();
  let count = 0,
    exact = 0;
  Object.values(groups).forEach((g) => {
    if (g.length < 2) return;
    g.forEach((r) => rows.add(r));
    count += g.length - 1;
    exact += g.length - new Set(g.map((r) => JSON.stringify(r))).size;
  });
  return { count, exact, rows };
}
function removeExactDuplicates() {
  const cfg = loadWork();
  const seen = new Set();
  const before = cfg.resources.length;
  cfg.resources = cfg.resources.filter((r) => {
    const k = JSON.stringify(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  saveWork(cfg);
  toast(`✓ Removed ${before - cfg.resources.length} exact duplicate rule(s)`);
  render();
}
function addResRowTo(tid, team) {
  const tbody = document.querySelector("#res_" + tid + " tbody");
  if (!tbody) return;
  const tr = document.createElement("tr");
  tr.className = "row-new";
  tr.innerHTML = editableResCells(NEW_RES_ROW) + `<td>—</td><td>${RES_DELETE_BTN}</td>`;
  // Set po_team as hidden data attribute
  tr.dataset.poTeam = team;
  tbody.appendChild(tr);
  tr.scrollIntoView({ behavior: "smooth" });
}

function addResRow() {
  /* legacy fallback */ const tables = document.querySelectorAll(".resGrpTable");
  if (tables.length) addResRowTo(tables[0].id.replace("res_", ""), "");
}

function delResRow(btn) {
  btn.closest("tr").classList.toggle("row-del");
}

function saveResTable() {
  const resources = [];
  document.querySelectorAll(".resGrpTable").forEach((tbl) => {
    // Get po_team from the heading above this table
    const box = tbl.closest(".box");
    const heading = box ? box.querySelector("h2") : null;
    const teamName = heading ? heading.textContent.split(" (")[0].trim() : "";
    const rows = [...tbl.querySelectorAll("tbody tr:not(.row-del)")];
    rows.forEach((tr) => {
      const cells = tr.querySelectorAll("td[contenteditable]");
      if (!cells.length) return;
      const poTeam = tr.dataset.poTeam || teamName;
      resources.push({
        name: cells[0].textContent.trim(),
        empl_id: parseInt(cells[1].textContent.trim()) || 0,
        role: cells[2].textContent.trim(),
        location: cells[3].textContent.trim(),
        projectID: parseInt(cells[4].textContent.trim()) || 0,
        po_team: poTeam,
        start: cells[5].textContent.trim(),
        end: cells[6].textContent.trim(),
        bill_rate: parseFloat(cells[7].textContent.trim()) || 0,
        hour_mult: parseFloat(cells[8].textContent.trim()) || 1,
        alloc: parseFloat(cells[9].textContent.trim()) || 0,
      });
    });
  });
  const cfg = loadWork();
  // With the PO_Team slicer on only the selected teams' tables are on screen; keep the other teams' rules
  const norm = (t) => (t || "").replace(/\s+/g, "");
  const shown = selectedPoTeams.length ? selectedPoTeams.map(norm) : null;
  const hidden = shown ? cfg.resources.filter((r) => !shown.includes(norm(r.po_team))) : [];
  cfg.resources = [...hidden, ...resources];
  saveWork(cfg);
  toast("✓ Resources saved — forecast recalculated!");
  setTimeout(render, 400);
}

function renderResourceGantt(model) {
  const validTeams = new Set((model.cfg.po_details || []).map((p) => (p.PO_Team_Identifier || "").replace(/\s+/g, "")));
  const normFilter = selectedPoTeams.length ? selectedPoTeams.map((t) => t.replace(/\s+/g, "")) : null;
  const fullCfg = loadWork();
  const res = (fullCfg.resources || []).filter((r) => {
    const t = (r.po_team || "").replace(/\s+/g, "");
    if (!validTeams.has(t)) return false;
    return normFilter ? normFilter.includes(t) : true;
  });
  const allStarts = res.map((r) => new Date(r.start)).filter((d) => !isNaN(d));
  const allEnds = res.map((r) => new Date(r.end)).filter((d) => !isNaN(d));
  const start = allStarts.length ? new Date(Math.min(...allStarts)) : new Date("2025-01-01");
  const end = allEnds.length ? new Date(Math.max(...allEnds)) : new Date("2026-12-31");
  const span = end - start || 1;
  const colors = ["#5c6bc0", "#26a69a", "#e65100", "#8e24aa", "#2e7d32", "#c62828", "#1565c0", "#4e342e", "#00838f"];
  const groups = {};
  res.forEach((r) => {
    const t = r.po_team || "Unknown";
    if (!groups[t]) groups[t] = [];
    groups[t].push(r);
  });
  let html = '<div class="tl-scroll"><div class="tl-inner">';
  html += monthAxis(start, end, span, 140, 18);
  let colorIdx = 0;
  Object.entries(groups).forEach(([team, members]) => {
    const byPerson = {};
    members.forEach((r) => {
      const key = `${r.empl_id}|${r.name}`;
      if (!byPerson[key]) byPerson[key] = [];
      byPerson[key].push(r);
    });
    html += `<div style="font-weight:700;font-size:.75rem;margin-top:.5rem;color:#1a1a2e">${team} (${Object.keys(byPerson).length} people)</div>`;
    Object.entries(byPerson).forEach(([key, rules]) => {
      const [eid, name] = key.split("|");
      html += `<div class="tl-row"><span class="nm">${name}</span><div class="ba">`;
      rules.forEach((r) => {
        const rs = new Date(r.start),
          re = new Date(r.end);
        if (isNaN(rs) || isNaN(re) || rs > re) return;
        const left = Math.max(0, ((rs - start) / span) * 100).toFixed(1);
        const width = Math.max(1, ((re - rs) / span) * 100).toFixed(1);
        html += `<div class="br" style="left:${left}%;width:${width}%;background:${colors[colorIdx % colors.length]};opacity:${0.6 + r.alloc * 0.4}">${r.alloc * 100}%</div>`;
      });
      html += `</div></div>`;
      colorIdx++;
    });
  });
  if (!res.length) html += '<p style="color:#888;font-size:.8rem">No resources for selected filter</p>';
  html += "</div></div>";
  return html;
}
