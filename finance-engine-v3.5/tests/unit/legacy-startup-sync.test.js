// DAT-004: startup sync keeps the newer copy instead of always taking the server's.
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  function cfg(tag, savedUtc) {
    var c = { tag: tag, resources: [], po_details: [] };
    if (savedUtc) c._meta = { saved_utc: savedUtc };
    return c;
  }
  var OLD = '2026-09-01T10:00:00.000Z', NEW = '2026-09-30T10:00:00.000Z';

  // local: { work, master } in browser storage; server: { work, master } answered by GET.
  function sandbox(local, server, protocol) {
    var L = loadLegacy({ protocol: protocol || 'http:' });
    var gets = [], posts = [];
    L.ctx.fetch = function (url, init) {
      if (init && init.method === 'POST') { posts.push({ url: url, body: JSON.parse(init.body) }); return Promise.resolve({ ok: true, status: 200 }); }
      gets.push(url);
      var v = url === '/api/config' ? server.work : server.master;
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(v === undefined ? null : v); } });
    };
    L.ctx.render = function () {};
    var ls = L.get('localStorage');
    if (local.work) ls.setItem('pf_working', JSON.stringify(local.work));
    if (local.master) ls.setItem('pf_master', JSON.stringify(local.master));
    return {
      L: L, gets: gets, posts: posts,
      run: function () { return L.get('initFromServer')(); },
      read: function (key) { var v = ls.getItem(key); return v === null ? null : JSON.parse(v); },
      work: function () { return L.get('loadWork')(); }
    };
  }

  T.suite('Legacy startup sync (DAT-004)', function () {
    T.test('saves stamp _meta.saved_utc', function () {
      var a = sandbox({}, {});
      a.L.ctx.fetch = function () { return Promise.resolve({ ok: true }); };
      return a.L.get('saveWork')(cfg('x')).then(function () {
        assert.equal(a.read('pf_working')._meta.saved_utc, '2026-10-01T12:00:00.000Z');
      });
    });

    T.test('local newer: local kept, re-POSTed, server copy superseded', function () {
      var a = sandbox({ work: cfg('local', NEW) }, { work: cfg('server', OLD) });
      return a.run().then(function () {
        assert.equal(a.work().tag, 'local');
        assert.equal(a.read('pf_working').tag, 'local');
        assert.equal(a.posts.length, 1);
        assert.equal(a.posts[0].url, '/api/config');
        assert.equal(a.posts[0].body.tag, 'local');
        assert.equal(a.posts[0].body._meta.saved_utc, NEW, 're-POST keeps the original stamp');
        assert.equal(a.read('pf_working_superseded').tag, 'server');
      });
    });

    T.test('server newer: server wins, local copy superseded, no POST', function () {
      var a = sandbox({ work: cfg('local', OLD) }, { work: cfg('server', NEW) });
      return a.run().then(function () {
        assert.equal(a.work().tag, 'server');
        assert.equal(a.read('pf_working').tag, 'server');
        assert.equal(a.posts.length, 0);
        assert.equal(a.read('pf_working_superseded').tag, 'local');
      });
    });

    T.test('local stamp missing counts as oldest: server wins', function () {
      var a = sandbox({ work: cfg('local') }, { work: cfg('server', OLD) });
      return a.run().then(function () {
        assert.equal(a.work().tag, 'server');
        assert.equal(a.read('pf_working_superseded').tag, 'local');
      });
    });

    T.test('server stamp missing counts as oldest: local wins', function () {
      var a = sandbox({ work: cfg('local', OLD) }, { work: cfg('server') });
      return a.run().then(function () {
        assert.equal(a.work().tag, 'local');
        assert.equal(a.posts.length, 1);
        assert.equal(a.read('pf_working_superseded').tag, 'server');
      });
    });

    T.test('server has no copy: browser copy kept and POSTed, nothing superseded', function () {
      var a = sandbox({ work: cfg('local', OLD) }, { work: null });
      return a.run().then(function () {
        assert.equal(a.work().tag, 'local');
        assert.equal(a.posts.length, 1);
        assert.equal(a.read('pf_working_superseded'), null);
      });
    });

    T.test('browser has no copy: server copy taken, nothing superseded', function () {
      var a = sandbox({}, { work: cfg('server', OLD) });
      return a.run().then(function () {
        assert.equal(a.read('pf_working').tag, 'server');
        assert.equal(a.read('pf_working_superseded'), null);
      });
    });

    T.test('identical copies: no POST, nothing superseded', function () {
      var a = sandbox({ work: cfg('same', OLD) }, { work: cfg('same', OLD) });
      return a.run().then(function () {
        assert.equal(a.posts.length, 0);
        assert.equal(a.read('pf_working_superseded'), null);
      });
    });

    T.test('master follows the same rule', function () {
      var a = sandbox({ master: cfg('local-m', NEW) }, { master: cfg('server-m', OLD) });
      return a.run().then(function () {
        assert.equal(a.read('pf_master').tag, 'local-m');
        assert.equal(a.posts[0].url, '/api/config/master');
        assert.equal(a.read('pf_master_superseded').tag, 'server-m');
      });
    });

    T.test('file://: returns immediately, no fetch', function () {
      var a = sandbox({ work: cfg('local', OLD) }, { work: cfg('server', NEW) }, 'file:');
      return a.run().then(function () {
        assert.equal(a.gets.length + a.posts.length, 0);
        assert.equal(a.read('pf_working').tag, 'local');
      });
    });
  });
})();
