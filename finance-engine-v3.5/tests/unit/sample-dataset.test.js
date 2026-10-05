// STO-003: the synthetic sample publication in samples/published/. Node only (reads files from disk
// and runs the generator); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var gen = CFE_NODE.support('make-sample-dataset.js');
  var NAMES = ['manifest.json', 'manifest.js', 'dataset.json', 'dataset.js'];

  T.suite('Sample publication (STO-003)', function () {
    var out = gen.build();

    T.test('regenerating gives byte-identical files', function () {
      NAMES.forEach(function (n) {
        assert.ok(CFE_NODE.readFile('samples/published/' + n) === out.files[n], n + ' differs: run node tests/support/make-sample-dataset.js');
      });
      var again = gen.build();
      NAMES.forEach(function (n) { assert.ok(again.files[n] === out.files[n], n + ' is not deterministic'); });
    });

    T.test('dataset and manifest pass the schema checks (only the "sample" marker is an unknown field)', function () {
      assert.deepEqual(out.schemaCheck.dataset, { errors: [], warnings: [] });
      assert.deepEqual(out.schemaCheck.manifest.errors, []);
      assert.deepEqual(out.schemaCheck.manifest.warnings.map(function (w) { return w.path; }), ['$.sample']);
    });

    T.test('labelled as sample, with the agreed refs and publisher', function () {
      var m = JSON.parse(CFE_NODE.readFile('samples/published/manifest.json'));
      var d = JSON.parse(CFE_NODE.readFile('samples/published/dataset.json'));
      assert.equal(m.sample, true);
      assert.equal(m.publisher, 'Sample data generator');
      assert.deepEqual(d.references.map(function (r) { return r.ref; }), ['O-0000001', 'O-0000002']);
      assert.equal(m.data_as_of, d.data_as_of);
      assert.ok(/^\/\/ SAMPLE DATA/.test(CFE_NODE.readFile('samples/published/dataset.js')));
    });

    T.test('payload_sha256 is the SHA-256 of the dataset as JSON.stringify gives it', function () {
      var d = JSON.parse(CFE_NODE.readFile('samples/published/dataset.json'));
      var m = JSON.parse(CFE_NODE.readFile('samples/published/manifest.json'));
      if (typeof Continuum === 'undefined' || !Continuum.hash) (0, eval)(CFE_NODE.readFile('app/continuum-core/hash.js'));
      assert.equal(Continuum.hash.sha256HexSync(JSON.stringify(d)), m.payload_sha256);
    });

    T.test('the .js twins hold exactly the JSON data', function () {
      ['manifest', 'dataset'].forEach(function (n) {
        var js = CFE_NODE.readFile('samples/published/' + n + '.js');
        var body = js.slice(js.indexOf('= ') + 2, js.lastIndexOf(';'));
        assert.deepEqual(JSON.parse(body), JSON.parse(CFE_NODE.readFile('samples/published/' + n + '.json')), n);
      });
    });

    T.test('every record points to its source; actual costs add up to the legacy totals', function () {
      var d = out.dataset, fileId = out.manifest.sources[0].file_id;
      ['purchase_orders', 'resource_rules', 'people', 'invoices', 'expenses', 'fx_rates', 'ot_rules'].forEach(function (e) {
        d[e].forEach(function (r) { assert.equal(r.src.file, fileId, e); assert.ok(r.src.row >= 1, e); });
      });
      d.actuals.forEach(function (a) { assert.deepEqual(a.src.files, [fileId]); });
      var rows = d.actuals.reduce(function (n, a) { return n + a.src.rows; }, 0);
      assert.ok(rows > 0, 'actual rows were aggregated');
      // Legacy app: cost per project for the same rows.
      var L = CFE_NODE.support('legacy-sandbox.js').loadLegacy();
      var cfg = JSON.parse(CFE_NODE.readFile('tests/fixtures/legacy-config-basic.json'));
      var legacy = L.get('aggregateActualsByProject')(cfg, cfg.raw_actuals);
      var legacyTotal = 0;
      Object.keys(legacy.byProject).forEach(function (p) { Object.keys(legacy.byProject[p]).forEach(function (m) { legacyTotal += legacy.byProject[p][m]; }); });
      var total = d.actuals.reduce(function (n, a) { return n + a.cost; }, 0);
      assert.ok(Math.abs(total - legacyTotal) < 0.05, 'sample ' + total + ' vs legacy ' + legacyTotal);
    });
  });
})();
