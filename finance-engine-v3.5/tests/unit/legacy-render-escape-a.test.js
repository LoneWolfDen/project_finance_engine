// SEC-003: data in the Overview, Burndown, Variance, PO, Invoices and Expenses renderers and the
// nav bar is escaped; nav values travel in data attributes, not inline handlers.
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  var TEAM = 'X"><img src=x onerror=1>';      // stored whitespace is stripped by some renderers
  var NOTE = '<script>alert(1)</script>';

  // A sandbox holding the basic fixture with every displayed string of team 111111 made malicious.
  function sandbox() {
    var L = loadLegacy({ now: '2025-08-15T12:00:00Z' });
    var cfg = JSON.parse(CFE_NODE.readFile('tests/fixtures/legacy-config-basic.json'));
    var old = cfg.po_details[0].PO_Team_Identifier;
    function retag(list, key) { (list || []).forEach(function (x) { if (x[key] === old) x[key] = TEAM; }); }
    retag(cfg.po_details, 'PO_Team_Identifier'); retag(cfg.resources, 'po_team'); retag(cfg.invoices, 'po_team'); retag(cfg.expenses, 'po_team');
    var p = cfg.po_details[0];
    p.PO_Currency_Code = 'GBP'; p.ProjectID = NOTE; p.WO_Approval_Status = NOTE; p.PO_WO_Number = NOTE; p.PO_Validity = '12-25';
    var inv = cfg.invoices[0];
    inv.notes = NOTE; inv.invoice_number = NOTE; inv.paid_date = NOTE;
    var e = cfg.expenses[0];
    e.desc = NOTE; e.name = NOTE;
    cfg._sample_sections = ['<img src=x>'];
    L.get('localStorage').setItem('pf_working', JSON.stringify(cfg));
    var els = {};
    var doc = L.ctx.document, original = doc.getElementById;
    doc.getElementById = function (id) { return els[id] || (els[id] = original(id)); };
    return { L: L, els: els, D: function () { return L.get('buildData')(); } };
  }

  function clean(name, html) {
    assert.ok(!/<img/i.test(html), name + ': raw <img found');
    assert.ok(!/<script/i.test(html), name + ': raw <script found');
  }

  T.suite('Legacy render escaping A (SEC-003)', function () {
    ['rOV', 'rBD', 'rMo', 'rPO', 'rInv', 'rExp'].forEach(function (fn) {
      T.test(fn + ' escapes data', function () {
        var a = sandbox();
        var html = a.L.get(fn)(a.D());
        clean(fn, html);
      });
    });

    T.test('malicious values appear as text', function () {
      var a = sandbox(), D = a.D();
      assert.ok(a.L.get('rOV')(D).indexOf('&lt;img') >= 0, 'rOV shows the team name as text');
      assert.ok(a.L.get('rPO')(D).indexOf('&lt;script&gt;') >= 0, 'rPO shows the PO number as text');
      assert.ok(a.L.get('rInv')(D).indexOf('&lt;script&gt;alert(1)&lt;/script&gt;') >= 0, 'rInv shows the note as text');
      assert.ok(a.L.get('rExp')(D).indexOf('&lt;script&gt;') >= 0, 'rExp shows the description as text');
    });

    T.test('nav: escaped values in data attributes, no data in inline handlers, banner escaped', function () {
      var a = sandbox();
      a.L.get('render')();
      var nav = a.els.nav.innerHTML;
      clean('nav', nav);
      assert.ok(/data-action="toggle-po-team" value="X&quot;&gt;&lt;imgsrc=xonerror=1&gt;"/.test(nav), 'team checkbox value escaped (the slicer strips spaces)');
      assert.ok(/data-action="set-year" data-value="2025"/.test(nav), 'year button uses data-value');
      assert.ok(!/togglePoTeam\(/.test(nav) && !/setYear\('2/.test(nav), 'no data-carrying inline handlers');
      clean('app', a.els.app.innerHTML);
      assert.ok(a.els.app.innerHTML.indexOf('&lt;img src=x&gt;') >= 0, 'sample banner escaped');
    });

    T.test('nav listeners: set-year and toggle-po-team dispatch to setYear / togglePoTeam', function () {
      var a = sandbox();
      var handlers = {};
      var nav = { addEventListener: function (type, fn) { handlers[type] = fn; } };
      var doc = a.L.ctx.document, g = doc.getElementById;
      doc.getElementById = function (id) { return id === 'nav' ? nav : g(id); };
      var html;
      try { html = CFE_NODE.readFile('legacy/index.html'); } catch (e) { html = CFE_NODE.readFile('index.html'); }  // SHL-004 moves it
      var m = /\/\/ SEC-003: year buttons[^\n]*\n([^\n]*\n[^\n]*\n)/.exec(html);
      assert.ok(m, 'listener block found');
      a.L.get(m[1]);  // re-run the two registrations against the capturing #nav stub
      var calls = [];
      a.L.set('setYear', function (y) { calls.push(['year', y]); });
      a.L.set('togglePoTeam', function (v, c) { calls.push(['team', v, c]); });
      function target(attrs) { return { closest: function (sel) { return sel.indexOf(attrs.action) >= 0 ? attrs.el : null; } }; }
      handlers.click({ target: target({ action: 'set-year', el: { dataset: { value: '2026' } } }) });
      handlers.change({ target: target({ action: 'toggle-po-team', el: { value: TEAM, checked: true } }) });
      assert.deepEqual(calls, [['year', '2026'], ['team', TEAM, true]]);
    });
  });
})();
