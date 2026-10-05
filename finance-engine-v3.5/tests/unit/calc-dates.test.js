// SRC-001: CFE.calc.dates (parseDate, parseValidityEnd) and CFE.require. Runs in Node and in the browser.
(function () {
  // In Node the app scripts are not preloaded: evaluate the modules in this context.
  if (typeof CFE === 'undefined') (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  if (!CFE.calc.dates) (0, eval)(CFE_NODE.readFile('app/calc/dates.js'));
  var T = CFE_TEST, assert = T.assert, D = CFE.calc.dates;

  T.suite('CFE.calc.dates', function () {
    T.test('parseDate: ISO input is kept (time part dropped)', function () {
      assert.equal(D.parseDate('2025-07-01'), '2025-07-01');
      assert.equal(D.parseDate('2025-07-01T10:00:00'), '2025-07-01');
    });

    T.test('parseDate: uk and us hints', function () {
      assert.equal(D.parseDate('03/04/2025', 'uk'), '2025-04-03');
      assert.equal(D.parseDate('03/04/2025', 'us'), '2025-03-04');
      assert.equal(D.parseDate('3-4-25', 'uk'), '2025-04-03', 'two-digit year becomes 20yy');
    });

    T.test('parseDate: auto-detect, ambiguous defaults to US', function () {
      assert.equal(D.parseDate('25/12/2025'), '2025-12-25', 'first part > 12 is the day');
      assert.equal(D.parseDate('12/25/2025'), '2025-12-25', 'second part > 12 is the day');
      assert.equal(D.parseDate('03/04/2025'), '2025-03-04', 'ambiguous → m/d/yyyy');
    });

    T.test('parseDate: empty and invalid', function () {
      assert.equal(D.parseDate(''), '');
      assert.equal(D.parseDate(null), '');
      assert.equal(D.parseDate('not a date'), '');
    });

    T.test('parseValidityEnd: mm-yy, mm-yyyy and year-only give the last day of the period', function () {
      function ymd(d) { return [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('-'); }
      assert.equal(ymd(D.parseValidityEnd('12-25')), '2025-12-31');
      assert.equal(ymd(D.parseValidityEnd('02-2028')), '2028-2-29');
      assert.equal(ymd(D.parseValidityEnd(2026)), '2026-12-31');
    });

    T.test('parseValidityEnd: missing or unrecognised → new Date("2025-12-31") (UTC; part of C-01)', function () {
      assert.equal(D.parseValidityEnd('').getTime(), new Date('2025-12-31').getTime());
      assert.equal(D.parseValidityEnd('soon').getTime(), new Date('2025-12-31').getTime());
    });

    T.test('CFE.require returns a loaded module and names a missing one', function () {
      assert.equal(CFE.require('calc.dates'), D);
      assert.throws(function () { CFE.require('calc.nothing'); }, 'CFE module calc.nothing not loaded – check script order in index.html');
    });
  });
})();
