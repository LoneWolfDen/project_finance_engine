// Import a workbook exported by this app (Data & Reports → Import Excel workbook), usually after
// editing its configuration sheets in Excel. Shows a preview first; applying is one save, so
// Settings → Save history can undo it.

let pendingImport = null; // { cfg, summary } waiting for "Apply"

// Rows of a sheet as objects keyed by the header row. Empty cells are left out; cells Excel
// stores as dates (e.g. a date typed into a text column) come back as yyyy-mm-dd.
function readSheetTable(ws) {
  if (!ws || !ws["!ref"]) return [];
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const value = (r, c) => {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    if (!cell || cell.v === undefined || cell.v === null || cell.v === "") return undefined;
    if (cell.t === "n" && cell.z && XLSX.SSF.is_date(cell.z)) {
      const d = XLSX.SSF.parse_date_code(cell.v);
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    return cell.v;
  };
  const header = [];
  for (let c = range.s.c; c <= range.e.c; c++) header.push(value(range.s.r, c));
  const rows = [];
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const row = {};
    header.forEach((key, i) => {
      const v = key === undefined ? undefined : value(r, range.s.c + i);
      if (v !== undefined) row[key] = v;
    });
    if (Object.keys(row).length) rows.push(row);
  }
  return rows;
}

// Workbook → config sections it contains (sections whose sheet is missing are left out)
function configFromWorkbook(wb) {
  const out = {};
  const has = (name) => wb.SheetNames.includes(name);
  CONFIG_SHEETS.forEach(({ key, sheet }) => {
    if (has(sheet)) out[key] = readSheetTable(wb.Sheets[sheet]);
  });
  if (has(HOLIDAYS_SHEET)) {
    out.holidays = {};
    readSheetTable(wb.Sheets[HOLIDAYS_SHEET]).forEach((r) => {
      if (r.Location && r.Date) (out.holidays[r.Location] = out.holidays[r.Location] || []).push(String(r.Date));
    });
  }
  if (has(VERSIONS_SHEET)) {
    const versions = new Map();
    readSheetTable(wb.Sheets[VERSIONS_SHEET]).forEach(({ version_id, version_name, version_saved, ...rule }) => {
      if (!versions.has(version_id))
        versions.set(version_id, { id: version_id, name: version_name, saved: version_saved, resources: [] });
      versions.get(version_id).resources.push(rule);
    });
    out.resource_versions = [...versions.values()];
  }
  if (has(SETTINGS_SHEET)) {
    out.settings = {};
    readSheetTable(wb.Sheets[SETTINGS_SHEET]).forEach((r) => r.Setting && (out.settings[r.Setting] = r.Value));
  }
  return out;
}

function previewWorkbookImport() {
  const input = document.getElementById("wbImport");
  const box = document.getElementById("wbImportPreview");
  const file = input && input.files[0];
  pendingImport = null;
  if (!file) return (box.innerHTML = '<span style="color:#c62828">Select the .xlsx file first.</span>');
  box.innerHTML = "Reading…";
  file.arrayBuffer().then((buf) => {
    let wb;
    try {
      wb = XLSX.read(buf, { cellNF: true }); // keep number formats: they tell dates from numbers
    } catch (e) {
      return (box.innerHTML = `<span style="color:#c62828">Not a readable Excel file: ${escapeHtml(e.message)}</span>`);
    }
    const meta = wb.SheetNames.includes(META_SHEET) ? readSheetTable(wb.Sheets[META_SHEET]) : [];
    const isOurs = meta.some((r) => r.Key === "format" && r.Value === WORKBOOK_FORMAT);
    const imported = configFromWorkbook(wb);
    const current = loadWork();
    const cfg = JSON.parse(JSON.stringify(current));
    const { settings, ...sections } = imported;
    Object.assign(cfg, sections, settings || {});
    DERIVED_KEYS.forEach((k) => delete cfg[k]);
    const errors = [
      ...validateData("po_details", cfg.po_details || []).map((e) => "PO Details " + e),
      ...validateData("resources", cfg.resources || []).map((e) => "Resources " + e),
      ...(cfg.holidays ? validateData("holidays", cfg.holidays).map((e) => "Holidays " + e) : []),
    ];
    const count = (v) => (Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : v ? 1 : 0);
    const rows = [
      ...CONFIG_SHEETS.map(({ key, sheet }) => [sheet, key]),
      [HOLIDAYS_SHEET, "holidays"],
      [VERSIONS_SHEET, "resource_versions"],
    ].map(([sheet, key]) =>
      key in imported
        ? [sheet, count(imported[key]), count(current[key])]
        : [sheet, "not in workbook (kept)", count(current[key])],
    );
    pendingImport = errors.length ? null : { cfg };
    let html = isOurs
      ? ""
      : '<p class="val-err">⚠️ This workbook was not exported by this app; only sheets with the expected names are read.</p>';
    html += `<div class="tw"><table id="tblImportPreview">${tableHead(["Sheet", "Rows in workbook", "Rows now"])}<tbody>`;
    rows.forEach((r) => (html += tableRow(r)));
    html += "</tbody></table></div>";
    if (settings && Object.keys(settings).length)
      html += `<p style="font-size:.72rem">Settings: ${Object.entries(settings)
        .map(([k, v]) => `${escapeHtml(k)} = ${escapeHtml(v)}`)
        .join(", ")}</p>`;
    if (errors.length) {
      html += `<div class="val-err"><strong>Fix these in the workbook and preview again:</strong><ul>${errors
        .slice(0, 20)
        .map((e) => `<li>${escapeHtml(e)}</li>`)
        .join("")}</ul>${errors.length > 20 ? `…and ${errors.length - 20} more` : ""}</div>`;
    } else {
      html += '<button class="btn btn-green" onclick="applyWorkbookImport()">✅ Apply import</button> ';
      html +=
        '<span style="font-size:.72rem;color:#888">Replaces these sections; the current config stays in Settings → Save history.</span>';
    }
    box.innerHTML = html;
  });
}

function applyWorkbookImport() {
  if (!pendingImport) return;
  const cfg = pendingImport.cfg;
  pendingImport = null;
  saveWork(cfg);
  // Actuals per project are rebuilt from the timesheet with the imported resource rates
  if (cfg.raw_actuals && cfg.raw_actuals.length) aggregateActuals(cfg.raw_actuals);
  toast("✓ Workbook imported");
  render();
}
