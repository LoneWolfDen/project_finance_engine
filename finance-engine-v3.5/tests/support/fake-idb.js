// A minimal in-memory IndexedDB for Node tests (STO-002). It implements only what
// app/continuum-core/storage.js uses: open (with version upgrades), objectStoreNames.contains,
// createObjectStore, transaction → objectStore → put/get/delete/getAll/clear, and the
// request/transaction events. Values are structured clones, as in a browser.
//
//   const idb = CFE_NODE.support('fake-idb.js').create();
//   globalThis.indexedDB = idb;            // what storage.js reads
//   idb.failNextTransaction(new Error()) // makes the next transaction report an error
'use strict';

function later(fn) { setTimeout(fn, 0); }

function domError(name, message) {
  const e = new Error(message || name);
  e.name = name;
  return e;
}

function create() {
  const databases = new Map(); // name → { version, stores: Map(storeName → Map(key → value)) }
  let failNext = null;

  function makeDb(name) {
    const record = databases.get(name);
    let closed = false;
    return {
      get version() { return record.version; },
      objectStoreNames: { contains: s => record.stores.has(s) },
      createObjectStore(s) { if (!record.stores.has(s)) record.stores.set(s, new Map()); },
      close() { closed = true; },
      transaction(storeNames, mode) {
        if (closed) throw domError('InvalidStateError', 'The database connection is closing.');
        storeNames.forEach(s => { if (!record.stores.has(s)) throw domError('NotFoundError', 'No object store ' + s); });
        const tx = { oncomplete: null, onerror: null, onabort: null, error: null };
        const failure = failNext;
        failNext = null;
        let pending = 0;
        function settle() {
          if (pending > 0) return;
          later(() => {
            if (failure) { tx.error = failure; if (tx.onerror) tx.onerror(); }
            else if (tx.oncomplete) tx.oncomplete();
          });
        }
        function request(fn) {
          const req = { onsuccess: null, onerror: null, result: undefined, error: null };
          pending++;
          later(() => {
            if (!failure) {
              req.result = fn();
              if (req.onsuccess) req.onsuccess();
            }
            pending--;
            settle();
          });
          return req;
        }
        tx.objectStore = s => {
          const data = record.stores.get(s);
          function writable() { if (mode !== 'readwrite') throw domError('ReadOnlyError', 'The transaction is read-only.'); }
          return {
            put(value, key) { writable(); const v = structuredClone(value); return request(() => { data.set(key, v); return key; }); },
            get(key) { return request(() => (data.has(key) ? structuredClone(data.get(key)) : undefined)); },
            delete(key) { writable(); return request(() => { data.delete(key); return undefined; }); },
            getAll() { return request(() => [...data.keys()].sort().map(k => structuredClone(data.get(k)))); },
            clear() { writable(); return request(() => { data.clear(); return undefined; }); }
          };
        };
        return tx;
      }
    };
  }

  return {
    open(name, version) {
      const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: null, error: null };
      later(() => {
        let record = databases.get(name);
        const isNew = !record;
        if (isNew) { record = { version: 0, stores: new Map() }; databases.set(name, record); }
        const target = version === undefined ? Math.max(record.version, 1) : version;
        if (target < record.version) {
          req.error = domError('VersionError', 'Requested version is lower than the current version.');
          if (req.onerror) req.onerror();
          return;
        }
        req.result = makeDb(name);
        if (target > record.version) {
          record.version = target;
          if (req.onupgradeneeded) req.onupgradeneeded();
        }
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    },
    deleteDatabase(name) {
      const req = { onsuccess: null, onerror: null };
      later(() => { databases.delete(name); if (req.onsuccess) req.onsuccess(); });
      return req;
    },
    failNextTransaction(error) { failNext = error; },
    _databases: databases
  };
}

module.exports = { create };
