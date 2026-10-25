// Small builders for HTML repeated across tabs (tables, cards, timelines).

// Builders for markup repeated across tabs. Each returns exactly the HTML that
// was previously written out by hand, so the rendered page is unchanged.

// <thead> row. A label ending in "⇅" becomes a sortable column (see the
// th[data-sort] click handler above); data-sort is the column index.
function tableHead(labels) {
  const cells = labels.map((label, i) =>
    label.endsWith("⇅") ? `<th data-sort="${i}" style="cursor:pointer">${label}</th>` : `<th>${label}</th>`,
  );
  return `<thead><tr>${cells.join("")}</tr></thead>`;
}

// A <td> with an inline style, for use inside tableRow().
function cell(html, style) {
  return { html, style };
}

// <tr> of plain values and/or cell() objects.
function tableRow(cells) {
  const tds = cells.map((c) =>
    c != null && typeof c === "object" ? `<td style="${c.style}">${c.html}</td>` : `<td>${c}</td>`,
  );
  return `<tr>${tds.join("")}</tr>`;
}

// Clickable header row of a collapsible group inside a table.
function groupHeaderRow(colspan, label) {
  return `<tr class="grp-hdr" onclick="toggleGrp(this)"><td colspan="${colspan}">${label}</td></tr>`;
}

// Summary card: <div class="card {cls}"><h3>title</h3><div class="v">value</div></div>
function statCard(cls, title, value, valueStyle = "") {
  const cardCls = cls ? "card " + cls : "card";
  const vStyle = valueStyle ? ` style="${valueStyle}"` : "";
  return `<div class="${cardCls}"><h3>${title}</h3><div class="v"${vStyle}>${value}</div></div>`;
}

// "Expand All" / "Collapse All" buttons for the grouped section with this id.
function expandCollapseButtons(containerId) {
  const btn = (cls, expand, label) =>
    `<button class="btn ${cls}" style="font-size:.65rem;padding:2px 8px" onclick="toggleAllGrps('${containerId}',${expand})">${label}</button>`;
  return btn("btn-blue", true, "Expand All") + " " + btn("btn-orange", false, "Collapse All");
}

// Header that shows/hides the element right after it.
function collapsibleHeader(label) {
  return `<div class="collapsible-hdr" onclick="this.classList.toggle('collapsed');this.nextElementSibling.classList.toggle('hidden')">${label}</div>`;
}

// Month labels above a Gantt-style timeline; each label sits at its % offset
// within the start→end span. labelWidth matches the row-name column width.
function monthAxis(start, end, span, labelWidth, height) {
  let html = `<div style="margin-left:${labelWidth}px;position:relative;height:${height}px;font-size:.6rem;color:#888;margin-bottom:4px">`;
  let monthStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (monthStart <= end) {
    const l = ((monthStart - start) / span) * 100;
    if (l >= 0 && l <= 100)
      html += `<span style="position:absolute;left:${l.toFixed(1)}%">${MONTH_NAMES[monthStart.getUTCMonth()]} ${String(monthStart.getUTCFullYear()).slice(2)}</span>`;
    monthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  }
  return html + "</div>";
}

// Columns of the "Actuals Date Range by Project" table (Utilization and Data tabs).
const DATE_RANGE_COLS = [
  "Project ID ⇅",
  "PO_Team",
  "Start Date ⇅",
  "End Date ⇅",
  "# Rows ⇅",
  "Duration (days) ⇅",
  "Avg Rows/Week",
];

// Red when over forecast, green when under, unstyled when unknown.
function varianceStyle(v) {
  return v != null ? (v > 0 ? "color:#c62828" : "color:#2e7d32") : "";
}

// Red above 90%, orange above 70%, otherwise green.
function pctColor(pct) {
  return pct > 90 ? "#c62828" : pct > 70 ? "#e65100" : "#2e7d32";
}
// Text typed by users (names, notes) -> safe to put in HTML
function escapeHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}
