// SRC-001: CFE.calc.dates (parseDate, parseValidityEnd) and CFE.require; DEC-040: toDisplayDate, fromDisplayDate. Runs in Node and in the browser.
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

    T.test('toDisplayDate: stored YYYY-MM-DD is shown as DD-MM-YYYY (DEC-040)', function () {
      assert.equal(D.toDisplayDate('2025-12-31'), '31-12-2025');
      assert.equal(D.toDisplayDate('2025-07-01T10:00:00Z'), '01-07-2025', 'a timestamp shows its date');
      assert.equal(D.toDisplayDate(''), '');
      assert.equal(D.toDisplayDate(null), '');
      assert.equal(D.toDisplayDate(undefined), '');
      assert.equal(D.toDisplayDate('TBC'), 'TBC', 'anything else is shown unchanged');
      assert.equal(D.toDisplayDate('31-12-2025'), '31-12-2025');
    });

    T.test('fromDisplayDate: day first, never guessed; impossible dates refused', function () {
      assert.equal(D.fromDisplayDate('31-12-2025'), '2025-12-31');
      assert.equal(D.fromDisplayDate(' 05-06-2025 '), '2025-06-05', '05-06 is 5 June, not 6 May');
      assert.equal(D.fromDisplayDate('5/6/2025'), '2025-06-05');
      assert.equal(D.fromDisplayDate('2025-06-05'), '2025-06-05', 'stored form is accepted');
      assert.equal(D.fromDisplayDate('29-02-2028'), '2028-02-29');
      ['31-02-2025', '29-02-2025', '13-13-2025', '00-01-2025', '05-06-25', '2025-6-5', 'TBC', '', null].forEach(function (v) {
        assert.equal(D.fromDisplayDate(v), '', String(v));
      });
    });

    T.test('toDisplayDate and fromDisplayDate round-trip', function () {
      ['2024-02-29', '2025-01-01', '2026-12-31'].forEach(function (iso) {
        assert.equal(D.fromDisplayDate(D.toDisplayDate(iso)), iso);
      });
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
