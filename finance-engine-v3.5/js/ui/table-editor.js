// Editable table for one config section (Settings → Edit data): typed inputs, add/delete rows,
// validation before saving. Fields not shown as columns are kept as they are.
//
// editor = {
//   key, label,                     config section (cfg[key]) and title
//   columns: [{ field, label, type, required, options, suggest, width }],
//     type: text | number | date (yyyy-mm-dd) | bool | select (options) | currency (3 letters)
//           | id (stored as a number when all digits) | validity (2026 or mm-yy)
//     suggest: values offered while typing (text, currency)
//   toRows(cfg) / fromRows(rows)    optional, for sections that aren't an array of rows (holidays)
// }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Value as typed in the input; null when empty
function readCell(col, input) {
  if (col.type === "bool") return input.checked;
  const raw = input.value.trim();
  if (raw === "") return null;
  if (col.type === "number") return Number(raw);
  if (col.type === "currency") return raw.toUpperCase();
  if (col.type === "id" || col.type === "validity") return /^\d{1,15}$/.test(raw) ? Number(raw) : raw;
  return raw;
}

// Problem with a cell's value, or "" when fine
function cellError(col, value) {
  if (value === null || value === "") return col.required ? "required" : "";
  if (col.type === "number" && !Number.isFinite(value)) return "must be a number";
  if (col.type === "date" && (!ISO_DATE.test(value) || isNaN(new Date(value)))) return "must be a date (yyyy-mm-dd)";
  if (col.type === "currency" && !/^[A-Z]{3}$/.test(value)) return "must be a 3-letter currency code";
  if (col.type === "validity" && !isValidValidity(value)) return "must be a year (2026) or mm-yy (06-26)";
  if (col.type === "select" && !col.options.includes(value)) return "must be one of " + col.options.join(", ");
  return "";
}

function editorInput(col, value, key) {
  const attrs = `data-f="${col.field}" oninput="markEditorDirty(this)"`;
  const v = value === undefined || value === null ? "" : value;
  if (col.type === "bool") return `<input type="checkbox" ${attrs}${v ? " checked" : ""}>`;
  if (col.type === "select") {
    const options = [...new Set([...(v === "" ? [""] : []), ...col.options, ...(v === "" ? [] : [v])])];
    return `<select ${attrs}>${options.map((o) => `<option${o === v ? " selected" : ""}>${escapeHtml(o)}</option>`).join("")}</select>`;
  }
  // A value the browser's date/number input can't show (e.g. 15/07/2025, "1,000") would display as
  // empty and be lost on save, so it stays a text input and is flagged until corrected
  const fitsDate = v === "" || ISO_DATE.test(v);
  const fitsNumber = v === "" || Number.isFinite(Number(v));
  const type = col.type === "date" && fitsDate ? "date" : col.type === "number" && fitsNumber ? "number" : "text";
  const flagged = (col.type === "date" && !fitsDate) || (col.type === "number" && !fitsNumber);
  const list = col.suggest ? ` list="dl_${key}_${col.field}"` : "";
  const step = type === "number" ? ' step="any"' : "";
  const err = flagged ? ` class="te-err" title="${escapeHtml(cellError(col, v) || "check this value")}"` : "";
  return `<input type="${type}" ${attrs}${list}${step}${err} value="${escapeHtml(v)}">`;
}

