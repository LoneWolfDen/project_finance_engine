// IMP-004: import V1 on the Publish page (CFE.views.publish): parse, detect, map, provenance, preview.
// The pure parts run in Node and in the browser (SheetJS from vendor/); render needs a DOM (browser);
// the real sample files are read from disk (Node only).
(function () {
  if (typeof CFE_NODE !== 'undefined') {
    if (typeof Continuum === 'undefined' || !Continuum.csv || !Continuum.provenance || !Continuum.log) {
      ['html.js', 'csv.js', 'hash.js', 'provenance.js', 'log.js'].forEach(function (f) { (0, eval)(CFE_NODE.readFile('app/continuum-core/' + f)); });
    }
    if (typeof CFE === 'undefined' || !CFE.require) (0, eval)(CFE_NODE.readFile('app/cfe.js'));
    if (!CFE.data.mapping) {
      (0, eval)(CFE_NODE.readFile('app/data/mapping.js'));
      ['peoplesoft-timesheet-v1', 'resource-rules-v1', 'po-details-v1', 'invoices-v1', 'expenses-v1', 'fx-rates-v1', 'ot-rules-v1', 'references-crosswalk-v1']
        .forEach(function (id) { (0, eval)(CFE_NODE.readFile('app/data/mappings/' + id + '.js')); });
    }
    if (!CFE.views.publish) (0, eval)(CFE_NODE.readFile('app/views/publish.js'));
    if (typeof XLSX === 'undefined') globalThis.XLSX = CFE_NODE.support('vendor-loader.js').sheetjs().XLSX;
  }
  var T = CFE_TEST, assert = T.assert, P = CFE.views.publish;
  var TS = 'Empl Name,Empl ID,Reported Dt,Project ID,Activity,Worksite City,Regular Hours,Overtime Hours,Vacation Hours,Total Hours\n';

  function bytes(text) { return new TextEncoder().encode(text); }
  function file(name, text) { var b = bytes(text); return { name: name, size: b.length, lastModified: 0, bytes: b }; }

  // A workbook with two sheets; on "Timesheet" the date is a real Excel date cell (1 July 2025).
  function workbook() {
    var X = XLSX;
    var ts = X.utils.aoa_to_sheet([['Empl Name', 'Empl ID', 'Reported Dt', 'Project ID', 'Regular Hours'], ['R1', '1001', '', '111111', 8]]);
    ts.C2 = { t: 'n', v: 45839, z: 'm/d/yy' };
    var rr = X.utils.aoa_to_sheet([['Empl Name', 'EmplID', 'PO_Team_Identifier', 'Location', 'RateEffectiveDt', 'ContractEndDt', 'BillRate', 'Allocation_Percentage'],
      ['R1', '1001', 'T1', 'UK', '', '31/12/2025', 180, 1]]);
    rr.E2 = { t: 'n', v: 45839, z: 'dd/mm/yyyy' };
    var wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ts, 'Timesheet');
    X.utils.book_append_sheet(wb, rr, 'Rates');
    var out = X.write(wb, { type: 'array', bookType: 'xlsx' });
    // out is an ArrayBuffer (possibly from another realm in Node): copy it into a local Uint8Array.
    var src = out.length === undefined ? new Uint8Array(out) : out;
    var u8 = new Uint8Array(src.length);
    for (var i = 0; i < u8.length; i++) u8[i] = src[i];
    return { name: 'book.xlsx', size: u8.length, lastModified: 0, bytes: u8 };
  }

  T.suite('CFE.views.publish (import)', function () {
    T.test('CSV timesheet: detected, mapped, personal columns dropped, provenance recorded', function () {
      var f = file('ts.csv', TS + 'R1,1001,7/1/2025,111111,PERFORM,CITY,8,0,4,12\nR2,1002,12/31/2025,111111,PERFORM,CITY,7.5,1,0,8.5\n');
      return P.processFile(f).then(function (e) {
        assert.equal(e.profile.id, 'peoplesoft-timesheet-v1');
        assert.deepEqual(e.result.errors, []);
        assert.deepEqual(e.result.records.map(function (r) { return r.reported_date; }), ['2025-07-01', '2025-12-31']);
        assert.deepEqual(e.result.droppedColumns, ['Worksite City', 'Vacation Hours']);
        assert.equal(e.sha256, Continuum.hash.sha256HexSync(f.bytes));
        var p = e.provenance;
        assert.deepEqual([p.name, p.parser, p.mapping_profile, p.rows_read, p.rows_used, p.header_row, p.sheet], ['ts.csv', 'continuum-csv', 'peoplesoft-timesheet-v1', 2, 2, 1, null]);
        assert.equal(p.file_id, e.sha256.slice(0, 12));
      });
    });

    T.test('choosing another profile re-maps the file (here: required columns missing)', function () {
      var f = file('ts.csv', TS + 'R1,1001,7/1/2025,111111,PERFORM,CITY,8,0,0,8\n');
      return P.processFile(f, { profileId: 'resource-rules-v1' }).then(function (e) {
        assert.equal(e.profile.id, 'resource-rules-v1');
        assert.equal(e.result.records.length, 0);
        assert.ok(e.result.errors.length > 0 && /Required column missing/.test(e.result.errors[0].message));
        assert.equal(e.provenance.rows_used, 0);
      });
    });

    T.test('CSV problems are listed with their line; good rows still import', function () {
      return P.processFile(file('ts.csv', TS + 'R1,1001,7/1/2025,111111,PERFORM,CITY,8,0,0,8\nbroken,row\n')).then(function (e) {
        assert.equal(e.parsed.problems.length, 1);
        assert.ok(/^Line 3:/.test(e.parsed.problems[0]), e.parsed.problems[0]);
        assert.equal(e.result.records.length, 1);
      });
    });

    T.test('JSON: a list of POs, and an object whose lists can be chosen', function () {
      var pos = [{ PO_WO_Number: 1, PO_Team_Identifier: 'T1', PO_WO_value: 10, PO_Currency_Code: 'GBP', WO_StartDate: '31-12-2025', WO_Approval_Status: 'Approved' }];
      var backup = { po_details: pos, invoices: [{ po_team: 'T1', invoice_number: 'I1', period_from: '2025-07-01', period_to: '2025-07-31', amount: 5, status: 'Paid' }], note: 'x' };
      return Promise.all([
        P.processFile(file('po.json', JSON.stringify(pos))),
        P.processFile(file('backup.json', JSON.stringify(backup))),
        P.processFile(file('backup.json', JSON.stringify(backup)), { sheet: 'invoices' }),
        P.processFile(file('bad.json', '{')),
        P.processFile(file('notes.txt', 'hello'))
      ]).then(function (r) {
        assert.equal(r[0].profile.id, 'po-details-v1');
        assert.equal(r[0].result.records[0].start, '2025-12-31');
        assert.deepEqual(r[1].parsed.sheets, ['po_details', 'invoices']);
        assert.equal(r[1].profile.id, 'po-details-v1');
        assert.equal(r[2].parsed.sheet, 'invoices');
        assert.equal(r[2].profile.id, 'invoices-v1');
        assert.equal(r[2].provenance.sheet, 'invoices');
        assert.deepEqual(r[3].parsed.problems, ['The file is not valid JSON.']);
        assert.equal(r[3].result, null);
        assert.deepEqual(r[4].parsed.problems, ['Only .csv, .xlsx and .json files can be imported.']);
      });
    });

    T.test('XLSX: first sheet by default, sheet choice, real date cells written in the profile format', function () {
      var wb = workbook();
      return Promise.all([P.processFile(wb), P.processFile(wb, { sheet: 'Rates' })]).then(function (r) {
        assert.deepEqual(r[0].parsed.sheets, ['Timesheet', 'Rates']);
        assert.equal(r[0].parsed.sheet, 'Timesheet');
        assert.deepEqual(r[0].parsed.rows[0]['Reported Dt'], { excelDate: '2025-07-01' });
        assert.equal(r[0].profile.id, 'peoplesoft-timesheet-v1');
        assert.deepEqual(r[0].result.errors, []);
        assert.equal(r[0].result.records[0].reported_date, '2025-07-01', 'month-first profile: 7/1/2025');
        assert.equal(r[0].result.records[0].regular_hours, 8);
        assert.equal(r[1].profile.id, 'resource-rules-v1');
        assert.deepEqual(r[1].result.errors, []);
        assert.equal(r[1].result.records[0].start, '2025-07-01', 'day-first profile: 1/7/2025');
        assert.equal(r[1].result.records[0].end, '2025-12-31');
        assert.equal(r[1].provenance.parser, 'sheetjs');
        assert.equal(r[1].provenance.parser_version, XLSX.version);
      });
    });
  });

  if (typeof document !== 'undefined') {
    T.suite('CFE.views.publish render (browser)', function () {
      T.test('chosen files become escaped cards; leaving the page discards them', function () {
        var doc = document.implementation.createHTMLDocument('t');
        doc.body.innerHTML = '<main id="main"></main>';
        var page = P.render(doc);
        var f1 = new File([TS + '<img src=x onerror=1>,1001,7/1/2025,111111,PERFORM,CITY,8,0,0,8\n'], 'ts.csv');
        return page.addFiles([f1]).then(function () {
          var main = doc.getElementById('main');
          assert.equal(main.querySelectorAll('section.card').length, 1);
          assert.equal(main.querySelector('section.card img'), null, 'escaped');
          assert.ok(main.textContent.indexOf('<img src=x onerror=1>') >= 0);
          assert.ok(/No errors\. Rows read: 1\. Rows used: 1\./.test(main.textContent), main.textContent);
          assert.equal(main.querySelector('select[data-action="choose-profile"]').value, 'peoplesoft-timesheet-v1');
          assert.equal(P.current().length, 1);
          P.discard();
          assert.equal(P.current().length, 0, 'nothing kept after leaving');
        });
      });
    });
  }

  if (typeof CFE_NODE === 'undefined') return;

  T.suite('CFE.views.publish on the sample files (Node)', function () {
    function disk(rel) { var b = new Uint8Array(CFE_NODE.support('vendor-loader.js').bytes(rel)); return { name: rel.split('/').pop(), size: b.length, lastModified: 0, bytes: b }; }

    T.test('test_Timesheet.csv, test_ResourceRules.csv, test_PO_Details.json and timesheet-basic.xlsx', function () {
      return Promise.all(['test_Timesheet.csv', 'test_ResourceRules.csv', 'test_PO_Details.json', 'tests/fixtures/xlsx/timesheet-basic.xlsx'].map(function (f) { return P.processFile(disk(f)); })).then(function (r) {
        assert.deepEqual(r.map(function (e) { return e.profile.id; }), ['peoplesoft-timesheet-v1', 'resource-rules-v1', 'po-details-v1', 'peoplesoft-timesheet-v1']);
        assert.deepEqual(r.map(function (e) { return e.result.errors.length; }), [0, 0, 0, 0]);
        assert.deepEqual(r.map(function (e) { return e.result.records.length; }), [1243, 14, 4, r[3].parsed.rows.length]);
        assert.ok(r[3].result.records.length > 0);
      });
    });
  });
})();
