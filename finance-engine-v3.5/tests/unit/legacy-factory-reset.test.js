// DAT-005: Factory Reset clears working and master in the cache, the browser and the server.
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  function fixture(name) { return JSON.parse(CFE_NODE.readFile('tests/fixtures/' + name)); }

  function sandbox(opts) {
    opts = opts || {};
    var L = loadLegacy({ webcrypto: true, protocol: opts.protocol || 'http:' });
    var downloads = [], posts = [];
    var parts = new WeakMap();
    L.ctx.Blob = function (chunks) { parts.set(this, chunks.join('')); };
    L.ctx.URL = { createObjectURL: function (b) { downloads.push(parts.get(b)); return 'blob:test'; } };
    L.ctx.render = function () {};
    L.ctx.fetch = function (url, init) {
      posts.push({ url: url, body: init && init.body });
      return Promise.resolve({ ok: opts.serverOk !== false, status: opts.serverOk === false ? 500 : 200 });
    };
    var doc = L.ctx.document, original = doc.getElementById;
    doc.getElementById = function (id) { return id === 'pinInput' ? { value: opts.pin || '1234' } : original(id); };
    var ls = L.get('localStorage');
    ls.setItem('pf_working', JSON.stringify(fixture('legacy-config-basic.json')));
    ls.setItem('pf_master', JSON.stringify(fixture('legacy-config-multicurrency.json')));
    ls.setItem('pf_scenarios', JSON.stringify({ 'Plan B': { resources: [] } }));
    ls.setItem('pf_chat_mode', 'smart');
    L.set('_cache', { work: fixture('legacy-config-basic.json'), master: fixture('legacy-config-multicurrency.json') });
    return { L: L, ls: ls, downloads: downloads, posts: posts, reset: function () { return Promise.resolve(L.get('checkPin')('reset')); } };
  }

  T.suite('Legacy factory reset (DAT-005)', function () {
    T.test('backup once, both stores POSTed null, loadWork returns sample data', function () {
      var a = sandbox();
      return a.reset().then(function () {
        assert.equal(a.downloads.length, 1, 'backup downloaded once');
        assert.equal(JSON.parse(a.downloads[0]).working.raw_actuals.length, 200, 'backup holds the data being reset');
        assert.deepEqual(a.posts.map(function (p) { return p.url; }).sort(), ['/api/config', '/api/config/master']);
        a.posts.forEach(function (p) { assert.equal(p.body, 'null'); });
        assert.equal(a.ls.getItem('pf_working'), null);
        assert.equal(a.ls.getItem('pf_master'), null);
        assert.deepEqual(a.L.get('_cache'), { work: null, master: null });
        var w = a.L.get('loadWork')();
        assert.deepEqual(w._sample_sections, Object.keys(a.L.get('DEFAULTS')), 'sample data, flagged');
        assert.ok(a.L.toasts.indexOf('✓ Working and master data reset. Scenarios were kept.') >= 0);
      });
    });

    T.test('scenarios and chat preferences are kept', function () {
      var a = sandbox();
      return a.reset().then(function () {
        assert.ok(a.ls.getItem('pf_scenarios') !== null);
        assert.equal(a.ls.getItem('pf_chat_mode'), 'smart');
      });
    });

    T.test('wrong PIN: nothing changes', function () {
      var a = sandbox({ pin: '0000' });
      return a.reset().then(function () {
        assert.equal(a.downloads.length, 0);
        assert.equal(a.posts.length, 0);
        assert.ok(a.ls.getItem('pf_working') !== null);
      });
    });

    T.test('server refuses: error toast says the server copy was not cleared', function () {
      var a = sandbox({ serverOk: false });
      return a.reset().then(function () {
        assert.ok(a.L.toasts.some(function (t) { return /server copy was not cleared/.test(t); }));
      });
    });

    T.test('file://: no POSTs, "Browser data reset (no server in use)"', function () {
      var a = sandbox({ protocol: 'file:' });
      return a.reset().then(function () {
        assert.equal(a.posts.length, 0);
        assert.equal(a.downloads.length, 1);
        assert.equal(a.ls.getItem('pf_working'), null);
        assert.ok(a.L.toasts.indexOf('✓ Browser data reset (no server in use)') >= 0);
      });
    });
  });
})();
