// STO-002: Continuum.storage (namespaced localStorage prefs, IndexedDB stores, estimate).
// Runs in Node (in-memory localStorage stub and tests/support/fake-idb.js) and in the browser
// (the real localStorage and IndexedDB of the page, e.g. Edge under file://).
(function () {
  var inNode = typeof CFE_NODE !== 'undefined';
  if (inNode) {
    // In Node the app scripts are not preloaded, and there is no browser storage: install stand-ins.
    if (typeof Continuum === 'undefined' || !Continuum.storage) (0, eval)(CFE_NODE.readFile('app/continuum-core/storage.js'));
    if (typeof localStorage === 'undefined') globalThis.localStorage = memoryStorage();
    if (typeof indexedDB === 'undefined') globalThis.indexedDB = CFE_NODE.support('fake-idb.js').create();
  }
  var T = CFE_TEST, assert = T.assert, S = Continuum.storage;
  var RUN = 'cfe-test-' + Date.now().toString(36);  // unique app keys, so a real browser profile is not polluted

  function memoryStorage() {
    var data = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; },
      key: function (i) { return Object.keys(data)[i] || null; },
      get length() { return Object.keys(data).length; }
    };
  }

  // Temporarily replaces setItem (on Storage.prototype in a browser: assigning to the
  // localStorage object itself would store an item called "setItem").
  function withSetItem(fn, body) {
    var target = typeof Storage !== 'undefined' && localStorage instanceof Storage ? Storage.prototype : localStorage;
    var original = target.setItem;
    target.setItem = fn;
    try { return body(); } finally { target.setItem = original; }
  }

  function cleanPrefs(appKey) {
    var p = S.prefs(appKey);
    p.keys().forEach(function (k) { p.remove(k); });
  }

  function deleteDb(name) {
    return new Promise(function (resolve) {
      var r = indexedDB.deleteDatabase(name);
      r.onsuccess = r.onerror = r.onblocked = function () { resolve(); };
    });
  }

  T.suite('Continuum.storage', function () {
    T.test('prefs: values are namespaced per app and round-trip as JSON', function () {
      var a = S.prefs(RUN + '-a'), b = S.prefs(RUN + '-b');
      try {
        assert.deepEqual(a.set('x', { n: 1, list: ['p'] }), { ok: true });
        assert.deepEqual(b.set('x', 2), { ok: true });
        assert.deepEqual(a.get('x'), { n: 1, list: ['p'] });
        assert.equal(b.get('x'), 2);
        assert.equal(localStorage.getItem('continuum.' + RUN + '-a.x'), '{"n":1,"list":["p"]}', 'stored under continuum.<appKey>.<key>');
        assert.deepEqual(a.keys(), ['x']);
        assert.equal(a.get('missing', 'dflt'), 'dflt');
        assert.deepEqual(a.remove('x'), { ok: true });
        assert.equal(a.get('x', null), null);
        assert.equal(b.get('x'), 2, 'removing in one app leaves the other alone');
      } finally { cleanPrefs(RUN + '-a'); cleanPrefs(RUN + '-b'); }
    });

    T.test('prefs: a full storage is reported as kind "quota", never thrown', function () {
      var p = S.prefs(RUN + '-q');
      var r = withSetItem(function () {
        var e = typeof DOMException !== 'undefined' ? new DOMException('The quota has been exceeded.', 'QuotaExceededError') : Object.assign(new Error('full'), { name: 'QuotaExceededError' });
        throw e;
      }, function () { return p.set('big', 'x'); });
      assert.equal(r.ok, false);
      assert.equal(r.error.kind, 'quota');
      assert.ok(r.error.message.length > 0);
    });

    T.test('prefs: other failures are kind "unknown"; invalid app keys are refused', function () {
      var r = withSetItem(function () { throw new Error('boom'); }, function () { return S.prefs(RUN + '-u').set('k', 1); });
      assert.deepEqual(r, { ok: false, error: { kind: 'unknown', message: 'boom' } });
      assert.throws(function () { S.prefs('bad key!'); }, 'invalid app key');
      assert.throws(function () { S.prefs(''); }, 'invalid app key');
    });

    T.test('db: put, get, getAll, delete and clear in an IndexedDB store', function () {
      var name = RUN + '-db';
      return S.db(name, ['drafts']).then(function (db) {
        return db.put('drafts', 'b', { v: 2 })
          .then(function (r) { assert.deepEqual(r, { ok: true }); return db.put('drafts', 'a', { v: 1 }); })
          .then(function () { return db.get('drafts', 'a'); })
          .then(function (r) { assert.deepEqual(r, { ok: true, value: { v: 1 } }); return db.getAll('drafts'); })
          .then(function (r) { assert.deepEqual(r, { ok: true, values: [{ v: 1 }, { v: 2 }] }); return db.delete('drafts', 'a'); })
          .then(function (r) { assert.deepEqual(r, { ok: true }); return db.get('drafts', 'a'); })
          .then(function (r) { assert.deepEqual(r, { ok: true, value: undefined }); return db.clear('drafts'); })
          .then(function () { return db.getAll('drafts'); })
          .then(function (r) { assert.deepEqual(r, { ok: true, values: [] }); db.close(); });
      }).then(function () { return deleteDb('continuum-' + name); });
    });

    T.test('db: a store added later is created without losing existing data', function () {
      var name = RUN + '-up';
      return S.db(name, ['one']).then(function (db) {
        return db.put('one', 'k', 'kept').then(function () { db.close(); });
      }).then(function () {
        return S.db(name, ['one', 'two']);
      }).then(function (db) {
        return db.put('two', 'k', 'new').then(function () { return db.get('one', 'k'); }).then(function (r) {
          assert.deepEqual(r, { ok: true, value: 'kept' });
          db.close();
        });
      }).then(function () { return deleteDb('continuum-' + name); });
    });

    T.test('db: an unknown store gives a result with an error, not an exception', function () {
      var name = RUN + '-nf';
      return S.db(name, ['one']).then(function (db) {
        return db.put('nope', 'k', 1).then(function (r) {
          assert.equal(r.ok, false);
          assert.equal(r.error.kind, 'unknown');
          db.close();
        });
      }).then(function () { return deleteDb('continuum-' + name); });
    });

    if (inNode) {
      T.test('db: a failed transaction is reported (Node fake)', function () {
        var name = RUN + '-fail';
        return S.db(name, ['one']).then(function (db) {
          indexedDB.failNextTransaction(Object.assign(new Error('disk full'), { name: 'QuotaExceededError' }));
          return db.put('one', 'k', 1).then(function (r) {
            assert.deepEqual(r, { ok: false, error: { kind: 'quota', message: 'disk full' } });
          });
        });
      });
    }

    T.test('estimate: {usage, quota} numbers, or null where the browser cannot tell', function () {
      return S.estimate().then(function (e) {
        if (e === null) return;
        assert.equal(typeof e.usage, 'number');
        assert.equal(typeof e.quota, 'number');
      });
    });
  });
})();
