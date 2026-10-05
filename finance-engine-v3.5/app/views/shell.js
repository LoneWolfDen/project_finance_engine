// The new app's page frame (SHL-001): navigation in #nav and a placeholder per route in #main.
// Registers CFE.views.shell; needs app/cfe.js and Continuum.html. Real views replace the
// placeholders from UI-001 on; #dialogs is left empty here.
//
//   CFE.views.shell.mount(document, navigate)  // draws #nav once; navigate(hash) is called on clicks
//   CFE.views.shell.render(route, document)    // fills #main for a route from CFE.app.parse
//   CFE.views.shell.renderBanner(status, document)  // fills #banner from Continuum.status.compute (SHL-002)
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

  function H() { return Continuum.html; }

  function mount(doc, navigate) {
    var t = H().t;
    var nav = doc.getElementById('nav');
    nav.innerHTML = String(t`<ul class="nav-list">${H().raw(NAV.map(function (n) {
      return String(t`<li><a href="#/${n.route}" data-action="navigate" data-route="${n.route}">${n.label}</a></li>`);
    }).join(''))}</ul>`);
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('[data-action="navigate"]');
      if (!a) return;
      e.preventDefault();
      navigate('#/' + a.dataset.route);
    });
  }

  function rows(list) {
    var t = H().t;
    return H().raw(list.map(function (r) { return String(t`<dt>${r[0]}</dt><dd>${r[1]}</dd>`); }).join(''));
  }

  function content(route, doc) {
    var t = H().t, v = CFE.version || {}, loc = doc.defaultView && doc.defaultView.location;
    switch (route.name) {
      case 'ref':
        if (!route.ref) return { title: 'Project not found', html: t`<h1>Project reference not recognised</h1><p>${route.error}</p><p><a href="#/portfolio" data-action="navigate" data-route="portfolio">Back to the portfolio</a></p>` };
        return { title: route.ref, html: t`<h1>Project ${route.ref}</h1><p>Project pages arrive in UI-001.</p>` };
      case 'publish':
        return { title: 'Publish', html: t`<h1>Publish</h1><p>Importing and publishing data will appear here (IMP-004).</p>` };
      case 'diagnostics':
        return { title: 'Diagnostics', html: t`<h1>Diagnostics</h1><dl class="facts">${rows([
          ['App version', v.app],
          ['Release date', CFE.calc.dates ? CFE.calc.dates.toDisplayDate(v.date) : v.date],
          ['Dataset schema versions supported', v.supportsSchema ? v.supportsSchema.join(' to ') : ''],
          ['Continuum core version', Continuum.coreVersion],
          ['Opened from', loc ? (loc.protocol === 'file:' ? 'a file on this computer' : loc.origin) : ''],
          ['Storage key', CFE.config && CFE.config.appKey]
        ])}</dl>` };
      case 'about':
        return { title: 'About', html: t`<h1>About</h1><p>Continuum Finance Engine ${v.app}.</p><p>Built by Vamsi Yedlapalli.</p>` };
      default:
        return { title: 'Portfolio', html: t`<h1>Portfolio</h1><p>Views arrive in UI-001.</p><p>The current app is still available: <a href="legacy/index.html">open the Finance Engine (current app)</a>.</p>` };
    }
  }

  function render(route, doc) {
    var c = content(route, doc);
    doc.getElementById('main').innerHTML = String(c.html);
    doc.title = c.title + ' – Finance Engine';
    var current = route.name === 'ref' ? null : route.name;
    Array.prototype.forEach.call(doc.querySelectorAll('#nav [data-route]'), function (a) {
      if (a.dataset.route === current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  // #banner is a polite live region (role="status" in index.html), so screen readers announce changes.
  function renderBanner(status, doc) {
    var t = H().t, lv = LEVELS[status.level] || LEVELS['not-ready'];
    var el = doc.getElementById('banner');
    el.className = 'banner banner-' + (LEVELS[status.level] ? status.level : 'not-ready');
    el.innerHTML = String(t`<span class="banner-icon" aria-hidden="true">${lv.icon}</span> <strong>${lv.label}:</strong> ${status.title} <a href="#/diagnostics">Details</a>`);
  }

  CFE.views.shell = { mount: mount, render: render, renderBanner: renderBanner, levels: Object.keys(LEVELS), nav: NAV.map(function (n) { return n.route; }) };
})(CFE);
