// Self-test of tests/harness.js. Runs in Node and in the browser.
(function () {
  var T = CFE_TEST, assert = T.assert;

  T.suite('Harness: assertions', function () {
    T.test('equal accepts identical values and NaN', function () {
      assert.equal(1, 1);
      assert.equal('a', 'a');
      assert.equal(NaN, NaN);
    });

    T.test('equal rejects different values', function () {
      assert.throws(function () { assert.equal(1, 2); }, 'expected 2, got 1');
      assert.throws(function () { assert.equal(1, '1'); });
    });

    T.test('deepEqual compares nested objects and arrays, ignoring key order', function () {
      assert.deepEqual({ a: [1, { b: 2 }], c: 'x' }, { c: 'x', a: [1, { b: 2 }] });
    });

    T.test('deepEqual reports the path of the first difference', function () {
      assert.throws(function () { assert.deepEqual({ a: [1, 2] }, { a: [1, 3] }); }, '$.a[1]');
      assert.throws(function () { assert.deepEqual({ a: 1 }, { a: 1, b: 2 }); }, '$.b');
      assert.throws(function () { assert.deepEqual([1], [1, 2]); }, '$.length');
    });

    T.test('approx uses the tolerance', function () {
      assert.approx(0.1 + 0.2, 0.3);
      assert.approx(100.4, 100, 0.5);
      assert.throws(function () { assert.approx(101, 100, 0.5); });
    });

    T.test('ok and throws', function () {
      assert.ok(true);
      assert.throws(function () { assert.ok(0); });
      assert.throws(function () { assert.throws(function () {}); }, 'Expected the function to throw');
      assert.throws(function () { throw new Error('boom 42'); }, /boom \d+/);
    });
  });

  T.suite('Harness: runner', function () {
    T.test('counts passes and failures, and reports suite and test names', function () {
      var inner = T.create();
      inner.suite('S', function () {
        inner.test('passes', function () {});
        inner.test('fails', function () { inner.assert.equal(1, 2); });
      });
      return inner.run().then(function (r) {
        assert.equal(r.passed, 1);
        assert.equal(r.failed, 1);
        assert.equal(r.results[1].suite, 'S');
        assert.equal(r.results[1].test, 'fails');
        assert.ok(/expected 2, got 1/.test(r.results[1].error));
      });
    });

    T.test('supports async tests, including rejected promises', function () {
      var inner = T.create();
      inner.suite('Async', function () {
        inner.test('resolves', function () { return Promise.resolve(); });
        inner.test('rejects', function () { return Promise.reject(new Error('late failure')); });
      });
      return inner.run().then(function (r) {
        assert.equal(r.passed, 1);
        assert.equal(r.failed, 1);
      });
    });

    T.test('filters suites by name', function () {
      var inner = T.create();
      inner.suite('Alpha', function () { inner.test('a', function () {}); });
      inner.suite('Beta', function () { inner.test('b', function () {}); });
      return inner.run({ only: 'bet' }).then(function (r) {
        assert.equal(r.results.length, 1);
        assert.equal(r.results[0].suite, 'Beta');
      });
    });

    T.test('golden() refuses to run without the Node runner', function () {
      var inner = T.create();
      assert.throws(function () { inner.golden('x/y.json', {}); }, 'Node runner');
    });
  });
})();
