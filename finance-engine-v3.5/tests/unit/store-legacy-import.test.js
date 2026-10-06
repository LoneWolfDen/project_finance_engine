// IMP-006: CFE.store.legacyImport (legacy v3.5 backup → Publish page entries → draft → dataset).
// Node only: the backup is produced by the legacy app itself (legacy sandbox, BAK-001 export).
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  if (typeof Continuum === 'undefined' || !Continuum.ref || !Continuum.provenance || !Continuum.csv || !Continuum.hash) {
    ['ref.js', 'provenance.js', 'csv.js', 'hash.js'].forEach(function (f) { (0, eval)(CFE_NODE.readFile('app/continuum-core/' + f)); });
  }
  if (typeof CFE === 'undefined' || !CFE.require) (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  [['calc', 'dates'], ['data', 'calendars'], ['calc', 'calendar'], ['calc', 'fx'], ['calc', 'actuals'], ['data', 'schema'], ['data', 'mapping']].forEach(function (p) {
    if (!CFE[p[0]][p[1]]) (0, eval)(CFE_NODE.readFile('app/' + p[0] + '/' + p[1] + '.js'));
  });
  ['peoplesoft-timesheet-v1', 'resource-rules-v1', 'po-details-v1', 'invoices-v1', 'expenses-v1', 'fx-rates-v1', 'ot-rules-v1', 'references-crosswalk-v1']
    .forEach(function (id) { if (!CFE.data.mappings[id]) (0, eval)(CFE_NODE.readFile('app/data/mappings/' + id + '.js')); });
  if (!CFE.store.draft) (0, eval)(CFE_NODE.readFile('app/store/draft.js'));
  if (!CFE.store.buildDataset) (0, eval)(CFE_NODE.readFile('app/store/build-dataset.js'));
  if (!CFE.store.legacyImport) (0, eval)(CFE_NODE.readFile('app/store/legacy-import.js'));
  var T = CFE_TEST, assert = T.assert, LI = CFE.store.legacyImport;
  var SHA = new Array(65).join('a');

  function basic() { return JSON.parse(CFE_NODE.readFile('tests/fixtures/legacy-config-basic.json')); }

  // The backup file text, exactly as the legacy app's Export Full Config writes it.
  function legacyBackup(working) {
    var L = CFE_NODE.support('legacy-sandbox.js').loadLegacy({ webcrypto: true });
    var out = [], parts = new WeakMap();
    L.ctx.Blob = function (chunks) { parts.set(this, chunks.join('')); };
    L.ctx.URL = { createObjectURL: function (b) { out.push(parts.get(b)); return 'blob:test'; } };
    L.get('localStorage').setItem('pf_working', JSON.stringify(working));
    return L.get('exportFullConfig')().then(function () { return { text: out[out.length - 1], L: L }; });
  }

  function referencesEntry() {
    var c = Continuum.csv.parse(CFE_NODE.readFile('tests/fixtures/references.csv'));
    var p = CFE.data.mappings['references-crosswalk-v1'], r = CFE.data.mapping.apply(p, c.header, c.rows);
    return { profile: p, result: r, provenance: Continuum.provenance.fileRecord({ name: 'references.csv', size: 1, sha256: new Array(65).join('b'),
      sourceSystem: 'test', parser: 'continuum-csv', parserVersion: '1', mappingProfile: p.id, rowsRead: 2, rowsUsed: 2, importedUtc: '2026-10-06T00:00:00Z' }) };
  }

  T.suite('CFE.store.legacyImport', function () {
    T.test('a legacy backup + references → draft → valid dataset; actual cost equals the legacy total', function () {
      var cfg = basic();
      return legacyBackup(cfg).then(function (b) {
        return LI(b.text, { name: 'finance_backup.json', size: b.text.length, sha256: SHA }).then(function (r) {
          assert.equal(r.ok, true, r.message);
          assert.deepEqual(r.entries.map(function (e) { return e.provenance.sheet; }), ['po_details', 'resources', 'raw_actuals', 'invoices', 'expenses', 'fx_rates', 'ot_params']);
          r.entries.forEach(function (e) { assert.deepEqual(e.result.errors, [], e.name); assert.equal(e.provenance.source_system, 'Legacy Finance Engine v3.5 backup'); });
          assert.equal(r.entries[2].result.records.length, 200);
          var draft = CFE.store.draft.build(r.entries.concat([referencesEntry()]));
          var built = CFE.store.buildDataset(draft, { nowUtc: '2026-10-06T00:00:00Z', published: null });
          assert.deepEqual(built.report.schema.errors, []);
          assert.deepEqual(built.report.unmatched, {});
          assert.deepEqual([built.report.counts.po, built.report.counts.resource_rules, built.report.counts.invoices, built.report.counts.expenses], [4, 14, 10, 9]);
          var legacy = b.L.get('aggregateActualsByProject')(cfg, cfg.raw_actuals), total = 0;
          Object.keys(legacy.byProject).forEach(function (p) { Object.keys(legacy.byProject[p]).forEach(function (m) { total += legacy.byProject[p][m]; }); });
          var built_total = built.dataset.actuals.reduce(function (n, a) { return n + a.cost; }, 0);
          assert.ok(Math.abs(built_total - total) <= 0.01, built_total + ' vs legacy ' + total);
          assert.ok(r.notices.length === 0, JSON.stringify(r.notices));
        });
      });
    });

    T.test('a changed backup is refused (checksum)', function () {
      return legacyBackup(basic()).then(function (b) {
        var obj = JSON.parse(b.text); obj.working.po_details[0].PO_WO_value += 1;
        return LI(JSON.stringify(obj), { sha256: SHA });
      }).then(function (r) {
        assert.equal(r.ok, false);
        assert.ok(/checksum does not match/.test(r.message));
      });
    });

    T.test('sample sections are left out with a notice; monthly totals without rows are not converted', function () {
      var cfg = basic();
      cfg._sample_sections = ['invoices', 'expenses'];
      var monthlyOnly = basic(); delete monthlyOnly.raw_actuals; monthlyOnly.actuals_monthly = [{ month: 'Jul-25', total: 1 }];
      return Promise.all([legacyBackup(cfg), legacyBackup(monthlyOnly)]).then(function (bs) {
        return Promise.all(bs.map(function (b) { return LI(b.text, { sha256: SHA }); }));
      }).then(function (rs) {
        var sheets = rs[0].entries.map(function (e) { return e.provenance.sheet; });
        assert.ok(sheets.indexOf('invoices') < 0 && sheets.indexOf('expenses') < 0, sheets.join());
        assert.ok(rs[0].notices.indexOf('Sample data was left out: invoices, expenses.') >= 0, JSON.stringify(rs[0].notices));
        assert.ok(rs[1].notices.indexOf('Monthly totals without timesheet rows cannot be attributed to people; re-import the PeopleSoft files.') >= 0);
        assert.ok(rs[1].entries.every(function (e) { return e.provenance.sheet !== 'raw_actuals'; }));
      });
    });

    T.test('an older Full Config export (a bare config) is accepted with a notice; other files are refused', function () {
      return Promise.all([LI(JSON.stringify(basic()), { sha256: SHA }), LI('{"hello":1}', { sha256: SHA }), LI('{', { sha256: SHA }),
        LI(JSON.stringify({ format: 'cfe-legacy-backup', schema_version: 2 }), { sha256: SHA })]).then(function (rs) {
        assert.equal(rs[0].ok, true);
        assert.ok(/older Full Config export/.test(rs[0].notices[0]));
        assert.ok(/not a legacy backup/.test(rs[1].message));
        assert.ok(/not valid JSON/.test(rs[2].message));
        assert.ok(/newer version/.test(rs[3].message));
      });
    });

    T.test('timesheet dates are read as the legacy app read them (2-digit years too)', function () {
      var cfg = basic();
      cfg.raw_actuals = cfg.raw_actuals.slice(0, 2);
      cfg.raw_actuals[0]['Reported Dt'] = '7/1/25';
      return LI(JSON.stringify(cfg), { sha256: SHA }).then(function (r) {
        var ts = r.entries.filter(function (e) { return e.provenance.sheet === 'raw_actuals'; })[0];
        assert.deepEqual(ts.result.errors, []);
        assert.equal(ts.result.records[0].reported_date, '2025-07-01');
      });
    });
  });
})();
