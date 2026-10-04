// CHT-001: truthful Smart-mode answers (scope line, sample flag, no misleading maths).
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  function fixture(name) { return JSON.parse(CFE_NODE.readFile('tests/fixtures/' + name)); }
  function ask(L, question) { return String(L.get('smartAnswer')(question, L.get('buildData')())); }
  function withConfig(cfg) {
    var L = loadLegacy();
    L.get('localStorage').setItem('pf_working', JSON.stringify(cfg));
    return L;
  }

  T.suite('Legacy smart answers (CHT-001)', function () {
    T.test('every answer starts with a scope line', function () {
      var L = withConfig(fixture('legacy-config-basic.json'));
      ['remaining budget', 'burn rate', 'who is over utilized', 'who is in the team', 'forecast', 'actuals', 'invoices', 'expenses', 'help'].forEach(function (q) {
        var a = ask(L, q);
        assert.ok(/^<small>Scope: All years · All PO teams · Source: loaded data · Actuals to [A-Z][a-z]{2}-\d{2}<\/small><br>/.test(a), q + ': ' + a.slice(0, 120));
      });
    });

    T.test('the scope says SAMPLE DATA while sample sections remain', function () {
      var L = loadLegacy();
      assert.ok(ask(L, 'remaining budget').indexOf('Source: SAMPLE DATA (not real)') >= 0);
    });

    T.test('"how much did R1 claim" no longer returns the budget answer', function () {
      var L = withConfig(fixture('legacy-config-basic.json'));
      var a = ask(L, 'how much did R1 claim');
      assert.equal(a.indexOf('Remaining:'), -1, a);
      assert.ok(a.indexOf('Total expenses') >= 0, a);
    });

    T.test('a zero burn rate gives the no-estimate text', function () {
      var cfg = fixture('legacy-config-basic.json');
      cfg.resources.forEach(function (r) { r.bill_rate = 0; });
      var L = withConfig(cfg);
      var a = ask(L, 'remaining budget');
      assert.ok(a.indexOf('cannot estimate days remaining (burn rate is 0)') >= 0, a);
      assert.equal(a.indexOf('Infinity'), -1);
    });

    T.test('the allocation answer says it is planned allocation, not utilisation', function () {
      var L = withConfig(fixture('legacy-config-basic.json'));
      assert.ok(ask(L, 'who is over utilized').indexOf('Planned allocation above 80% (not measured utilisation)') >= 0);
    });

    T.test('the invoice answer counts only invoices in the selected team and year', function () {
      var cfg = fixture('legacy-config-basic.json');
      var L = withConfig(cfg);
      var all = cfg.invoices.length;
      assert.ok(ask(L, 'invoices').indexOf(all + ' invoices in scope') >= 0);
      L.set('selectedPoTeams', ['222222_ProjectBeta_GCP']);
      var beta = cfg.invoices.filter(function (i) { return i.po_team === '222222_ProjectBeta_GCP'; }).length;
      assert.ok(beta < all, 'fixture has invoices for several teams');
      assert.ok(ask(L, 'invoices').indexOf(beta + ' invoices in scope') >= 0, ask(L, 'invoices'));
      L.set('selectedPoTeams', []);
      L.set('selectedYear', '2099');
      assert.ok(ask(L, 'invoices').indexOf('0 invoices in scope') >= 0);
    });

    T.test('names that contain another name do not cross-match', function () {
      var cfg = fixture('legacy-config-basic.json');
      var base = cfg.resources[0];
      cfg.resources = [
        Object.assign({}, base, { name: 'R1', empl_id: 1001 }),
        Object.assign({}, base, { name: 'R10', empl_id: 1010, role: 'Tester' })
      ];
      var L = withConfig(cfg);
      var a = ask(L, 'tell me about r10');
      assert.ok(a.indexOf('<strong>R10</strong>') >= 0, a);
      assert.ok(L.get('wholeWord')('ask r1 now', 'r1'));
      assert.ok(!L.get('wholeWord')('ask r10 now', 'r1'));
      assert.ok(!L.get('wholeWord')('resource_10', 'resource_1'));
    });
  });
})();
