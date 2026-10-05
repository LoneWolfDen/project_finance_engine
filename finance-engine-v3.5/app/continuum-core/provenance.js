// Continuum.provenance: where imported data came from (IMP-002, DATA_AND_STORAGE §7).
// Classic script, no dependencies. Copy this folder verbatim between apps.
//
//   var rec = Continuum.provenance.fileRecord({
//     name: 'PS_TIMESHEET_2026-09-30.xlsx', size: 48213, lastModified: file.lastModified,
//     sha256: hex, sourceSystem: 'PeopleSoft (query export)', parser: 'sheetjs', parserVersion: '0.20.3',
//     mappingProfile: 'peoplesoft-timesheet-v1', sheet: 'Sheet1', headerRow: 1,
//     rowsRead: 48211, rowsUsed: 48090, asOf: '2026-09-30', importedUtc: new Date().toISOString()
//   });
//   // → frozen { file_id, name, size, last_modified, sha256, imported_utc, source_system, parser,
//   //            parser_version, mapping_profile, sheet, header_row, rows_read, rows_used, as_of }
//   Continuum.provenance.rowRef(rec.file_id, 'Sheet1', 1022)   // → frozen { file, sheet, row }
//
// fileRecord throws an Error listing every invalid field, so a bad record is never stored.
// file_id defaults to the first 12 characters of the SHA-256 (pass fileId to choose another).
(function (root) {
  'use strict';
  var C = root.Continuum = root.Continuum || {};

  var ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  var ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
  var SHA = /^[0-9a-f]{64}$/;

  function isText(v) { return typeof v === 'string' && v.trim() !== ''; }
  function isCount(v) { return typeof v === 'number' && isFinite(v) && v >= 0 && Math.floor(v) === v; }
  function optional(v) { return v === undefined || v === null; }

  function fileRecord(input) {
    var p = input || {}, problems = [];
    function need(ok, message) { if (!ok) problems.push(message); }

    need(isText(p.name), 'name: a non-empty file name is required');
    need(isCount(p.size), 'size: a whole number of bytes (0 or more) is required');
    need(optional(p.lastModified) || (typeof p.lastModified === 'number' && isFinite(p.lastModified)), 'lastModified: milliseconds since 1970 (File.lastModified) or empty');
    need(typeof p.sha256 === 'string' && SHA.test(p.sha256), 'sha256: 64 lower-case hex characters are required');
    need(isText(p.sourceSystem), 'sourceSystem: required (e.g. "PeopleSoft (query export)")');
    need(isText(p.parser), 'parser: required (e.g. "sheetjs" or "continuum-csv")');
    need(isText(p.parserVersion), 'parserVersion: required');
    need(optional(p.mappingProfile) || isText(p.mappingProfile), 'mappingProfile: text or empty');
    need(optional(p.sheet) || isText(p.sheet), 'sheet: text or empty');
    need(optional(p.headerRow) || (isCount(p.headerRow) && p.headerRow >= 1), 'headerRow: a row number from 1, or empty');
    need(isCount(p.rowsRead), 'rowsRead: a whole number (0 or more) is required');
    need(isCount(p.rowsUsed), 'rowsUsed: a whole number (0 or more) is required');
    if (isCount(p.rowsRead) && isCount(p.rowsUsed)) need(p.rowsUsed <= p.rowsRead, 'rowsUsed cannot be more than rowsRead');
    need(optional(p.asOf) || (typeof p.asOf === 'string' && ISO_DATE.test(p.asOf)), 'asOf: a date as YYYY-MM-DD, or empty');
    need(typeof p.importedUtc === 'string' && ISO_UTC.test(p.importedUtc), 'importedUtc: a UTC time such as 2026-10-05T09:30:00Z is required');
    need(optional(p.fileId) || isText(p.fileId), 'fileId: text or empty');
    if (problems.length) throw new Error('Invalid provenance record:\n- ' + problems.join('\n- '));

    return Object.freeze({
      file_id: optional(p.fileId) ? p.sha256.slice(0, 12) : p.fileId,
      name: p.name,
      size: p.size,
      last_modified: optional(p.lastModified) ? null : new Date(p.lastModified).toISOString(),
      sha256: p.sha256,
      imported_utc: p.importedUtc,
      source_system: p.sourceSystem,
      parser: p.parser,
      parser_version: p.parserVersion,
      mapping_profile: optional(p.mappingProfile) ? null : p.mappingProfile,
      sheet: optional(p.sheet) ? null : p.sheet,
      header_row: optional(p.headerRow) ? null : p.headerRow,
      rows_read: p.rowsRead,
      rows_used: p.rowsUsed,
      as_of: optional(p.asOf) ? null : p.asOf
    });
  }

  // A reference from one record (e.g. a timesheet row) back to its source: the row number as in the
  // file (header included, counting from 1).
  function rowRef(fileId, sheet, row) {
    if (!isText(fileId)) throw new Error('rowRef: a file id is required');
    if (!(isCount(row) && row >= 1)) throw new Error('rowRef: row must be a row number from 1');
    return Object.freeze({ file: fileId, sheet: optional(sheet) || sheet === '' ? null : String(sheet), row: row });
  }

  C.provenance = { fileRecord: fileRecord, rowRef: rowRef, version: '1.0.0' };
})(typeof globalThis !== 'undefined' ? globalThis : this);
