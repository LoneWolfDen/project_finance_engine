// IMP-008: the import draft (CFE.store.draft) and the Publish page's draft buttons.
// Runs in Node (fake IndexedDB from tests/support/fake-idb.js; quota failure) and in the browser
// (real IndexedDB under the key "finance-test", never the app's own "finance").
(function () {
  if (typeof CFE_NODE !== 'undefined') {
    if (typeof indexedDB === 'undefined') globalThis.indexedDB = CFE_NODE.support('fake-idb.js').create();
    if (typeof Continuum === 'undefined' || !Continuum.storage || !Continuum.hash) {
      ['html.js', 'storage.js', 'hash.js'].forEach(function (f) { (0, eval)(CFE_NODE.readFile('app/continuum-core/' + f)); });
    }
    if (typeof CFE === 'undefined' || !CFE.require) (0, eval)(CFE_NODE.readFile('app/cfe.js'));
    if (!CFE.store.draft) (0, eval)(CFE_NODE.readFile('app/store/draft.js'));
  }
  var T = CFE_TEST, assert = T.assert;
  var D = CFE.store.draft.create('finance-test');

  function entries() {
    return [
      { name: 'ts.csv', profile: { id: 'peoplesoft-timesheet-v1', entity: 'actuals' }, provenance: { file_id: 'aaaaaaaaaaaa', name: 'ts.csv', rows_read: 2, rows_used: 2, mapping_profile: 'peoplesoft-timesheet-v1' },
        result: { records: [{ employee_id: '1001', regular_hours: 8 }, { employee_id: '1002', regular_hours: 7.5 }], recordRows: [2, 4], errors: [], warnings: [] } },
      { name: 'rr.csv', profile: { id: 'resource-rules-v1', entity: 'resource_rules' }, provenance: { file_id: 'bbbbbbbbbbbb', name: 'rr.csv', rows_read: 1, rows_used: 1, mapping_profile: 'resource-rules-v1' },
        result: { records: [{ employee_id: '1001', bill_rate: 180 }], errors: [], warnings: [] } },
      { name: 'bad.txt', parsed: { problems: ['x'] }, result: null, profile: null, provenance: null }
    ];
  }

  T.suite('CFE.store.draft', function () {
    T.test('build: provenance per file, records grouped by entity with their file id', function () {
      var d = D.build(entries());
      assert.equal(d.schema_version, 1);
      assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(d.saved_utc));
      assert.deepEqual(d.files.map(function (f) { return f.file_id; }), ['aaaaaaaaaaaa', 'bbbbbbbbbbbb']);
      assert.deepEqual(d.records.actuals[1], { employee_id: '1002', regular_hours: 7.5, _file: 'aaaaaaaaaaaa', _row: 4 });
      assert.equal(d.records.resource_rules.length, 1);
    });

    T.test('save, load and discard round trip', function () {
      var d = D.build(entries());
      return D.discard().then(function () { return D.load(); }).then(function (none) {
        assert.equal(none, null, 'nothing at first');
        return D.save(d);
      }).then(function (r) {
        assert.deepEqual(r, { ok: true });
        return D.load();
      }).then(function (back) {
        assert.deepEqual(back, d);
        return D.discard();
      }).then(function (r) {
        assert.equal(r.ok, true);
        return D.load();
      }).then(function (gone) { assert.equal(gone, null); });
    });

    T.test('save refuses something that is not a draft', function () {
      return D.save({ files: [] }).then(function (r) { assert.equal(r.ok, false); });
    });

    T.test('draft file: checksum and format are verified', function () {
      var d = D.build(entries());
      return D.toFile(d).then(function (f) {
        assert.ok(/^finance-draft-\d{4}-\d{2}-\d{2}\.json$/.test(f.name), f.name);
        var obj = JSON.parse(f.text);
        assert.equal(obj.format, 'cfe.draft-file');
        assert.equal(obj.schema_version, 1);
        assert.equal(obj.sha256, Continuum.hash.sha256HexSync(JSON.stringify(d)));
        var tampered = JSON.parse(f.text); tampered.draft.records.actuals[0].regular_hours = 80;
        var newer = JSON.parse(f.text); newer.schema_version = 2;
        return Promise.all([D.fromFileText(f.text), D.fromFileText(JSON.stringify(tampered)), D.fromFileText(JSON.stringify(newer)),
          D.fromFileText('{"format":"other"}'), D.fromFileText('{')]);
      }).then(function (r) {
        assert.equal(r[0].ok, true);
        assert.deepEqual(r[0].draft, d);
        assert.ok(/checksum mismatch/.test(r[1].message));
        assert.ok(/newer version/.test(r[2].message));
        assert.ok(/not a saved draft/.test(r[3].message));
        assert.ok(/not valid JSON/.test(r[4].message));
      });
    });
  });

  if (typeof CFE_NODE !== 'undefined') {
    T.suite('CFE.store.draft (Node, fake IndexedDB)', function () {
      T.test('a full browser storage gives error kind "quota", not a crash', function () {
        var d = D.build(entries());
        return D.load().then(function () {   // the database is open
          indexedDB.failNextTransaction(Object.assign(new Error('disk full'), { name: 'QuotaExceededError' }));
          return D.save(d);
        }).then(function (r) {
          assert.equal(r.ok, false);
          assert.equal(r.error.kind, 'quota');
        });
      });
    });
  }

  if (typeof document !== 'undefined' && CFE.views.publish) {
    T.suite('Publish page draft buttons (browser)', function () {
      var TS = 'Empl Name,Empl ID,Reported Dt,Project ID,Regular Hours\n';
      function page() {
        var doc = document.implementation.createHTMLDocument('t');
        doc.body.innerHTML = '<main id="main"></main>';
        return doc;
      }
      function click(doc, action) { doc.querySelector('[data-action="' + action + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); }
      function wait(ms) { return new Promise(function (r) { setTimeout(r, ms || 50); }); }

      T.test('Keep in draft, reload (restored), discard (gone); errors block Keep', function () {
        var doc = page(), p;
        return D.discard().then(function () {
          p = CFE.views.publish.render(doc, { store: D });
          return p.restored;
        }).then(function () {
          return p.addFiles([new File([TS + 'R1,1001,7/1/2025,111111,8\nR2,1002,99/99/2025,111111,8\n'], 'bad.csv')]);
        }).then(function () {
          var keepBtn = doc.querySelector('[data-action="keep-draft"]');
          assert.equal(keepBtn.disabled, true, 'a file with errors blocks Keep');
          assert.ok(/Fix or remove the files with errors: bad\.csv/.test(keepBtn.parentNode.textContent));
          click(doc, 'remove-file');
          return p.addFiles([new File([TS + 'R1,1001,7/1/2025,111111,8\n'], 'ts.csv')]);
        }).then(function () {
          assert.equal(doc.querySelector('[data-action="keep-draft"]').disabled, false);
          click(doc, 'keep-draft');
          return wait(150);
        }).then(function () {
          assert.ok(/Kept in draft/.test(doc.getElementById('main').textContent));
          var doc2 = page();
          var p2 = CFE.views.publish.render(doc2, { store: D });   // like a reload
          return p2.restored.then(function () { return wait(); }).then(function () {
            var text = doc2.getElementById('main').textContent;
            assert.ok(/Draft from \d{2}-\d{2}-\d{4} \d{2}:\d{2} UTC restored: 1 file; timesheet rows: 1\./.test(text), text);
            assert.ok(text.indexOf('ts.csv · peoplesoft-timesheet-v1 · 1 of 1 rows') >= 0);
            var savedConfirm = window.confirm; window.confirm = function () { return true; };
            try { click(doc2, 'discard-draft'); } finally { window.confirm = savedConfirm; }
            return wait(150).then(function () { return D.load(); }).then(function (gone) {
              assert.equal(gone, null);
              assert.ok(/Draft discarded/.test(doc2.getElementById('main').textContent));
              CFE.views.publish.discard();
            });
          });
        });
      });
    });
  }
})();
