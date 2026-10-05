// DAT-002: explicit Append/Replace choice for a timesheet upload when rows already exist.
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  function fixture(name) { return JSON.parse(CFE_NODE.readFile('tests/fixtures/' + name)); }

  // A sandbox whose chooser answers `choice`, with download capture.
  function sandbox(choice) {
    var L = loadLegacy({ webcrypto: true });
    var downloads = [], asked = [];
    var parts = new WeakMap();
    L.ctx.Blob = function (chunks) { parts.set(this, chunks.join('')); };
    L.ctx.URL = { createObjectURL: function (b) { downloads.push(parts.get(b)); return 'blob:test'; } };
    L.set('chooseActualsMode', function (n) { asked.push(n); return Promise.resolve(choice); });
    var ls = L.get('localStorage');
    var working = fixture('legacy-config-basic.json');
    ls.setItem('pf_working', JSON.stringify(working));
    return {
      L: L, downloads: downloads, asked: asked, working: working,
      rows: function () { return JSON.parse(ls.getItem('pf_working')).raw_actuals; }
    };
  }

  // One row identical to an existing row, two new rows (dates not in the fixture).
  function upload(working) {
    var same = JSON.parse(JSON.stringify(working.raw_actuals[0]));
    var a = JSON.parse(JSON.stringify(same)); a['Reported Dt'] = '1/5/2026';
    var b = JSON.parse(JSON.stringify(same)); b['Reported Dt'] = '1/6/2026';
    return [same, a, b];
  }

  T.suite('Legacy timesheet upload mode (DAT-002)', function () {
    T.test('cancel (null): rows unchanged, no backup', function () {
      var a = sandbox(null);
      return a.L.get('processUpload')(upload(a.working), 'actuals').then(function () {
        assert.deepEqual(a.asked, [200], 'chooser told the existing row count');
        assert.deepEqual(a.rows(), a.working.raw_actuals);
        assert.equal(a.downloads.length, 0);
      });
    });

    T.test('replace: backup first, then rows replaced', function () {
      var a = sandbox('replace');
      var data = upload(a.working);
      return a.L.get('processUpload')(data, 'actuals').then(function () {
        assert.equal(a.downloads.length, 1, 'backup downloaded once');
        assert.equal(JSON.parse(a.downloads[0]).working.raw_actuals.length, 200, 'backup holds the previous rows');
        assert.deepEqual(a.rows(), data);
      });
    });

    T.test('append: rows concatenated and deduplicated, no backup', function () {
      var a = sandbox('append');
      return a.L.get('processUpload')(upload(a.working), 'actuals').then(function () {
        assert.equal(a.rows().length, 202, '200 existing + 2 new; the identical row is removed');
        assert.equal(a.downloads.length, 0);
      });
    });

    T.test('no existing rows: imports without asking', function () {
      var a = sandbox('append');
      var ls = a.L.get('localStorage');
      var w = JSON.parse(ls.getItem('pf_working')); w.raw_actuals = []; ls.setItem('pf_working', JSON.stringify(w));
      var data = upload(a.working);
      return a.L.get('processUpload')(data, 'actuals').then(function () {
        assert.equal(a.asked.length, 0, 'chooser not shown');
        assert.deepEqual(a.rows(), data);
      });
    });
  });
})();
