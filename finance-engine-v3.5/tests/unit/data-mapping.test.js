// IMP-003: CFE.data.mapping (declarative mapping profiles). The inline cases run in Node and in the
// browser; the fixture and sample files are read from disk, so those cases are Node only.
(function () {
  // In Node the app scripts are not preloaded: evaluate the modules in this context.
  if (typeof Continuum === 'undefined' || !Continuum.csv) (0, eval)(CFE_NODE.readFile('app/continuum-core/csv.js'));
  if (typeof CFE === 'undefined') (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  if (!CFE.data.mapping) {
    (0, eval)(CFE_NODE.readFile('app/data/mapping.js'));
    ['peoplesoft-timesheet-v1', 'resource-rules-v1', 'po-details-v1', 'invoices-v1', 'expenses-v1', 'fx-rates-v1', 'ot-rules-v1', 'references-crosswalk-v1']
      .forEach(function (id) { (0, eval)(CFE_NODE.readFile('app/data/mappings/' + id + '.js')); });
  }
  var T = CFE_TEST, assert = T.assert, M = CFE.data.mapping, P = CFE.data.mappings;
  var TS = 'Empl Name,Empl ID,Reported Dt,Project ID,Customer Name,Activity,Worksite City,Regular Hours,Overtime Hours,Vacation Hours,Total Hours';

  function csv(text) { var r = Continuum.csv.parse(text); return { header: r.header, rows: r.rows }; }
  function map(id, text) { var c = csv(text); return M.apply(P[id], c.header, c.rows); }

  T.suite('CFE.data.mapping', function () {
    T.test('eight profiles are registered', function () {
      assert.deepEqual(Object.keys(P).sort(), ['expenses-v1', 'fx-rates-v1', 'invoices-v1', 'ot-rules-v1', 'peoplesoft-timesheet-v1', 'po-details-v1', 'references-crosswalk-v1', 'resource-rules-v1']);
    });

    T.test('timesheet dates are M/D/YYYY: 7/1/2025 and 12/31/2025', function () {
      var r = map('peoplesoft-timesheet-v1', TS + '\nR1,1001,7/1/2025,111111,TestCo,PERFORM,CITY,8,0,0,8\nR1,1001,12/31/2025,111111,TestCo,PERFORM,CITY,7.5,1,0,8.5\n');
      assert.deepEqual(r.errors, []);
      assert.deepEqual(r.records.map(function (x) { return x.reported_date; }), ['2025-07-01', '2025-12-31']);
      assert.deepEqual(r.records[1], { employee_id: '1001', employee_name: 'R1', reported_date: '2025-12-31', project_id: '111111', activity: 'PERFORM', regular_hours: 7.5, overtime_hours: 1, other_hours: null, total_hours: 8.5 });
    });

    T.test('resource-rule dates are D/M/YYYY: 1/7/2025 is 1 July, 31/12/2025 is 31 December', function () {
      var r = map('resource-rules-v1', 'Empl Name,EmplID,PO_Team_Identifier,Location,RateEffectiveDt,ContractEndDt,BillRate,Allocation_Percentage\nR1,1001,T1,UK,1/7/2025,31/12/2025,180,1\n');
      assert.deepEqual(r.errors, []);
      assert.equal(r.records[0].start, '2025-07-01');
      assert.equal(r.records[0].end, '2025-12-31');
    });

    T.test('dates are never guessed: other formats and impossible dates are row errors', function () {
      var r = map('peoplesoft-timesheet-v1', TS + '\nR1,1001,2025-07-01,1,,,,8,,,\nR1,1001,2/30/2025,1,,,,8,,,\nR1,1001,7/1/25,1,,,,8,,,\nR1,1001,7/2/2025,1,,,,8,,,\n');
      assert.deepEqual(r.errors.map(function (e) { return e.row; }), [2, 3, 4]);
      assert.ok(/expected a date as M\/D\/YYYY/.test(r.errors[0].message));
      assert.ok(/not a real date/.test(r.errors[1].message));
      assert.equal(r.records.length, 1, 'rows with errors are left out');
    });

    T.test('a missing required column blocks the whole file', function () {
      var r = map('peoplesoft-timesheet-v1', 'Empl Name,Empl ID,Project ID,Regular Hours\nR1,1001,1,8\n');
      assert.deepEqual(r.records, []);
      assert.equal(r.errors.length, 1);
      assert.equal(r.errors[0].row, 1);
      assert.equal(r.errors[0].column, 'reported_date');
      assert.ok(/Required column missing/.test(r.errors[0].message));
    });

    T.test('unneeded columns are dropped (minimisation) and listed', function () {
      var r = map('peoplesoft-timesheet-v1', TS + '\nR1,1001,7/1/2025,111111,TestCo,PERFORM,CITY,8,0,4,8\n');
      assert.deepEqual(r.droppedColumns, ['Customer Name', 'Worksite City', 'Vacation Hours']);
      assert.deepEqual(r.unmappedColumns, r.droppedColumns);
      assert.ok(!('Worksite City' in r.records[0]) && !('_extra' in r.records[0]));
    });

    T.test('types: numbers without symbols, ints, bools, ";" lists; empty required values', function () {
      var r = map('po-details-v1', 'PO_WO_Number,PO_Team_Identifier,PO_WO_value,PO_Currency_Code,WO_StartDate,WO_Approval_Status,PO_Validity_Year,rollover_allowed\n' +
        '1,T1,"300,000",GBP,2025-01-01,Approved,2025,yes\n2,T1,1.5,GBP,2025-01-01,Approved,20.5,no\n3,T1,10,GBP,2025-01-01,,2025,maybe\n4,T1,10,GBP,2025-01-01,Approved,2025,N\n');
      assert.deepEqual(r.errors.map(function (e) { return e.row + ' ' + e.column; }), ['2 PO_WO_value', '3 PO_Validity_Year', '4 WO_Approval_Status', '4 rollover_allowed']);
      assert.equal(r.records.length, 1);
      assert.equal(r.records[0].rollover_allowed, false);
      var x = map('references-crosswalk-v1', 'ref,name,po_team_identifiers\nO-1,Alpha, T1 ; T2;\n');
      assert.deepEqual(x.records[0].po_team_identifiers, ['T1', 'T2']);
    });

    T.test('header names match ignoring case, spaces and underscores', function () {
      var r = map('fx-rates-v1', 'CODE,Effective_Date,rate\nUSD,2025-01-01,1.3\n');
      assert.deepEqual(r.records, [{ currency: 'USD', effective: '2025-01-01', rate: 1.3 }]);
      assert.deepEqual(r.warnings, []);
    });

    T.test('dropUnmapped false keeps the other columns under _extra', function () {
      var p = JSON.parse(JSON.stringify(P['fx-rates-v1'])); p.dropUnmapped = false;
      var c = csv('code,effective,rate,note\nUSD,2025-01-01,1.3,x\n');
      var r = M.apply(p, c.header, c.rows);
      assert.deepEqual(r.records[0]._extra, { note: 'x' });
      assert.deepEqual(r.droppedColumns, []);
    });

    T.test('detect ranks profiles by required-column coverage', function () {
      assert.equal(M.detect(csv(TS + '\n').header)[0].id, 'peoplesoft-timesheet-v1');
      assert.equal(M.detect(['Empl Name', 'EmplID', 'ProjectID', 'PO_Team_Identifier', 'Role', 'Location', 'RateEffectiveDt', 'BillRate', 'ContractEndDt', 'Allocation_Percentage'])[0].id, 'resource-rules-v1');
      assert.deepEqual(M.detect(['nothing']), []);
    });

    T.test('invalid profiles are refused', function () {
      assert.throws(function () { M.register({ id: 'x', version: 1, columns: { a: { aliases: ['a'], type: 'date' } } }); }, 'a.dateFormat');
      assert.throws(function () { M.register({ id: 'x', version: 1, columns: { a: { aliases: [], type: 'string' } } }); }, 'a.aliases');
    });
  });

  if (typeof CFE_NODE === 'undefined') return;

  function fixture(rel) { return csv(CFE_NODE.readFile(rel)); }
  function jsonRows(list) {
    var header = [];
    list.forEach(function (o) { Object.keys(o).forEach(function (k) { if (header.indexOf(k) < 0) header.push(k); }); });
    return { header: header, rows: list };
  }
  function mapRows(id, data) { return M.apply(P[id], data.header, data.rows); }

  T.suite('CFE.data.mapping on fixture and sample files (Node)', function () {
    T.test('test_Timesheet.csv: 1,243 records, no errors, personal columns dropped', function () {
      var r = mapRows('peoplesoft-timesheet-v1', fixture('test_Timesheet.csv'));
      assert.deepEqual(r.errors, []);
      assert.equal(r.records.length, 1243);
      ['Worksite City', 'Worksite Postal', 'Worksite Country', 'Worksite State', 'Customer Name', 'Vacation Hours', 'Personal Hours'].forEach(function (c) {
        assert.ok(r.droppedColumns.indexOf(c) >= 0, c + ' dropped');
      });
    });

    T.test('timesheet-quoted.csv and timesheet-duplicates.csv: no errors', function () {
      var q = mapRows('peoplesoft-timesheet-v1', fixture('tests/fixtures/timesheet-quoted.csv'));
      assert.deepEqual(q.errors, []);
      assert.equal(q.records[3].employee_name, 'Engineer, R3 "Sam"');
      assert.deepEqual(mapRows('peoplesoft-timesheet-v1', fixture('tests/fixtures/timesheet-duplicates.csv')).errors, []);
    });

    T.test('timesheet-ambiguous-dates.csv: M/D/YYYY only, never swapped', function () {
      var r = mapRows('peoplesoft-timesheet-v1', fixture('tests/fixtures/timesheet-ambiguous-dates.csv'));
      assert.deepEqual(r.records.map(function (x) { return x.reported_date; }), ['2026-03-04', '2026-04-03', '2026-04-13']);
      assert.deepEqual(r.errors.map(function (e) { return e.row; }), [4, 6, 7], '13/04/2026, 3/4/26 and 2026-04-03 are refused');
    });

    T.test('test_ResourceRules.csv: no errors; D/M/YYYY dates', function () {
      var r = mapRows('resource-rules-v1', fixture('test_ResourceRules.csv'));
      assert.deepEqual(r.errors, []);
      assert.equal(r.records.length, 14);
      assert.equal(r.records[0].start, '2025-07-01');
      assert.equal(r.records[0].end, '2025-12-31');
    });

    T.test('resources-uk-dates.csv: 02/03/2026 is 2 March; the 2-digit year 28/02/26 is refused', function () {
      var r = mapRows('resource-rules-v1', fixture('tests/fixtures/resources-uk-dates.csv'));
      assert.equal(r.errors.length, 1);
      assert.equal(r.errors[0].row, 5);
      assert.ok(/28\/02\/26/.test(r.errors[0].message));
      var r2 = r.records.filter(function (x) { return x.employee_name === 'R2_Architect'; })[0];
      assert.equal(r2.start, '2026-03-02');
      assert.equal(r2.end, '2027-02-03');
    });

    T.test('PO details, invoices, expenses, FX rates and OT rules: no errors', function () {
      var basic = JSON.parse(CFE_NODE.readFile('tests/fixtures/legacy-config-basic.json'));
      [['po-details-v1', JSON.parse(CFE_NODE.readFile('test_PO_Details.json')), 4],
       ['po-details-v1', basic.po_details, basic.po_details.length],
       ['invoices-v1', JSON.parse(CFE_NODE.readFile('test_Invoices.json')), 10],
       ['expenses-v1', JSON.parse(CFE_NODE.readFile('test_Expenses.json')), 9],
       ['fx-rates-v1', basic.fx_rates, basic.fx_rates.length],
       ['ot-rules-v1', basic.ot_params, basic.ot_params.length]].forEach(function (c) {
        var r = mapRows(c[0], jsonRows(c[1]));
        assert.deepEqual(r.errors, [], c[0]);
        assert.equal(r.records.length, c[2], c[0]);
      });
    });
  });
})();
