// IMP-002: Continuum.provenance (file records, row references). Runs in Node and in the browser.
(function () {
  // In Node the app scripts are not preloaded: evaluate the module in this context.
  if (typeof Continuum === 'undefined' || !Continuum.provenance) (0, eval)(CFE_NODE.readFile('app/continuum-core/provenance.js'));
  var T = CFE_TEST, assert = T.assert, P = Continuum.provenance;
  var SHA = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

  function input(over) {
    var p = {
      name: 'PS_TIMESHEET_2026-09-30.xlsx', size: 48213, lastModified: Date.UTC(2026, 8, 30, 17, 5, 0), sha256: SHA,
      sourceSystem: 'PeopleSoft (query export)', parser: 'sheetjs', parserVersion: '0.20.3',
      mappingProfile: 'peoplesoft-timesheet-v1', sheet: 'Sheet1', headerRow: 1,
      rowsRead: 48211, rowsUsed: 48090, asOf: '2026-09-30', importedUtc: '2026-10-05T09:30:00Z'
    };
    Object.keys(over || {}).forEach(function (k) { p[k] = over[k]; });
    return p;
  }

  T.suite('Continuum.provenance', function () {
    T.test('fileRecord: the DATA_AND_STORAGE §7 shape, frozen', function () {
      var r = P.fileRecord(input());
      assert.deepEqual(r, {
        file_id: 'ba7816bf8f01', name: 'PS_TIMESHEET_2026-09-30.xlsx', size: 48213, last_modified: '2026-09-30T17:05:00.000Z',
        sha256: SHA, imported_utc: '2026-10-05T09:30:00Z', source_system: 'PeopleSoft (query export)', parser: 'sheetjs',
        parser_version: '0.20.3', mapping_profile: 'peoplesoft-timesheet-v1', sheet: 'Sheet1', header_row: 1,
        rows_read: 48211, rows_used: 48090, as_of: '2026-09-30'
      });
      assert.ok(Object.isFrozen(r));
    });

    T.test('fileRecord: optional fields may be empty; fileId can be chosen', function () {
      var r = P.fileRecord(input({ lastModified: null, mappingProfile: undefined, sheet: null, headerRow: null, asOf: null, fileId: 'f3' }));
      assert.equal(r.file_id, 'f3');
      assert.equal(r.last_modified, null);
      assert.equal(r.sheet, null);
      assert.equal(r.as_of, null);
    });

    T.test('fileRecord: every problem is listed and nothing is returned', function () {
      assert.throws(function () {
        P.fileRecord(input({ name: ' ', size: -1, sha256: 'ABC', rowsUsed: 50000, asOf: '30/09/2026', importedUtc: '2026-10-05 09:30' }));
      }, 'Invalid provenance record');
      try { P.fileRecord(input({ name: '', size: 1.5, rowsUsed: 50000 })); } catch (e) {
        assert.ok(/name:/.test(e.message) && /size:/.test(e.message) && /rowsUsed cannot be more than rowsRead/.test(e.message), e.message);
      }
      assert.throws(function () { P.fileRecord(); }, 'Invalid provenance record');
    });

    T.test('rowRef: {file, sheet, row}, frozen and checked', function () {
      var ref = P.rowRef('f3', 'Sheet1', 1022);
      assert.deepEqual(ref, { file: 'f3', sheet: 'Sheet1', row: 1022 });
      assert.ok(Object.isFrozen(ref));
      assert.deepEqual(P.rowRef('f3', '', 2), { file: 'f3', sheet: null, row: 2 }, 'CSV files have no sheet');
      assert.throws(function () { P.rowRef('', 'S', 1); }, 'file id');
      assert.throws(function () { P.rowRef('f3', 'S', 0); }, 'row number');
    });
  });
})();
