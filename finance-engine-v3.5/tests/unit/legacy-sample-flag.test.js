// MIG-001: demo DEFAULTS data is flagged as sample until each section is replaced.
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;
  var ALL = ['po_details', 'resources', 'ot_params', 'fx_rates', 'expenses', 'actuals_monthly', 'invoices'];

  // Captures the HTML render() writes into #app.
  function withApp(L) {
    var app = { innerHTML: '' };
    var doc = L.ctx.document, original = doc.getElementById;
    doc.getElementById = function (id) { return id === 'app' ? app : original(id); };
    return app;
  }

  T.suite('Legacy sample flag (MIG-001)', function () {
    T.test('a fresh sandbox flags every DEFAULTS section as sample', function () {
      var L = loadLegacy();
      assert.deepEqual(L.get('loadWork')()._sample_sections, ALL);
      assert.deepEqual(L.get('loadMaster')()._sample_sections, ALL);
    });

    T.test("doSave('resources') removes resources from the flag", function () {
      var L = loadLegacy();
      var resources = L.get('DEFAULTS').resources;
      var original = L.ctx.document.getElementById;
      L.ctx.document.getElementById = function (id) {
        return id === 'cfg_resources' ? { value: JSON.stringify(resources), parentElement: { querySelector: function () { return null; } }, insertAdjacentHTML: function () {} } : original(id);
      };
      L.get('doSave')('resources');
      var flag = JSON.parse(L.get('localStorage').getItem('pf_working'))._sample_sections;
      assert.deepEqual(flag, ALL.filter(function (k) { return k !== 'resources'; }));
    });

    T.test('markReal removes the field once nothing is sample', function () {
      var L = loadLegacy();
      var cfg = { _sample_sections: ['resources'] };
      L.get('markReal')(cfg, 'resources');
      assert.equal(cfg._sample_sections, undefined);
      assert.deepEqual(L.get('sampleSections')(cfg), []);
    });

    T.test('stored configs without the field are treated as real (no banner)', function () {
      var L = loadLegacy();
      L.get('localStorage').setItem('pf_working', CFE_NODE.readFile('tests/fixtures/legacy-config-basic.json'));
      var app = withApp(L);
      L.get('render')();
      assert.equal(app.innerHTML.indexOf('SAMPLE data'), -1);
    });

    T.test('the banner appears on every tab while sample data remains', function () {
      var L = loadLegacy();
      var app = withApp(L);
      L.get('TABS').forEach(function (t) {
        L.set('tab', t.id);
        L.get('render')();
        assert.ok(app.innerHTML.indexOf('Contains SAMPLE data (not real):') >= 0, 'banner on ' + t.id);
        assert.ok(app.innerHTML.indexOf('po_details') >= 0);
      });
    });

    T.test('aggregateActuals marks actuals_monthly as real', function () {
      var L = loadLegacy();
      var cfg = JSON.parse(CFE_NODE.readFile('tests/fixtures/legacy-config-basic.json'));
      cfg._sample_sections = ['actuals_monthly', 'invoices'];
      L.get('localStorage').setItem('pf_working', JSON.stringify(cfg));
      L.get('aggregateActuals')(cfg.raw_actuals);
      assert.deepEqual(JSON.parse(L.get('localStorage').getItem('pf_working'))._sample_sections, ['invoices']);
    });

    T.test('buildData totals for DEFAULTS are unchanged by the flag', function () {
      var L = loadLegacy();
      var D = L.get('buildData')();
      var plain = JSON.parse(JSON.stringify(L.get('DEFAULTS')));
      var L2 = loadLegacy();
      L2.get('localStorage').setItem('pf_working', JSON.stringify(plain));
      var D2 = L2.get('buildData')();
      assert.deepEqual([D.tAct, D.tExp, D.rem, D.fc.total, D.fc.rate], [D2.tAct, D2.tExp, D2.rem, D2.fc.total, D2.fc.rate]);
    });
  });
})();
