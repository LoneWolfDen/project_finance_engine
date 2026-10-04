// SEC-002: the legacy chat escapes data values and shows typed text literally.
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;
  var EVIL = '<img src=x onerror=alert(1)>';

  function withEvilResource() {
    var L = loadLegacy();
    var cfg = JSON.parse(JSON.stringify(L.get('DEFAULTS')));
    cfg.resources[0].name = EVIL;
    cfg.resources[0].role = '<script>bad()</script>';
    L.get('localStorage').setItem('pf_working', JSON.stringify(cfg));
    return L;
  }

  T.suite('Legacy chat escaping (SEC-002)', function () {
    T.test('a resource name with HTML is escaped in the team answer', function () {
      var L = withEvilResource();
      var answer = String(L.get('smartAnswer')('who is in the team', L.get('buildData')()));
      assert.ok(answer.indexOf('&lt;img src=x onerror=alert(1)&gt;') >= 0, answer);
      assert.equal(answer.indexOf('<img'), -1);
      assert.equal(answer.indexOf('<script>'), -1);
      assert.ok(answer.indexOf('<strong>') >= 0, 'markup kept');
    });

    T.test('the person answer escapes the matched name', function () {
      var L = withEvilResource();
      var answer = String(L.get('smartAnswer')(EVIL.toLowerCase(), L.get('buildData')()));
      assert.equal(answer.indexOf('<img'), -1, answer);
    });

    T.test('sendChat shows the typed text as plain text', function () {
      var L = loadLegacy();
      var added = [];
      var msgs = { scrollTop: 0, scrollHeight: 0, appendChild: function (el) { added.push(el); return el; } };
      var input = { value: '<b>hi</b>' };
      var doc = L.ctx.document, original = doc.getElementById;
      doc.getElementById = function (id) { return id === 'chatMsgs' ? msgs : id === 'chatIn' ? input : original(id); };
      return L.get('sendChat')().then(function () {
        assert.equal(added[0].className, 'chat-msg user');
        assert.equal(added[0].textContent, '<b>hi</b>');
        assert.equal(added[0].innerHTML, '');
        assert.equal(added[1].className, 'chat-msg ai');
      });
    });
  });
})();
