// TST-004: the legacy sandbox loads the legacy app and exposes its functions and data.
// Node only (reads legacy/index.html from disk).
(function () {
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  T.suite('Legacy sandbox', function () {
    T.test('loads the legacy scripts and exposes computeForecast', function () {
      var L = loadLegacy();
      assert.equal(typeof L.get('computeForecast'), 'function');
    });

    T.test('exposes const bindings such as DEFAULTS', function () {
      var L = loadLegacy();
      assert.equal(L.get('DEFAULTS').po_details.length, 1);
    });

    T.test('new Date() and Date.now() return the fixed time; new Date(x) is normal', function () {
      var L = loadLegacy({ now: '2026-10-01T12:00:00Z' });
      assert.equal(L.get('new Date().toISOString()'), '2026-10-01T12:00:00.000Z');
      assert.equal(L.get('Date.now()'), Date.parse('2026-10-01T12:00:00Z'));
      assert.equal(L.get('new Date("2025-01-02T00:00:00Z").toISOString()'), '2025-01-02T00:00:00.000Z');
    });

    T.test('two loads are independent', function () {
      var a = loadLegacy(), b = loadLegacy();
      a.get('localStorage').setItem('probe', 'a');
      a.set('tab', 'burndown');
      assert.equal(b.get('localStorage').getItem('probe'), null);
      assert.equal(a.get('tab'), 'burndown');
      assert.equal(b.get('tab'), 'overview');
    });

    T.test('captures toasts and uses the configured protocol and confirm()', function () {
      var L = loadLegacy({ protocol: 'file:', confirm: function () { return false; } });
      L.get('toast')('hello');
      assert.deepEqual(L.toasts.slice(), ['hello']);
      assert.equal(L.get('location.protocol'), 'file:');
      assert.equal(L.get('confirm("sure?")'), false);
    });
  });
})();
