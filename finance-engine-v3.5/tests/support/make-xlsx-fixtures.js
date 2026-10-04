#!/usr/bin/env node
// Generates tests/fixtures/xlsx/timesheet-basic.xlsx with the vendored SheetJS that index.html
// loads (0.18.5 when the fixture was first made; 0.20.3 since BLD-002), in a vm context.
// Built-in Node modules only.
//
//   node tests/support/make-xlsx-fixtures.js
//
// The workbook holds the first 20 rows of tests/fixtures/legacy-config-basic.json raw_actuals
// (synthetic). Re-running rewrites the file; zip timestamps make the bytes differ each time,
// so only re-run it when the fixture content should change.
//
// When required (not run), it only exports small fixture helpers for tests/unit/fixtures.test.js.
'use strict';

const fs = require('fs');
const path = require('path');

const APP_DIR = path.resolve(__dirname, '..', '..');
const OUT = path.join(APP_DIR, 'tests', 'fixtures', 'xlsx', 'timesheet-basic.xlsx');

function main() {
  const XLSX = require('./vendor-loader.js').sheetjs().XLSX;

  const basic = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'tests', 'fixtures', 'legacy-config-basic.json'), 'utf8'));
  const rows = basic.raw_actuals.slice(0, 20);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Timesheet');
  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(base64, 'base64'));
  console.log('Wrote ' + path.relative(APP_DIR, OUT) + ' (' + rows.length + ' rows, SheetJS ' + XLSX.version + ')');
}

const FIXTURES_DIR = path.join(APP_DIR, 'tests', 'fixtures');

// Every file under tests/fixtures/, as paths relative to it (e.g. 'xlsx/timesheet-basic.xlsx').
function listFiles() {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.relative(FIXTURES_DIR, path.join(dir, e.name)).split(path.sep).join('/')]);
  return walk(FIXTURES_DIR).sort();
}

// Bytes of a file given relative to finance-engine-v3.5/.
function readBytes(rel) {
  return Array.from(fs.readFileSync(path.join(APP_DIR, rel)));
}

module.exports = { listFiles, readBytes };

if (require.main === module) main();
