// SEC-004: data in the Resources, Utilisation, Scenarios, Upload and Settings views is escaped;
// Settings textareas get their JSON through .value; scenario actions use data attributes.
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  var BAD = 'X"><img src=x onerror=1>';
  var TA = '</textarea><img src=x>';

  function legacyHtml() {
    try { return CFE_NODE.readFile('legacy/index.html'); } catch (e) { return CFE_NODE.readFile('index.html'); }  // SHL-004 moves it
  }

  // The basic fixture with names, roles and team of the first PO team made malicious, plus a
  // scenario with a malicious name.
  function sandbox(opts) {
    opts = opts || {};
    var L = loadLegacy({ now: '2025-08-15T12:00:00Z', confirm: function () { return false; } });
    var cfg = JSON.parse(CFE_NODE.readFile('tests/fixtures/legacy-config-basic.json'));
    var old = cfg.po_details[0].PO_Team_Identifier;
    function retag(list, key) { (list || []).forEach(function (x) { if (x[key] === old) x[key] = BAD; }); }
    retag(cfg.po_details, 'PO_Team_Identifier'); retag(cfg.resources, 'po_team'); retag(cfg.invoices, 'po_team'); retag(cfg.expenses, 'po_team');
    cfg.resources.forEach(function (r) { r.name = BAD; r.role = TA; });
    cfg.raw_actuals.slice(0, 3).forEach(function (row) { row['Empl Name'] = BAD; });
    cfg.fx_rates[0].code = BAD;
    cfg.invoices[0].notes = TA;
    cfg.actuals_monthly = [];  // normally written by aggregateActuals
    var ls = L.get('localStorage');
    ls.setItem('pf_working', JSON.stringify(cfg));
    ls.setItem('pf_scenarios', JSON.stringify({ "Plan '\"<img src=x>": cfg }));
    var els = {};
    var doc = L.ctx.document, original = doc.getElementById;
    doc.getElementById = function (id) { return els[id] || (els[id] = original(id)); };
    L.ctx.render = L.get('render');  // keep the real render (other tests stub it)
    return { L: L, els: els, ls: ls, cfg: cfg, D: function () { return L.get('buildData')(); } };
  }

  function clean(name, html) {
    assert.ok(!/<img/i.test(html), name + ': raw <img found');
    assert.ok(!/<\/textarea><img/i.test(html), name + ': raw </textarea><img found');
    assert.ok(!/onclick="[^"]*\$\{/.test(html), name + ': template left in a handler');
  }

  T.suite('Legacy render escaping B (SEC-004)', function () {
    ['rRes', 'rUtil', 'rScen', 'rActData', 'rActDataInline', 'rFX', 'rUpload', 'rCfg', 'rTL'].forEach(function (fn) {
      T.test(fn + ' escapes data', function () {
        var a = sandbox();
        clean(fn, a.L.get(fn)(a.D()));
      });
    });

    T.test('Resources: team travels in data-team, not in the handler', function () {
      var a = sandbox();
      var html = a.L.get('rRes')(a.D());
      assert.ok(/data-team="X&quot;&gt;&lt;img src=x onerror=1&gt;" onclick="addResRowTo\(this\.dataset\.tid,this\.dataset\.team\)"/.test(html));
    });

    T.test('Scenarios: Load and Delete use data-action and an escaped data-name', function () {
      var a = sandbox();
      var html = a.L.get('rScen')(a.D());
      assert.ok(html.indexOf('data-action="load-scenario" data-name="Plan &#39;&quot;&lt;img src=x&gt;"') >= 0, 'load button');
      assert.ok(html.indexOf('data-action="delete-scenario" data-name="Plan &#39;&quot;&lt;img src=x&gt;"') >= 0, 'delete button');
      assert.ok(!/loadScenario\(|deleteScenario\(/.test(html), 'no inline scenario handlers');
    });

    T.test('Scenarios: the #app listener dispatches load-scenario and delete-scenario by name', function () {
      var a = sandbox();
      var handler = null;
      var doc = a.L.ctx.document, g = doc.getElementById;
      doc.getElementById = function (id) { return id === 'app' ? { addEventListener: function (t, fn) { if (t === 'click') handler = fn; } } : g(id); };
      var m = /\/\/ SEC-004: scenario Load[^\n]*\n([^\n]*\n)/.exec(legacyHtml());
      assert.ok(m, 'listener line found');
      a.L.get(m[1]);
      var calls = [];
      a.L.set('loadScenario', function (n) { calls.push(['load', n]); });
      a.L.set('deleteScenario', function (n) { calls.push(['delete', n]); });
      function click(action, name) { handler({ target: { closest: function () { return { dataset: { action: action, name: name } }; } } }); }
      click('load-scenario', "Plan '\"<img src=x>");
      click('delete-scenario', 'B');
      handler({ target: { closest: function () { return null; } } });
      assert.deepEqual(calls, [['load', "Plan '\"<img src=x>"], ['delete', 'B']]);
    });

    T.test('compareScenarios escapes scenario names and values', function () {
      var a = sandbox();
      var out = { innerHTML: '' };
      a.els.scenA = { value: '_current' }; a.els.scenB = { value: "Plan '\"<img src=x>" }; a.els.scenCompare = out;
      a.L.get('compareScenarios')();
      clean('compareScenarios', out.innerHTML);
      assert.ok(out.innerHTML.indexOf('&lt;img src=x&gt;') >= 0);
    });

    T.test('Settings: textarea is empty in the HTML and filled through .value after render', function () {
      var a = sandbox();
      a.L.set('tab', 'config');
      a.L.get('render')();
      var html = a.els.app.innerHTML;
      clean('config tab', html);
      assert.ok(/<textarea id="cfg_resources"[^>]*><\/textarea>/.test(html), 'empty textarea markup');
      assert.deepEqual(JSON.parse(a.els.cfg_resources.value), a.cfg.resources, 'value set after render');
    });

    T.test('Settings: a config containing </textarea><img src=x> round-trips through Save unchanged', function () {
      var a = sandbox();
      a.L.ctx.fetch = function () { return Promise.resolve({ ok: true }); };
      a.L.set('tab', 'config');
      a.L.get('render')();
      a.els.cfg_resources.parentElement = { querySelector: function () { return null; } };
      a.L.get('doSave')('resources');
      var saved = JSON.parse(a.ls.getItem('pf_working')).resources;
      assert.deepEqual(saved, a.cfg.resources);
      assert.equal(saved[0].role, TA);
    });

    T.test('upload reports escape file content', function () {
      var a = sandbox();
      a.L.get('processUpload')([{ 'Empl Name': BAD, 'Empl ID': '', 'Reported Dt': '<img src=x>' }], 'actuals');
      clean('actuals error report', a.els.uploadPreview.innerHTML);
      assert.ok(a.els.uploadPreview.innerHTML.indexOf('&lt;img src=x&gt;') >= 0);
    });

    T.test('no data inside inline handlers anywhere in the legacy page', function () {
      assert.ok(!/onclick="[^"]*\$\{/.test(legacyHtml()));
    });
  });
})();
