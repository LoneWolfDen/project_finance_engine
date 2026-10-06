// The portfolio page (#/portfolio) and a project page (#/ref/<ref>) (UI-001). Registers
// CFE.views.portfolio; needs CFE.state, CFE.views.model/filters/overview/burndown/variance/chartBlock.
//
//   CFE.views.portfolio.render(document, route, {asOf})
// Shows the filter bar, the view switch (Overview, Burndown, Variance; remembered in prefs) and the
// chosen view for the published data, filtered by project (route), year and PO teams.
(function (CFE) {
  'use strict';

  var VIEWS = [['overview', 'Overview'], ['burndown', 'Burndown'], ['variance', 'Variance']];
  var detach = null, destroyCharts = null;

  function H() { return Continuum.html; }
  function prefs() { return Continuum.storage.prefs((CFE.config && CFE.config.appKey) || 'finance'); }

  function cleanup() {
    if (destroyCharts) { destroyCharts(); destroyCharts = null; }
    if (detach) { detach(); detach = null; }
  }

  function render(doc, route, opts) {
    cleanup();
    var main = doc.getElementById('main'), t = H().t, raw = H().raw;
    var published = CFE.state && CFE.state.published;
    var ref = route && route.name === 'ref' ? route.ref : null;
    if (!published) {
      H().setHtml(main, t`<h1>${ref ? 'Project ' + ref : 'Portfolio'}</h1><p>No published data is loaded, so there are no figures to show. The banner above says why.</p><p>The current app is still available: <a href="legacy/index.html">open the Finance Engine (current app)</a>.</p>`);
      return null;
    }
    var ds = published.dataset;
    var record = null;
    if (ref) {
      var r = Continuum.ref.resolve(ref, ds.references);
      if (r.status === 'not-found' || r.status === 'conflict') {
        H().setHtml(main, t`<h1>Project ${ref}</h1><p>${r.status === 'conflict' ? 'This reference matches more than one project.' : 'This project is not in the published data.'}</p><p><a href="#/portfolio">Back to the portfolio</a></p>`);
        return null;
      }
      record = r.record; ref = r.record.ref;
    }
    var filters = CFE.require('views.filters').load();
    var view = prefs().get('view', 'overview');
    if (!VIEWS.some(function (v) { return v[0] === view; })) view = 'overview';

    function draw() {
      if (destroyCharts) { destroyCharts(); destroyCharts = null; }
      var D = CFE.require('views.model').build(ds, { ref: ref, year: filters.year, poTeams: filters.poTeams }, opts && opts.asOf);
      var V = CFE.require('views.' + view);
      var title = record ? 'Project ' + record.ref + ' · ' + record.name : 'Portfolio';
      H().setHtml(main, t`<h1>${title}</h1>
${CFE.require('views.filters').html(ds, filters, ref)}
<div class="view-switch" role="group" aria-label="View">${raw(VIEWS.map(function (v) {
        return String(t`<button type="button" class="btn${raw(v[0] === view ? ' active' : '')}" data-action="switch-view" data-view="${v[0]}" aria-pressed="${v[0] === view ? 'true' : 'false'}">${v[1]}</button>`);
      }).join(''))}</div>
${raw(D.hasActuals ? '' : String(t`<p class="note">No actuals in the published data for this selection.</p>`))}
${V.html(D)}`);
      doc.title = (record ? record.ref : 'Portfolio') + ' – Finance Engine';
      destroyCharts = CFE.require('views.chartBlock').draw(main, V.charts(D));
      return D;
    }

    function onChange(e) {
      var a = e.target.getAttribute('data-action');
      if (a === 'filter-year') filters.year = e.target.value;
      else if (a === 'filter-team') {
        var v = e.target.value, i = filters.poTeams.indexOf(v);
        if (e.target.checked && i < 0) filters.poTeams.push(v);
        if (!e.target.checked && i >= 0) filters.poTeams.splice(i, 1);
      } else if (a === 'filter-ref') {
        var win = doc.defaultView || window;
        win.location.hash = e.target.value ? '#/ref/' + encodeURIComponent(e.target.value) : '#/portfolio';
        return;
      } else return;
      CFE.require('views.filters').save(filters);
      state.D = draw();
    }
    function onClick(e) {
      var el = e.target.closest('[data-action]');
      if (!el) return;
      var a = el.getAttribute('data-action');
      if (a === 'switch-view') { view = el.getAttribute('data-view'); prefs().set('view', view); state.D = draw(); }
      else if (a === 'clear-filters') { filters = { year: '', poTeams: [] }; CFE.require('views.filters').save(filters); state.D = draw(); }
      else if (a === 'toggle-chart-table') CFE.require('views.chartBlock').toggle(main, el.getAttribute('data-chart'));
    }
    main.addEventListener('change', onChange);
    main.addEventListener('click', onClick);
    detach = function () { main.removeEventListener('change', onChange); main.removeEventListener('click', onClick); };
    var state = { D: draw() };
    return state;
  }

  CFE.views.portfolio = { render: render, cleanup: cleanup, views: VIEWS.map(function (v) { return v[0]; }) };
})(CFE);
