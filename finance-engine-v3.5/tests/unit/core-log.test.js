// SHL-003: Continuum.log (in-memory diagnostics log) and CFE.views.diagnostics.
// The log and the diagnostics text run in Node and in the browser; render needs a DOM (browser only).
(function () {
  if (typeof Continuum === 'undefined' || !Continuum.log) {
    (0, eval)(CFE_NODE.readFile('app/continuum-core/CORE_VERSION.js'));
    (0, eval)(CFE_NODE.readFile('app/continuum-core/html.js'));
    (0, eval)(CFE_NODE.readFile('app/continuum-core/log.js'));
  }
  if (typeof CFE === 'undefined' || !CFE.version) {
    (0, eval)(CFE_NODE.readFile('app/VERSION.js'));
    (0, eval)(CFE_NODE.readFile('app/config.js'));
  }
  if (!CFE.require) (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  if (!CFE.calc.dates) (0, eval)(CFE_NODE.readFile('app/calc/dates.js'));
  if (!CFE.views.diagnostics) (0, eval)(CFE_NODE.readFile('app/views/diagnostics.js'));
  var T = CFE_TEST, assert = T.assert, L = Continuum.log, D = CFE.views.diagnostics;

  function withEmptyLog(fn) {
    var saved = L.entries();
    L.clear();
    try { fn(); } finally {
      L.clear();
      saved.forEach(function (e) { L[e.level](e.module, e.message, e.meta); });   // put earlier entries back (times change)
    }
  }

  function env(extra) {
    var e = {
      version: CFE.version, coreVersion: '0.1.0',
      status: { level: 'not-ready', title: 'No published data found.', details: ['No published data found.'] },
      manifest: null, userAgent: 'TestAgent/1.0', secure: true, protocol: 'file:',
      features: { 'Folder picker (showDirectoryPicker)': true, 'Browser database (indexedDB)': false },
      storage: { usage: 1048576, quota: 10485760 }, log: []
    };
    Object.keys(extra || {}).forEach(function (k) { e[k] = extra[k]; });
    return e;
  }

  T.suite('Continuum.log', function () {
    T.test('entries have time, level, module, message and meta; oldest first; copies', function () {
      withEmptyLog(function () {
        L.info('app', 'Started', { version: '4.0.0' });
        L.warn('import', 'Rows skipped', { count: 3 });
        L.error('app', 'Unexpected error', { type: 'TypeError' });
        var e = L.entries();
        assert.deepEqual(e.map(function (x) { return x.level + ' ' + x.module + ' ' + x.message; }), ['info app Started', 'warn import Rows skipped', 'error app Unexpected error']);
        assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(e[0].time), e[0].time);
        e[1].meta.count = 99;
        assert.equal(L.entries()[1].meta.count, 3, 'entries() returns copies');
      });
    });

    T.test('the ring buffer keeps the newest 500', function () {
      withEmptyLog(function () {
        for (var i = 0; i < 520; i++) L.info('t', 'n', { i: i });
        var e = L.entries();
        assert.equal(L.limit, 500);
        assert.equal(e.length, 500);
        assert.equal(e[0].meta.i, 20);
        assert.equal(e[499].meta.i, 519);
      });
    });

    T.test('meta keeps only numbers, booleans and strings up to 80 characters', function () {
      withEmptyLog(function () {
        var long = new Array(82).join('x');
        L.info('t', 'm', { n: 1.5, b: false, s: 'ok', s80: long.slice(0, 80), s81: long, o: { name: 'Alice' }, a: ['Alice'], f: function () {}, nan: NaN, u: undefined, nul: null });
        assert.deepEqual(L.entries()[0].meta, { n: 1.5, b: false, s: 'ok', s80: long.slice(0, 80), rejected: 7 });
        L.info('t', 'm', 'a string is not meta');
        L.info('t', 'm', ['Alice']);
        L.info('t', 'm');
        assert.deepEqual(L.entries().slice(1).map(function (x) { return x.meta; }), [{ rejected: 1 }, { rejected: 1 }, {}]);
        var many = {}; for (var i = 0; i < 12; i++) many['k' + i] = i;
        L.info('t', 'm', many);
        assert.equal(Object.keys(L.entries()[4].meta).length, 11, '10 kept + rejected');
        assert.equal(L.entries()[4].meta.rejected, 2);
      });
    });

    T.test('module and message are cut to 40 and 200 characters', function () {
      withEmptyLog(function () {
        L.info(new Array(60).join('m'), new Array(300).join('x'));
        assert.equal(L.entries()[0].module.length, 40);
        assert.equal(L.entries()[0].message.length, 200);
      });
    });

    T.test('format gives one plain line', function () {
      assert.equal(L.format({ time: '2026-10-05T12:00:00.000Z', level: 'warn', module: 'import', message: 'Rows skipped', meta: { count: 3, file: 'a1b2' } }),
        '2026-10-05T12:00:00.000Z WARN import: Rows skipped (count=3, file=a1b2)');
      assert.equal(L.format({ time: 't', level: 'info', module: 'app', message: 'Started', meta: {} }), 't INFO app: Started');
    });
  });

  T.suite('CFE.views.diagnostics', function () {
    T.test('copy text has the version lines, readiness, browser, features, storage and log', function () {
      var text = D.text(env({ log: [{ time: '2026-10-05T12:00:00.000Z', level: 'info', module: 'app', message: 'Started', meta: {} }] }));
      ['Finance Engine diagnostics', 'App version: 4.0.0-alpha.1', 'Release date: 05-10-2026', 'Dataset schema versions supported: 1 to 1',
       'Continuum core version: 0.1.0', 'Readiness: Not ready', 'Checks: No published data found.', 'Published data: not loaded',
       'User agent: TestAgent/1.0', 'Secure context: yes', 'Opened from: file: (a file on this computer)',
       'Folder picker (showDirectoryPicker): yes', 'Browser database (indexedDB): no', 'Storage estimate: 1.0 MB used of 10.0 MB',
       'Log (last 50 entries)', '2026-10-05T12:00:00.000Z INFO app: Started'].forEach(function (line) {
        assert.ok(text.split('\n').indexOf(line) >= 0, 'missing line: ' + line);
      });
    });

    T.test('storage unknown or still checking; empty log; manifest summary', function () {
      assert.ok(D.text(env({ storage: null })).indexOf('Storage estimate: not available') >= 0);
      assert.ok(D.text(env({ storage: undefined })).indexOf('Storage estimate: checking…') >= 0);
      assert.ok(D.text(env()).indexOf('(no entries)') >= 0);
      var t = D.text(env({ manifest: { data_as_of: '2026-10-01', published_utc: '2026-10-02T09:10:00Z', publisher: 'V. Y.', publication_id: 'p1', dataset_schema_version: 1 } }));
      assert.ok(t.indexOf('Data as of: 01-10-2026') >= 0 && t.indexOf('Published: 2026-10-02T09:10:00Z by V. Y.') >= 0 && t.indexOf('Publication: p1') >= 0);
    });

    T.test('only the last 50 log entries are shown', function () {
      withEmptyLog(function () {
        for (var i = 0; i < 60; i++) L.info('t', 'n', { i: i });
        var e = D.environment({ navigator: { userAgent: 'x' }, location: { protocol: 'file:' } });
        assert.equal(e.log.length, 50);
        assert.equal(e.log[0].meta.i, 10);
        assert.deepEqual(Object.keys(e.features).length, 4);
      });
    });
  });

  if (typeof document === 'undefined') return;

  T.suite('CFE.views.diagnostics render (browser)', function () {
    T.test('render shows the sections, escapes values and has a Copy button', function () {
      var doc = document.implementation.createHTMLDocument('t');
      doc.body.innerHTML = '<main id="main"></main>';
      D.render(doc, env({ userAgent: '<img src=x onerror=1>' }));
      var main = doc.getElementById('main');
      assert.deepEqual(Array.prototype.map.call(main.querySelectorAll('h2'), function (h) { return h.textContent; }),
        ['Versions', 'Published data', 'Browser', 'Features', 'Storage', 'Log (last 50 entries)']);
      assert.equal(main.querySelector('img'), null);
      assert.ok(main.textContent.indexOf('<img src=x onerror=1>') >= 0);
      assert.equal(main.querySelector('button[data-action="copy-diagnostics"]').textContent, 'Copy diagnostics');
    });
  });
})();
