// Hash router of the new Finance Engine app (SHL-001). Loaded last; registers CFE.app.
//
//   CFE.app.parse('#/ref/o-5030460')  // → {name:'ref', ref:'O-5030460', hash:'#/ref/O-5030460'}
//   CFE.app.parse('#/nowhere')        // → {name:'portfolio', hash:'#/portfolio'}  (unknown → portfolio)
//   CFE.app.route                     // the route currently shown (after start)
//
// Routes: #/portfolio (default), #/ref/<ref>, #/publish (views/publish.js), #/diagnostics (views/diagnostics.js),
// #/about (views/about.js).
// A reference is normalised by Continuum.ref; an invalid one gives {name:'ref', ref:null, error}.
// parse is pure, so it also runs in Node. start() wires the page and runs only when #main exists.
// Boot (STO-004): draw the page, load published/ (CFE.store.loadPublished), store the result with
// CFE.actions.setPublished, show the readiness banner, redraw the route. CFE.app.ready is that promise.
// If loading fails, the banner offers "Open dataset.json…", which runs the same checks on chosen files.
(function (CFE) {
  'use strict';

  var ROUTES = ['portfolio', 'ref', 'publish', 'diagnostics', 'about'];
  var DEFAULT = 'portfolio';

  function parse(hash) {
    var path = String(hash == null ? '' : hash).replace(/^#/, '').replace(/^\//, '');
    var slash = path.indexOf('/');
    var name = slash < 0 ? path : path.slice(0, slash);
    var rest = slash < 0 ? '' : path.slice(slash + 1);
    if (name === 'ref') {
      var text;
      try { text = decodeURIComponent(rest); } catch (e) { text = rest; }
      var R = typeof Continuum !== 'undefined' && Continuum.ref;
      if (!R) throw new Error('Continuum.ref not loaded – check script order in index.html');
      var n = R.normalise(text);
      if (!n.ok) return { name: 'ref', ref: null, error: n.error.message, hash: '#/ref/' + rest };
      return { name: 'ref', ref: n.ref, hash: '#/ref/' + encodeURIComponent(n.ref) };
    }
    if (ROUTES.indexOf(name) < 0 || rest) name = DEFAULT;
    return { name: name, hash: '#/' + name };
  }

  function show(win, doc) {
    var route = parse(win.location.hash);
    CFE.app.route = route;
    CFE.actions.setRoute(route);
    Continuum.log.info('app', 'Route shown', { route: route.name });
    CFE.require('views.shell').render(route, doc);
    return route;
  }

  // Unexpected errors: logged (error type, file and line only; never the message, which may hold
  // data) and shown in the banner as not ready (SHL-003).
  function onUnexpected(doc, meta) {
    Continuum.log.error('app', 'Unexpected error', meta);
    CFE.app.status = { level: 'not-ready', title: 'Unexpected error – see Diagnostics', details: ['Unexpected error – see Diagnostics'] };
    try { CFE.require('views.shell').renderBanner(CFE.app.status, doc); } catch (e) { /* the banner itself failed; the log has it */ }
  }

  function fileName(path) { return String(path || '').split(/[\\/]/).pop().slice(0, 80); }

  function start(win, doc) {
    win = win || window; doc = doc || document;
    CFE.require('views.shell').mount(doc, function navigate(hash) {
      if (win.location.hash === hash) show(win, doc); else win.location.hash = hash;
    });
    win.addEventListener('hashchange', function () { show(win, doc); });
    win.addEventListener('error', function (e) {
      onUnexpected(doc, { type: (e.error && e.error.name) || 'Error', file: fileName(e.filename), line: e.lineno || 0 });
    });
    win.addEventListener('unhandledrejection', function (e) {
      onUnexpected(doc, { type: (e.reason && e.reason.name) || typeof e.reason, kind: 'unhandled promise' });
    });
    Continuum.log.info('app', 'Started', { version: CFE.version.app, protocol: String(win.location.protocol || '') });
    doc.getElementById('banner').addEventListener('change', function (e) {
      if (!e.target.matches('[data-action="open-dataset-files"]')) return;
      CFE.require('store.loader').fromFiles(e.target.files).then(function (r) { apply(r, win, doc, 'files'); });
    });
    var route = show(win, doc);
    CFE.app.ready = CFE.require('store.loadPublished')(win, doc).then(function (r) { return apply(r, win, doc, 'published folder'); });
    return route;
  }

  // Stores a loader result, updates the banner and redraws the current route.
  function apply(result, win, doc, from) {
    CFE.actions.setPublished(result.ok ? { manifest: result.manifest, dataset: result.dataset, from: from } : null);
    var input = Object.assign({}, result.statusInput, { manifest: result.manifest || {}, nowUtc: new Date(), staleAfterDays: CFE.config.staleAfterDays });
    CFE.app.status = Continuum.status.compute(input);
    if (!result.ok && result.problems && result.problems.length) {
      CFE.app.status.details = CFE.app.status.details.concat(result.problems.slice(0, 20));
    }
    Continuum.log[result.ok ? 'info' : 'warn']('loader', result.ok ? 'Published data loaded' : 'Published data not loaded',
      { from: from, level: CFE.app.status.level, problems: (result.problems || []).length });
    CFE.require('views.shell').renderBanner(CFE.app.status, doc, { offerFiles: !result.ok });
    show(win, doc);
    return result;
  }

  CFE.app = { routes: ROUTES.slice(), parse: parse, start: start, apply: apply, route: null, status: null, ready: null };

  if (typeof document !== 'undefined' && document.getElementById('main')) start();
})(CFE);
