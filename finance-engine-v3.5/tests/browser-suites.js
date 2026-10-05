// Browser test runner for tests/index.html.
// Add new browser-safe test files to SUITES and new app scripts to APP_SCRIPTS (paths relative to tests/).
// Node-only tests (e.g. tests/characterisation/, which read files from disk) must NOT be listed here.
(function () {
  'use strict';

  // app/** scripts the browser suites need, in load order.
  var APP_SCRIPTS = [
    'vendor/xlsx-0.20.3/xlsx.full.min.js',
    'app/VERSION.js',
    'app/config.js',
    'app/continuum-core/CORE_VERSION.js',
    'app/continuum-core/html.js',
    'app/continuum-core/storage.js',
    'app/continuum-core/csv.js',
    'app/continuum-core/hash.js',
    'app/continuum-core/provenance.js',
    'app/continuum-core/ref.js',
    'app/continuum-core/status.js',
    'app/continuum-core/log.js',
    'app/cfe.js',
    'app/calc/dates.js',
    'app/data/calendars.js',
    'app/calc/calendar.js',
    'app/calc/fx.js',
    'app/calc/forecast.js',
    'app/calc/actuals.js',
    'app/data/schema.js',
    'app/data/migrate.js',
    'app/data/mapping.js',
    'app/data/mappings/peoplesoft-timesheet-v1.js',
    'app/data/mappings/resource-rules-v1.js',
    'app/data/mappings/po-details-v1.js',
    'app/data/mappings/invoices-v1.js',
    'app/data/mappings/expenses-v1.js',
    'app/data/mappings/fx-rates-v1.js',
    'app/data/mappings/ot-rules-v1.js',
    'app/data/mappings/references-crosswalk-v1.js',
    'app/store/state.js',
    'app/store/dataset-loader.js',
    'app/views/shell.js',
    'app/views/diagnostics.js',
    'app/views/about.js',
    'app/views/publish.js',
    'app/app.js'
  ];

  // Browser-safe test files.
  var SUITES = [
    'unit/harness.test.js',
    'unit/html.test.js',
    'unit/core-storage.test.js',
    'unit/core-csv.test.js',
    'unit/core-hash.test.js',
    'unit/core-provenance.test.js',
    'unit/core-ref.test.js',
    'unit/core-status.test.js',
    'unit/core-log.test.js',
    'unit/calc-dates.test.js',
    'unit/data-calendars.test.js',
    'unit/calc-calendar.test.js',
    'unit/calc-fx.test.js',
    'unit/calc-forecast.test.js',
    'unit/calc-actuals.test.js',
    'unit/data-schema.test.js',
    'unit/data-migrate.test.js',
    'unit/data-mapping.test.js',
    'unit/app-router.test.js',
    'unit/about-view.test.js',
    'unit/store-loader.test.js',
    'unit/views-publish.test.js'
  ];

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function line(parent, text, className) {
    var el = document.createElement('div');
    el.textContent = text;
    if (className) el.className = className;
    parent.appendChild(el);
    return el;
  }

  function render(r) {
    var out = document.getElementById('results');
    var lastSuite = null;
    r.results.forEach(function (res) {
      if (res.suite !== lastSuite) { line(out, res.suite, 'suite'); lastSuite = res.suite; }
      line(out, (res.ok ? '✓ ' : '✗ ') + res.test, res.ok ? 'pass' : 'fail');
      if (!res.ok) line(out, res.error, 'error');
    });
    var summary = document.getElementById('summary');
    summary.textContent = r.failed === 0
      ? 'All suites passed (' + r.passed + ' tests)'
      : r.failed + ' failed, ' + r.passed + ' passed';
    summary.className = r.failed === 0 ? 'summary pass' : 'summary fail';
  }

  function fail(e) {
    var summary = document.getElementById('summary');
    summary.textContent = 'Test page error: ' + e.message;
    summary.className = 'summary fail';
  }

  var all = APP_SCRIPTS.map(function (p) { return '../' + p; }).concat(SUITES);
  all.reduce(function (p, src) { return p.then(function () { return loadScript(src); }); }, Promise.resolve())
    .then(function () { return CFE_TEST.run(); })
    .then(render, fail);
})();
