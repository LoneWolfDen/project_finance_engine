// SRC-004: CFE.data.calendars (synthetic test calendar with provenance) and calendarCoverage.
// Runs in Node and in the browser.
(function () {
  // In Node the app scripts are not preloaded: evaluate the modules in this context.
  if (typeof CFE === 'undefined') (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  if (!CFE.data.calendars) (0, eval)(CFE_NODE.readFile('app/data/calendars.js'));
  if (!CFE.calc.calendar) (0, eval)(CFE_NODE.readFile('app/calc/calendar.js'));
  var T = CFE_TEST, assert = T.assert, Cal = CFE.data.calendars, C = CFE.calc.calendar;

  T.suite('CFE.data.calendars', function () {
    T.test('declares schema, provenance and covered years', function () {
      assert.equal(Cal.schema_version, 1);
      assert.ok(/Synthetic test calendar/.test(Cal.source));
      assert.deepEqual(Cal.valid_years, [2025, 2026]);
    });

    T.test('every date is ISO, sorted, and inside the covered years', function () {
      Object.keys(Cal.locations).forEach(function (loc) {
        var list = Cal.locations[loc];
        list.forEach(function (d) {
          assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(d), loc + ' ' + d);
          assert.ok(Cal.valid_years.indexOf(Number(d.slice(0, 4))) >= 0, loc + ' ' + d + ' outside valid_years');
        });
        assert.deepEqual(list.slice().sort(), list, loc + ' sorted');
      });
    });

    T.test('the calendar module reads this data', function () {
      assert.equal(C.HOLIDAYS_BY_LOC, Cal.locations);
    });

    T.test('calendarCoverage', function () {
      assert.deepEqual(C.calendarCoverage(2025), { covered: true, locations: Object.keys(Cal.locations) });
      assert.equal(C.calendarCoverage(2026).covered, true);
      assert.deepEqual(C.calendarCoverage(2027), { covered: false, locations: [] });
      assert.equal(C.calendarCoverage('2026').covered, true, 'a year given as text works too');
    });
  });
})();
