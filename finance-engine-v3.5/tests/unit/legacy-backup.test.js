// BAK-001: complete, checksummed legacy backup export and validated import.
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  function fixture(name) { return JSON.parse(CFE_NODE.readFile('tests/fixtures/' + name)); }

  // A sandbox with download capture, a fake file input, the "also restore" checkbox and a confirm log.
  function sandbox(opts) {
    opts = opts || {};
    var confirms = [];
    var L = loadLegacy({
      webcrypto: opts.webcrypto !== false,
      confirm: function (m) { confirms.push(m); return opts.confirm === undefined ? true : opts.confirm; }
    });
    var downloads = [];
    var parts = new WeakMap();
    L.ctx.Blob = function (chunks) { parts.set(this, chunks.join('')); };
    L.ctx.URL = { createObjectURL: function (b) { downloads.push(parts.get(b)); return 'blob:test'; } };
    var ui = { file: null, also: !!opts.also, status: { innerHTML: '' } };
    var doc = L.ctx.document, original = doc.getElementById;
    doc.getElementById = function (id) {
      if (id === 'fullCfgImport') return { files: ui.file === null ? [] : [{ text: function () { return Promise.resolve(ui.file); } }] };
      if (id === 'fullCfgAlso') return { checked: ui.also };
      if (id === 'fullCfgStatus') return ui.status;
      return original(id);
    };
    var ls = L.get('localStorage');
    return {
      L: L, ui: ui, downloads: downloads, confirms: confirms,
      seed: function (working, master, scenarios) {
        ls.setItem('pf_working', JSON.stringify(working));
        if (master) ls.setItem('pf_master', JSON.stringify(master));
        if (scenarios) ls.setItem('pf_scenarios', JSON.stringify(scenarios));
      },
      read: function (key) { var v = ls.getItem(key); return v === null ? null : JSON.parse(v); },
      exportBackup: function () { return L.get('exportFullConfig')().then(function () { return JSON.parse(downloads[downloads.length - 1]); }); },
      importText: function (text) { ui.file = text; return L.get('importFullConfig')(); }
    };
  }

  var SCENARIOS = { 'Plan B': { saved: '2026-09-30T10:00', resources: [{ name: 'R1_Lead', alloc: 0.5 }] } };

  T.suite('Legacy backup (BAK-001)', function () {
    T.test('export has the v1 shape and a SHA-256', function () {
      var a = sandbox();
      a.seed(fixture('legacy-config-basic.json'), fixture('legacy-config-multicurrency.json'), SCENARIOS);
      return a.exportBackup().then(function (b) {
        assert.equal(b.format, 'cfe-legacy-backup');
        assert.equal(b.schema_version, 1);
        assert.equal(b.app_version, '3.5');
        assert.ok(/^[0-9a-f]{64}$/.test(b.sha256), 'sha256 is 64 hex characters');
        assert.equal(b.working.raw_actuals.length, 200, 'raw timesheet rows included');
        assert.deepEqual(b.scenarios, SCENARIOS);
        assert.ok(a.L.toasts.some(function (t) { return /personal data/.test(t) && /Microsoft 365/.test(t); }), 'export toast warns');
      });
    });

    T.test('master is null when it was never saved', function () {
      var a = sandbox();
      a.seed(fixture('legacy-config-basic.json'));
      return a.exportBackup().then(function (b) { assert.equal(b.master, null); });
    });

    T.test('round trip restores identical working, master and scenarios', function () {
      var working = fixture('legacy-config-basic.json'), master = fixture('legacy-config-multicurrency.json');
      var a = sandbox();
      a.seed(working, master, SCENARIOS);
      return a.exportBackup().then(function (b) {
        var target = sandbox({ also: true });
        target.seed(fixture('legacy-config-2027.json'));
        return target.importText(JSON.stringify(b)).then(function () {
          assert.deepEqual(target.read('pf_working'), working);
          assert.deepEqual(target.read('pf_master'), master);
          assert.deepEqual(target.read('pf_scenarios'), SCENARIOS);
          var pre = JSON.parse(target.downloads[0]);
          assert.deepEqual(pre.working, fixture('legacy-config-2027.json'), 'pre-import safety backup holds the previous data');
          assert.ok(/✅/.test(target.ui.status.innerHTML));
        });
      });
    });

    T.test('without the checkbox, master and scenarios are left alone', function () {
      var a = sandbox();
      a.seed(fixture('legacy-config-basic.json'), fixture('legacy-config-multicurrency.json'), SCENARIOS);
      return a.exportBackup().then(function (b) {
        var target = sandbox({ also: false });
        target.seed(fixture('legacy-config-2027.json'));
        return target.importText(JSON.stringify(b)).then(function () {
          assert.deepEqual(target.read('pf_working'), fixture('legacy-config-basic.json'));
          assert.equal(target.read('pf_master'), null);
          assert.equal(target.read('pf_scenarios'), null);
        });
      });
    });

    T.test('a tampered checksum is refused and nothing changes', function () {
      var a = sandbox();
      a.seed(fixture('legacy-config-basic.json'));
      return a.exportBackup().then(function (b) {
        b.working.po_details[0].PO_WO_value = 1;
        var target = sandbox();
        var before = fixture('legacy-config-2027.json');
        target.seed(before);
        return target.importText(JSON.stringify(b)).then(function () {
          assert.ok(/Checksum mismatch/.test(target.ui.status.innerHTML));
          assert.deepEqual(target.read('pf_working'), before);
          assert.equal(target.downloads.length, 0, 'no safety backup needed');
        });
      });
    });

    T.test('old format with actuals_monthly removes stale actuals after confirmation', function () {
      var a = sandbox({ confirm: true });
      var cfg = fixture('legacy-config-basic.json');
      cfg.actuals_by_project = { '111111': { 'Jul-25': 1000 } };
      a.seed(cfg);
      var old = { po_details: cfg.po_details, actuals_monthly: [{ month: 'Jul-25', actuals: 500, actuals_burn: 100 }] };
      return a.importText(JSON.stringify(old)).then(function () {
        var w = a.read('pf_working');
        assert.equal(w.actuals_by_project, undefined);
        assert.equal(w.raw_actuals, undefined);
        assert.deepEqual(w.actuals_monthly, old.actuals_monthly);
        assert.ok(a.confirms.some(function (m) { return /actuals_by_project/.test(m) && /raw_actuals/.test(m); }), 'confirmation lists both');
        assert.equal(a.downloads.length, 1, 'pre-import backup downloaded');
      });
    });

    T.test('declining the stale-actuals confirmation imports nothing', function () {
      var a = sandbox({ confirm: false });
      var cfg = fixture('legacy-config-basic.json');
      a.seed(cfg);
      return a.importText(JSON.stringify({ actuals_monthly: [] })).then(function () {
        assert.deepEqual(a.read('pf_working'), cfg);
      });
    });

    T.test('invalid po_details are refused without applying', function () {
      var a = sandbox();
      var cfg = fixture('legacy-config-basic.json');
      a.seed(cfg);
      return a.importText(JSON.stringify({ po_details: [{ PO_WO_value: -1 }] })).then(function () {
        assert.ok(/validation error/.test(a.ui.status.innerHTML));
        assert.deepEqual(a.read('pf_working'), cfg);
        assert.equal(a.downloads.length, 0);
      });
    });

    T.test('year-only POs (PO_Validity_Year) are accepted, and stored unchanged', function () {
      var a = sandbox();
      a.seed(fixture('legacy-config-basic.json'));
      var pos = JSON.parse(CFE_NODE.readFile('test_PO_Details.json'));
      return a.importText(JSON.stringify({ po_details: pos })).then(function () {
        assert.deepEqual(a.read('pf_working').po_details, pos);
      });
    });

    T.test('without crypto.subtle: export marks hash_unavailable; import needs confirmation', function () {
      var a = sandbox({ webcrypto: false });
      a.seed(fixture('legacy-config-basic.json'));
      return a.exportBackup().then(function (b) {
        assert.equal(b.sha256, null);
        assert.equal(b.hash_unavailable, true);
        var refuse = sandbox({ confirm: false });
        refuse.seed(fixture('legacy-config-2027.json'));
        return refuse.importText(JSON.stringify(b)).then(function () {
          assert.deepEqual(refuse.read('pf_working'), fixture('legacy-config-2027.json'), 'declined: unchanged');
          assert.ok(/integrity of this backup cannot be checked/.test(refuse.confirms[0]));
        });
      });
    });

    T.test('without crypto.subtle: a confirmed import of an unchecked backup is applied', function () {
      var a = sandbox({ webcrypto: false });
      a.seed(fixture('legacy-config-basic.json'));
      return a.exportBackup().then(function (b) {
        var accept = sandbox({ confirm: true });
        accept.seed(fixture('legacy-config-2027.json'));
        return accept.importText(JSON.stringify(b)).then(function () {
          assert.deepEqual(accept.read('pf_working'), fixture('legacy-config-basic.json'));
        });
      });
    });

    T.test('unsupported backup version is refused', function () {
      var a = sandbox();
      a.seed(fixture('legacy-config-basic.json'));
      return a.importText(JSON.stringify({ format: 'cfe-legacy-backup', schema_version: 2, working: {} })).then(function () {
        assert.ok(/Unsupported backup version/.test(a.ui.status.innerHTML));
      });
    });
  });
})();
