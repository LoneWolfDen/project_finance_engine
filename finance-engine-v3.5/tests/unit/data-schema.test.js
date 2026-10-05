// STO-001: CFE.data.schema (manifest and dataset v1 validators). Runs in Node and in the browser.
(function () {
  // In Node the app scripts are not preloaded: evaluate the modules in this context.
  if (typeof Continuum === 'undefined' || !Continuum.ref) (0, eval)(CFE_NODE.readFile('app/continuum-core/ref.js'));
  if (typeof CFE === 'undefined') (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  if (!CFE.data.schema) (0, eval)(CFE_NODE.readFile('app/data/schema.js'));
  var T = CFE_TEST, assert = T.assert, S = CFE.data.schema;

  // A small, valid, synthetic dataset (names and numbers are invented).
  function dataset() {
    var src = { file: 'ba7816bf8f01', sheet: 'Sheet1', row: 2 };
    var agg = { files: ['ba7816bf8f01'], rows: 21 };
    return {
      schema: 'cfe.dataset', schema_version: 1, data_as_of: '2026-09-30',
      references: [{ ref: 'O-0000001', name: 'Project Alpha', client: 'TestCo', status: 'active', opportunity_numbers: ['O-0000001'], links: { po_team_identifiers: ['111111_ProjectAlpha_AWS'] } }],
      purchase_orders: [{ po_number: '100100100', ref: 'O-0000001', po_team_identifier: '111111_ProjectAlpha_AWS', value: 300000, currency: 'GBP', start: '2025-01-01', validity_end: '2025-12-31', rollover_allowed: false, approval_status: 'Approved', src: src }],
      resource_rules: [{ rule_id: 'r1', ref: 'O-0000001', person_key: '1001', role: 'Technical Lead', location: 'UK', start: '2025-07-01', end: '2025-12-31', bill_rate: 180, currency: 'GBP', rate_unit: 'hour', allocation: 1, src: src }],
      people: [{ person_key: '1001', display_name: 'R1_Lead', employee_id: '1001', src: src }],
      actuals: [{ ref: 'O-0000001', person_key: '1001', month: '2025-07', hours_type: 'regular', hours: 168, cost: 30240, currency: 'GBP', src: agg }],
      invoices: [{ invoice_id: 'INV-2025-001', ref: 'O-0000001', period_from: '2025-07-01', period_to: '2025-07-31', amount: 45000, currency: 'GBP', status: 'Paid', paid_date: '2025-08-15', src: src }],
      expenses: [{ expense_id: 'e1', ref: 'O-0000001', date: '2025-07-15', amount: 250, currency: 'GBP', description: 'Travel', src: src }],
      fx_rates: [{ currency: 'USD', effective: '2025-01-01', rate: 1.36, src: src }],
      ot_rules: [{ type: 'Overtime_Hours', effective: '2025-01-01', multiplier: 1.5, src: src }],
      calendars: [{ location: 'UK', source: 'Synthetic test calendar', valid_years: [2025, 2026], holidays: ['2025-12-25'] }]
    };
  }

  function manifest() {
    return {
      schema: 'cfe.manifest', schema_version: 1, publication_id: '2026-10-02T09:10:00Z-7f3a', published_utc: '2026-10-02T09:10:00Z',
      publisher: 'V. Y.', app_version: '4.0.0', dataset_schema_version: 1, data_as_of: '2026-09-30',
      payload_sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      sources: [{ file_id: 'ba7816bf8f01', name: 'timesheet.csv', sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' }],
      counts: { references: 1, po: 1 }, validation: { errors: 0, warnings: [] },
      minimisation: { policy: 'aggregate-by-person-month', person_names: 'included' },
      deployment: { display_name: 'Continuum Finance', reporting_currency: 'USD' }, publications: []
    };
  }
  function codes(r) { return r.errors.map(function (e) { return e.code + ' ' + e.path; }); }

  T.suite('CFE.data.schema', function () {
    T.test('a valid dataset and manifest pass with no errors or warnings', function () {
      assert.deepEqual(S.validateDataset(dataset()), { errors: [], warnings: [] });
      assert.deepEqual(S.validateManifest(manifest()), { errors: [], warnings: [] });
    });

    T.test('every missing required field is reported with its path', function () {
      Object.keys(S.entities).forEach(function (entity) {
        var fields = S.entities[entity].fields;
        Object.keys(fields).filter(function (f) { return fields[f][1]; }).forEach(function (f) {
          var ds = dataset();
          delete ds[entity][0][f];
          var r = S.validateDataset(ds);
          assert.ok(codes(r).indexOf('missing-field $.' + entity + '[0].' + f) >= 0, entity + '.' + f + ': ' + JSON.stringify(codes(r)));
        });
      });
      var ds = dataset(); delete ds.calendars; delete ds.data_as_of;
      assert.deepEqual(codes(S.validateDataset(ds)), ['missing-field $.data_as_of', 'missing-field $.calendars']);
    });

    T.test('wrong types: dates, money, currency, ref, enums', function () {
      var ds = dataset();
      ds.purchase_orders[0].start = '01/01/2025';
      ds.purchase_orders[0].value = '£300,000';
      ds.purchase_orders[0].currency = 'gbp';
      ds.purchase_orders[0].ref = 'o-0000001';
      ds.actuals[0].hours_type = 'holiday';
      ds.resource_rules[0].allocation = 1.5;
      assert.deepEqual(codes(S.validateDataset(ds)), [
        'wrong-type $.purchase_orders[0].ref', 'wrong-type $.purchase_orders[0].value', 'wrong-type $.purchase_orders[0].currency',
        'wrong-type $.purchase_orders[0].start', 'wrong-type $.resource_rules[0].allocation', 'wrong-type $.actuals[0].hours_type'
      ]);
    });

    T.test('unknown entities and fields are warnings, not errors', function () {
      var ds = dataset();
      ds.forecast = [];
      ds.people[0].nickname = 'x';
      var r = S.validateDataset(ds);
      assert.deepEqual(r.errors, []);
      assert.deepEqual(r.warnings.map(function (w) { return w.code + ' ' + w.path; }), ['unknown-entity $.forecast', 'unknown-field $.people[0].nickname']);
    });

    T.test('duplicate keys and a wrong schema are errors', function () {
      var ds = dataset();
      ds.actuals.push(JSON.parse(JSON.stringify(ds.actuals[0])));
      ds.schema_version = 2;
      assert.deepEqual(codes(S.validateDataset(ds)), ['wrong-schema $.schema_version', 'duplicate-key $.actuals[1]']);
      assert.deepEqual(codes(S.validateDataset([])), ['wrong-schema $']);
    });

    T.test('src: a source row or an aggregate; required on imported entities', function () {
      var ds = dataset();
      ds.invoices[0].src = { file: 'f', row: 0 };
      assert.deepEqual(codes(S.validateDataset(ds)), ['wrong-type $.invoices[0].src']);
    });

    T.test('manifest: nested parts, counts, sources and the 100-event limit', function () {
      var m = manifest();
      m.minimisation.person_names = 'real';
      m.counts.po = -1;
      m.sources = [{ name: 'x' }];
      m.publications = new Array(102).join('x').split('');  // 101 events
      delete m.payload_sha256;
      assert.deepEqual(codes(S.validateManifest(m)).sort(), [
        'bad-value $.publications', 'bad-value $.sources[0]', 'missing-field $.payload_sha256', 'wrong-type $.counts.po', 'wrong-type $.minimisation.person_names'
      ]);
    });

    T.test('no fields for worksite city, postal code or personal hours (minimisation)', function () {
      var all = [];
      Object.keys(S.entities).forEach(function (e) { all = all.concat(Object.keys(S.entities[e].fields)); });
      assert.ok(!all.some(function (f) { return /worksite|postal|city|personal|vacation/i.test(f); }), all.join(','));
    });
  });
})();
