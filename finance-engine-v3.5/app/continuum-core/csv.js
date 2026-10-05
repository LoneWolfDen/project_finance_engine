// Continuum.csv: an RFC 4180 CSV parser shared by all Continuum apps (IMP-001).
// Classic script, no dependencies. Copy this folder verbatim between apps.
//
//   var r = Continuum.csv.parse(text);
//   r.header   // ['Empl Name', 'Empl ID', …]  (exactly as in the file, BOM removed)
//   r.rows     // [{ 'Empl Name': 'Lead, R1', 'Empl ID': '1001', … }, …]  (every value is a string)
//   r.errors   // [{ line: 7, message: 'Row has 22 fields; the header has 23. The row was not imported.' }]
//
// Handles a UTF-8 byte-order mark, CRLF or LF line endings, quoted fields containing commas,
// quotes ("") and line breaks. Rows whose field count differs from the header are reported with
// the line they start on and left out, never padded or cut. Empty lines are skipped. The
// delimiter is always a comma; values are never trimmed, converted or evaluated.
(function (root) {
  'use strict';
  var C = root.Continuum = root.Continuum || {};

  // Splits text into records: [{line, fields:[…]}], plus syntax problems as errors.
  function records(text, errors) {
    var out = [];
    var fields = [], field = '', quoted = false, afterQuote = false, line = 1, recordLine = 1, sawData = false;
    var i = 0, n = text.length;

    function endField() { fields.push(field); field = ''; afterQuote = false; }
    function endRecord() {
      endField();
      if (sawData) out.push({ line: recordLine, fields: fields });
      fields = []; sawData = false;
    }

    while (i < n) {
      var c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }   // "" inside quotes = one quote
          quoted = false; afterQuote = true; i++; continue;
        }
        if (c === '\n') line++;
        field += c; i++; continue;
      }
      if (c === '"' && field === '' && !afterQuote) { quoted = true; sawData = true; i++; continue; }
      if (c === ',') { endField(); sawData = true; i++; continue; }
      if (c === '\r' || c === '\n') {
        endRecord();
        i += (c === '\r' && text[i + 1] === '\n') ? 2 : 1;
        line++; recordLine = line;
        continue;
      }
      if (afterQuote) {
        errors.push({ line: line, message: 'Unexpected text after a closing quote; it was kept as part of the value.' });
        afterQuote = false;
      }
      field += c; sawData = true; i++;
    }
    if (quoted) errors.push({ line: recordLine, message: 'A quoted value is not closed before the end of the file; the last row was not imported.' });
    else endRecord();
    return out;
  }

  function parse(text) {
    var errors = [];
    text = String(text == null ? '' : text);
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var recs = records(text, errors);
    if (!recs.length) return { header: [], rows: [], errors: errors.concat([{ line: 1, message: 'The file has no header row.' }]) };

    var header = recs[0].fields;
    var seen = {};
    header.forEach(function (h) {
      if (seen[h]) errors.push({ line: recs[0].line, message: 'The column "' + h + '" appears more than once; only its last value is kept in each row.' });
      seen[h] = true;
    });

    var rows = [];
    for (var r = 1; r < recs.length; r++) {
      var f = recs[r].fields;
      if (f.length !== header.length) {
        errors.push({ line: recs[r].line, message: 'Row has ' + f.length + ' fields; the header has ' + header.length + '. The row was not imported.' });
        continue;
      }
      var row = {};
      for (var k = 0; k < header.length; k++) row[header[k]] = f[k];
      rows.push(row);
    }
    errors.sort(function (a, b) { return a.line - b.line; });
    return { header: header, rows: rows, errors: errors };
  }

  C.csv = { parse: parse, version: '1.0.0' };
})(typeof globalThis !== 'undefined' ? globalThis : this);
