// TST-003: characterisation ("golden") tests of the legacy calculations.
// They record what the legacy app computes TODAY, defects included. They do not say the values are right.
// Node only. Golden files: tests/golden/legacy/ (see tests/README.md, "Golden files").
//
//   node tests/run-node.js --suite=legacy-calc --tz=Europe/London      (reference)
//   node tests/run-node.js --suite=legacy-calc --tz=America/New_York   (KNOWN DEFECT C-01 variant)
//   node tests/run-node.js --suite=legacy-calc --tz=Asia/Kolkata       (KNOWN DEFECT C-01 variant)
//   regenerate (only when a backlog item says so): add --update-golden=legacy
(function () {
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  var NOW = '2026-10-01T12:00:00Z';
  var MONEY_EPS = 0.005;
  var REFERENCE_TZ = 'Europe/London';
  var TZ_VARIANTS = ['America/New_York', 'Asia/Kolkata'];
  // Node may report a zone under an older alias (e.g. Asia/Calcutta for Asia/Kolkata).
  var TZ_ALIASES = { 'Asia/Calcutta': 'Asia/Kolkata', 'GB': 'Europe/London', 'US/Eastern': 'America/New_York' };
  var TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  TZ = TZ_ALIASES[TZ] || TZ;
  var TZ_SUPPORTED = TZ === REFERENCE_TZ || TZ_VARIANTS.indexOf(TZ) >= 0;

  var FIXTURES = {
    basic: 'tests/fixtures/legacy-config-basic.json',
    multicurrency: 'tests/fixtures/legacy-config-multicurrency.json',
    y2027: 'tests/fixtures/legacy-config-2027.json'
  };

  function plain(v) { return v === undefined ? null : JSON.parse(JSON.stringify(v)); }
  function fixture(name) { return JSON.parse(CFE_NODE.readFile(FIXTURES[name])); }
  function configs() {
    var out = {};
    Object.keys(FIXTURES).forEach(function (k) { out[k] = fixture(k); });
    out.defaults = plain(loadLegacy({ now: NOW }).get('DEFAULTS'));
    return out;
  }

  // Same CSV reading as the legacy upload (split on commas, strip quotes).
  function legacyCsvRows(rel) {
    var lines = CFE_NODE.readFile(rel).trim().split('\n');
    var headers = lines[0].split(',').map(function (h) { return h.trim().replace(/"/g, ''); });
    return lines.slice(1).map(function (line) {
      var vals = line.split(',').map(function (v) { return v.trim().replace(/"/g, ''); });
      var o = {}; headers.forEach(function (h, i) { o[h] = vals[i] || ''; }); return o;
    });
  }

  // Same project → PO team map as the legacy buildData().
  function projToTeam(cfg) {
    var m = {};
    (cfg.resources || []).forEach(function (r) { var t = (r.po_team || '').replace(/\s+/g, ''); if (r.projectID && t) m[r.projectID] = t; });
    (cfg.po_details || []).forEach(function (p) { var t = (p.PO_Team_Identifier || '').replace(/\s+/g, ''); if (p.ProjectID && t) m[p.ProjectID] = t; });
    return m;
  }

  // Compare with a tolerance for numbers (money); everything else must match exactly.
  function approxDiff(a, b, path) {
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= MONEY_EPS ? null : path + ': expected ' + b + ', got ' + a;
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b)) return path + ': array vs non-array';
      if (a.length !== b.length) return path + '.length: expected ' + b.length + ', got ' + a.length;
      for (var i = 0; i < a.length; i++) { var d = approxDiff(a[i], b[i], path + '[' + i + ']'); if (d) return d; }
      return null;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      var keys = Object.keys(a).concat(Object.keys(b).filter(function (k) { return !(k in a); }));
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        if (!(k in a) || !(k in b)) return path + '.' + k + ': present on one side only';
        var dk = approxDiff(a[k], b[k], path + '.' + k); if (dk) return dk;
      }
      return null;
    }
    return a === b ? null : path + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a);
  }

  // name: file name without folder/extension. tzDependent: the value depends on the process time zone.
  function golden(name, value, tzDependent, note) {
    var suffix = tzDependent && TZ !== REFERENCE_TZ ? '.tz-' + TZ.replace(/\//g, '_') : '';
    var file = 'legacy/' + name + suffix + '.json';
    var doc = { _what: name, _now: NOW, _tz: tzDependent ? TZ : 'any' };
    if (suffix) doc._note = 'KNOWN DEFECT C-01: legacy results depend on the computer time zone. This file records the ' + TZ + ' output; Europe/London is the reference.';
    if (note) doc._fixture = note;
    doc.value = plain(value);
    if (T.io.updating(file)) return T.golden(file, doc);
    var text = T.io.readGolden(file);
    if (text === null) throw new Error('Golden file missing: tests/golden/' + file + ' (generate with --update-golden=legacy)');
    var d = approxDiff(doc.value, JSON.parse(text).value, '$');
    if (d) throw new Error('golden ' + file + ' differs at ' + d);
  }

  function tzTest(title, fn) {
    if (!TZ_SUPPORTED) return;
    T.test(title + ' (TZ=' + TZ + ')', fn);
  }

  T.suite('legacy-calc', function () {
    if (!TZ_SUPPORTED) {
      T.test('time-zone dependent goldens skipped: TZ=' + TZ + ' has none (use --tz=' + REFERENCE_TZ + ')', function () {});
    }

    // Forecast, actuals and totals for every fixture config and the sandbox DEFAULTS.
    Object.keys(configs()).forEach(function (name) {
      tzTest('computeForecast ' + name + ': all teams and first team', function () {
        var cfg = configs()[name];
        var L = loadLegacy({ now: NOW });
        var firstTeam = (cfg.po_details[0].PO_Team_Identifier || '').replace(/\s+/g, '');
        golden('forecast-' + name, {
          all: L.get('computeForecast')(cfg, []),
          firstTeam: { team: firstTeam, result: L.get('computeForecast')(cfg, [firstTeam]) }
        }, true, name);
      });

      tzTest('computeActualsMonthly ' + name, function () {
        var cfg = configs()[name];
        var L = loadLegacy({ now: NOW });
        golden('actuals-monthly-' + name, L.get('computeActualsMonthly')(cfg, null, projToTeam(cfg)), true, name);
      });

      tzTest('aggregateActuals + computeActualsFromCache ' + name, function () {
        var cfg = configs()[name];
        var L = loadLegacy({ now: NOW });
        L.get('localStorage').setItem('pf_working', JSON.stringify(cfg));
        L.get('aggregateActuals')(cfg.raw_actuals || []);
        var stored = JSON.parse(L.get('localStorage').getItem('pf_working'));
        golden('actuals-cache-' + name, {
          actuals_by_project: stored.actuals_by_project,
          actuals_monthly: stored.actuals_monthly,
          fromCache: L.get('computeActualsFromCache')(stored, null, projToTeam(stored)),
          toasts: L.toasts
        }, true, name);
      });

      tzTest('buildData totals ' + name, function () {
        var cfg = configs()[name];
        var L = loadLegacy({ now: NOW });
        L.get('localStorage').setItem('pf_working', JSON.stringify(cfg));
        var D = L.get('buildData')();
        golden('builddata-' + name, {
          tAct: D.tAct, tExp: D.tExp, rem: D.rem, fcTotal: D.fc.total, fcRate: D.fc.rate,
          allYears: D.allYears, allPoTeams: D.allPoTeams
        }, true, name);
      });
    });

    // Extra: the basic fixture with the clock inside its PO period, so the forecast is not all zero.
    tzTest('computeForecast basic at 2025-08-15', function () {
      var cfg = configs().basic;
      var L = loadLegacy({ now: '2025-08-15T12:00:00Z' });
      golden('forecast-basic-now-2025-08-15', L.get('computeForecast')(cfg, []), true, 'basic, now 2025-08-15');
    });

    tzTest('parseDate: 20 inputs × uk / us / auto', function () {
      var L = loadLegacy({ now: NOW });
      var parseDate = L.get('parseDate');
      var inputs = ['2026-04-03', '2026-04-03T10:00:00Z', '03/04/2026', '04/03/2026', '13/04/2026', '04/13/2026',
        '3/4/2026', '7/1/2025', '31/12/2025', '12/31/2025', '1/1/26', '29/02/2024', '30/02/2026', '03-04-2026',
        'Jan 5 2026', '5 January 2026', '', '   ', 'not a date', '2026/04/03'];
      var out = inputs.map(function (s) { return { input: s, uk: parseDate(s, 'uk'), us: parseDate(s, 'us'), auto: parseDate(s) }; });
      golden('parse-date', out, true);
    });

    tzTest('parseValidityEnd: 10 inputs', function () {
      var L = loadLegacy({ now: NOW });
      var f = L.get('parseValidityEnd');
      var inputs = ['12-25', '06-27', '1-26', '12-2026', '02-24', 2025, '2026', '', null, '2026-12-31'];
      golden('parse-validity-end', inputs.map(function (v) { var d = f(v); return { input: v, iso: d.toISOString(), local: d.toString().slice(0, 15) }; }), true);
    });

    T.test('validateData: valid and invalid samples per key', function () {
      var L = loadLegacy({ now: NOW });
      var v = L.get('validateData');
      var basic = configs().basic;
      var out = {
        not_array: v('po_details', {}),
        po_details: { valid: v('po_details', basic.po_details), invalid: v('po_details', [{ PO_Team_Identifier: 'T', PO_WO_value: -5, PO_Currency_Code: 'GBP', PO_Validity: '2025', WO_StartDate: '01/01/2025', rollover_allowed: 'yes' }, {}]) },
        po_details_legacy_test_file: v('po_details', JSON.parse(CFE_NODE.readFile('test_PO_Details.json'))),
        resources: { valid: v('resources', basic.resources), invalid: v('resources', [{ bill_rate: 'abc', alloc: 1.5 }]) },
        invoices: { valid: v('invoices', basic.invoices), invalid: v('invoices', [{ amount: '10', period_from: '1/1/2025', status: 'Unknown' }]) },
        fx_rates: { valid: v('fx_rates', basic.fx_rates), invalid: v('fx_rates', [{ effective: '2025', rate: '1.2' }]) },
        expenses: { valid: v('expenses', basic.expenses), invalid: v('expenses', [{ date: '15/07/2025', amount: '250' }]) },
        unknown_key: v('something_else', [{}])
      };
      golden('validate-data', out, false);
    });

    T.test('deduplicateActuals on timesheet-duplicates.csv', function () {
      var L = loadLegacy({ now: NOW });
      var cfg = { raw_actuals: legacyCsvRows('tests/fixtures/timesheet-duplicates.csv') };
      var r = L.get('deduplicateActuals')(cfg);
      golden('deduplicate-actuals', { removed: r.removed, kept: r.cfg.raw_actuals.map(function (row) { return [row['Empl ID'], row['Reported Dt'], row['Project ID'], row.Activity, row['Regular Hours']].join('|'); }) }, false);
    });

    T.test('fxRateAsOf and otMultiplier', function () {
      var L = loadLegacy({ now: NOW });
      var fx = L.get('fxRateAsOf'), ot = L.get('otMultiplier');
      var cfg = configs().multicurrency;
      var dates = ['2023-12-31', '2024-01-01', '2025-06-30', '2026-01-01', '2026-12-31'];
      golden('fx-and-ot', {
        fx: ['GBP', 'USD', 'INR', 'EUR'].map(function (code) { return { code: code, rates: dates.map(function (d) { return fx(cfg.fx_rates, code, d); }) }; }),
        ot: ['Overtime_Hours', 'Vacation_Hours', 'Personal_Hours'].map(function (type) { return { type: type, multipliers: dates.map(function (d) { return ot(cfg.ot_params, 'any', type, d); }) }; }),
        dates: dates
      }, false);
    });
  });
})();