function renderTableEditor(editor, cfg) {
  const rows = editor.toRows ? editor.toRows(cfg) : cfg[editor.key] || [];
  const id = editor.key;
  let html = `<div class="te-wrap" id="te_${id}">`;
  html += `<div class="tw"><table class="tblEdit"><thead><tr>`;
  html += editor.columns
    .map((c) => `<th${c.width ? ` style="width:${c.width}"` : ""}>${c.label}${c.required ? " *" : ""}</th>`)
    .join("");
  html += "<th></th></tr></thead><tbody>";
  const rowHtml = (row, i) =>
    `<tr data-i="${i}">` +
    editor.columns.map((c) => `<td>${editorInput(c, row[c.field], id)}</td>`).join("") +
    `<td><button class="te-del" title="Delete row" onclick="deleteEditorRow(this)">🗑️</button></td></tr>`;
  html += rows.map(rowHtml).join("");
  html += "</tbody></table></div>";
  // template for new rows and suggestion lists
  html += `<template id="te_tpl_${id}">${rowHtml(editor.blank ? editor.blank(cfg) : {}, "new")}</template>`;
  editor.columns
    .filter((c) => c.suggest)
    .forEach((c) => {
      html += `<datalist id="dl_${id}_${c.field}">${c
        .suggest(cfg)
        .map((s) => `<option value="${escapeHtml(s)}">`)
        .join("")}</datalist>`;
    });
  html += '<div class="te-actions">';
  html += `<button class="btn btn-blue" style="font-size:.7rem" onclick="addEditorRow('${id}')">➕ Add row</button>`;
  html += `<button class="btn btn-green" style="font-size:.7rem" onclick="saveTableEditor('${id}')">💾 Save ${editor.label}</button>`;
  html += `<span class="te-status" id="te_status_${id}">${rows.length} row(s)</span>`;
  html += `</div><div class="te-errors" id="te_errors_${id}"></div></div>`;
  return html;
}

function markEditorDirty(el) {
  const wrap = el.closest(".te-wrap");
  wrap.classList.add("te-dirty");
  wrap.querySelector(".te-status").textContent = "● unsaved changes";
  el.classList.remove("te-err");
}
function addEditorRow(id) {
  const wrap = document.getElementById("te_" + id);
  const row = document.getElementById("te_tpl_" + id).content.firstElementChild.cloneNode(true);
  wrap.querySelector("tbody").appendChild(row);
  markEditorDirty(row.querySelector("input,select"));
  row.querySelector("input,select").focus();
}
function deleteEditorRow(btn) {
  const wrap = btn.closest(".te-wrap");
  btn.closest("tr").remove();
  markEditorDirty(wrap.querySelector(".te-status"));
}

// Read the table, validate, save. Existing rows keep fields that aren't columns.
function saveTableEditor(id) {
  const editor = DATA_TABLES.find((e) => e.key === id);
  const wrap = document.getElementById("te_" + id);
  const cfg = loadWork();
  const original = editor.toRows ? editor.toRows(cfg) : cfg[editor.key] || [];
  const errors = [];
  const rows = [...wrap.querySelectorAll("tbody tr")].map((tr, n) => {
    const i = tr.dataset.i;
    const row = i === "new" ? {} : JSON.parse(JSON.stringify(original[Number(i)]));
    editor.columns.forEach((col) => {
      const input = tr.querySelector(`[data-f="${col.field}"]`);
      const value = readCell(col, input);
      const problem = cellError(col, value);
      input.classList.toggle("te-err", !!problem);
      input.title = problem;
      if (problem) errors.push(`Row ${n + 1}, ${col.label}: ${problem}`);
      if (col.type === "bool" && value === false && !(col.field in row)) return; // don't add false to rows without it
      if (value === null) {
        // empty: remove the field, unless it was already empty (null / "") — keep that as it was
        if (row[col.field] !== null && row[col.field] !== "") delete row[col.field];
      } else row[col.field] = value;
    });
    return row;
  });
  const data = editor.fromRows ? editor.fromRows(rows) : rows;
  if (!errors.length) errors.push(...validateData(editor.key, data));
  const box = document.getElementById("te_errors_" + id);
  if (errors.length) {
    box.innerHTML = `<div class="val-err"><strong>Not saved — fix ${errors.length} problem(s):</strong><ul>${errors
      .slice(0, 15)
      .map((e) => `<li>${escapeHtml(e)}</li>`)
      .join("")}</ul></div>`;
    return false;
  }
  cfg[editor.key] = data;
  saveWork(cfg);
  toast(`✓ Saved ${editor.label} (${rows.length} rows)`);
  render();
  return true;
}
