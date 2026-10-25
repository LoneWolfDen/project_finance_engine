// 📚 Resource versions (on the Resources tab): named copies of the resource rules, saved in the config,
// each with how far the budget left today funds it and how much more it needs.

let selectedVersionId = null; // version whose details are shown

const fmtDay = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

// Current working resources first, then saved versions
function resourcePlans(cfg) {
  return [
    { id: null, name: "Current (working)", saved: "", resources: cfg.resources },
    ...(cfg.resource_versions || []),
  ];
}

function renderResourceVersions(model) {
  const cfg = loadWork();
  const asOf = new Date().toISOString().slice(0, 10);
  const teams = teamsInView(model);
  const budget = model.remaining;
  const plans = resourcePlans(cfg).map((p) => ({ ...p, cov: planCoverage(p.resources, model, teams, budget, asOf) }));

  let html =
    '<details class="cfg-section" open style="margin-bottom:1rem"><summary style="padding:.8rem 1rem;background:#e8f5e9;font-weight:700">📚 Resource versions — funding from today</summary><div class="inner">';
  html += '<p style="font-size:.75rem;color:#555;margin-bottom:.6rem">';
  html += `<strong>Budget left on ${fmtDay(asOf)}: ${fmtMoney(budget)}</strong> = PO value ${fmtMoney(model.fc.totalPOValue)}`;
  html += ` − actuals ${fmtMoney(model.totalActuals)} − expenses ${fmtMoney(model.totalExpenses)}`;
  html += ` (${teams.length === 1 ? teams[0] : teams.length + " PO_Teams"} in view). `;
  html +=
    "Each plan's cost counts its working days after today, to each rule's own end date (including any time past PO validity).</p>";
  if (!model.totalActuals)
    html +=
      '<p class="val-err" style="font-size:.72rem">⚠️ No actuals loaded: the budget left assumes nothing has been spent yet.</p>';

  const cols = [
    "Plan",
    "Saved",
    "Rules",
    "People",
    "Cost from today",
    "Funded until",
    "Working days covered",
    "Additional needed",
    "Left over",
    "",
  ];
  html += `<div class="tw"><table id="tblVersions">${tableHead(cols)}<tbody>`;
  plans.forEach((p) => {
    const c = p.cov;
    const people = new Set(p.resources.filter((r) => teams.includes(normTeam(r.po_team))).map((r) => r.name)).size;
    const rules = p.resources.filter((r) => teams.includes(normTeam(r.po_team))).length;
    const funded = !c.daysPlanned ? "—" : c.runsOut ? fmtDay(c.fundedUntil) : `${fmtDay(c.planEnd)} (plan end) ✅`;
    const actions =
      p.id === null
        ? ""
        : `<button class="btn btn-blue" style="font-size:.65rem" onclick="showVersionDetails(${p.id})">Details</button> ` +
          `<button class="btn btn-green" style="font-size:.65rem" onclick="applyResourceVersion(${p.id})">Apply</button> ` +
          `<button class="btn btn-red" style="font-size:.65rem" onclick="deleteResourceVersion(${p.id})">🗑️</button>`;
    html += tableRow([
      p.id === null ? `<strong>${p.name}</strong>` : escapeHtml(p.name),
      cell(p.saved || "—", "font-size:.65rem"),
      rules,
      people,
      fmtMoney(c.cost),
      cell(funded, c.runsOut ? "color:#c62828;font-weight:600" : "color:#2e7d32"),
      `${c.daysCovered} of ${c.daysPlanned}`,
      cell(c.shortfall ? fmtMoney(c.shortfall) : "—", c.shortfall ? "color:#c62828;font-weight:700" : ""),
      cell(c.surplus ? fmtMoney(c.surplus) : "—", c.surplus ? "color:#2e7d32" : ""),
      actions,
    ]);
  });
  html += "</tbody></table></div>";

  html += '<div style="display:flex;gap:.5rem;align-items:center;margin:.6rem 0">';
  html += `<input type="text" id="verName" placeholder="Version name (e.g. Add 2 devs from Jan)" style="flex:1;padding:.4rem;border:1px solid #ddd;border-radius:4px;font-size:.8rem">`;
  html +=
    '<button class="btn btn-green" onclick="saveResourceVersion()">💾 Save current resources as version</button></div>';
  html +=
    '<p style="font-size:.7rem;color:#888;margin-bottom:.6rem">To try a change: save the current resources as a version, edit the tables below and Save All, then save again — every plan is compared above. Apply makes a version the working resources (the current ones are saved as a version first).</p>';
  if (plans.some((p) => p.cov.daysPlanned)) html += '<canvas id="cVersions" height="70"></canvas>';

  const selected = plans.find((p) => p.id !== null && p.id === selectedVersionId);
  if (selected) html += renderVersionDetails(selected, plans[0], model, teams, asOf);
  html += "</div></details>";
  return html;
}

