// Page shell: tab list, nav bar with Year filter and PO_Team slicer, render(), toast, sortable tables.

const TABS = [
  { id: "overview", label: "📊 Overview" },
  { id: "burndown", label: "📉 Burndown" },
  { id: "monthly", label: "📈 Variance" },
  { id: "po", label: "📑 PO Details" },
  { id: "invoices", label: "🧾 Invoices" },
  { id: "resources", label: "👥 Resources" },
  { id: "utilization", label: "⏱️ Utilization" },
  { id: "expenses", label: "💳 Expenses" },
  { id: "scenarios", label: "🔀 Scenarios" },
  { id: "upload", label: "📤 Data & Reports" },
  { id: "config", label: "⚙️ Settings" },
];

let tab = "overview",
  charts = [];

let showDataLabels = false;
let drawChartsTimer = null;

Chart.register(ChartDataLabels);

Chart.defaults.plugins.datalabels = { display: false };

function render() {
  charts.forEach((c) => c.destroy());
  charts = [];
  const model = buildData();
  // Nav with Year filter (primary) + PO_Team slicer (secondary)
  // Tabs are grouped Analysis | Planning | Data | Admin, with a separator before tabs 3, 5 and 8
  let navHtml = "";
  TABS.forEach((t, i) => {
    if (i === 3 || i === 5 || i === 8) navHtml += '<span class="sep"></span>';
    navHtml += `<button class="${t.id === tab ? "active" : ""}" onclick="show('${t.id}')">${t.label}</button>`;
  });
  // Year filter as clickable buttons
  if (model.allYears.length > 0) {
    navHtml += '<div class="filter-bar" style="margin-left:auto">';
    navHtml += '<span style="font-size:.7rem;font-weight:600;color:#666">Year:</span>';
    navHtml += `<button class="yr-btn ${!selectedYear ? "active" : ""}" onclick="setYear('')">All</button>`;
    model.allYears.forEach((y) => {
      navHtml += `<button class="yr-btn ${selectedYear == y ? "active" : ""}" onclick="setYear('${y}')">${y}</button>`;
    });
    navHtml += `</div><div class="filter-bar">`;
  }
  // PO_Team slicer
  if (model.allPoTeams.length > 0) {
    const selCount = selectedPoTeams.length;
    const label = selCount === 0 ? "All PO_Teams (" + model.allPoTeams.length + ")" : selCount + " selected";
    navHtml += '<div class="slicer-wrap">';
    navHtml += `<button class="slicer-btn" onclick="toggleSlicer()">🔍 ${label} ▾</button>`;
    navHtml += '<div class="slicer-dd" id="slicerDD">';
    navHtml += '<input type="text" placeholder="Search projects..." oninput="filterSlicer(this.value)">';
    navHtml += '<div class="opts" id="slicerOpts">';
    model.allPoTeams.forEach((pt) => {
      const checked = selectedPoTeams.includes(pt) ? "checked" : "";
      navHtml += `<label><input type="checkbox" value="${pt}" ${checked} onchange="togglePoTeam('${pt}',this.checked)"> ${pt}</label>`;
    });
    navHtml += "</div>";
    navHtml += '<div class="actions">';
    navHtml += '<button onclick="selectAllPO()">All</button>';
    navHtml += '<button onclick="selectNonePO()">None</button>';
    navHtml += '<button onclick="toggleSlicer()">Close</button>';
    navHtml += "</div></div></div>";
  }
  if (model.allYears.length > 0) navHtml += `</div>`;
  navHtml +=
    '<label style="margin-left:8px;font-size:.72rem;cursor:pointer;white-space:nowrap"><input type="checkbox" ' +
    (showDataLabels ? "checked" : "") +
    ' onchange="showDataLabels=this.checked;render()"> Show Data Labels</label>';
  document.getElementById("nav").innerHTML = navHtml;
  document.getElementById("app").innerHTML = `<div class="tab active">${renderTab(tab, model)}</div>`;
  // Cancel a draw still pending from an earlier render (e.g. at startup, when the server
  // data arrives right after the first render): it would draw stale data onto this canvas
  clearTimeout(drawChartsTimer);
  drawChartsTimer = setTimeout(() => drawCharts(tab, model), 60);
}

