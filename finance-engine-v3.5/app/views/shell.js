// The new app's page frame (SHL-001): navigation in #nav and a placeholder per route in #main.
// Registers CFE.views.shell; needs app/cfe.js and Continuum.html. Real views replace the
// placeholders from UI-001 on; #dialogs is left empty here.
//
//   CFE.views.shell.mount(document, navigate)  // draws #nav once; navigate(hash) is called on clicks
//   CFE.views.shell.render(route, document)    // fills #main for a route from CFE.app.parse
//   CFE.views.shell.renderBanner(status, document, {offerFiles})  // fills #banner from Continuum.status.compute
//     (SHL-002); offerFiles adds "Open dataset.json…" (a file input; app.js listens for its change, STO-004)
(function (CFE) {
  'use strict';

  var NAV = [
    { route: 'portfolio', label: 'Portfolio' },
    { route: 'publish', label: 'Publish' },
    { route: 'diagnostics', label: 'Diagnostics' },
    { route: 'about', label: 'About' }
  ];

  // Icon plus words, never colour alone (TARGET_ARCHITECTURE §3.4). The icon is decoration only.
  var LEVELS = {
    'ready': { icon: '\u2714', label: 'Ready' },
    'attention': { icon: '\u26A0', label: 'Needs attention' },
    'not-ready': { icon: '\u2716', label: 'Not ready' }
  };

  // Routes drawn by their own view file instead of a placeholder.
  var OWN_VIEWS = {
    diagnostics: { module: 'views.diagnostics', title: 'Diagnostics' },   // SHL-003
    about: { module: 'views.about', title: 'About' }                      // REL-001
  };

  function H() { return Continuum.html; }

  function mount(doc, navigate) {
    var t = H().t;
    var nav = doc.getElementById('nav');
    H().setHtml(nav, t`<ul class="nav-list">${H().raw(NAV.map(function (n) {
      return String(t`<li><a href="#/${n.route}" data-action="navigate" data-route="${n.route}">${n.label}</a></li>`);
    }).join(''))}</ul>`);
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('[data-action="navigate"]');
      if (!a) return;
      e.preventDefault();
      navigate('#/' + a.dataset.route);
    });
  }

  function content(route, doc) {
    var t = H().t;
    switch (route.name) {
      case 'ref':
        if (!route.ref) return { title: 'Project not found', html: t`<h1>Project reference not recognised</h1><p>${route.error}</p><p><a href="#/portfolio" data-action="navigate" data-route="portfolio">Back to the portfolio</a></p>` };
        return { title: route.ref, html: t`<h1>Project ${route.ref}</h1><p>${refLine(route.ref)}</p>` };
      case 'publish':
        return { title: 'Publish', html: t`<h1>Publish</h1><p>Importing and publishing data will appear here (IMP-004).</p>` };
      default:
        return { title: 'Portfolio', html: t`<h1>Portfolio</h1><p>Views arrive in UI-001.</p>${H().raw(countsLine() ? String(t`<p class="counts">${countsLine()}</p>`) : '')}<p>The current app is still available: <a href="legacy/index.html">open the Finance Engine (current app)</a>.</p>` };
    }
  }

  function render(route, doc) {
    var own = OWN_VIEWS[route.name];
    if (own) {   // routes with their own view file
      CFE.require(own.module).render(doc);
      doc.title = own.title + ' – Finance Engine';
    } else {
      var c = content(route, doc);
      H().setHtml(doc.getElementById('main'), c.html);
      doc.title = c.title + ' – Finance Engine';
    }
    var current = route.name === 'ref' ? null : route.name;
    Array.prototype.forEach.call(doc.querySelectorAll('#nav [data-route]'), function (a) {
      if (a.dataset.route === current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  // #banner is a polite live region (role="status" in index.html), so screen readers announce changes.
  function renderBanner(status, doc, options) {
    var t = H().t, lv = LEVELS[status.level] || LEVELS['not-ready'];
    var el = doc.getElementById('banner');
    el.className = 'banner banner-' + (LEVELS[status.level] ? status.level : 'not-ready');
    var files = options && options.offerFiles
      ? t` <label class="btn btn-small">Open dataset.json…<input type="file" accept=".json" multiple class="visually-hidden" data-action="open-dataset-files" aria-label="Open dataset.json and manifest.json"></label>`
      : '';
    H().setHtml(el, t`<span class="banner-icon" aria-hidden="true">${lv.icon}</span> <strong>${lv.label}:</strong> ${status.title} <a href="#/diagnostics">Details</a>${files}`);
  }

  // "Loaded: 2 references, 4 purchase orders, …" for the placeholders (views arrive in UI-001).
  function countsLine() {
    var p = CFE.state && CFE.state.published;
    if (!p) return '';
    var d = p.dataset;
    return 'Loaded: ' + [[d.references, 'reference', 'references'], [d.purchase_orders, 'purchase order', 'purchase orders'],
      [d.resource_rules, 'resource rule', 'resource rules'], [d.people, 'person', 'people'], [d.actuals, 'actuals month', 'actuals months'],
      [d.invoices, 'invoice', 'invoices'], [d.expenses, 'expense', 'expenses']].map(function (c) {
      return c[0].length + ' ' + (c[0].length === 1 ? c[1] : c[2]);
    }).join(', ') + '.';
  }

  function refLine(ref) {
    var p = CFE.state && CFE.state.published;
    if (!p) return 'Project pages arrive in UI-001.';
    var r = Continuum.ref.resolve(ref, p.dataset.references);
    if (r.status === 'not-found') return 'This project is not in the published data.';
    if (r.status === 'conflict') return 'This reference matches more than one project.';
    return (r.record.name || r.record.ref) + (r.status === 'superseded' ? ' (now ' + r.record.ref + ')' : '') + '. Project pages arrive in UI-001.';
  }

  CFE.views.shell = { mount: mount, render: render, renderBanner: renderBanner, levels: Object.keys(LEVELS), nav: NAV.map(function (n) { return n.route; }) };
})(CFE);