// Per-team funding of one version, and what changed compared with the current resources
function renderVersionDetails(version, current, model, teams, asOf) {
  let html = `<div class="box" style="margin-top:.8rem"><h2>${escapeHtml(version.name)} — details <button class="btn btn-orange" style="font-size:.65rem" onclick="showVersionDetails(null)">Close</button></h2>`;
  html +=
    '<p style="font-size:.72rem;color:#666;margin-bottom:.4rem">Per PO_Team (a PO\'s budget only pays for its own team):</p>';
  const cols = [
    "PO_Team",
    "Budget left",
    "Cost from today",
    "Funded until",
    "Working days covered",
    "Additional needed",
    "Left over",
  ];
  html += `<div class="tw"><table>${tableHead(cols)}<tbody>`;
  teams.forEach((team) => {
    const b = teamBudgetLeft(model, team);
    const c = planCoverage(version.resources, model, [team], b.left, asOf);
    html += tableRow([
      cell(team, "font-size:.68rem"),
      b.actuals === null ? "— (actuals not split by team)" : fmtMoney(b.left),
      fmtMoney(c.cost),
      !c.daysPlanned ? "—" : c.runsOut ? fmtDay(c.fundedUntil) : "✅ to plan end",
      `${c.daysCovered} of ${c.daysPlanned}`,
      cell(c.shortfall ? fmtMoney(c.shortfall) : "—", c.shortfall ? "color:#c62828;font-weight:700" : ""),
      c.surplus ? fmtMoney(c.surplus) : "—",
    ]);
  });
  html += "</tbody></table></div>";

  const diff = diffResources(current.resources, version.resources);
  html += `<p style="font-size:.75rem;margin:.6rem 0 .3rem"><strong>Compared with current:</strong> ${diff.added.length} added, ${diff.removed.length} removed, ${diff.changed.length} changed</p>`;
  const list = (items, color, fmt) =>
    items.length
      ? `<ul style="font-size:.72rem;margin-left:1rem;color:${color}">${items.map((i) => `<li>${fmt(i)}</li>`).join("")}</ul>`
      : "";
  const ruleText = (r) =>
    `${escapeHtml(r.name)} (${escapeHtml(r.role)}, ${escapeHtml(r.po_team)}) ${r.start} → ${r.end}, ${rateSymbol(model, r)}${r.bill_rate}/hr × ${r.alloc}`;
  html += list(diff.added, "#2e7d32", (r) => "➕ " + ruleText(r));
  html += list(diff.removed, "#c62828", (r) => "➖ " + ruleText(r));
  html += list(
    diff.changed,
    "#e65100",
    (c) =>
      `✏️ ${escapeHtml(c.rule.name)} (${escapeHtml(c.rule.po_team)}): ${c.changes.map((x) => `${x.field} ${escapeHtml(x.from)} → ${escapeHtml(x.to)}`).join(", ")}`,
  );
  return html + "</div>";
}

// Rules matched by employee, team, project and start date
function diffResources(from, to) {
  const key = (r) => `${r.empl_id}|${normTeam(r.po_team)}|${r.projectID || ""}|${r.start}`;
  const fromMap = new Map(from.map((r) => [key(r), r]));
  const toMap = new Map(to.map((r) => [key(r), r]));
  const fields = ["name", "role", "location", "end", "bill_rate", "hour_mult", "alloc"];
  const changed = [];
  toMap.forEach((r, k) => {
    const old = fromMap.get(k);
    if (!old) return;
    const changes = fields
      .filter((f) => String(old[f]) !== String(r[f]))
      .map((f) => ({ field: f, from: old[f], to: r[f] }));
    if (changes.length) changed.push({ rule: r, changes });
  });
  return {
    added: [...toMap].filter(([k]) => !fromMap.has(k)).map(([, r]) => r),
    removed: [...fromMap].filter(([k]) => !toMap.has(k)).map(([, r]) => r),
    changed,
  };
}

