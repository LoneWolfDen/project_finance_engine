// SRC-001: CFE.calc.calendar (HOLIDAYS_BY_LOC, isWorkingDay). Runs in Node and in the browser.
(function () {
  if (typeof CFE === 'undefined') (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  if (!CFE.data.calendars) (0, eval)(CFE_NODE.readFile('app/data/calendars.js'));
  if (!CFE.calc.calendar) (0, eval)(CFE_NODE.readFile('app/calc/calendar.js'));
  var T = CFE_TEST, assert = T.assert, C = CFE.calc.calendar;
  // Noon UTC is the same calendar day in London, New York and Kolkata.
  function day(iso) { return new Date(iso + 'T12:00:00Z'); }

  T.suite('CFE.calc.calendar', function () {
    T.test('weekends are not working days', function () {
      assert.equal(C.isWorkingDay(day('2025-07-05'), 'UK'), false, 'Saturday');
      assert.equal(C.isWorkingDay(day('2025-07-06'), 'UK'), false, 'Sunday');
      assert.equal(C.isWorkingDay(day('2025-07-07'), 'UK'), true, 'Monday');
    });

    T.test('bank holidays depend on location', function () {
      assert.equal(C.isWorkingDay(day('2025-08-25'), 'UK'), false, 'UK summer bank holiday');
      assert.equal(C.isWorkingDay(day('2025-08-25'), 'India'), true);
      assert.equal(C.isWorkingDay(day('2025-08-15'), 'India'), false, 'Independence Day');
    });

    T.test('unknown or missing location falls back to UK', function () {
      assert.equal(C.isWorkingDay(day('2025-12-25'), 'Atlantis'), false);
      assert.equal(C.isWorkingDay(day('2025-08-25')), false);
    });

    T.test('holiday lists cover the eight legacy locations', function () {
      assert.deepEqual(Object.keys(C.HOLIDAYS_BY_LOC), ['UK', 'India', 'Germany', 'France', 'Canada', 'Ireland', 'Netherlands', 'Spain']);
      assert.ok(C.HOLIDAY_SETS.UK.has('2026-12-25'));
    });
  });
})();
