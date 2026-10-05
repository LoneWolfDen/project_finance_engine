// SRC-003: CFE.calc.actuals (rowCost, aggregateActualsByProject, computeActualsMonthly,
// computeActualsFromCache, deduplicateActuals). Runs in Node and in the browser.
(function () {
  // In Node the app scripts are not preloaded: evaluate the modules in this context.
  if (typeof CFE === 'undefined') (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  ['dates', 'fx', 'actuals'].forEach(function (m) {
    if (!CFE.calc[m]) (0, eval)(CFE_NODE.readFile('app/calc/' + m + '.js'));
  });
  var T = CFE_TEST, assert = T.assert, A = CFE.calc.actuals;

  function cfg() {
    return {
      po_details: [{ PO_Team_Identifier: 'T1', ProjectID: 111, PO_WO_value: 10000 }],
      resources: [
        { empl_id: 1, po_team: 'T1', projectID: 111, start: '2025-01-01', end: '2025-06-30', bill_rate: 100, hour_mult: 1 },
        { empl_id: 1, po_team: 'T1', projectID: 111, start: '2025-07-01', end: '2025-12-31', bill_rate: 120, hour_mult: 1 }
      ],
      ot_params: [{ type: 'Overtime_Hours', effective: '2025-01-01', multiplier: 1.5 }]
    };
  }
  function row(empl, date, reg, ot) { return { 'Empl ID': String(empl), 'Reported Dt': date, 'Project ID': '111', 'Regular Hours': String(reg), 'Overtime Hours': String(ot || 0) }; }

  T.suite('CFE.calc.actuals', function () {
    T.test('rowCost: rule in force on the date, OT at the multiplier; no rule → null', function () {
      assert.equal(A.rowCost(cfg(), row(1, '6/30/2025', 8), '2025-06-30'), 800);
      assert.equal(A.rowCost(cfg(), row(1, '7/1/2025', 8, 2), '2025-07-01'), 8 * 120 + 2 * 120 * 1.5);
      assert.equal(A.rowCost(cfg(), row(9, '7/1/2025', 8), '2025-07-01'), null);
    });

    T.test('aggregateActualsByProject: per project and month, matched and unmatched counted', function () {
      // Mid-month dates: month keys use local time (C-01), so dates near a month boundary move in some zones.
      var r = A.aggregateActualsByProject(cfg(), [row(1, '6/15/2025', 8), row(1, '7/15/2025', 8), row(9, '7/15/2025', 8), row(1, 'bad date', 8)]);
      assert.deepEqual(r.byProject, { 111: { 'Jun-25': 800, 'Jul-25': 960 } });
      assert.equal(r.matched, 2);
      assert.equal(r.unmatched, 1, 'the row with an unparseable date is skipped, not counted');
    });

    T.test('computeActualsFromCache: monthly totals and burn against the PO value', function () {
      var c = cfg(); c.actuals_by_project = { 111: { 'Jul-25': 960, 'Jun-25': 800 } };
      assert.deepEqual(A.computeActualsFromCache(c, null, { 111: 'T1' }), [
        { month: 'Jun-25', actuals: 800, actuals_burn: 9200 },
        { month: 'Jul-25', actuals: 960, actuals_burn: 8240 }
      ]);
      assert.deepEqual(A.computeActualsFromCache(c, ['T2'], { 111: 'T1' }), [], 'filtered out');
    });

    T.test('computeActualsMonthly: from raw rows (its own legacy formula, kept as-is)', function () {
      var c = cfg(); c.raw_actuals = [row(1, '6/15/2025', 8), row(1, '7/15/2025', 8)];
      assert.deepEqual(A.computeActualsMonthly(c, null, { 111: 'T1' }), [
        { month: 'Jun-25', actuals: 800, forecast: null, actuals_burn: 9200, forecast_burn: null },
        { month: 'Jul-25', actuals: 960, forecast: null, actuals_burn: 8240, forecast_burn: null }
      ]);
    });

    T.test('deduplicateActuals: exact rows only (DAT-006)', function () {
      var c = { raw_actuals: [row(1, '7/1/2025', 8), row(1, '7/1/2025', 8), row(1, '7/1/2025', 2)] };
      var r = A.deduplicateActuals(c);
      assert.equal(r.removed, 1);
      assert.equal(c.raw_actuals.length, 2);
      assert.equal(A.actualsRowKey({ b: ' x', a: 1 }), A.actualsRowKey({ a: '1', b: 'x' }));
    });
  });
})();
