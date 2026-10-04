// TST-002: every synthetic fixture is present, readable, documented and free of real-looking data.
// Node only (reads files from disk); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var fs = CFE_NODE.support('make-xlsx-fixtures.js');
  var DIR = 'tests/fixtures/';

  var TIMESHEET_HEADER = 'Empl Name,Empl ID,Reported Dt,PC Bus Unit,Project ID,Customer Name,Project Name,Week Ending,Country Time Rptd,State Time Rptd,Activity,Reported Status,Worksite Country,Worksite State,Worksite City,Worksite Postal,Bill Indicator,Regular Hours,Overtime Hours,Vacation Hours,Personal Hours,Other,Total Hours';
  var RESOURCES_HEADER = 'Empl Name,EmplID,ProjectID,PO_Team_Identifier,Role,Location,RateEffectiveDt,BillRate,HourMultiplier_TimeEntry,ContractEndDt,Allocation_Percentage';
  var CONFIGS = ['legacy-config-basic.json', 'legacy-config-multicurrency.json', 'legacy-config-2027.json'];
  var CSVS = {
    'timesheet-quoted.csv': TIMESHEET_HEADER,
    'timesheet-duplicates.csv': TIMESHEET_HEADER,
    'timesheet-ambiguous-dates.csv': TIMESHEET_HEADER,
    'resources-uk-dates.csv': RESOURCES_HEADER
  };
  // Long numbers that are documented synthetic IDs (tests/fixtures/README.md).
  var DOCUMENTED_IDS = ['100100100', '100100101', '200200200', '300300300', '400400400', '400400401', '0000001'];

  function text(name) { return CFE_NODE.readFile(DIR + name); }

  T.suite('Fixtures', function () {
    T.test('legacy configs parse and have the legacy keys', function () {
      CONFIGS.forEach(function (name) {
        var cfg = JSON.parse(text(name));
        ['po_details', 'resources', 'fx_rates', 'ot_params', 'expenses', 'invoices', 'raw_actuals'].forEach(function (k) {
          assert.ok(Array.isArray(cfg[k]), name + ' has array ' + k);
        });
        assert.ok(/SYNTHETIC/.test(cfg._fixture), name + ' is labelled synthetic');
        cfg.po_details.forEach(function (po) { assert.ok(/^\d{2}-\d{2}$/.test(po.PO_Validity), name + ' PO_Validity mm-yy'); });
        cfg.resources.forEach(function (r) { assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(r.start) && /^\d{4}-\d{2}-\d{2}$/.test(r.end), name + ' ISO resource dates'); });
      });
      assert.equal(JSON.parse(text('legacy-config-basic.json')).raw_actuals.length, 200);
    });

    T.test('CSV fixtures have the expected header', function () {
      Object.keys(CSVS).forEach(function (name) {
        var first = text(name).replace(/^﻿/, '').split(/\r?\n/)[0];
        assert.equal(first, CSVS[name], name);
      });
    });

    T.test('timesheet-quoted.csv has a BOM, CRLF line endings and quoted commas', function () {
      var t = text('timesheet-quoted.csv');
      assert.equal(t.charCodeAt(0), 0xFEFF);
      assert.ok(t.indexOf('\r\n') > 0);
      assert.equal(t.replace(/\r\n/g, '').indexOf('\n'), -1, 'no bare LF');
      assert.ok(t.indexOf('"Lead, R1"') > 0);
      assert.ok(t.indexOf('""Sam""') > 0);
    });

    T.test('timesheet-duplicates.csv has one exact duplicate and one same-key pair', function () {
      var lines = text('timesheet-duplicates.csv').trim().split('\n').slice(1);
      var exact = lines.filter(function (l, i) { return lines.indexOf(l) !== i; });
      assert.equal(exact.length, 1);
      var keys = lines.map(function (l) { var c = l.split(','); return c[1] + '|' + c[2] + '|' + c[4]; });
      var repeated = keys.filter(function (k, i) { return keys.indexOf(k) !== i; });
      assert.equal(repeated.length, 2);
    });

    T.test('xlsx fixture is a zip (xlsx) file', function () {
      var bytes = fs.readBytes(DIR + 'xlsx/timesheet-basic.xlsx');
      assert.equal(String.fromCharCode(bytes[0], bytes[1]), 'PK');
    });

    T.test('no e-mail addresses or undocumented long numbers', function () {
      CONFIGS.concat(Object.keys(CSVS)).forEach(function (name) {
        var t = text(name);
        assert.equal(t.indexOf('@'), -1, name + ' contains @');
        var numbers = t.match(/\b\d{7,}\b/g) || [];
        numbers.forEach(function (n) {
          assert.ok(DOCUMENTED_IDS.indexOf(n) >= 0, name + ' contains undocumented long number ' + n);
        });
      });
    });

    T.test('every fixture file is documented in the README', function () {
      var readme = text('README.md');
      fs.listFiles().filter(function (f) { return f !== 'README.md'; }).forEach(function (f) {
        assert.ok(readme.indexOf('`' + f + '`') >= 0, f + ' is listed in tests/fixtures/README.md');
      });
    });
  });
})();
