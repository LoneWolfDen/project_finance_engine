// SRC-001: CFE.calc.fx (fxRateAsOf, otMultiplier). Runs in Node and in the browser.
(function () {
  if (typeof CFE === 'undefined') (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  if (!CFE.calc.fx) (0, eval)(CFE_NODE.readFile('app/calc/fx.js'));
  var T = CFE_TEST, assert = T.assert, F = CFE.calc.fx;
  var RATES = [
    { code: 'USD', effective: '2025-01-01', rate: 1.25 },
    { code: 'USD', effective: '2025-07-01', rate: 1.36 },
    { code: 'EUR', effective: '2025-01-01', rate: 1.17 }
  ];
  var OT = [
    { type: 'Weekday', effective: '2025-01-01', multiplier: 1.5 },
    { type: 'Weekday', effective: '2026-01-01', multiplier: 1.6 },
    { type: 'Weekend', effective: '2025-01-01', multiplier: 2 }
  ];

  T.suite('CFE.calc.fx', function () {
    T.test('fxRateAsOf: latest rate on or before the date', function () {
      assert.equal(F.fxRateAsOf(RATES, 'USD', '2025-06-30'), 1.25);
      assert.equal(F.fxRateAsOf(RATES, 'USD', '2025-07-01'), 1.36);
      assert.equal(F.fxRateAsOf(RATES, 'EUR', '2026-01-01'), 1.17);
    });

    T.test('fxRateAsOf: no rate → 1 (legacy fallback, kept as-is)', function () {
      assert.equal(F.fxRateAsOf(RATES, 'USD', '2024-12-31'), 1);
      assert.equal(F.fxRateAsOf(RATES, 'JPY', '2025-07-01'), 1);
    });

    T.test('otMultiplier: latest multiplier of that type on or before the date; none → 1', function () {
      assert.equal(F.otMultiplier(OT, 'any team', 'Weekday', '2025-12-31'), 1.5);
      assert.equal(F.otMultiplier(OT, 'any team', 'Weekday', '2026-02-01'), 1.6);
      assert.equal(F.otMultiplier(OT, 'any team', 'Weekend', '2026-02-01'), 2);
      assert.equal(F.otMultiplier(OT, 'any team', 'Holiday', '2026-02-01'), 1);
    });
  });
})();
