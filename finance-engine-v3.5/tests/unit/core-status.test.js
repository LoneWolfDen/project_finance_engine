// SHL-002: Continuum.status.compute (readiness banner rules, TARGET_ARCHITECTURE §3.4).
// Runs in Node and in the browser.
(function () {
  if (typeof Continuum === 'undefined' || !Continuum.status) (0, eval)(CFE_NODE.readFile('app/continuum-core/status.js'));
  var T = CFE_TEST, assert = T.assert, S = Continuum.status;
  var NOW = '2026-10-05T12:00:00Z';
  var M = { data_as_of: '2026-10-01', published_utc: '2026-10-02T09:10:00Z', publisher: 'V. Y.', validation: { errors: 0, warnings: [] } };

  function good(extra) {
    var input = { datasetLoaded: true, hashOk: true, manifest: JSON.parse(JSON.stringify(M)), nowUtc: NOW, staleAfterDays: 7 };
    Object.keys(extra || {}).forEach(function (k) { input[k] = extra[k]; });
    return input;
  }

  T.suite('Continuum.status', function () {
    T.test('input → level and title', function () {
      var old = JSON.parse(JSON.stringify(M)); old.data_as_of = '2026-09-27';
      var warned = JSON.parse(JSON.stringify(M)); warned.validation.warnings = ['a', 'b'];
      [
        ['all good', good(), 'ready', 'Data as of 01-10-2026 · published 02-10-2026 09:10 UTC by V. Y.'],
        ['missing dataset', { datasetLoaded: false, nowUtc: NOW }, 'not-ready', /^No published data found\./],
        ['hash mismatch', good({ hashOk: false }), 'not-ready', /damaged/],
        ['newer schema', good({ newerSchema: true }), 'not-ready', /newer version of the app/],
        ['parse errors', good({ errors: ['x'] }), 'not-ready', /could not be read \(1 error\)/],
        ['unknown reference', good({ refState: 'not-found', ref: 'O-9' }), 'not-ready', 'Project reference "O-9" was not found.'],
        ['8 days old', good({ manifest: old }), 'attention', 'Data is 8 days old. Ask the publisher to refresh.'],
        ['warnings (manifest)', good({ manifest: warned }), 'attention', 'The data has 2 warnings. See Details.'],
        ['warnings (input)', good({ warnings: ['w'] }), 'attention', 'The data has 1 warning. See Details.'],
        ['older schema migrated', good({ schemaMigrated: true }), 'attention', /older version of the app/],
        ['reference partly matched', good({ refState: 'partial', ref: 'O-1' }), 'attention', /"O-1" matched only partly/]
      ].forEach(function (c) {
        var r = S.compute(c[1]);
        assert.equal(r.level, c[2], c[0]);
        if (c[3] instanceof RegExp) assert.ok(c[3].test(r.title), c[0] + ': ' + r.title);
        else assert.equal(r.title, c[3], c[0]);
      });
    });

    T.test('exactly 7 days old is still ready; the threshold is configurable', function () {
      var m = JSON.parse(JSON.stringify(M)); m.data_as_of = '2026-09-28';
      assert.equal(S.compute(good({ manifest: m })).level, 'ready');
      assert.equal(S.compute(good({ manifest: m, staleAfterDays: 3 })).level, 'attention');
      m.data_as_of = '2026-09-27';
      assert.equal(S.compute(good({ manifest: m, staleAfterDays: undefined })).level, 'attention', 'default 7');
    });

    T.test('the worst level wins; details list every message and the summary', function () {
      var m = JSON.parse(JSON.stringify(M)); m.data_as_of = '2026-09-01'; m.validation.warnings = ['w'];
      var r = S.compute(good({ manifest: m, hashOk: false }));
      assert.equal(r.level, 'not-ready');
      assert.ok(/damaged/.test(r.title));
      assert.equal(r.details.length, 4);
      assert.ok(/34 days old/.test(r.details[1]) && /1 warning/.test(r.details[2]));
      assert.equal(r.details[3], 'Data as of 01-09-2026 · published 02-10-2026 09:10 UTC by V. Y. · 1 warning');
    });

    T.test('no dataset: only data-independent messages; no summary', function () {
      var r = S.compute({ datasetLoaded: false, refState: 'partial', schemaMigrated: true, warnings: ['w'] });
      assert.equal(r.level, 'not-ready');
      assert.equal(r.details.length, 2, 'missing data and the partial reference');
      assert.deepEqual(S.compute().level, 'not-ready', 'no input at all');
    });

    T.test('missing manifest fields do not crash', function () {
      var r = S.compute({ datasetLoaded: true, manifest: {}, nowUtc: NOW });
      assert.equal(r.level, 'ready');
      assert.equal(r.title, 'Data loaded.');
      assert.equal(S.compute({ datasetLoaded: true }).level, 'ready');
      assert.equal(S.compute(good({ nowUtc: 'not a time' })).level, 'ready', 'unknown age is not stale');
    });

    T.test('ageDays counts whole days from midnight UTC of the data date', function () {
      assert.equal(S.ageDays('2026-10-01', '2026-10-01T23:59:00Z'), 0);
      assert.equal(S.ageDays('2026-10-01', new Date('2026-10-09T00:00:00Z')), 8);
      assert.equal(S.ageDays('01-10-2026', NOW), null);
    });
  });
})();