function nextVersionId(cfg) {
  return (cfg.resource_versions || []).reduce((m, v) => Math.max(m, v.id), 0) + 1;
}
function addVersion(cfg, name) {
  const v = {
    id: nextVersionId(cfg),
    name,
    saved: new Date().toISOString().slice(0, 16).replace("T", " "),
    resources: JSON.parse(JSON.stringify(cfg.resources)),
  };
  cfg.resource_versions = [...(cfg.resource_versions || []), v];
  return v;
}

function saveResourceVersion() {
  const cfg = loadWork();
  const input = document.getElementById("verName");
  const name = (input && input.value.trim()) || "Version " + nextVersionId(cfg);
  const v = addVersion(cfg, name);
  saveWork(cfg);
  toast(`✓ Saved "${name}" (${v.resources.length} rules)`);
  render();
}

function applyResourceVersion(id) {
  const cfg = loadWork();
  const v = (cfg.resource_versions || []).find((x) => x.id === id);
  if (!v || !confirm(`Make "${v.name}" the working resources?\n\nThe current resources are saved as a version first.`))
    return;
  addVersion(cfg, `Before applying "${v.name}"`);
  cfg.resources = JSON.parse(JSON.stringify(v.resources));
  saveWork(cfg);
  toast(`✓ Applied "${v.name}" — forecast recalculated`);
  render();
}

function deleteResourceVersion(id) {
  const cfg = loadWork();
  const v = (cfg.resource_versions || []).find((x) => x.id === id);
  if (!v || !confirm(`Delete version "${v.name}"?`)) return;
  cfg.resource_versions = cfg.resource_versions.filter((x) => x.id !== id);
  if (selectedVersionId === id) selectedVersionId = null;
  saveWork(cfg);
  render();
}

function showVersionDetails(id) {
  selectedVersionId = id;
  render();
}

// Budget left at the end of each month for every plan; a line below zero means the money has run out
function drawResourceCharts(model) {
  const canvas = document.getElementById("cVersions");
  if (!canvas) return;
  const asOf = new Date().toISOString().slice(0, 10);
  const teams = teamsInView(model);
  const plans = resourcePlans(loadWork()).map((p) => ({
    ...p,
    days: planDailyCosts(p.resources, model, teams, asOf),
  }));
  const monthKey = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString("en", { month: "short" }) + "-" + String(d.getFullYear()).slice(2);
  };
  const months = [
    ...new Set(
      plans
        .flatMap((p) => p.days.map(([d]) => d))
        .sort()
        .map(monthKey),
    ),
  ];
  const labels = ["Today", ...months];
  const colors = ["#1a1a2e", "#2196f3", "#e65100", "#8e24aa", "#26a69a", "#c62828", "#5c6bc0"];
  const datasets = plans.map((p, i) => {
    const byMonth = {};
    p.days.forEach(([d, c]) => (byMonth[monthKey(d)] = (byMonth[monthKey(d)] || 0) + c));
    let left = model.remaining;
    const data = [Math.round(left), ...months.map((m) => Math.round((left -= byMonth[m] || 0)))];
    return {
      label: p.name,
      data,
      borderColor: colors[i % colors.length],
      borderWidth: i === 0 ? 3 : 2,
      borderDash: i === 0 ? [] : [6, 3],
      pointRadius: 2,
      tension: 0.2,
    };
  });
  datasets.push({
    label: "Zero",
    data: labels.map(() => 0),
    borderColor: "#f44336",
    borderWidth: 1,
    pointRadius: 0,
    borderDash: [2, 2],
  });
  addChart("cVersions", {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top", labels: { filter: (item) => item.text !== "Zero" } },
        title: {
          display: true,
          text: "Budget left after each month, per plan (below zero = additional funding needed)",
        },
        datalabels: kLabels({ size: 8 }),
      },
      scales: { y: { ticks: moneyTicks() } },
    },
  });
}
