// CHT-002: experimental chat modes (Ollama, Copilot iframe) are off by default.
// Node only (uses the legacy sandbox); not listed in browser-suites.js.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;
  var loadLegacy = CFE_NODE.support('legacy-sandbox.js').loadLegacy;

  function withElements(L) {
    var els = {};
    var doc = L.ctx.document, original = doc.getElementById;
    doc.getElementById = function (id) {
      if (!els[id]) { els[id] = original(id); els[id].parentElement = { textContent: '' }; }
      return els[id];
    };
    return els;
  }

  T.suite('Legacy chat modes (CHT-002)', function () {
    T.test('only Smart is enabled by default', function () {
      var L = loadLegacy();
      assert.deepEqual(L.get('enabledChatModes()'), ['smart']);
      assert.deepEqual(L.get('CHAT_FLAGS'), { ollama: false, copilotIframe: false });
    });

    T.test('switchChatMode stays on Smart while the flags are off', function () {
      var L = loadLegacy();
      withElements(L);
      L.get('switchChatMode')();
      assert.equal(L.get('chatMode'), 'smart');
      L.get('switchChatMode')();
      assert.equal(L.get('chatMode'), 'smart');
    });

    T.test('a stored copilot or ollama mode resets to Smart', function () {
      ['copilot', 'ollama'].forEach(function (mode) {
        var L = loadLegacy();
        withElements(L);
        L.get('localStorage').setItem('pf_chat_mode', mode);
        L.get('initChatMode')();
        assert.equal(L.get('chatMode'), 'smart', mode);
        assert.equal(L.get('localStorage').getItem('pf_chat_mode'), 'smart');
      });
    });

    T.test('the Mode button is hidden when Smart is the only mode', function () {
      var L = loadLegacy();
      var els = withElements(L);
      L.get('initChatMode')();
      assert.equal(els.chatModeBtn.style.display, 'none');
    });

    T.test('with a stale ollama mode, sendChat answers locally and never calls the server', function () {
      var L = loadLegacy();
      var els = withElements(L);
      var calls = 0;
      L.ctx.fetch = function () { calls++; return Promise.reject(new Error('should not be called')); };
      els.chatIn = { value: 'remaining budget' };
      var added = [];
      els.chatMsgs = { appendChild: function (el) { added.push(el); return el; } };
      L.set('chatMode', 'ollama');
      return L.get('sendChat')().then(function () {
        assert.equal(calls, 0);
        assert.ok(/Remaining/.test(String(added[1].innerHTML)), 'smart answer shown');
      });
    });
  });
})();
