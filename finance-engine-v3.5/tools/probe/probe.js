// Continuum environment probe (backlog item BAS-002).
//
// Checks what the browser allows for a page opened from a local or synced folder (file://).
// Rules this file follows:
// * No network use. The page CSP sets connect-src 'none'; check 7 confirms it.
// * Files are touched only through pickers the user clicks.
// * Results never contain file contents, file or folder names, paths or clipboard text.
//   They contain only statuses, counts and browser facts, so they are safe to paste into the repository.
// * DOM is built with textContent only (no innerHTML).

(function () {
  'use strict';

  var VERSION = '1.0.0';
  var LS_PREFIX = 'continuum.probe.';
  var DB_NAME = 'continuum-probe';
  var SHA256_ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

  // CSP violations are recorded from the moment this script runs (it loads before the inline test).
  var violations = [];
  document.addEventListener('securitypolicyviolation', function (e) {
    violations.push({ directive: e.effectiveDirective || e.violatedDirective || '?', blocked: safeBlocked(e.blockedURI) });
    if (results['17']) reportViolations();
  });

  // The blocked URI can contain a local path; keep only the scheme or keyword.
  function safeBlocked(uri) {
    if (!uri) return '(empty)';
    var m = /^([a-z][a-z0-9+.-]*):/i.exec(uri);
    return m ? m[1] + ':' : uri; // e.g. 'inline', 'eval', 'file:'
  }

  // ---- Result table -------------------------------------------------------

  var ORDER = ['1', '2', '3', '4', '5', '6', '7', '8', '9a', '9b', '9c', '10', '11a', '11b', '12', '13', '14', '15', '16', '17'];
  var TITLES = {
    '1': 'Secure context and origin',
    '2': 'localStorage write/read',
    '3': 'IndexedDB open/write/read',
    '4': 'Storage estimate and persist()',
    '5': 'Data file loads by script tag (OV-3)',
    '6': 'Inline script blocked by CSP',
    '7': 'fetch() of a local file is blocked',
    '8': 'crypto.subtle SHA-256',
    '9a': 'Folder picker available (OV-1)',
    '9b': 'Folder pick, write and read back (OV-1)',
    '9c': 'Stored folder after reload (OV-1)',
    '10': 'Folder listing via webkitdirectory',
    '11a': 'Save dialog available',
    '11b': 'Save dialog writes a file (DEC-023)',
    '12': '.js download (OV-4)',
    '13': 'file:// link to second page with #hash (OV-2)',
    '14': 'Clipboard read on click (CV-3)',
    '15': "script-src 'self' accepts local files (DEC-020)",
    '16': 'Storage shared across folders (ADR-009)',
    '17': 'Unexpected CSP violations'
  };
  var results = {};

  // Results of button and manual checks are kept in localStorage, so they survive the
  // page reload that check 9 asks for. They hold statuses and counts only.
  var SAVED_KEY = LS_PREFIX + 'clickResults';
  var CLICK_IDS = ['9b', '10', '11b', '12', '13', '14'];
  var FORM_IDS = ['where', 'offline', 'obs-download', 'obs-link', 'notes'];

  function set(id, status, detail) {
    results[id] = { status: status, detail: detail };
    if (CLICK_IDS.indexOf(id) >= 0 && status !== 'N/A') saveClickResult(id);
    render();
  }

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  function saveClickResult(id) {
    try {
      var saved = loadSaved();
      saved[id] = { status: results[id].status, detail: results[id].detail, when: new Date().toISOString() };
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    } catch (e) { /* storage unavailable: results stay on screen only */ }
  }

  function restoreSaved() {
    var saved = loadSaved();
    CLICK_IDS.forEach(function (id) {
      var r = saved[id];
      if (r) results[id] = { status: r.status, detail: r.detail + ' [recorded ' + r.when + ', before a reload]' };
    });
    FORM_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      try {
        var v = localStorage.getItem(LS_PREFIX + 'form.' + id);
        if (el && v !== null) el.value = v;
      } catch (e) { /* ignore */ }
    });
    render();
  }

  function saveForm(id) {
    var el = document.getElementById(id);
    try { if (el) localStorage.setItem(LS_PREFIX + 'form.' + id, el.value); } catch (e) { /* ignore */ }
  }

  // A browser API that never answers must not stall the whole probe: give up after `ms`
  // and record a FAIL for that check only.
  function withTimeout(id, ms, fn) {
    var done = false;
    return new Promise(function (resolve) {
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        set(id, 'FAIL', 'No answer within ' + (ms / 1000) + ' s (the browser did not respond)');
        resolve();
      }, ms);
      Promise.resolve().then(fn).then(function () {}, function () {}).then(function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve();
      });
    });
  }

  function errText(e) {
    if (!e) return 'unknown error';
    return (e.name ? e.name + ': ' : '') + (e.message || String(e));
  }

  function render() {
    var body = document.getElementById('results');
    if (!body) return;
    while (body.firstChild) body.removeChild(body.firstChild);
    ORDER.forEach(function (id) {
      var r = results[id] || { status: 'N/A', detail: 'Not run yet' };
      var tr = document.createElement('tr');
      [id, TITLES[id], r.status, r.detail].forEach(function (text, i) {
        var td = document.createElement('td');
        td.textContent = text;
        if (i === 2) td.className = 'status ' + (r.status === 'PASS' ? 'pass' : r.status === 'FAIL' ? 'fail' : 'na');
        if (i === 3) td.className = 'detail';
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    var out = document.getElementById('results-text');
    if (out) out.value = report();
  }

  // ---- IndexedDB helpers --------------------------------------------------

  function idbOpen() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles');
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
      req.onblocked = function () { reject(new Error('open blocked by another tab')); };
    });
  }

  function idbRequest(store, mode, fn) {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, mode);
        var req = fn(tx.objectStore(store));
        tx.oncomplete = function () { db.close(); resolve(req.result); };
        tx.onerror = function () { db.close(); reject(tx.error); };
        tx.onabort = function () { db.close(); reject(tx.error); };
      });
    });
  }

  function idbPut(store, key, value) {
    return idbRequest(store, 'readwrite', function (s) { return s.put(value, key); });
  }

  function idbGet(store, key) {
    return idbRequest(store, 'readonly', function (s) { return s.get(key); });
  }

  // ---- Automatic checks ---------------------------------------------------

  function checkContext() {
    var origin = String(location.origin);
    var detail = 'isSecureContext=' + window.isSecureContext + '; protocol=' + location.protocol + '; origin=' + origin;
    set('1', window.isSecureContext ? 'PASS' : 'FAIL', detail + (window.isSecureContext ? '' : ' (folder access needs a secure context)'));
  }

  function checkLocalStorage() {
    try {
      var key = LS_PREFIX + 'test';
      var value = 'ok-' + Date.now();
      localStorage.setItem(key, value);
      var back = localStorage.getItem(key);
      set('2', back === value ? 'PASS' : 'FAIL', back === value ? 'Wrote and read back a test value' : 'Read-back did not match');
    } catch (e) {
      set('2', 'FAIL', errText(e));
    }
  }

  function checkIndexedDb() {
    if (!window.indexedDB) return Promise.resolve(set('3', 'FAIL', 'indexedDB is not available'));
    var value = 'ok-' + Date.now();
    return idbPut('kv', 'test', value)
      .then(function () { return idbGet('kv', 'test'); })
      .then(function (back) {
        set('3', back === value ? 'PASS' : 'FAIL', back === value ? 'Opened ' + DB_NAME + ', wrote and read back' : 'Read-back did not match');
      })
      .catch(function (e) { set('3', 'FAIL', errText(e)); });
  }

  function checkStorageEstimate() {
    var s = navigator.storage;
    if (!s || !s.estimate) return Promise.resolve(set('4', 'N/A', 'navigator.storage.estimate is not available'));
    var mb = function (n) { return (n / 1048576).toFixed(1) + ' MB'; };
    var detail = '';
    return s.estimate()
      .then(function (est) {
        detail = 'usage ' + mb(est.usage || 0) + ' of quota ' + mb(est.quota || 0);
        return s.persisted ? s.persisted() : null;
      })
      .then(function (before) {
        detail += '; persisted before=' + before;
        return s.persist ? s.persist() : null;
      })
      .then(function (granted) {
        set('4', 'PASS', detail + '; persist() returned ' + granted);
      })
      .catch(function (e) { set('4', 'FAIL', detail + ' ' + errText(e)); });
  }

  function checkScriptData() {
    var ok = window.PROBE_DATA && window.PROBE_DATA.ok === true;
    set('5', ok ? 'PASS' : 'FAIL', ok
      ? 'data/probe-data.js loaded with a <script src> tag'
      : 'data/probe-data.js did not load; published/dataset.js would need the "Open dataset.json" fallback');
  }

  function checkInlineBlocked() {
    var ran = window.PROBE_INLINE_RAN === true;
    set('6', ran ? 'FAIL' : 'PASS', ran ? 'Inline script ran: the CSP is NOT enforced' : 'Inline script was blocked (CSP enforced)');
  }

  function checkFetch() {
    if (!window.fetch) return Promise.resolve(set('7', 'N/A', 'fetch is not available'));
    return fetch('data/probe-data.js')
      .then(function () { set('7', 'FAIL', "fetch succeeded: connect-src 'none' is NOT enforced"); })
      .catch(function (e) { set('7', 'PASS', 'Blocked as expected (' + errText(e) + ')'); });
  }

  function checkDigest() {
    if (!window.crypto || !crypto.subtle || !crypto.subtle.digest) return Promise.resolve(set('8', 'FAIL', 'crypto.subtle is not available'));
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode('abc'))
      .then(function (buf) {
        var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        set('8', hex === SHA256_ABC ? 'PASS' : 'FAIL', hex === SHA256_ABC ? 'SHA-256 of "abc" matches the known value' : 'Wrong hash: ' + hex);
      })
      .catch(function (e) { set('8', 'FAIL', errText(e)); });
  }

  function checkPickersPresent() {
    set('9a', typeof window.showDirectoryPicker === 'function' ? 'PASS' : 'FAIL',
      typeof window.showDirectoryPicker === 'function' ? 'showDirectoryPicker is available' : 'showDirectoryPicker is not available: V1 file pickers only');
    set('11a', typeof window.showSaveFilePicker === 'function' ? 'PASS' : 'FAIL',
      typeof window.showSaveFilePicker === 'function' ? 'showSaveFilePicker is available' : 'showSaveFilePicker is not available: publishing falls back to downloads');
  }

  // 9c: runs on every load. Meaningful after 9b was clicked and the page was reloaded.
  function checkStoredHandle() {
    if (typeof window.showDirectoryPicker !== 'function') return Promise.resolve(set('9c', 'N/A', 'No folder picker in this browser'));
    return idbGet('handles', 'folder')
      .then(function (handle) {
        if (!handle) return set('9c', 'N/A', 'No stored folder yet: click button 9, then reload this page (F5)');
        if (typeof handle.queryPermission !== 'function') return set('9c', 'FAIL', 'Stored handle came back without queryPermission');
        return handle.queryPermission({ mode: 'readwrite' }).then(function (state) {
          var detail = 'Stored folder handle survived; queryPermission after reload = ' + state;
          if (state === 'granted') set('9c', 'PASS', detail);
          else if (state === 'prompt') set('9c', 'PASS', detail + ' (normal: click "reconnect stored folder" to confirm it can be re-opened)');
          else set('9c', 'FAIL', detail);
        });
      })
      .catch(function (e) { set('9c', 'FAIL', errText(e)); });
  }

  function checkScriptSelf() {
    // If this line runs at all, the browser loaded probe.js under script-src 'self'.
    set('15', 'PASS', "probe.js and data/probe-data.js ran under script-src 'self' (DEC-020 alternative A)");
  }

  // 16: does a page opened from a different folder see this page's localStorage?
  // The folder path itself stays in this browser only and is never put in the results.
  function checkSharedOrigin() {
    var key = LS_PREFIX + 'page';
    var here = location.pathname.replace(/[^/]*$/, '');
    try {
      // Every folder the probe has been opened from: [{dir, when}]. Older single-object values are accepted.
      var seen = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(seen)) seen = seen && seen.dir ? [seen] : [];
      var other = seen.filter(function (s) { return s.dir !== here; });
      if (other.length) {
        set('16', 'PASS', 'Values written by the probe opened from ' + other.length + ' other folder(s) (latest ' + other[other.length - 1].when + ') are visible here: file:// pages share storage');
      } else {
        set('16', 'N/A', 'Open a second copy of the probe from a different folder to test (README step 7). If you did and this stays N/A, storage is NOT shared');
      }
      seen = other.concat([{ dir: here, when: new Date().toISOString() }]).slice(-10);
      localStorage.setItem(key, JSON.stringify(seen));
    } catch (e) {
      set('16', 'FAIL', errText(e));
    }
  }

  function reportViolations() {
    // Two violations are expected: the inline script (check 6) and the fetch (check 7).
    var unexpected = violations.filter(function (v) {
      var inlineScript = v.blocked === 'inline' && /^script-src/.test(v.directive);
      var connect = v.directive === 'connect-src';
      return !inlineScript && !connect;
    });
    var summary = violations.length + ' recorded, ' + unexpected.length + ' unexpected';
    if (unexpected.length) {
      set('17', 'FAIL', summary + ': ' + unexpected.map(function (v) { return v.directive + ' blocked ' + v.blocked; }).join('; '));
    } else {
      set('17', 'PASS', summary + ' (expected: inline script and connect-src)');
    }
  }

  // ---- Button checks ------------------------------------------------------

  function pickFolder() {
    if (typeof window.showDirectoryPicker !== 'function') return set('9b', 'N/A', 'No folder picker in this browser');
    var fileName = 'probe-write-test.txt';
    var text = 'Continuum probe write test ' + new Date().toISOString() + '\n';
    var dir;
    window.showDirectoryPicker({ id: 'continuum-probe', mode: 'readwrite' })
      .then(function (d) { dir = d; return dir.getFileHandle(fileName, { create: true }); })
      .then(function (fh) {
        return fh.createWritable()
          .then(function (w) { return w.write(text).then(function () { return w.close(); }); })
          .then(function () { return fh.getFile(); })
          .then(function (file) { return file.text(); });
      })
      .then(function (back) {
        if (back !== text) return set('9b', 'FAIL', 'Wrote ' + fileName + ' but the read-back did not match');
        return idbPut('handles', 'folder', dir)
          .then(function () { return 'yes'; }, function (e) { return 'no (' + errText(e) + ')'; })
          .then(function (stored) {
            set('9b', 'PASS', 'Wrote and read back ' + fileName + ' (' + text.length + ' bytes); handle stored in IndexedDB: ' + stored + '. Now reload the page (F5) to run 9c');
          });
      })
      .catch(function (e) {
        if (e && e.name === 'AbortError') set('9b', 'N/A', 'Picker cancelled');
        else set('9b', 'FAIL', errText(e));
      });
  }

  function reconnectFolder() {
    idbGet('handles', 'folder')
      .then(function (handle) {
        if (!handle) return set('9c', 'N/A', 'No stored folder yet: click button 9 first');
        return handle.requestPermission({ mode: 'readwrite' })
          .then(function (state) {
            if (state !== 'granted') return set('9c', 'FAIL', 'requestPermission after reload = ' + state);
            return handle.getFileHandle('probe-write-test.txt')
              .then(function (fh) { return fh.getFile(); })
              .then(function (file) {
                set('9c', 'PASS', 'After reload: permission granted on click, test file re-read (' + file.size + ' bytes)');
              });
          });
      })
      .catch(function (e) { set('9c', 'FAIL', errText(e)); });
  }

  function listFolder(e) {
    var files = e.target.files || [];
    set('10', 'PASS', 'Listing returned ' + files.length + ' file(s) (names not recorded)');
  }

  function trySave() {
    if (typeof window.showSaveFilePicker !== 'function') return set('11b', 'N/A', 'No save dialog in this browser');
    var text = 'Continuum probe save test ' + new Date().toISOString() + '\n';
    window.showSaveFilePicker({ suggestedName: 'probe-save-test.txt', types: [{ description: 'Text file', accept: { 'text/plain': ['.txt'] } }] })
      .then(function (fh) { return fh.createWritable(); })
      .then(function (w) { return w.write(text).then(function () { return w.close(); }); })
      .then(function () { set('11b', 'PASS', 'Saved probe-save-test.txt where you chose (' + text.length + ' bytes)'); })
      .catch(function (e) {
        if (e && e.name === 'AbortError') set('11b', 'N/A', 'Save dialog cancelled');
        else set('11b', 'FAIL', errText(e));
      });
  }

  function download() {
    var blob = new Blob(['// Continuum probe download test. Safe to delete.\nwindow.PROBE_DOWNLOAD = true;\n'], { type: 'text/javascript' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'probe-download.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    set('12', 'N/A', 'Download started: record what Edge did under "Record what you saw"');
  }

  function readClipboard() {
    if (!navigator.clipboard || !navigator.clipboard.readText) return set('14', 'FAIL', 'navigator.clipboard.readText is not available');
    navigator.clipboard.readText()
      .then(function (t) { set('14', 'PASS', 'Read ' + t.length + ' characters (content not recorded)'); })
      .catch(function (e) { set('14', 'FAIL', errText(e)); });
  }

  // Manual observations (12, 13) come from the drop-downs; value format "pass:<text>" or "fail:<text>".
  function readObservation(selectId, id, pendingText) {
    var el = document.getElementById(selectId);
    var v = el ? el.value : '';
    if (!v) return set(id, 'N/A', pendingText);
    var i = v.indexOf(':');
    set(id, v.slice(0, i) === 'pass' ? 'PASS' : 'FAIL', 'Owner observed: ' + v.slice(i + 1));
  }

  // ---- Report -------------------------------------------------------------

  function selectedText(id) {
    var el = document.getElementById(id);
    return el && el.value ? el.value : '(not chosen)';
  }

  function report() {
    var lines = [];
    lines.push('Continuum environment probe ' + VERSION + ': results');
    lines.push('Date (UTC): ' + new Date().toISOString());
    lines.push('Opened from: ' + selectedText('where'));
    lines.push('OneDrive setting: ' + selectedText('offline'));
    lines.push('Browser: ' + navigator.userAgent);
    lines.push('');
    ORDER.forEach(function (id) {
      var r = results[id] || { status: 'N/A', detail: 'Not run yet' };
      lines.push(id + '. ' + TITLES[id] + ': ' + r.status + ' - ' + r.detail);
    });
    var notes = document.getElementById('notes');
    lines.push('');
    lines.push('Notes: ' + (notes && notes.value.trim() ? notes.value.trim() : '(none)'));
    return lines.join('\n');
  }

  function copyResults() {
    var text = report();
    var status = document.getElementById('copy-status');
    var out = document.getElementById('results-text');
    out.value = text;
    var fallback = function () {
      out.focus();
      out.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      status.textContent = ok ? 'Copied.' : 'Could not copy automatically: the text is selected below, press Ctrl+C (Cmd+C on Mac).';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { status.textContent = 'Copied.'; }, fallback);
    } else {
      fallback();
    }
  }

  function clearProbeData() {
    var status = document.getElementById('clear-status');
    try {
      Object.keys(localStorage).filter(function (k) { return k.indexOf(LS_PREFIX) === 0; })
        .forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* storage unavailable: nothing to clear */ }
    var req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = function () { status.textContent = 'Cleared. Delete probe-write-test.txt, probe-save-test.txt and probe-download.js by hand if you created them.'; };
    req.onerror = function () { status.textContent = 'Could not delete the database: ' + errText(req.error); };
    req.onblocked = function () { status.textContent = 'Close other probe tabs, then click again.'; };
  }

  // ---- Pages --------------------------------------------------------------

  function runSecond() {
    var hash = document.getElementById('hash');
    hash.textContent = location.hash || '(none)';
    var shared = document.getElementById('shared');
    var seen = false;
    try { seen = localStorage.getItem(LS_PREFIX + 'test') !== null; } catch (e) { seen = false; }
    shared.textContent = seen
      ? 'This page can also see the probe\'s stored test value (same storage as index.html).'
      : 'This page cannot see the probe\'s stored test value.';
  }

  function on(id, event, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  }

  function run() {
    var missing = document.getElementById('js-missing');
    if (missing) missing.className = 'hidden';
    if (document.body.getAttribute('data-page') === 'second') return runSecond();

    on('btn-folder', 'click', pickFolder);
    on('btn-reconnect', 'click', reconnectFolder);
    on('dir-input', 'change', listFolder);
    on('btn-save', 'click', trySave);
    on('btn-download', 'click', download);
    on('btn-clipboard', 'click', readClipboard);
    on('btn-copy', 'click', copyResults);
    on('btn-clear', 'click', clearProbeData);
    on('obs-download', 'change', function () { readObservation('obs-download', '12', 'Click button 12, then record what Edge did'); });
    on('obs-link', 'change', function () { readObservation('obs-link', '13', 'Click link 13, then record what happened'); });
    FORM_IDS.forEach(function (id) {
      var save = function () { saveForm(id); render(); };
      on(id, 'input', save);
      on(id, 'change', save);
    });

    checkContext();
    checkLocalStorage();
    checkScriptData();
    checkInlineBlocked();
    checkPickersPresent();
    checkScriptSelf();
    checkSharedOrigin();
    set('9b', 'N/A', 'Click button 9 to run');
    set('10', 'N/A', 'Click button 10 to run');
    set('11b', 'N/A', 'Click button 11 to run (optional)');
    set('12', 'N/A', 'Click button 12, then record what Edge did');
    set('13', 'N/A', 'Click link 13, then record what happened');
    set('14', 'N/A', 'Click button 14 to run');
    restoreSaved();
    readObservation('obs-download', '12', 'Click button 12, then record what Edge did');
    readObservation('obs-link', '13', 'Click link 13, then record what happened');

    // Each asynchronous check runs on its own, so one slow API cannot hide the others.
    var pending = [
      withTimeout('3', 5000, checkIndexedDb),
      withTimeout('4', 5000, checkStorageEstimate),
      withTimeout('7', 5000, checkFetch),
      withTimeout('8', 5000, checkDigest),
      withTimeout('9c', 5000, checkStoredHandle)
    ];
    Promise.all(pending).then(reportViolations);
  }

  window.Probe = { version: VERSION, run: run, report: report };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
