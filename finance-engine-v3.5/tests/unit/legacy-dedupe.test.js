// DAT-006 (DEC-016): de-duplicate only exact duplicate timesheet rows.
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  // tests/fixtures/timesheet-duplicates.csv has no quoted fields.
  function csvRows(rel) {
    var lines = CFE_NODE.readFile(rel).trim().split('\n');
    var headers = lines[0].split(',').map(function (h) { return h.trim(); });
    return lines.slice(1).map(function (line) {
      var vals = line.split(',');
      var o = {}; headers.forEach(function (h, i) { o[h] = (vals[i] || '').trim(); }); return o;
    });
  }
  function label(row) { return [row['Empl ID'], row.Activity, row['Regular Hours']].join('|'); }

  T.suite('Legacy exact-row de-duplication (DAT-006)', function () {
    T.test('timesheet-duplicates.csv: one exact duplicate removed, different-activity rows kept', function () {
      var L = loadLegacy();
      var r = L.get('deduplicateActuals')({ raw_actuals: csvRows('tests/fixtures/timesheet-duplicates.csv') });
      assert.equal(r.removed, 1);
      assert.deepEqual(r.cfg.raw_actuals.map(label), ['1001|PERFORM|6', '1001|TRAVEL|2', '1002|PERFORM|8', '1003|PERFORM|8']);
    });

    T.test('values are compared trimmed; key order does not matter', function () {
      var L = loadLegacy();
      var r = L.get('deduplicateActuals')({ raw_actuals: [{ a: '1', b: 'x ' }, { b: 'x', a: ' 1' }] });
      assert.equal(r.removed, 1);
    });

    T.test('rows that differ in any column are kept', function () {
      var L = loadLegacy();
      var r = L.get('deduplicateActuals')({ raw_actuals: [{ a: '1', b: 'x' }, { a: '1', b: 'y' }, { a: '1', c: 'x' }] });
      assert.equal(r.removed, 0);
    });

    T.test('upload warning reports exact duplicates and same employee+date+project rows separately', function () {
      var asked = [];
      var L = loadLegacy({ confirm: function (m) { asked.push(m); return false; } });
      L.get('processUpload')(csvRows('tests/fixtures/timesheet-duplicates.csv'), 'actuals');
      assert.equal(asked.length, 1);
      assert.ok(/1 exact duplicate rows \(will be removed on append\)/.test(asked[0]), asked[0]);
      assert.ok(/2 rows with the same employee\+date\+project but different details \(kept\)/.test(asked[0]), asked[0]);
    });
  });
})();
