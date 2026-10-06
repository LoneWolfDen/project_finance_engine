// IMP-005: CFE.store.buildDataset (draft → dataset v1) and CFE.store.diffDatasets.
// A small inline draft runs in Node and in the browser; the fixture checks (legacy totals, the
// STO-003 sample) read files from disk and run in Node only.
(function () {
  if (typeof CFE_NODE !== 'undefined') {
    if (typeof Continuum === 'undefined' || !Continuum.ref || !Continuum.provenance || !Continuum.csv) {
      ['ref.js', 'provenance.js', 'csv.js'].forEach(function (f) { (0, eval)(CFE_NODE.readFile('app/continuum-core/' + f)); });
    }
    if (typeof CFE === 'undefined' || !CFE.require) (0, eval)(CFE_NODE.readFile('app/cfe.js'));
    ['calc/dates.js', 'data/calendars.js', 'calc/calendar.js', 'calc/fx.js', 'calc/actuals.js', 'data/schema.js', 'data/mapping.js'].forEach(function (f) {
      var path = f.split('/'), ns = CFE[path[0]][path[1].replace('.js', '')];
      if (!ns) (0, eval)(CFE_NODE.readFile('app/' + f));
    });
    if (!CFE.data.mappings['references-crosswalk-v1']) {
      ['peoplesoft-timesheet-v1', 'resource-rules-v1', 'po-details-v1', 'invoices-v1', 'expenses-v1', 'fx-rates-v1', 'ot-rules-v1', 'references-crosswalk-v1']
        .forEach(function (id) { if (!CFE.data.mappings[id]) (0, eval)(CFE_NODE.readFile('app/data/mappings/' + id + '.js')); });
    }
    if (!CFE.store.buildDataset) (0, eval)(CFE_NODE.readFile('app/store/build-dataset.js'));
  }
  var T = CFE_TEST, assert = T.assert, B = CFE.store.buildDataset, DIFF = CFE.store.diffDatasets;
  var NOW = '2026-10-05T10:00:00Z';

  function rec(file, row, fields) { return Object.assign({}, fields, { _file: file, _row: row }); }
  function smallDraft() {
    return {
      schema_version: 1, saved_utc: NOW,
      files: ['f1 refs.csv', 'f2 rules.csv', 'f3 ts.csv'].map(function (x, i) {
        return { file_id: x.split(' ')[0], name: x.split(' ')[1], sheet: null, sha256: new Array(65).join(String(i + 1)) };
      }),
      records: {
        references: [rec('f1', 2, { ref: ' o-1 ', name: 'Alpha', po_team_identifiers: ['T 1'], peoplesoft_project_ids: ['111'] })],
        resource_rules: [
          rec('f2', 2, { employee_name: 'R1', employee_id: '1001', po_team_identifier: 'T1', location: 'UK', start: '2025-07-01', end: '2025-12-31', bill_rate: 100, allocation: 1 }),
          rec('f2', 3, { employee_name: 'R9', employee_id: '1009', po_team_identifier: 'ZZ', location: 'UK', start: '2025-07-01', end: '2025-12-31', bill_rate: 50, allocation: 1 })
        ],
        timesheet_rows: [
          rec('f3', 2, { employee_id: '1001', employee_name: 'R1', reported_date: '2025-07-01', project_id: '111', regular_hours: 8, overtime_hours: 1 }),
          rec('f3', 3, { employee_id: '1001', employee_name: 'R1', reported_date: '2025-07-02', project_id: '111', regular_hours: 4 }),
          rec('f3', 4, { employee_id: '1001', employee_name: 'R1', reported_date: '2025-07-03', project_id: '999', regular_hours: 8 }),
          rec('f3', 5, { employee_id: '2002', employee_name: 'R2', reported_date: '2025-07-03', project_id: '111', regular_hours: 8 })
        ]
      }
    };
  }

  T.suite('CFE.store.buildDataset', function () {
    T.test('refs normalised; rows matched by PO team (spaces ignored) or PeopleSoft project; unmatched counted', function () {
      var b = B(smallDraft(), { nowUtc: NOW, publisher: 'Tester', published: null });
      assert.deepEqual(b.report.schema.errors, []);
      assert.deepEqual(b.dataset.references.map(function (r) { return r.ref; }), ['O-1']);
      assert.equal(b.dataset.resource_rules.length, 1);
      assert.equal(b.report.unmatched.resource_rules.count, 1);
      assert.equal(b.report.unmatched.timesheet_rows.count, 2, 'unknown project 999, and employee 2002 without a rule');
      assert.ok(/No resource rule for employee 2002 \(row 5 of ts\.csv\)/.test(b.report.unmatched.timesheet_rows.examples.join(' | ')));
      assert.equal(b.dataset.resource_rules[0].src.row, 2);
      assert.equal(b.dataset.resource_rules[0].rule_id, 'E1001@T1@2025-07-01', 'stable id: person, PO team, start');
    });

    T.test('actuals: costed with the legacy rule, aggregated per ref, person, month, hours type', function () {
      var b = B(smallDraft(), { nowUtc: NOW, published: null });
      assert.deepEqual(b.dataset.actuals.map(function (a) { return [a.ref, a.person_key, a.month, a.hours_type, a.hours, a.cost, a.src.rows]; }), [
        ['O-1', 'E1001', '2025-07', 'overtime', 1, 100, 1],   // no OT rule: × 1, as in the legacy app
        ['O-1', 'E1001', '2025-07', 'regular', 12, 1200, 2]
      ]);
      assert.equal(b.dataset.data_as_of, '2025-07-02');
      assert.ok(!('timesheet_rows' in b.dataset), 'daily rows are not published');
      assert.deepEqual(b.dataset.people.map(function (p) { return p.person_key + ' ' + p.display_name; }), ['E1001 R1', 'E2002 R2']);
    });

    T.test('manifest draft: counts, sources, warnings for unmatched rows; no checksum yet', function () {
      var b = B(smallDraft(), { nowUtc: NOW, publisher: 'Tester', published: null });
      var m = b.manifestDraft;
      assert.equal(m.publisher, 'Tester');
      assert.equal(m.published_utc, NOW);
      assert.equal(m.sources.length, 3);
      assert.equal(m.counts.actual_rows_in, 4);
      assert.equal(m.counts.actual_rows_costed, 2);
      assert.ok(m.validation.warnings.indexOf('2 timesheet rows not included') >= 0, JSON.stringify(m.validation.warnings));
      assert.equal(m.payload_sha256, undefined);
      var check = CFE.data.schema.validateManifest(Object.assign({ payload_sha256: new Array(65).join('a') }, m));
      assert.deepEqual(check.errors, [], JSON.stringify(check.errors));
    });

    T.test('no references: a problem says how to fix it, and nothing is matched', function () {
      var d = smallDraft(); delete d.records.references;
      var b = B(d, { nowUtc: NOW, published: null });
      assert.ok(/No project references/.test(b.report.problems[0]));
      assert.equal(b.dataset.actuals.length, 0);
    });

    T.test('diff: identical datasets have zero changes; a removed PO and its value are reported', function () {
      var b = B(smallDraft(), { nowUtc: NOW, published: null });
      var d = DIFF(b.dataset, b.dataset);
      assert.equal(d.changes, 0);
      assert.deepEqual(d.kpis, []);
      var after = JSON.parse(JSON.stringify(b.dataset));
      after.actuals.pop();
      var d2 = DIFF(b.dataset, after);
      assert.deepEqual(d2.entities.actuals, { before: 2, after: 1, added: 0, removed: 1 });
      assert.deepEqual(d2.kpis, [{ ref: 'O-1', field: 'actual_cost', before: 1300, after: 100, delta: -1200 }]);
      assert.deepEqual(CFE.store.datasetTotals(b.dataset), { 'O-1': { po_value: 0, actual_cost: 1300, invoiced: 0, expenses: 0 } });
      var b2 = B(smallDraft(), { nowUtc: NOW, published: { dataset: b.dataset } });
      assert.equal(b2.report.diff.changes, 0, 'built against the same published data');
    });
  });

  if (typeof CFE_NODE === 'undefined') return;

  // The fixture as a draft: sections through their mapping profiles (resources in mapped shape).
  function fixtureDraft() {
    var cfg = JSON.parse(CFE_NODE.readFile('tests/fixtures/legacy-config-basic.json'));
    var M = CFE.data.mapping, draft = { schema_version: 1, saved_utc: NOW, files: [], records: {} };
    function add(fileId, profileId, header, rows) {
      var p = CFE.data.mappings[profileId], r = M.apply(p, header, rows);
      assert.deepEqual(r.errors, [], profileId);
      draft.files.push({ file_id: fileId, name: fileId, sheet: null });
      draft.records[p.entity] = r.records.map(function (x, i) { return rec(fileId, r.recordRows[i], x); });
    }
    function table(list) { var h = []; list.forEach(function (o) { Object.keys(o).forEach(function (k) { if (h.indexOf(k) < 0) h.push(k); }); }); return [h, list]; }
    var refs = Continuum.csv.parse(CFE_NODE.readFile('tests/fixtures/references.csv'));
    add('refs', 'references-crosswalk-v1', refs.header, refs.rows);
    [['po', 'po-details-v1', cfg.po_details], ['ts', 'peoplesoft-timesheet-v1', cfg.raw_actuals], ['inv', 'invoices-v1', cfg.invoices],
     ['exp', 'expenses-v1', cfg.expenses], ['fx', 'fx-rates-v1', cfg.fx_rates], ['ot', 'ot-rules-v1', cfg.ot_params]].forEach(function (s) {
      var t = table(s[2]); add(s[0], s[1], t[0], t[1]);
    });
    draft.records.resource_rules = cfg.resources.map(function (r, i) {
      return rec('rr', i + 2, { employee_name: r.name, employee_id: String(r.empl_id), project_id: String(r.projectID), po_team_identifier: r.po_team, role: r.role,
        location: r.location, start: r.start, end: r.end, bill_rate: r.bill_rate, hour_multiplier: r.hour_mult, allocation: r.alloc });
    });
    draft.files.push({ file_id: 'rr', name: 'rr', sheet: null });
    return { cfg: cfg, draft: draft };
  }

  T.suite('CFE.store.buildDataset on the fixtures (Node)', function () {
    T.test('the dataset validates; nothing unmatched', function () {
      var b = B(fixtureDraft().draft, { nowUtc: NOW, published: null });
      assert.deepEqual(b.report.schema.errors, []);
      assert.deepEqual(b.report.unmatched, {});
      assert.deepEqual(b.report.problems, []);
      assert.deepEqual([b.report.counts.references, b.report.counts.po, b.report.counts.resource_rules, b.report.counts.invoices, b.report.counts.expenses], [2, 4, 14, 10, 9]);
    });

    T.test('total actual cost equals the legacy aggregateActuals total (± 0.01)', function () {
      var f = fixtureDraft();
      var b = B(f.draft, { nowUtc: NOW, published: null });
      var L = CFE_NODE.support('legacy-sandbox.js').loadLegacy();
      var legacy = L.get('aggregateActualsByProject')(f.cfg, f.cfg.raw_actuals), legacyTotal = 0;
      Object.keys(legacy.byProject).forEach(function (p) { Object.keys(legacy.byProject[p]).forEach(function (m) { legacyTotal += legacy.byProject[p][m]; }); });
      var total = b.dataset.actuals.reduce(function (n, a) { return n + a.cost; }, 0);
      assert.ok(Math.abs(total - legacyTotal) <= 0.01, 'built ' + total + ' vs legacy ' + legacyTotal);
    });

    T.test('actuals and POs match the STO-003 sample built from the same fixture', function () {
      var b = B(fixtureDraft().draft, { nowUtc: NOW, published: null });
      var sample = JSON.parse(CFE_NODE.readFile('samples/published/dataset.json'));
      function strip(list, keys) { return list.map(function (x) { var o = {}; keys.forEach(function (k) { o[k] = x[k]; }); return o; }); }
      var ak = ['ref', 'person_key', 'month', 'hours_type', 'hours', 'cost', 'currency'];
      assert.deepEqual(strip(b.dataset.actuals, ak), strip(sample.actuals, ak));
      var pk = ['po_number', 'ref', 'value', 'currency', 'start', 'validity_end', 'rollover_allowed'];
      assert.deepEqual(strip(b.dataset.purchase_orders, pk), strip(sample.purchase_orders, pk));
      var rk = ['rule_id', 'ref', 'person_key', 'location', 'start', 'end', 'bill_rate', 'allocation'];
      assert.deepEqual(strip(b.dataset.resource_rules, rk), strip(sample.resource_rules, rk));
      var d = CFE.store.diffDatasets(sample, b.dataset);
      ['references', 'purchase_orders', 'resource_rules', 'people', 'actuals', 'invoices', 'fx_rates', 'ot_rules', 'calendars'].forEach(function (e) {
        assert.equal(d.entities[e].added + d.entities[e].removed, 0, e + ' unchanged against the sample');
      });
      assert.equal(b.dataset.data_as_of, sample.data_as_of);
    });
  });
})();
