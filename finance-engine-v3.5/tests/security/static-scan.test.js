// SEC-005: static security scan of the new app (index.html and app/**). Node only.
// The legacy app (legacy/**) is out of scope: it has inline scripts by nature.
//
// Rules (TARGET_ARCHITECTURE §23, ADR-015):
//   1. index.html carries the Content-Security-Policy below (connect-src 'none': no network at all);
//   2. no inline <script> (every script tag has src);
//   3. no on*= event-handler attributes and no style= attributes in markup;
//   4. innerHTML is written only by Continuum.html.setHtml (app/continuum-core/html.js), which
//      accepts only markup built by the escaping template t`` (or raw());
//   5. no network APIs: fetch(, XMLHttpRequest, WebSocket, sendBeacon, EventSource;
//   6. web addresses (http:// or https://) only where tests/security/allowlist.json allows them.
// Rules 2–5 ignore whole-line comments (lines starting with //, and /* … */ blocks), so code can
// explain the rules; rule 6 checks every character, comments included.
(function () {
  if (typeof CFE_NODE === 'undefined') return;
  var T = CFE_TEST, assert = T.assert;

  var CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; " +
    "connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
  var FILES = ['index.html'].concat(CFE_NODE.support('files.js').list('app', /\.(js|css|html)$/));
  var HTML_SETTER = 'app/continuum-core/html.js';

  function code(text) {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(function (l) { return /^\s*\/\//.test(l) ? '' : l; }).join('\n');
  }

  // [file:line] for each match of re in each file's code (comments removed).
  function find(re, skip) {
    var hits = [];
    FILES.forEach(function (f) {
      if (skip && skip(f)) return;
      code(CFE_NODE.readFile(f)).split('\n').forEach(function (line, i) {
        if (re.test(line)) hits.push(f + ':' + (i + 1) + '  ' + line.trim().slice(0, 100));
      });
    });
    return hits;
  }

  T.suite('Security scan (SEC-005)', function () {
    T.test('the scan covers index.html and every app file', function () {
      assert.ok(FILES.length > 30, FILES.length + ' files');
      ['index.html', 'app/app.js', 'app/views/shell.js', 'app/store/dataset-loader.js', 'app/css/app.css'].forEach(function (f) { assert.ok(FILES.indexOf(f) >= 0, f); });
      assert.ok(!FILES.some(function (f) { return /^legacy\//.test(f); }));
    });

    T.test('index.html carries the Content-Security-Policy (no network: connect-src none)', function () {
      var html = CFE_NODE.readFile('index.html');
      var metas = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/g) || [];
      assert.equal(metas.length, 1);
      assert.equal(/content="([^"]*)"/.exec(metas[0])[1], CSP);
      assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script'), 'before the first script');
    });

    T.test('no inline <script>', function () {
      assert.deepEqual(find(/<script(?![^>]*\bsrc\s*=)[^>]*>/i), []);
    });

    T.test('no on*= attributes and no style= attributes in markup', function () {
      assert.deepEqual(find(/<[a-z][^>]*\son[a-z]+\s*=/i), []);
      assert.deepEqual(find(/<[a-z][^>]*\sstyle\s*=/i), []);
    });

    T.test('innerHTML is written only by Continuum.html.setHtml', function () {
      assert.deepEqual(find(/\.(innerHTML|outerHTML)\s*\+?=|insertAdjacentHTML|document\.write/, function (f) { return f === HTML_SETTER; }), []);
      var setter = code(CFE_NODE.readFile(HTML_SETTER)).match(/\.innerHTML\s*=/g) || [];
      assert.equal(setter.length, 1, 'html.js writes innerHTML in setHtml only');
    });

    T.test('no network APIs', function () {
      assert.deepEqual(find(/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts/), []);
    });

    T.test('web addresses only where tests/security/allowlist.json allows them', function () {
      var allow = JSON.parse(CFE_NODE.readFile('tests/security/allowlist.json')).entries;
      var found = [];
      FILES.forEach(function (f) {
        (CFE_NODE.readFile(f).match(/https?:\/\/[^\s'"`<>)\\]+/g) || []).forEach(function (url) {
          if (!allow.some(function (e) { return e.url === url && e.files.indexOf(f) >= 0; })) found.push(f + ': ' + url);
        });
      });
      assert.deepEqual(found, []);
      allow.forEach(function (e) {
        e.files.forEach(function (f) { assert.ok(CFE_NODE.readFile(f).indexOf(e.url) >= 0, 'allowlist entry still used: ' + e.url + ' in ' + f); });
      });
    });

    T.test('the scanner catches each kind of violation', function () {
      var bad = {
        inline: '<script>alert(1)</script>', handler: '<img src=x onerror="go()">', style: '<div style="color:red">',
        inner: 'el.innerHTML = text;', net: 'fetch("x")', url: 'see https://example.com'
      };
      assert.ok(/<script(?![^>]*\bsrc\s*=)[^>]*>/i.test(bad.inline));
      assert.ok(/<[a-z][^>]*\son[a-z]+\s*=/i.test(bad.handler));
      assert.ok(/<[a-z][^>]*\sstyle\s*=/i.test(bad.style));
      assert.ok(/\.(innerHTML|outerHTML)\s*\+?=/.test(bad.inner));
      assert.ok(/\bfetch\s*\(/.test(bad.net));
      assert.ok(/https?:\/\/[^\s'"`<>)\\]+/.test(bad.url));
      assert.equal(code('// fetch("x")\n/* <script> */\nok();'), '\n\nok();', 'whole-line comments are ignored');
      assert.ok(/\bfetch\s*\(/.test(code('x(); // fetch("y")')), 'a trailing comment is still scanned');
    });
  });
})();
