// SHL-001: the new app's hash router (CFE.app), page frame (CFE.views.shell) and root index.html.
// The router runs in Node and in the browser; the shell needs a DOM (browser only); the index.html
// checks read files from disk (Node only).
(function () {
  // In Node the app scripts are not preloaded: evaluate the modules in this context.
  if (typeof Continuum === 'undefined' || !Continuum.ref) {
    (0, eval)(CFE_NODE.readFile('app/continuum-core/CORE_VERSION.js'));
    (0, eval)(CFE_NODE.readFile('app/continuum-core/html.js'));
    (0, eval)(CFE_NODE.readFile('app/continuum-core/ref.js'));
    (0, eval)(CFE_NODE.readFile('app/continuum-core/status.js'));
    (0, eval)(CFE_NODE.readFile('app/continuum-core/log.js'));
  }
  if (typeof CFE === 'undefined' || !CFE.version) {
    (0, eval)(CFE_NODE.readFile('app/VERSION.js'));
    (0, eval)(CFE_NODE.readFile('app/config.js'));
  }
  if (!CFE.require) (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  if (!CFE.actions) (0, eval)(CFE_NODE.readFile('app/store/state.js'));
  if (!CFE.app) (0, eval)(CFE_NODE.readFile('app/app.js'));
  var T = CFE_TEST, assert = T.assert, A = CFE.app;

  T.suite('CFE.app router', function () {
    T.test('version and config', function () {
      assert.deepEqual(CFE.version, { app: '4.0.0-alpha.1', supportsSchema: [1, 1], date: '2026-10-05' });
      assert.deepEqual(CFE.config, { staleAfterDays: 7, enabledProviders: ['none'], appKey: 'finance', historyKeep: 60 });
    });

    T.test('known routes', function () {
      ['portfolio', 'publish', 'diagnostics', 'about'].forEach(function (n) {
        assert.deepEqual(A.parse('#/' + n), { name: n, hash: '#/' + n });
      });
      assert.deepEqual(A.routes, ['portfolio', 'ref', 'publish', 'diagnostics', 'about']);
    });

    T.test('empty and unknown hashes go to the portfolio', function () {
      ['', '#', '#/', null, undefined, '#/nowhere', '#/publish/extra', '#/PUBLISH', 'publish?x'].forEach(function (h) {
        assert.equal(A.parse(h).name, h === 'publish' ? 'publish' : 'portfolio', String(h));
      });
      assert.equal(A.parse('publish').name, 'publish', 'a hash without # or / is read too');
    });

    T.test('#/ref/<ref> normalises the reference like Continuum.ref', function () {
      assert.deepEqual(A.parse('#/ref/o-5030460'), { name: 'ref', ref: 'O-5030460', hash: '#/ref/O-5030460' });
      assert.deepEqual(A.parse('#/ref/%20o%20008891%20'), { name: 'ref', ref: 'O008891', hash: '#/ref/O008891' });
      assert.deepEqual(A.parse('#/ref/A%2FB'), { name: 'ref', ref: 'A/B', hash: '#/ref/A%2FB' });
      assert.equal(A.parse('#/ref/a/b').ref, 'A/B', 'an unencoded slash stays part of the reference');
      assert.equal(A.parse(Continuum.ref.toLink('index.html', 'O-1').replace('index.html', '')).ref, 'O-1', 'toLink and parse agree');
    });

    T.test('an invalid reference gives an error message, not a crash', function () {
      var r = A.parse('#/ref/');
      assert.equal(r.name, 'ref');
      assert.equal(r.ref, null);
      assert.ok(r.error && r.error.length > 5, r.error);
      assert.equal(A.parse('#/ref/' + new Array(66).join('X')).ref, null, 'too long');
      assert.equal(A.parse('#/ref/%E0%A4%A').name, 'ref', 'broken % encoding is read as text');
    });

    T.test('start() renders the route, loads published data, shows the banner, follows hash changes', function () {
      var shown = [], navigate = null, listeners = {}, banner = null, bannerOptions = null;
      var savedShell = CFE.views.shell, savedLoad = CFE.store.loadPublished;
      CFE.views.shell = { mount: function (doc, nav) { navigate = nav; }, render: function (route) { shown.push(route.name); },
        renderBanner: function (status, doc, options) { banner = status; bannerOptions = options; } };
      CFE.store.loadPublished = function () { return Promise.resolve({ ok: false, manifest: null, dataset: null, statusInput: { datasetLoaded: false, errors: [] }, problems: [] }); };
      var win = { location: { hash: '#/about' }, addEventListener: function (type, fn) { listeners[type] = fn; } };
      var doc = { getElementById: function () { return { addEventListener: function () {} }; } };
      function restore() { CFE.views.shell = savedShell; CFE.store.loadPublished = savedLoad; }
      try {
        assert.equal(A.start(win, doc).name, 'about');
        assert.equal(CFE.state.session.route.name, 'about', 'the route is in CFE.state');
      } catch (e) { restore(); throw e; }
      return A.ready.then(function () {
        assert.deepEqual(shown, ['about', 'about'], 'drawn, then redrawn after loading');
        win.location.hash = '#/publish'; listeners.hashchange();
        navigate('#/diagnostics');
        assert.equal(win.location.hash, '#/diagnostics', 'navigate sets the hash');
        navigate('#/diagnostics');
        assert.deepEqual(shown, ['about', 'about', 'publish', 'diagnostics'], 'the same hash re-renders directly');
        assert.equal(A.route.name, 'diagnostics');
        assert.equal(banner.level, 'not-ready', 'no published data');
        assert.ok(/^No published data found/.test(banner.title));
        assert.deepEqual(bannerOptions, { offerFiles: true }, 'offers Open dataset.json…');
        assert.equal(A.status, banner);
        assert.equal(CFE.state.published, null);
        listeners.error({ error: new TypeError('secret value Alice 180'), filename: 'file:///x/app/views/shell.js', lineno: 12 });
        assert.equal(banner.level, 'not-ready');
        assert.equal(banner.title, 'Unexpected error – see Diagnostics');
        var last = Continuum.log.entries().pop();
        assert.deepEqual([last.level, last.message, last.meta], ['error', 'Unexpected error', { type: 'TypeError', file: 'shell.js', line: 12 }]);
        assert.ok(JSON.stringify(Continuum.log.entries()).indexOf('Alice') < 0, 'the error message (may hold data) is not logged');
        listeners.unhandledrejection({ reason: new RangeError('x') });
        assert.deepEqual(Continuum.log.entries().pop().meta, { type: 'RangeError', kind: 'unhandled promise' });
      }).then(restore, function (e) { restore(); throw e; });
    });
  });

  if (typeof document !== 'undefined' && CFE.views.shell) {
    T.suite('CFE.views.shell (browser)', function () {
      function page() {
        var doc = document.implementation.createHTMLDocument('t');
        doc.body.innerHTML = '<div id="banner"></div><nav id="nav"></nav><main id="main"></main><div id="dialogs"></div>';
        return doc;
      }

      T.test('mount draws the navigation; clicks call navigate', function () {
        var doc = page(), went = [];
        CFE.views.shell.mount(doc, function (h) { went.push(h); });
        var links = doc.querySelectorAll('#nav a[data-action="navigate"]');
        assert.deepEqual(Array.prototype.map.call(links, function (a) { return a.textContent; }), ['Portfolio', 'Publish', 'Diagnostics', 'About']);
        links[2].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        assert.deepEqual(went, ['#/diagnostics']);
      });

      T.test('render fills #main, sets the title and marks the current link', function () {
        var doc = page();
        CFE.views.shell.mount(doc, function () {});
        CFE.views.shell.render(CFE.app.parse('#/portfolio'), doc);
        assert.ok(/Views arrive in UI-001/.test(doc.getElementById('main').textContent));
        assert.ok(doc.querySelector('#main a[href="legacy/index.html"]'), 'link to the current app');
        assert.equal(doc.title, 'Portfolio – Finance Engine');
        assert.equal(doc.querySelector('#nav [aria-current="page"]').dataset.route, 'portfolio');
        CFE.views.shell.render(CFE.app.parse('#/diagnostics'), doc);
        assert.ok(doc.querySelector('#main [data-action="copy-diagnostics"]'), 'the Diagnostics view (SHL-003) is used');
        assert.ok(doc.getElementById('main').textContent.indexOf('4.0.0-alpha.1') >= 0);
        assert.ok(doc.getElementById('main').textContent.indexOf('05-10-2026') >= 0, 'release date shown DD-MM-YYYY');
        assert.equal(doc.querySelector('#nav [aria-current="page"]').dataset.route, 'diagnostics');
      });

      T.test('renderBanner: icon plus words, a Details link, escaped text, one class per level', function () {
        var doc = page();
        [['ready', 'Ready:'], ['attention', 'Needs attention:'], ['not-ready', 'Not ready:']].forEach(function (c) {
          CFE.views.shell.renderBanner({ level: c[0], title: 'Title <b>x</b>', details: [] }, doc);
          var el = doc.getElementById('banner');
          assert.equal(el.className, 'banner banner-' + c[0]);
          assert.equal(el.querySelector('strong').textContent, c[1]);
          assert.equal(el.querySelector('.banner-icon').getAttribute('aria-hidden'), 'true');
          assert.equal(el.querySelector('a').getAttribute('href'), '#/diagnostics');
          assert.equal(el.querySelector('b'), null, 'title is text');
          assert.ok(el.textContent.indexOf('Title <b>x</b>') >= 0);
        });
        CFE.views.shell.renderBanner({ level: 'weird', title: 't' }, doc);
        assert.equal(doc.getElementById('banner').className, 'banner banner-not-ready', 'unknown level shows as not ready');
      });

      T.test('a reference is shown as text, never as markup', function () {
        var doc = page();
        CFE.views.shell.mount(doc, function () {});
        CFE.views.shell.render(CFE.app.parse('#/ref/' + encodeURIComponent('<img src=x onerror=alert(1)>')), doc);
        assert.equal(doc.querySelector('#main img'), null);
        assert.ok(doc.getElementById('main').textContent.indexOf('<IMGSRC=XONERROR=ALERT(1)>') >= 0);
        assert.equal(doc.querySelector('#nav [aria-current]'), null, 'no nav item is current on a project page');
        CFE.views.shell.render(CFE.app.parse('#/ref/'), doc);
        assert.ok(/not recognised/.test(doc.getElementById('main').textContent));
      });
    });
  }

  if (typeof CFE_NODE === 'undefined') return;

  T.suite('Root index.html (Node)', function () {
    var html = CFE_NODE.readFile('index.html');
    var srcs = (html.match(/<script\b[^>]*>/g) || []).map(function (tag) { var m = /src="([^"]+)"/.exec(tag); return m ? m[1] : null; });

    T.test('static markup only: no inline script or style, no on* attributes', function () {
      assert.ok(srcs.length > 0 && srcs.every(Boolean), 'every script has src');
      assert.ok(!/<script\b[^>]*>[^<]+<\/script>/.test(html), 'no inline script body');
      assert.ok(!/<style\b/i.test(html), 'no <style>');
      assert.ok(!/\sstyle\s*=/i.test(html), 'no style attributes');
      assert.ok(!/\son[a-z]+\s*=/i.test(html), 'no on* attributes');
      assert.ok(!/https?:\/\//.test(html), 'no network addresses');
    });

    T.test('has the regions #banner, #nav, #main, #dialogs', function () {
      ['banner', 'nav', 'main', 'dialogs'].forEach(function (id) { assert.ok(html.indexOf('id="' + id + '"') >= 0, id); });
    });

    T.test('loads VERSION, config, cfe, continuum-core, data, calc, store, views (shell first), app in order; all files exist', function () {
      function group(s) {
        if (s === 'app/VERSION.js') return 0; if (s === 'app/config.js') return 1; if (s === 'app/cfe.js') return 2;
        if (/^app\/continuum-core\//.test(s)) return 3; if (/^app\/data\//.test(s)) return 4; if (/^app\/calc\//.test(s)) return 5;
        if (/^app\/store\//.test(s)) return 6; if (s === 'app/views/shell.js') return 7; if (/^app\/views\//.test(s)) return 8; if (s === 'app/app.js') return 9;
        return -1;
      }
      var groups = srcs.map(group);
      assert.ok(groups.indexOf(-1) < 0, 'unexpected script: ' + srcs[groups.indexOf(-1)]);
      assert.deepEqual(groups.slice().sort(function (a, b) { return a - b; }), groups, 'groups in order');
      srcs.forEach(function (s) { CFE_NODE.readFile(s); });
      assert.ok(srcs.indexOf('app/data/mapping.js') < srcs.indexOf('app/data/mappings/po-details-v1.js'));
      assert.ok(srcs.indexOf('app/data/calendars.js') < srcs.indexOf('app/calc/calendar.js'));
      ['app/css/tokens.css', 'app/css/app.css'].forEach(function (c) { assert.ok(html.indexOf('href="' + c + '"') >= 0, c); CFE_NODE.readFile(c); });
    });

    T.test('every script it loads is also loaded by the browser tests', function () {
      var listed = CFE_NODE.readFile('tests/browser-suites.js');
      srcs.forEach(function (s) { assert.ok(listed.indexOf("'" + s + "'") >= 0, s + ' is also in tests/browser-suites.js'); });
    });
  });
})();
