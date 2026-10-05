// DAT-003: visible storage and server-save failures.
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  // opts: protocol, quota (setItem throws QuotaExceededError), fetch (function returning a Promise).
  function sandbox(opts) {
    var L = loadLegacy({ protocol: opts.protocol || 'http:' });
    var calls = [];
    L.ctx.fetch = function (url, init) { calls.push({ url: url, init: init }); return opts.fetch(); };
    if (opts.quota) {
      L.get('localStorage').setItem = function () { var e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
    }
    return { L: L, calls: calls, status: function () { return L.get('saveStatus').kind; } };
  }
  function ok() { return Promise.resolve({ ok: true, status: 200 }); }
  var CFG = { resources: [], po_details: [] };

  T.suite('Legacy save status (DAT-003)', function () {
    T.test('storage quota error: server still called, status storage-full, error toast', function () {
      var a = sandbox({ quota: true, fetch: ok });
      return a.L.get('saveWork')(CFG).then(function () {
        assert.equal(a.calls.length, 1, 'fetch still called');
        assert.equal(a.calls[0].url, '/api/config');
        assert.equal(a.status(), 'storage-full');
        assert.ok(a.L.toasts.some(function (t) { return /Browser storage full/.test(t) && /Export a backup now/.test(t); }));
      });
    });

    T.test('server answers !ok: status server-failed', function () {
      var a = sandbox({ fetch: function () { return Promise.resolve({ ok: false, status: 500 }); } });
      return a.L.get('saveWork')(CFG).then(function () {
        assert.equal(a.status(), 'server-failed');
        assert.equal(a.L.get('localStorage').getItem('pf_working'), JSON.stringify(CFG), 'browser copy saved');
        assert.ok(a.L.toasts.some(function (t) { return /Server not reachable/.test(t) && /HTTP 500/.test(t); }));
      });
    });

    T.test('server unreachable (fetch rejects): status server-failed', function () {
      var a = sandbox({ fetch: function () { return Promise.reject(new Error('Failed to fetch')); } });
      return a.L.get('saveMaster')(CFG).then(function () {
        assert.equal(a.calls[0].url, '/api/config/master');
        assert.equal(a.status(), 'server-failed');
      });
    });

    T.test('both OK: status saved, no error toast', function () {
      var a = sandbox({ fetch: ok });
      return a.L.get('saveWork')(CFG).then(function () {
        assert.equal(a.status(), 'saved');
        assert.equal(a.L.toasts.length, 0);
      });
    });

    T.test('file://: no server POST, neutral local-only status', function () {
      var a = sandbox({ protocol: 'file:', fetch: ok });
      return a.L.get('saveWork')(CFG).then(function () {
        assert.equal(a.calls.length, 0, 'no fetch from file://');
        assert.equal(a.status(), 'local-only');
        assert.equal(a.L.toasts.length, 0, 'no warning for a server that cannot exist');
      });
    });

    T.test('file:// with storage full: storage-full', function () {
      var a = sandbox({ protocol: 'file:', quota: true, fetch: ok });
      return a.L.get('saveWork')(CFG).then(function () {
        assert.equal(a.calls.length, 0);
        assert.equal(a.status(), 'storage-full');
      });
    });
  });
})();
