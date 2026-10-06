// UI-007: CFE.store.toCalcInput (dataset v1 → calc config). The shape checks run in Node and in the
// browser; the golden equivalence (fixture → draft → dataset → adapter → CFE.calc = legacy goldens)
// is Node only and uses the reference time zone of the goldens.
(function () {
  if (typeof CFE_NODE !== 'undefined') {
    if (typeof Continuum === 'undefined' || !Continuum.ref || !Continuum.provenance) {
      ['ref.js', 'provenance.js'].forEach(function (f) { (0, eval)(CFE_NODE.readFile('app/continuum-core/' + f)); });
    }
    if (typeof CFE === 'undefined' || !CFE.require) (0, eval)(CFE_NODE.readFile('app/cfe.js'));
    [['calc', 'dates'], ['data', 'calendars'], ['calc', 'calendar'], ['calc', 'fx'], ['calc', 'forecast'], ['calc', 'actuals'], ['data', 'schema'], ['data', 'mapping']].forEach(function (p) {
      if (!CFE[p[0]][p[1]]) (0, eval)(CFE_NODE.readFile('app/' + p[0] + '/' + p[1] + '.js'));
    });
    ['peoplesoft-timesheet-v1', 'resource-rules-v1', 'po-details-v1', 'invoices-v1', 'expenses-v1', 'fx-rates-v1', 'ot-rules-v1', 'references-crosswalk-v1']
      .forEach(function (id) { if (!CFE.data.mappings[id]) (0, eval)(CFE_NODE.readFile('app/data/mappings/' + id + '.js')); });
    if (!CFE.store.buildDataset) (0, eval)(CFE_NODE.readFile('app/store/build-dataset.js'));
    if (!CFE.store.toCalcInput) (0, eval)(CFE_NODE.readFile('app/store/legacy-cfg-adapter.js'));
  }
  var T = CFE_TEST, assert = T.assert, A = CFE.store.toCalcInput;

  function ds() {
    var src = { file: 'f', sheet: null, row: 2 };
    return {
      schema: 'cfe.dataset', schema_version: 1, data_as_of: '2025-08-31',
      references: [{ ref: 'O-1', name: 'A', status: 'active', links: { po_team_identifiers: ['T1', 'T2'] } }, { ref: 'O-2', name: 'B', status: 'active', links: { po_team_identifiers: ['T3'] } }],
      purchase_orders: [
        { po_number: '1', ref: 'O-1', po_team_identifier: 'T1', value: 1000, currency: 'GBP', normalized_currency: 'USD', start: '2025-01-01', validity_end: '2025-12-31', rollover_allowed: false, approval_status: 'Approved', src: src },
        { po_number: '2', ref: 'O-1', po_team_identifier: 'T2', value: 500, currency: 'GBP', start: '2026-01-01', validity_end: '2026-06-30', rollover_allowed: true, approval_status: 'Approved', src: src },
        { po_number: '3', ref: 'O-2', po_team_identifier: 'T3', value: 200, currency: 'GBP', start: '2025-01-01', validity_end: '2025-12-31', rollover_allowed: false, approval_status: 'Pending', src: src }
      ],
      people: [{ person_key: 'E7', display_name: 'R7', employee_id: '7', src: src }],
      resource_rules: [{ rule_id: 'x', ref: 'O-1', person_key: 'E7', role: 'Dev', location: 'UK', start: '2025-07-01', end: '2025-12-31', bill_rate: 100, currency: 'GBP', rate_unit: 'hour', allocation: 0.5, po_team_identifier: 'T1', src: src }],
      actuals: [
        { ref: 'O-1', person_key: 'E7', month: '2025-08', hours_type: 'regular', hours: 10, cost: 300, currency: 'GBP', src: { files: ['f'], rows: 2 } },
        { ref: 'O-1', person_key: 'E7', month: '2025-07', hours_type: 'regular', hours: 10, cost: 100, currency: 'GBP', src: { files: ['f'], rows: 2 } },
        { ref: 'O-1', person_key: 'E7', month: '2025-07', hours_type: 'overtime', hours: 1, cost: 50.5, currency: 'GBP', src: { files: ['f'], rows: 1 } },
        { ref: 'O-2', person_key: 'E7', month: '2025-07', hours_type: 'regular', hours: 1, cost: 7, currency: 'GBP', src: { files: ['f'], rows: 1 } }
      ],
      invoices: [{ invoice_id: 'I1', ref: 'O-2', period_from: '2025-07-01', period_to: '2025-07-31', amount: 9, currency: 'GBP', status: 'Paid', src: src }],
      expenses: [{ expense_id: 'e1', ref: 'O-1', person_key: 'E7', date: '2025-07-15', amount: 25, currency: 'GBP', description: 'Taxi', src: src }],
      fx_rates: [{ currency: 'USD', effective: '2025-01-01', rate: 1.3, src: src }],
      ot_rules: [{ type: 'Overtime_Hours', effective: '2025-01-01', multiplier: 1.5, src: src }],
      calendars: []
    };
  }

  T.suite('CFE.store.toCalcInput', function () {
    T.test('maps every entity to the legacy field names', function () {
      var c = A(ds());
      assert.deepEqual(c.po_details[0], { PO_Team_Identifier: 'T1', PO_WO_Number: '1', PO_WO_value: 1000, PO_Currency_Code: 'GBP', Normalized_Currency_Code: 'USD',
        PO_Validity: '12-2025', WO_StartDate: '2025-01-01', WO_Approval_Status: 'Approved', rollover_allowed: false, ref: 'O-1' });
      assert.equal(c.po_details[1].Normalized_Currency_Code, 'GBP', 'falls back to the PO currency');
      assert.deepEqual(c.resources[0], { name: 'R7', empl_id: 7, role: 'Dev', location: 'UK', start: '2025-07-01', end: '2025-12-31', bill_rate: 100, hour_mult: 1, alloc: 0.5, po_team: 'T1', ref: 'O-1' });
      assert.deepEqual(c.expenses[0], { name: 'R7', date: '2025-07-15', amount: 25, currency: 'GBP', desc: 'Taxi', po_team: 'T1', ref: 'O-1' });
      assert.equal(c.invoices[0].po_team, 'T3');
      assert.deepEqual(c.fx_rates, [{ code: 'USD', effective: '2025-01-01', rate: 1.3 }]);
      assert.deepEqual(c.ot_params, [{ type: 'Overtime_Hours', effective: '2025-01-01', multiplier: 1.5 }]);
      assert.deepEqual(c.raw_actuals, []);
    });

    T.test('actuals_monthly: month order, summed, burn against the selected PO value', function () {
      assert.deepEqual(A(ds()).actuals_monthly, [{ month: 'Jul-25', actuals: 157.5, actuals_burn: 1542.5 }, { month: 'Aug-25', actuals: 300, actuals_burn: 1242.5 }]);
    });

    T.test('filters: project, year (validity end) and PO teams (actuals per project)', function () {
      var r = A(ds(), { ref: 'O-1' });
      assert.deepEqual(r.po_details.map(function (p) { return p.PO_WO_Number; }), ['1', '2']);
      assert.equal(r.expenses.length, 1); assert.equal(r.invoices.length, 0);
      assert.deepEqual(r.actuals_monthly.map(function (m) { return m.actuals; }), [150.5, 300]);
      assert.deepEqual(A(ds(), { year: 2026 }).po_details.map(function (p) { return p.PO_WO_Number; }), ['2']);
      var t = A(ds(), { poTeams: ['T 3'] });
      assert.deepEqual(t.actuals_monthly, [{ month: 'Jul-25', actuals: 7, actuals_burn: 193 }]);
      assert.equal(t.actualsScope, 'ref');
    });

    T.test('the forecast runs on the adapted config', function () {
      var f = CFE.calc.forecast.computeForecast(A(ds()), [], '2025-08-01');
      assert.equal(f.totalPOValue, 1700);
      assert.ok(f.total > 0);
    });
  });

  if (typeof CFE_NODE === 'undefined') return;

  var TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  TZ = { 'GB': 'Europe/London' }[TZ] || TZ;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;
  var NOW = '2026-10-01T12:00:00Z';
  var FIXTURES = { basic: 'legacy-config-basic.json', multicurrency: 'legacy-config-multicurrency.json', y2027: 'legacy-config-2027.json', defaults: null };
  function golden(name) { return JSON.parse(T.io.readGolden('legacy/' + name + '.json')).value; }
  function near(got, want, path) {
    if (typeof want === 'number' && typeof got === 'number') { assert.approx(got, want, 0.005, path); return; }
    if (want && typeof want === 'object') {
      assert.deepEqual(Object.keys(got || {}).sort(), Object.keys(want).sort(), path + ' keys');
      Object.keys(want).forEach(function (k) { near(got[k], want[k], path + '.' + k); });
      return;
    }
    assert.deepEqual(got, want, path);
  }

  T.suite('CFE.store.toCalcInput golden equivalence (Node)', function () {
    if (TZ !== 'Europe/London') { T.test('skipped: the goldens are compared in Europe/London (use --tz=Europe/London); TZ=' + TZ, function () {}); return; }
    Object.keys(FIXTURES).forEach(function (name) {
      T.test(name + ': forecast, monthly actuals and Overview totals equal the legacy goldens', function () {
        var L = loadLegacy({ now: NOW });
        var legacyCfg = FIXTURES[name] ? JSON.parse(CFE_NODE.readFile('tests/fixtures/' + FIXTURES[name])) : JSON.parse(JSON.stringify(L.get('DEFAULTS')));
        var draft = CFE_NODE.support('fixture-draft.js').build(CFE, Continuum, legacyCfg);
        var built = CFE.store.buildDataset(draft, { nowUtc: NOW, published: null });
        assert.deepEqual(built.report.schema.errors, [], 'dataset valid');
        var cfg = A(JSON.parse(JSON.stringify(built.dataset)));

        // posByYear lists the PO input records themselves: compare the fields that carry meaning (the legacy
        // records also hold columns the dataset does not publish, and write validity as mm-yy).
        var PO_FIELDS = ['PO_Team_Identifier', 'PO_WO_value', 'PO_Currency_Code', 'Normalized_Currency_Code', 'WO_StartDate', 'WO_Approval_Status', 'rollover_allowed'];
        function forecast(f) {
          f = JSON.parse(JSON.stringify(f));
          Object.keys(f.posByYear || {}).forEach(function (y) {
            f.posByYear[y] = f.posByYear[y].map(function (p) { var o = { number: String(p.PO_WO_Number) }; PO_FIELDS.forEach(function (k) { o[k] = p[k]; }); return o; });
          });
          return f;
        }
        var g = golden('forecast-' + name);
        near(forecast(L.get('computeForecast')(cfg, [])), forecast(g.all), 'forecast.all');
        near(forecast(L.get('computeForecast')(cfg, [g.firstTeam.team])), forecast(g.firstTeam.result), 'forecast.firstTeam');

        var am = golden('actuals-cache-' + name).actuals_monthly;   // from timesheet rows (none for defaults)
        near(cfg.actuals_monthly, am, 'actuals_monthly');

        L.get('localStorage').setItem('pf_working', JSON.stringify(cfg));
        L.set('selectedYear', ''); L.set('selectedPoTeams', []);
        var D = L.get('buildData')();
        var b = golden('builddata-' + name);
        if (name === 'defaults') {
          // The legacy sample (DEFAULTS) has monthly totals but no timesheet rows. Those totals cannot be
          // attributed to people, so they are not converted (IMP-006): its actuals have no dataset
          // equivalent. Actuals are 0 here, and the remaining budget is higher by exactly the legacy actuals.
          assert.equal(legacyCfg.raw_actuals, undefined);
          assert.ok(legacyCfg.actuals_monthly.length > 0);
          assert.equal(D.tAct, 0);
          b = JSON.parse(JSON.stringify(b));
          b.rem = Math.round((b.rem + b.tAct) * 100) / 100;
          b.tAct = 0;
        }
        near({ tAct: D.tAct, tExp: D.tExp, rem: D.rem, fcTotal: D.fc.total, fcRate: D.fc.rate, allYears: D.allYears, allPoTeams: D.allPoTeams },
          { tAct: b.tAct, tExp: b.tExp, rem: b.rem, fcTotal: b.fcTotal, fcRate: b.fcRate, allYears: b.allYears, allPoTeams: b.allPoTeams }, 'buildData');
      });
    });
  });
})();
