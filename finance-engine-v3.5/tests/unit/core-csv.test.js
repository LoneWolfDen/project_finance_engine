// IMP-001: Continuum.csv.parse (RFC 4180). The inline cases run in Node and in the browser;
// the fixture files are read from disk, so those cases are Node only.
(function () {
  // In Node the app scripts are not preloaded: evaluate the module in this context.
  if (typeof Continuum === 'undefined' || !Continuum.csv) (0, eval)(CFE_NODE.readFile('app/continuum-core/csv.js'));
  var T = CFE_TEST, assert = T.assert, parse = Continuum.csv.parse;

  T.suite('Continuum.csv', function () {
    T.test('header and rows; every value is a string', function () {
      var r = parse('a,b\n1,x\n2,y\n');
      assert.deepEqual(r, { header: ['a', 'b'], rows: [{ a: '1', b: 'x' }, { a: '2', b: 'y' }], errors: [] });
    });

    T.test('BOM and CRLF', function () {
      var r = parse('﻿a,b\r\n1,2\r\n');
      assert.deepEqual(r.header, ['a', 'b']);
      assert.deepEqual(r.rows, [{ a: '1', b: '2' }]);
    });

    T.test('quoted commas, "" escapes and line breaks inside quotes', function () {
      var r = parse('name,note\n"Lead, R1","said ""hi"""\n"two\nlines",ok\n');
      assert.deepEqual(r.rows, [{ name: 'Lead, R1', note: 'said "hi"' }, { name: 'two\nlines', note: 'ok' }]);
      assert.deepEqual(r.errors, []);
    });

    T.test('empty fields and empty quoted fields are kept; values are not trimmed', function () {
      var r = parse('a,b,c\n,"", x \n');
      assert.deepEqual(r.rows, [{ a: '', b: '', c: ' x ' }]);
    });

    T.test('ragged rows are reported with their line and left out', function () {
      var r = parse('a,b,c\n1,2,3\n4,5\n6,7,8,9\n"multi\nline",2,3\n10,11\n');
      assert.deepEqual(r.rows, [{ a: '1', b: '2', c: '3' }, { a: 'multi\nline', b: '2', c: '3' }]);
      assert.deepEqual(r.errors.map(function (e) { return e.line; }), [3, 4, 7], 'line numbers count physical lines');
      assert.ok(/Row has 2 fields; the header has 3/.test(r.errors[0].message));
    });

    T.test('empty lines (including trailing ones) are skipped', function () {
      var r = parse('a,b\n\n1,2\n\r\n\n');
      assert.deepEqual(r.rows, [{ a: '1', b: '2' }]);
      assert.deepEqual(r.errors, []);
    });

    T.test('an unclosed quote and text after a closing quote are reported', function () {
      var r = parse('a,b\n1,"open\n');
      assert.deepEqual(r.rows, []);
      assert.equal(r.errors.length, 1);
      assert.equal(r.errors[0].line, 2);
      var r2 = parse('a,b\n"x"y,2\n');
      assert.deepEqual(r2.rows, [{ a: 'xy', b: '2' }]);
      assert.equal(r2.errors[0].line, 2);
    });

    T.test('empty input and duplicate column names are reported', function () {
      assert.deepEqual(parse(''), { header: [], rows: [], errors: [{ line: 1, message: 'The file has no header row.' }] });
      var r = parse('a,a\n1,2\n');
      assert.deepEqual(r.rows, [{ a: '2' }]);
      assert.ok(/appears more than once/.test(r.errors[0].message));
    });

    T.test('values are never evaluated', function () {
      var r = parse('f\n"=1+1"\n<script>x</script>\n');
      assert.deepEqual(r.rows, [{ f: '=1+1' }, { f: '<script>x</script>' }]);
    });
  });

  if (typeof CFE_NODE === 'undefined') return;

  T.suite('Continuum.csv on the fixture files (Node)', function () {
    T.test('timesheet-quoted.csv: BOM, CRLF, quoted commas and "" escapes', function () {
      var r = parse(CFE_NODE.readFile('tests/fixtures/timesheet-quoted.csv'));
      assert.deepEqual(r.errors, []);
      assert.equal(r.header.length, 23);
      assert.equal(r.header[0], 'Empl Name', 'BOM removed from the first column name');
      assert.equal(r.rows[0]['Empl Name'], 'Lead, R1');
      assert.equal(r.rows[2]['Customer Name'], 'TestCo, Ltd');
      assert.equal(r.rows[3]['Empl Name'], 'Engineer, R3 "Sam"');
      r.rows.forEach(function (row) { assert.equal(Object.keys(row).length, 23); });
    });

    ['timesheet-duplicates.csv', 'timesheet-ambiguous-dates.csv', 'resources-uk-dates.csv'].forEach(function (f) {
      T.test(f + ': parses without errors, one object per data line', function () {
        var text = CFE_NODE.readFile('tests/fixtures/' + f);
        var r = parse(text);
        assert.deepEqual(r.errors, []);
        var dataLines = text.split(/\r?\n/).filter(function (l) { return l !== ''; }).length - 1;
        assert.equal(r.rows.length, dataLines);
      });
    });

    T.test('test_Timesheet.csv: 1,243 rows with 23 columns', function () {
      var r = parse(CFE_NODE.readFile('test_Timesheet.csv'));
      assert.deepEqual(r.errors, []);
      assert.equal(r.header.length, 23);
      assert.equal(r.rows.length, 1243);
    });
  });
})();
