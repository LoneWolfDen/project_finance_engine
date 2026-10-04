// Browser test runner for tests/index.html.
// Add new browser-safe test files to SUITES and new app scripts to APP_SCRIPTS (paths relative to tests/).
// Node-only tests (e.g. tests/characterisation/, which read files from disk) must NOT be listed here.
(function () {
  'use strict';

  // app/** scripts the browser suites need, in load order.
  var APP_SCRIPTS = [];

  // Browser-safe test files.
  var SUITES = [
    'unit/harness.test.js'
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
