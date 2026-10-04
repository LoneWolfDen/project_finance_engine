// CFE_TEST: a tiny test harness shared by the Node runner (tests/run-node.js)
// and the browser page (tests/index.html). Classic script, no dependencies.
//
//   CFE_TEST.suite('Forecast', function () {
//     CFE_TEST.test('adds up', function () { CFE_TEST.assert.equal(1 + 1, 2); });
//   });
//   CFE_TEST.run().then(function (r) { ... r.passed, r.failed, r.results ... });
//
// Tests may return a Promise. CFE_TEST.create() makes an independent instance (used by the self-test).
(function (root) {
  'use strict';

  function AssertionError(message) {
    var e = new Error(message);
    e.name = 'AssertionError';
    return e;
  }

  function show(v) {
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' && isNaN(v)) return 'NaN';
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }

  // Returns null if equal, otherwise a path and both values where they first differ.
  function firstDifference(a, b, path) {
    if (Object.is(a, b)) return null;
    var ta = Object.prototype.toString.call(a), tb = Object.prototype.toString.call(b);
    if (ta !== tb) return { path: path, a: a, b: b };
    if (ta === '[object Date]') return a.getTime() === b.getTime() ? null : { path: path, a: a, b: b };
    if (ta === '[object Array]') {
      if (a.length !== b.length) return { path: path + '.length', a: a.length, b: b.length };
      for (var i = 0; i < a.length; i++) {
        var d = firstDifference(a[i], b[i], path + '[' + i + ']');
        if (d) return d;
      }
      return null;
    }
    if (ta === '[object Object]') {
      var ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
      var keys = ka.concat(kb.filter(function (k) { return ka.indexOf(k) < 0; }));
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        if (!(k in a)) return { path: path + '.' + k, a: '(missing)', b: b[k] };
        if (!(k in b)) return { path: path + '.' + k, a: a[k], b: '(missing)' };
        var dk = firstDifference(a[k], b[k], path + '.' + k);
        if (dk) return dk;
      }
      return null;
    }
    return { path: path, a: a, b: b };
  }

  var assert = {
    ok: function (value, message) {
      if (!value) throw AssertionError(message || 'Expected a truthy value, got ' + show(value));
    },
    equal: function (actual, expected, message) {
      if (!Object.is(actual, expected)) {
        throw AssertionError((message ? message + ': ' : '') + 'expected ' + show(expected) + ', got ' + show(actual));
      }
    },
    deepEqual: function (actual, expected, message) {
      var d = firstDifference(actual, expected, '$');
      if (d) {
        throw AssertionError((message ? message + ': ' : '') + 'differs at ' + d.path + ': expected ' + show(d.b) + ', got ' + show(d.a));
      }
    },
    approx: function (actual, expected, eps, message) {
      eps = eps === undefined ? 1e-9 : eps;
      if (typeof actual !== 'number' || Math.abs(actual - expected) > eps) {
        throw AssertionError((message ? message + ': ' : '') + 'expected ' + expected + ' ± ' + eps + ', got ' + show(actual));
      }
    },
    throws: function (fn, match, message) {
      try { fn(); } catch (e) {
        if (match === undefined) return e;
        var text = String(e && e.message);
        var ok = match instanceof RegExp ? match.test(text) : text.indexOf(String(match)) >= 0;
        if (!ok) throw AssertionError((message ? message + ': ' : '') + 'error ' + show(text) + ' does not match ' + String(match));
        return e;
      }
      throw AssertionError(message || 'Expected the function to throw');
    }
  };

  function create() {
    var suites = [];
    var current = null;
    var api = {
      assert: assert,

      suite: function (name, fn) {
        var s = { name: String(name), tests: [] };
        suites.push(s);
        var previous = current;
        current = s;
        try { fn(); } finally { current = previous; }
      },

      test: function (name, fn) {
        if (!current) api.suite('(no suite)', function () {});
        (current || suites[suites.length - 1]).tests.push({ name: String(name), fn: fn });
      },

      // Golden-file comparison. The Node runner supplies api.io; the browser has none.
      // In update mode (node tests/run-node.js --update-golden=<dir>) the file is (re)written instead.
      golden: function (file, actual) {
        if (!api.io) throw AssertionError('Golden files need the Node runner (node tests/run-node.js)');
        var text = JSON.stringify(actual, null, 2) + '\n';
        if (api.io.updating(file)) { api.io.writeGolden(file, text); return; }
        var expected = api.io.readGolden(file);
        if (expected === null) throw AssertionError('Golden file missing: tests/golden/' + file + ' (run with --update-golden)');
        assert.deepEqual(actual, JSON.parse(expected), 'golden ' + file);
      },

      // options.only: run only suites whose name contains this text (case-insensitive).
      run: function (options) {
        var only = options && options.only ? String(options.only).toLowerCase() : null;
        var results = [];
        var chain = Promise.resolve();
        suites.forEach(function (s) {
          if (only && s.name.toLowerCase().indexOf(only) < 0) return;
          s.tests.forEach(function (t) {
            chain = chain.then(function () {
              return Promise.resolve().then(t.fn).then(
                function () { results.push({ suite: s.name, test: t.name, ok: true }); },
                function (e) { results.push({ suite: s.name, test: t.name, ok: false, error: (e && e.stack) || String(e) }); }
              );
            });
          });
        });
        return chain.then(function () {
          var failed = results.filter(function (r) { return !r.ok; }).length;
          return { passed: results.length - failed, failed: failed, results: results };
        });
      },

      create: create
    };
    return api;
  }

  root.CFE_TEST = create();
})(typeof globalThis !== 'undefined' ? globalThis : this);
