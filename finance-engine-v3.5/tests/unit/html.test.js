// SEC-002: Continuum.html escaping helpers. Runs in Node and in the browser.
(function () {
  // In Node the app scripts are not preloaded: evaluate the module in this context.
  if (typeof Continuum === 'undefined' || !Continuum.html) (0, eval)(CFE_NODE.readFile('app/continuum-core/html.js'));
  var T = CFE_TEST, assert = T.assert, H = Continuum.html;

  T.suite('Continuum.html', function () {
    T.test('escape() escapes < > & " and \'', function () {
      assert.equal(H.escape('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
      assert.equal(H.escape(null), '');
      assert.equal(H.escape(undefined), '');
      assert.equal(H.escape(42), '42');
    });

    T.test('t`` escapes interpolated values but keeps the template markup', function () {
      var name = '<img src=x onerror=alert(1)>';
      assert.equal(String(H.t`<strong>${name}</strong>`), '<strong>&lt;img src=x onerror=alert(1)&gt;</strong>');
    });

    T.test('raw() values and nested t`` results are not escaped again', function () {
      var inner = H.t`<em>${'a&b'}</em>`;
      assert.equal(String(H.t`${H.raw('<br>')}${inner}`), '<br><em>a&amp;b</em>');
      assert.ok(H.isRaw(inner));
      assert.ok(!H.isRaw('<br>'));
    });

    T.test('arrays are joined, each element escaped', function () {
      assert.equal(String(H.t`${['<a>', H.raw('<b>')]}`), '&lt;a&gt;<b>');
    });

    T.test('setText() writes plain text', function () {
      var el = {};
      H.setText(el, '<b>hi</b>');
      assert.equal(el.textContent, '<b>hi</b>');
      H.setText(el, null);
      assert.equal(el.textContent, '');
    });

    T.test('core version is declared when CORE_VERSION.js is loaded', function () {
      if (typeof Continuum.coreVersion === 'undefined') (0, eval)(CFE_NODE.readFile('app/continuum-core/CORE_VERSION.js'));
      assert.equal(Continuum.coreVersion, '0.1.0');
    });
  });
})();
