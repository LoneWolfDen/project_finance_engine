// REL-001: About page (CFE.views.about), the export-attribution preference, LICENSE and the
// web-address allowlist. The preference runs in Node and in the browser; render needs a DOM
// (browser only); the file checks read from disk (Node only).
(function () {
  if (typeof Continuum === 'undefined' || !Continuum.storage) {
    (0, eval)(CFE_NODE.readFile('app/continuum-core/html.js'));
    (0, eval)(CFE_NODE.readFile('app/continuum-core/storage.js'));
  }
  if (typeof CFE === 'undefined' || !CFE.version) {
    (0, eval)(CFE_NODE.readFile('app/VERSION.js'));
    (0, eval)(CFE_NODE.readFile('app/config.js'));
  }
  if (!CFE.require) (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  if (!CFE.views.about) (0, eval)(CFE_NODE.readFile('app/views/about.js'));
  if (typeof localStorage === 'undefined') {   // Node: a minimal in-memory localStorage
    var mem = {};
    globalThis.localStorage = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; },
      key: function (i) { return Object.keys(mem)[i] || null; },
      get length() { return Object.keys(mem).length; }
    };
  }
  var T = CFE_TEST, assert = T.assert, A = CFE.views.about;
  var KEY = 'continuum.finance.exportAttribution';

  function keepPref(fn) {
    var saved = localStorage.getItem(KEY);
    try { fn(); } finally { if (saved === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, saved); }
  }

  T.suite('CFE.views.about', function () {
    T.test('export attribution defaults to on and round-trips', function () {
      keepPref(function () {
        localStorage.removeItem(KEY);
        assert.equal(A.exportAttribution(), true, 'default');
        assert.deepEqual(A.setExportAttribution(false), { ok: true });
        assert.equal(localStorage.getItem(KEY), 'false');
        assert.equal(A.exportAttribution(), false);
        A.setExportAttribution(true);
        assert.equal(A.exportAttribution(), true);
      });
    });
  });

  if (typeof document !== 'undefined') {
    T.suite('CFE.views.about render (browser)', function () {
      T.test('shows version, credit, GitHub link, licence and libraries; the toggle saves', function () {
        keepPref(function () {
          localStorage.removeItem(KEY);
          var doc = document.implementation.createHTMLDocument('t');
          doc.body.innerHTML = '<main id="main"></main>';
          A.render(doc);
          var main = doc.getElementById('main'), text = main.textContent;
          ['Continuum Finance Engine', '4.0.0-alpha.1', 'Crafted by Vamsi Yedlapalli', 'MIT License. Copyright (c) 2026 Vamsi Yedlapalli'].forEach(function (s) {
            assert.ok(text.indexOf(s) >= 0, s);
          });
          var a = main.querySelector('a[href="https://github.com/LoneWolfDen"]');
          assert.equal(a.getAttribute('target'), '_blank');
          assert.equal(a.getAttribute('rel'), 'noopener noreferrer');
          assert.equal(main.querySelectorAll('tbody tr').length, 6);
          var box = main.querySelector('[data-action="toggle-export-attribution"]');
          assert.equal(box.checked, true);
          box.checked = false;
          box.dispatchEvent(new Event('change'));
          assert.equal(A.exportAttribution(), false);
          assert.ok(/will not show/.test(main.querySelector('.pref-result').textContent));
          A.render(doc);
          assert.equal(main.querySelector('[data-action="toggle-export-attribution"]').checked, false, 'remembered');
        });
      });
    });
  }

  if (typeof CFE_NODE === 'undefined') return;

  T.suite('Licence and web addresses (Node)', function () {
    T.test('LICENSE at the repository root is the MIT text with the owner as copyright holder', function () {
      var text = CFE_NODE.readFile('../LICENSE');
      var lines = text.split('\n');
      assert.equal(lines[0], 'MIT License');
      assert.equal(lines[2], 'Copyright (c) 2026 Vamsi Yedlapalli');
      assert.ok(text.indexOf('Permission is hereby granted, free of charge, to any person obtaining a copy') >= 0);
      assert.ok(text.indexOf('THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND') >= 0);
    });

    T.test('the third-party list matches vendor/VENDOR.md', function () {
      var md = CFE_NODE.readFile('vendor/VENDOR.md');
      var table = md.split('## Library files')[1].split('##')[0];
      var rows = table.split('\n').filter(function (l) { return /^\| [^-L]/.test(l); }).map(function (l) {
        var c = l.split('|').map(function (x) { return x.trim(); });
        return [c[1], c[2], c[3]];
      });
      assert.deepEqual(A.thirdParty, rows);
    });

    T.test('web addresses in index.html and app/** appear only where tests/security/allowlist.json allows', function () {
      var allow = JSON.parse(CFE_NODE.readFile('tests/security/allowlist.json')).entries;
      var files = ['index.html'].concat(CFE_NODE.support('files.js').list('app', /\.(js|css|html)$/));
      var found = [];
      files.forEach(function (f) {
        (CFE_NODE.readFile(f).match(/https?:\/\/[^\s'"`<>)]+/g) || []).forEach(function (url) {
          var ok = allow.some(function (e) { return e.url === url && e.files.indexOf(f) >= 0; });
          if (!ok) found.push(f + ': ' + url);
        });
      });
      assert.deepEqual(found, []);
      assert.ok(CFE_NODE.readFile('app/views/about.js').indexOf('https://github.com/LoneWolfDen') >= 0, 'the allowed link is used');
    });
  });
})();