function setYear(y) {
  selectedYear = y;
  selectedPoTeams = [];
  render();
}

function toggleSlicer() {
  document.getElementById("slicerDD").classList.toggle("open");
}

function filterSlicer(q) {
  const opts = document.querySelectorAll("#slicerOpts label");
  opts.forEach((l) => {
    l.style.display = l.textContent.toLowerCase().includes(q.toLowerCase()) ? "" : "none";
  });
}

function togglePoTeam(pt, checked) {
  if (checked) {
    if (!selectedPoTeams.includes(pt)) selectedPoTeams.push(pt);
  } else {
    selectedPoTeams = selectedPoTeams.filter((t) => t !== pt);
  }
  render();
}

function selectAllPO() {
  selectedPoTeams = [];
  render();
}

function selectNonePO() {
  const model = buildData();
  selectedPoTeams = [...model.allPoTeams];
  render();
}

// Collapse/expand grouped sections
function toggleGrp(btn) {
  const rows = btn.nextElementSibling;
  if (rows) {
    rows.classList.toggle("hidden");
    btn.classList.toggle("collapsed");
  }
}

function toggleAllGrps(container, expand) {
  const box = document.getElementById(container);
  if (!box) return;
  box.querySelectorAll(".grp-hdr").forEach((html) => {
    const rows = html.nextElementSibling;
    if (expand) {
      rows.classList.remove("hidden");
      html.classList.remove("collapsed");
    } else {
      rows.classList.add("hidden");
      html.classList.add("collapsed");
    }
  });
}

document.addEventListener("click", function (e) {
  if (!e.target.closest(".slicer-wrap")) {
    const dd = document.getElementById("slicerDD");
    if (dd) dd.classList.remove("open");
  }
});

function show(id) {
  tab = id;
  render();
}

// HTML for the tab with this id (see TABS)
function renderTab(id, model) {
  return {
    overview: renderOverview,
    burndown: renderBurndown,
    monthly: renderVariance,
    po: renderPODetails,
    invoices: renderInvoices,
    resources: renderResources,
    utilization: renderUtilization,
    expenses: renderExpenses,
    scenarios: renderScenarios,
    upload: renderDataAndReports,
    config: renderSettings,
  }[id](model);
}

// 1234.5 -> "£1,235"; null/undefined -> "—". Pass "$" etc. for other currencies.
function fmtMoney(n, c = "£") {
  return n != null ? c + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—";
}

function toast(msg, ok = true) {
  const d = document.createElement("div");
  d.className = "toast " + (ok ? "ok" : "err");
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), ok ? 3000 : 6000);
}

// Sortable tables - use event delegation (skips grouped tables)
document.addEventListener("click", function (e) {
  const th = e.target.closest("th[data-sort]");
  if (!th) return;
  const tbl = th.closest("table");
  if (!tbl) return;
  const col = parseInt(th.dataset.sort);
  const tbody = tbl.querySelector("tbody");
  const rows = [...tbody.querySelectorAll(":scope > tr:not(.grp-hdr):not(.grp-rows)")];
  if (!rows.length) return;
  const dir = tbl.dataset.sortDir === "asc" ? "desc" : "asc";
  tbl.dataset.sortDir = dir;
  rows.sort((a, b) => {
    let av = a.cells[col] ? a.cells[col].textContent.trim() : "",
      bv = b.cells[col] ? b.cells[col].textContent.trim() : "";
    const an = parseFloat(av.replace(/[£$,%—]/g, "")),
      bn = parseFloat(bv.replace(/[£$,%—]/g, ""));
    if (!isNaN(an) && !isNaN(bn)) return dir === "asc" ? an - bn : bn - an;
    const ad = new Date(av),
      bd = new Date(bv);
    if (!isNaN(ad) && !isNaN(bd)) return dir === "asc" ? ad - bd : bd - ad;
    return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  rows.forEach((r) => tbody.appendChild(r));
});
