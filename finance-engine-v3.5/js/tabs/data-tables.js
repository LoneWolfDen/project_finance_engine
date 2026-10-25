// ⚙️ Settings → Edit data: table editors for the config sections (see ui/table-editor.js)

const poTeamsOf = (cfg) => [...new Set((cfg.po_details || []).map((p) => p.PO_Team_Identifier).filter(Boolean))];
const currencyCodes = (cfg) =>
  [...new Set([...(cfg.fx_rates || []).map((r) => r.code), ...Object.keys(CURRENCY_SYMBOLS)])].filter(Boolean).sort();
const teamColumn = (field) => ({
  field,
  label: "PO_Team",
  type: "select",
  required: true,
  // options are filled per render (current PO teams)
  options: [],
  width: "16%",
});

const DATA_TABLES = [
  {
    key: "po_details",
    label: "PO Details",
    columns: [
      { field: "PO_Team_Identifier", label: "PO_Team", type: "text", required: true, width: "16%" },
      { field: "ProjectID", label: "Project ID", type: "id" },
      { field: "PO_WO_Number", label: "PO Number", type: "id" },
      { field: "PO_WO_value", label: "PO Value", type: "number", required: true },
      { field: "PO_Currency_Code", label: "Currency", type: "currency", required: true, suggest: currencyCodes },
      { field: "Normalized_Currency_Code", label: "Normalised", type: "currency", suggest: currencyCodes },
      { field: "PO_Validity_Year", label: "Valid to (2026 / 06-26)", type: "validity", required: true },
      { field: "WO_StartDate", label: "Start", type: "date", required: true },
      {
        field: "WO_Approval_Status",
        label: "Status",
        type: "text",
        suggest: () => ["Approved", "Pending", "Rejected"],
      },
      { field: "rollover_allowed", label: "Rollover", type: "bool" },
    ],
  },
  {
    key: "invoices",
    label: "Invoices",
    columns: [
      teamColumn("po_team"),
      { field: "invoice_number", label: "Invoice #", type: "text", required: true },
      { field: "period_from", label: "From", type: "date", required: true },
      { field: "period_to", label: "To", type: "date", required: true },
      { field: "amount", label: "Amount (PO currency)", type: "number", required: true },
      { field: "status", label: "Status", type: "select", options: ["Paid", "Submitted", "Draft"], required: true },
      { field: "paid_date", label: "Paid date", type: "date" },
      { field: "notes", label: "Notes", type: "text" },
    ],
    blank: () => ({ status: "Draft" }),
  },
  {
    key: "expenses",
    label: "Expenses",
    columns: [
      { field: "name", label: "Name", type: "text", required: true },
      { field: "date", label: "Date", type: "date", required: true },
      { field: "amount", label: "Amount", type: "number", required: true },
      { field: "currency", label: "Currency", type: "currency", required: true, suggest: currencyCodes },
      { field: "desc", label: "Description", type: "text" },
      { field: "projectID", label: "Project ID", type: "id" },
      teamColumn("po_team"),
    ],
  },
  {
    key: "fx_rates",
    label: "FX Rates",
    note: "Units of each currency per 1 GBP, from the effective date (e.g. USD 1.36, INR 88).",
    columns: [
      { field: "code", label: "Currency", type: "currency", required: true, suggest: currencyCodes },
      { field: "effective", label: "Effective from", type: "date", required: true },
      { field: "rate", label: "Rate per 1 GBP", type: "number", required: true },
    ],
  },
  {
    key: "ot_params",
    label: "OT Params",
    columns: [
      {
        field: "type",
        label: "Type",
        type: "text",
        required: true,
        suggest: (cfg) => [...new Set((cfg.ot_params || []).map((o) => o.type))],
      },
      { field: "effective", label: "Effective from", type: "date", required: true },
      { field: "multiplier", label: "Multiplier", type: "number", required: true },
      { field: "trc", label: "TRC", type: "text" },
    ],
  },
  {
    key: "holidays",
    label: "Holidays",
    note: "Bank holidays deducted from working days, per resource location.",
    columns: [
      {
        field: "location",
        label: "Location",
        type: "text",
        required: true,
        suggest: (cfg) => Object.keys(cfg.holidays || HOLIDAYS_BY_LOC),
      },
      { field: "date", label: "Date", type: "date", required: true },
    ],
    toRows: (cfg) =>
      Object.entries(cfg.holidays || HOLIDAYS_BY_LOC).flatMap(([location, days]) =>
        days.map((date) => ({ location, date })),
      ),
    fromRows: (rows) => {
      const out = {};
      rows.forEach((r) => (out[r.location] = out[r.location] || []).push(r.date));
      Object.values(out).forEach((days) => days.sort());
      return out;
    },
  },
];

// Settings → Edit data (all rows, whatever the Year / PO_Team filters)
function renderDataTables() {
  const cfg = loadWork();
  const teams = poTeamsOf(cfg);
  DATA_TABLES.forEach((e) => e.columns.forEach((c) => c.field === "po_team" && (c.options = teams)));
  let html = '<h3 style="font-size:.85rem;margin:1rem 0 .4rem">📝 Edit data</h3>';
  html +=
    '<p style="font-size:.72rem;color:#666;margin-bottom:.5rem">All rows, whatever the Year / PO_Team filters. Fields marked * are required; problems are highlighted and nothing is saved until they are fixed. Earlier versions stay in Save history.</p>';
  DATA_TABLES.forEach((e) => {
    const n = (e.toRows ? e.toRows(cfg) : cfg[e.key] || []).length;
    html += `<details class="cfg-section"><summary>${e.label} (${n})</summary><div class="inner">`;
    if (e.note) html += `<p style="font-size:.72rem;color:#666;margin-bottom:.4rem">${e.note}</p>`;
    html += renderTableEditor(e, cfg) + "</div></details>";
  });
  return html;
}
