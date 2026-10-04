// BLD-002: the vendored SheetJS used by the legacy app reads and writes workbooks as before.
// Node only (loads the library from disk into a vm context); not listed in browser-suites.js.
// The golden tests/golden/vendor/xlsx-basic.json was produced with SheetJS 0.18.5 before the upgrade.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var vm = CFE_NODE.support('vendor-loader.js');

  T.suite('Vendored SheetJS', function () {
    T.test('the app loads exactly one vendored SheetJS build', function () {
      var lib = vm.sheetjs();
      assert.ok(/^vendor\/xlsx-[0-9.]+\/xlsx\.full\.min\.js$/.test(lib.src), lib.src);
      assert.ok(typeof lib.XLSX.version === 'string');
    });

    T.test('parses tests/fixtures/xlsx/timesheet-basic.xlsx into the same rows as 0.18.5', function () {
      var XLSX = vm.sheetjs().XLSX;
      var wb = XLSX.read(vm.bytes('tests/fixtures/xlsx/timesheet-basic.xlsx'), { type: 'array' });
      var ws = wb.Sheets[wb.SheetNames[0]];
      T.golden('vendor/xlsx-basic.json', { sheetNames: wb.SheetNames, rows: XLSX.utils.sheet_to_json(ws) });
    });

    T.test('json_to_sheet + write + read round trip keeps rows', function () {
      var XLSX = vm.sheetjs().XLSX;
      var rows = [{ Name: 'R1_Lead', Hours: 7.5, Date: '2025-07-01' }, { Name: 'R2, "Arch"', Hours: 0, Date: '' }];
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Data');
      var out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      var back = XLSX.read(out, { type: 'array' });
      assert.deepEqual(back.SheetNames, ['Data']);
      assert.deepEqual(XLSX.utils.sheet_to_json(back.Sheets.Data, { defval: '' }), rows);
    });
  });
})();
