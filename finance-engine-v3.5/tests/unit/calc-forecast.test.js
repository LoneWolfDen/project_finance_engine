// SRC-002: CFE.calc.forecast (computeForecast with optional asOf, forecastPerTeam).
// The first suite runs in Node and in the browser; the golden comparison is Node only.
(function () {
  // In Node the app scripts are not preloaded: evaluate the modules in this context.
  if (typeof CFE === 'undefined') (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  ['dates', 'calendar', 'fx', 'forecast'].forEach(function (m) {
    if (!CFE.calc[m]) (0, eval)(CFE_NODE.readFile('app/calc/' + m + '.js'));
  });
  var T = CFE_TEST, assert = T.assert, F = CFE.calc.forecast;

  // One PO team, one UK resource for one full working week (Mon 7 – Fri 11 July 2025).
  function cfg() {
    return {
      po_details: [{ PO_Team_Identifier: 'T 1', PO_WO_value: 10000, PO_Currency_Code: 'GBP', Normalized_Currency_Code: 'USD', PO_Validity: '12-25', WO_StartDate: '2025-01-01', WO_Approval_Status: 'Approved' }],
      resources: [{ name: 'R', bill_rate: 100, alloc: 0.5, location: 'UK', po_team: 'T1', start: '2025-07-07T12:00:00Z', end: '2025-07-11T12:00:00Z' }],
      fx_rates: [{ code: 'GBP', effective: '2025-01-01', rate: 1 }, { code: 'USD', effective: '2025-01-01', rate: 1.25 }, { code: 'USD', effective: '2025-09-01', rate: 1.4 }],
      ot_params: []
    };
  }

  T.suite('CFE.calc.forecast', function () {
    T.test('computeForecast: 5 working days × £400', function () {
      var r = F.computeForecast(cfg(), []);
      assert.equal(r.total, 2000);
      assert.equal(r.days, 5);
      assert.equal(r.rate, 400);
      assert.equal(r.totalPOValue, 10000);
    });

    T.test('computeForecast: asOf picks the FX rate for the normalised PO value', function () {
      assert.equal(F.computeForecast(cfg(), [], '2025-08-31').normPO, 12500);
      assert.equal(F.computeForecast(cfg(), [], '2025-09-01').normPO, 14000);
      assert.equal(F.computeForecast(cfg(), [], '2024-12-31').normPO, 10000, 'no rate yet → 1 (legacy fallback)');
    });

    T.test('computeForecast: without asOf it uses today, as before', function () {
      var today = new Date().toISOString().slice(0, 10);
      assert.deepEqual(JSON.parse(JSON.stringify(F.computeForecast(cfg(), []))), JSON.parse(JSON.stringify(F.computeForecast(cfg(), [], today))));
    });

    T.test('forecastPerTeam: per team, whitespace removed from the team key', function () {
      assert.deepEqual(F.forecastPerTeam(cfg()), { T1: 2000 });
    });
  });

  if (typeof CFE_NODE === 'undefined') return;

  // Node only: forecastPerTeam equals what the legacy rOV loop produced before SRC-002 moved it
  // (tests/golden/legacy/forecast-per-team-*.json, recorded from the old loop; see tests/README.md).
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;
  var NOW = '2026-10-01T12:00:00Z';
  var TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  TZ = { 'Asia/Calcutta': 'Asia/Kolkata', 'GB': 'Europe/London', 'US/Eastern': 'America/New_York' }[TZ] || TZ;
  var SUFFIX = { 'Europe/London': '', 'America/New_York': '.tz-America_New_York', 'Asia/Kolkata': '.tz-Asia_Kolkata' }[TZ];
  var FIXTURES = { basic: 'legacy-config-basic.json', multicurrency: 'legacy-config-multicurrency.json', y2027: 'legacy-config-2027.json', defaults: null };

  T.suite('CFE.calc.forecast golden (legacy rOV per-team loop)', function () {
    if (SUFFIX === undefined) { T.test('skipped: TZ=' + TZ + ' has no goldens (use --tz=Europe/London)', function () {}); return; }
    Object.keys(FIXTURES).forEach(function (name) {
      T.test('forecastPerTeam ' + name + ' (TZ=' + TZ + ')', function () {
        var L = loadLegacy({ now: NOW });
        var c = FIXTURES[name] ? JSON.parse(CFE_NODE.readFile('tests/fixtures/' + FIXTURES[name])) : JSON.parse(JSON.stringify(L.get('DEFAULTS')));
        var got = L.get('CFE.calc.forecast.forecastPerTeam')(c);
        var want = JSON.parse(T.io.readGolden('legacy/forecast-per-team-' + name + SUFFIX + '.json')).value;
        assert.deepEqual(Object.keys(got).sort(), Object.keys(want).sort());
        Object.keys(want).forEach(function (k) { assert.approx(got[k], want[k], 0.005); });
      });
    });
  });
})();
