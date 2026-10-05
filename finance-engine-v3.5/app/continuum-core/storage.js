// Continuum.storage: namespaced browser storage shared by all Continuum apps (STO-002, ADR-009).
// Classic script, no dependencies. Copy this folder verbatim between apps.
//
// Every file:// page may share one storage origin (ADR-009), so every key is namespaced by app:
//
//   var prefs = Continuum.storage.prefs('finance');        // localStorage keys "continuum.finance.<key>"
//   prefs.set('theme', 'dark');                             // → {ok:true} or {ok:false, error:{kind, message}}
//   prefs.get('theme', 'light');                            // stored value, or the default
//
//   Continuum.storage.db('finance', ['drafts']).then(function (db) {   // IndexedDB "continuum-finance"
//     return db.put('drafts', 'd1', {...});                 // → Promise of {ok:true} or {ok:false, error}
//   });
//
// Failures are never silent: every write returns a result, error.kind is 'quota', 'unavailable' or
// 'unknown'. Values are stored as JSON (prefs) or structured clones (db). db() itself rejects with
// {kind:'unavailable', message} where the browser offers no IndexedDB.
(function (root) {
  'use strict';
  var C = root.Continuum = root.Continuum || {};

  var APP_KEY = /^[a-z0-9][a-z0-9-]{0,63}$/i;

  function checkAppKey(appKey) {
    if (!APP_KEY.test(String(appKey))) throw new Error('Continuum.storage: invalid app key "' + appKey + '" (letters, digits and "-")');
  }

  function errorKind(e) {
    var name = e && e.name;
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || (e && (e.code === 22 || e.code === 1014))) return 'quota';
    if (name === 'SecurityError' || name === 'InvalidStateError') return 'unavailable';
    return 'unknown';
  }

  function failure(kind, e) {
    return { ok: false, error: { kind: kind, message: e && e.message ? String(e.message) : String(e || kind) } };
  }

  // Reading root.localStorage itself can throw (blocked storage, some file:// policies).
  function local() {
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  // ─── prefs: small values in localStorage ────────────────────────────────
  function prefs(appKey) {
    checkAppKey(appKey);
    var prefix = 'continuum.' + appKey + '.';

    function get(key, fallback) {
      var ls = local();
      if (!ls) return fallback;
      try {
        var raw = ls.getItem(prefix + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    }

    function set(key, value) {
      var ls = local();
      if (!ls) return failure('unavailable', 'Browser storage is not available');
      try {
        ls.setItem(prefix + key, JSON.stringify(value));
        return { ok: true };
      } catch (e) {
        return failure(errorKind(e), e);
      }
    }

    function remove(key) {
      var ls = local();
      if (!ls) return failure('unavailable', 'Browser storage is not available');
      try {
        ls.removeItem(prefix + key);
        return { ok: true };
      } catch (e) {
        return failure(errorKind(e), e);
      }
    }

    function keys() {
      var ls = local(), out = [];
      if (!ls) return out;
      try {
        for (var i = 0; i < ls.length; i++) {
          var k = ls.key(i);
          if (k && k.indexOf(prefix) === 0) out.push(k.slice(prefix.length));
        }
      } catch (e) { /* storage became unavailable: report what was read */ }
      return out.sort();
    }

    return { get: get, set: set, remove: remove, keys: keys };
  }

  // ─── db: larger values in IndexedDB ─────────────────────────────────────
  function indexedDb() {
    try { return root.indexedDB || null; } catch (e) { return null; }
  }

  function promised(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  // Opens the database and creates any missing object stores (by raising the version once).
  function open(idb, name, stores) {
    return promised(idb.open(name)).then(function (database) {
      var missing = stores.filter(function (s) { return !database.objectStoreNames.contains(s); });
      if (!missing.length) return database;
      var version = database.version + 1;
      database.close();
      var request = idb.open(name, version);
      request.onupgradeneeded = function () {
        missing.forEach(function (s) { if (!request.result.objectStoreNames.contains(s)) request.result.createObjectStore(s); });
      };
      return promised(request);
    });
  }

  function db(appKey, stores) {
    try { checkAppKey(appKey); } catch (e) { return Promise.reject(e); }
    stores = (stores || []).map(String);
    var idb = indexedDb();
    if (!idb) return Promise.reject(failure('unavailable', 'IndexedDB is not available').error);

    return open(idb, 'continuum-' + appKey, stores).then(function (database) {
      // Runs one request in its own transaction; resolves {ok:true[, field:result]} or {ok:false, error}.
      function run(store, mode, field, makeRequest) {
        return new Promise(function (resolve) {
          var tx, result;
          try {
            tx = database.transaction([store], mode);
            var request = makeRequest(tx.objectStore(store));
            request.onsuccess = function () { result = request.result; };
          } catch (e) {
            resolve(failure(errorKind(e), e));
            return;
          }
          tx.oncomplete = function () {
            var out = { ok: true };
            if (field) out[field] = result;
            resolve(out);
          };
          tx.onerror = function () { resolve(failure(errorKind(tx.error), tx.error)); };
          tx.onabort = function () { resolve(failure(errorKind(tx.error), tx.error || 'Transaction aborted')); };
        });
      }
      return {
        put: function (store, key, value) { return run(store, 'readwrite', null, function (s) { return s.put(value, key); }); },
        get: function (store, key) { return run(store, 'readonly', 'value', function (s) { return s.get(key); }); },
        delete: function (store, key) { return run(store, 'readwrite', null, function (s) { return s.delete(key); }); },
        getAll: function (store) { return run(store, 'readonly', 'values', function (s) { return s.getAll(); }); },
        clear: function (store) { return run(store, 'readwrite', null, function (s) { return s.clear(); }); },
        close: function () { database.close(); }
      };
    });
  }

  // ─── estimate: how much the browser lets this origin store ──────────────
  // Promise of {usage, quota} in bytes, or null where the browser cannot tell.
  function estimate() {
    try {
      var nav = root.navigator;
      if (!nav || !nav.storage || !nav.storage.estimate) return Promise.resolve(null);
      return nav.storage.estimate().then(function (e) { return { usage: e.usage, quota: e.quota }; }, function () { return null; });
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  C.storage = { prefs: prefs, db: db, estimate: estimate };
})(typeof globalThis !== 'undefined' ? globalThis : this);
