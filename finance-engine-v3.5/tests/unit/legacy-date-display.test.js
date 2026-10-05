// DEC-040: the legacy views show dates as DD-MM-YYYY; the stored data keeps YYYY-MM-DD.
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  function sandbox() {
    var L = loadLegacy({ now: '2025-08-15T12:00:00Z', confirm: function () { return false; } });
    var cfg = JSON.parse(CFE_NODE.readFile('tests/fixtures/legacy-config-basic.json'));
    cfg.actuals_monthly = [];  // normally written by aggregateActuals
    cfg.invoices[0].paid_date = '2025-09-30';
    L.get('localStorage').setItem('pf_working', JSON.stringify(cfg));
    return { L: L, cfg: cfg, D: function () { return L.get('buildData')(); } };
  }

  // Text of every table cell that holds a stored (YYYY-MM-DD) date.
  function isoCells(html) { return html.match(/<td[^>]*>\s*\d{4}-\d{2}-\d{2}\s*<\/td>/g) || []; }

  T.suite('Legacy date display (DEC-040)', function () {
    [['rRes', ['01-07-2025', '31-12-2025']],
     ['rInv', ['01-07-2025', '30-09-2025']],
     ['rExp', ['15-07-2025']],
     ['rPO', ['01-01-2025']],
     ['rUtil', []],
     ['rActDataInline', []]].forEach(function (c) {
      T.test(c[0] + ' shows DD-MM-YYYY and no stored-form dates', function () {
        var a = sandbox();
        var html = a.L.get(c[0])(a.D());
        assert.deepEqual(isoCells(html), [], c[0]);
        c[1].forEach(function (d) { assert.ok(html.indexOf('>' + d + '<') >= 0, c[0] + ' shows ' + d); });
      });
    });

    T.test('timesheet dates are read as M/D/YYYY before display: 7/1/2025 is 01-07-2025', function () {
      var a = sandbox();
      var html = a.L.get('rActDataInline')(a.D());
      var first = a.cfg.raw_actuals[0]['Reported Dt'];
      var shown = a.L.get('toDisplayDate')(a.L.get('parseDate')(first, 'us'));
      assert.ok(/^\d{2}-\d{2}-\d{4}$/.test(shown), shown);
      assert.ok(html.indexOf('>' + shown + '<') >= 0, 'shows ' + shown + ' for ' + first);
    });

    T.test('the stored data is unchanged (YYYY-MM-DD)', function () {
      var a = sandbox();
      var D = a.D();
      a.L.get('rRes')(D); a.L.get('rInv')(D);
      var stored = JSON.parse(a.L.get('localStorage').getItem('pf_working'));
      assert.equal(stored.resources[0].start, '2025-07-01');
      assert.equal(stored.invoices[0].period_from, '2025-07-01');
    });

    T.test('Excel export helper gives real local dates; empty and unreadable values stay as text', function () {
      var a = sandbox();
      var xlDate = a.L.get('xlDate');
      var d = xlDate('2025-12-31');
      assert.deepEqual([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()], [2025, 12, 31, 0]);
      assert.equal(xlDate(''), '');
      assert.equal(xlDate(undefined), '');
      assert.equal(xlDate('TBC'), 'TBC');
      assert.deepEqual(a.L.get('XL_DATE_OPTS'), { dateNF: 'dd-mm-yyyy' });
    });
  });
})();
