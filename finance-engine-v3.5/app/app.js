// Hash router of the new Finance Engine app (SHL-001). Loaded last; registers CFE.app.
//
//   CFE.app.parse('#/ref/o-5030460')  // → {name:'ref', ref:'O-5030460', hash:'#/ref/O-5030460'}
//   CFE.app.parse('#/nowhere')        // → {name:'portfolio', hash:'#/portfolio'}  (unknown → portfolio)
//   CFE.app.route                     // the route currently shown (after start)
//
// Routes: #/portfolio (default), #/ref/<ref>, #/publish, #/diagnostics, #/about.
// A reference is normalised by Continuum.ref; an invalid one gives {name:'ref', ref:null, error}.
// parse is pure, so it also runs in Node. start() wires the page and runs only when #main exists.
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
    // Nothing loads published data yet (STO-004), so the banner reports that no data was found.
    CFE.app.status = Continuum.status.compute({ datasetLoaded: false, nowUtc: new Date(), staleAfterDays: CFE.config.staleAfterDays });
    CFE.require('views.shell').renderBanner(CFE.app.status, doc);
    return show(win, doc);
  }

  CFE.app = { routes: ROUTES.slice(), parse: parse, start: start, route: null, status: null };

  if (typeof document !== 'undefined' && document.getElementById('main')) start();
})(CFE);
