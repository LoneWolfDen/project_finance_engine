// DAT-001: Restore-from-Master and Load-scenario need confirmation and a backup first.
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  function fixture(name) { return JSON.parse(CFE_NODE.readFile('tests/fixtures/' + name)); }

  // A sandbox with download capture, a confirm log and a saveWork call counter.
  function sandbox(answer) {
    var confirms = [];
    var L = loadLegacy({ webcrypto: true, confirm: function (m) { confirms.push(m); return answer; } });
    var downloads = [];
    var parts = new WeakMap();
    L.ctx.Blob = function (chunks) { parts.set(this, chunks.join('')); };
    L.ctx.URL = { createObjectURL: function (b) { downloads.push(parts.get(b)); return 'blob:test'; } };
    L.ctx.render = function () {};
    var saves = { n: 0 }, realSave = L.get('saveWork');
    L.set('saveWork', function (cfg) { saves.n++; return realSave(cfg); });
    var ls = L.get('localStorage');
    return {
      L: L, confirms: confirms, downloads: downloads, saves: saves,
      seed: function (key, value) { ls.setItem(key, JSON.stringify(value)); },
      read: function (key) { var v = ls.getItem(key); return v === null ? null : JSON.parse(v); }
    };
  }

  T.suite('Legacy restore and scenario load (DAT-001)', function () {
    T.test('no master: working copy unchanged, saveWork not called, error toast', function () {
      var a = sandbox(true);
      var working = fixture('legacy-config-basic.json');
      a.seed('pf_working', working);
      return a.L.get('restoreFromMaster')().then(function (done) {
        assert.equal(done, false);
        assert.equal(a.saves.n, 0, 'saveWork not called');
        assert.deepEqual(a.read('pf_working'), working);
        assert.equal(a.confirms.length, 0, 'no confirmation is asked');
        assert.equal(a.downloads.length, 0, 'no backup downloaded');
        assert.ok(a.L.toasts.some(function (t) { return /No master has been saved yet\. Nothing was changed\./.test(t); }));
      });
    });

    T.test('master exists, confirm declined: unchanged', function () {
      var a = sandbox(false);
      var working = fixture('legacy-config-basic.json');
      a.seed('pf_working', working);
      a.seed('pf_master', fixture('legacy-config-multicurrency.json'));
      return a.L.get('restoreFromMaster')().then(function (done) {
        assert.equal(done, false);
        assert.equal(a.saves.n, 0);
        assert.deepEqual(a.read('pf_working'), working);
        assert.equal(a.downloads.length, 0);
        assert.ok(/resources, 200 timesheet rows/.test(a.confirms[0]), 'confirmation names the working copy size');
      });
    });

    T.test('master exists, confirmed: one backup, then working equals master', function () {
      var a = sandbox(true);
      var working = fixture('legacy-config-basic.json'), master = fixture('legacy-config-multicurrency.json');
      a.seed('pf_working', working);
      a.seed('pf_master', master);
      return a.L.get('restoreFromMaster')().then(function (done) {
        assert.equal(done, true);
        assert.equal(a.downloads.length, 1, 'backup downloaded once');
        assert.deepEqual(JSON.parse(a.downloads[0]).working, working, 'backup holds the previous working copy');
        assert.deepEqual(a.read('pf_working'), master);
      });
    });

    T.test('scenario load, confirm declined: unchanged', function () {
      var a = sandbox(false);
      var working = fixture('legacy-config-basic.json');
      var scen = fixture('legacy-config-2027.json'); scen._saved = '2026-09-30T10:00'; scen._forecast = 1;
      a.seed('pf_working', working);
      a.seed('pf_scenarios', { 'Plan B': scen });
      return a.L.get('loadScenario')('Plan B').then(function (done) {
        assert.equal(done, false);
        assert.equal(a.saves.n, 0);
        assert.deepEqual(a.read('pf_working'), working);
        assert.ok(/scenario "Plan B" saved 2026-09-30T10:00/.test(a.confirms[0]));
      });
    });

    T.test('scenario load, confirmed: one backup, then working equals the scenario', function () {
      var a = sandbox(true);
      var working = fixture('legacy-config-basic.json'), scen = fixture('legacy-config-2027.json');
      var stored = JSON.parse(JSON.stringify(scen)); stored._saved = '2026-09-30T10:00'; stored._forecast = 1;
      a.seed('pf_working', working);
      a.seed('pf_scenarios', { 'Plan B': stored });
      return a.L.get('loadScenario')('Plan B').then(function (done) {
        assert.equal(done, true);
        assert.equal(a.downloads.length, 1);
        assert.deepEqual(JSON.parse(a.downloads[0]).working, working);
        assert.deepEqual(a.read('pf_working'), scen);
      });
    });
  });
})();
