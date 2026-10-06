// Filter bar for the portfolio and project pages (UI-001): Year, PO team, Project. Registers
// CFE.views.filters; needs app/cfe.js, Continuum.html and Continuum.storage.
//
//   var f = CFE.views.filters.load()            // {year:'2025'|'', poTeams:[…]} remembered in prefs
//   CFE.views.filters.save(f)
//   CFE.views.filters.html(dataset, f, ref)     // → SafeHtml (controls use data-action, handled by views/portfolio.js)
// The project filter is the page itself: choosing a project opens #/ref/<ref>, "All projects" opens #/portfolio.
(function (CFE) {
  'use strict';

  var KEY = 'filters';
  function H() { return Continuum.html; }
  function prefs() { return Continuum.storage.prefs((CFE.config && CFE.config.appKey) || 'finance'); }

  function load() {
    var v = prefs().get(KEY, null);
    return { year: v && v.year ? String(v.year) : '', poTeams: v && Array.isArray(v.poTeams) ? v.poTeams.map(String) : [] };
  }

  function save(f) { return prefs().set(KEY, { year: f.year || '', poTeams: f.poTeams || [] }); }

  function html(dataset, f, ref) {
    var t = H().t, raw = H().raw;
    var pos = (dataset.purchase_orders || []).filter(function (p) { return !ref || p.ref === ref; });
    var years = pos.map(function (p) { return p.validity_end.slice(0, 4); }).filter(function (y, i, a) { return a.indexOf(y) === i; }).sort();
    var teams = pos.map(function (p) { return p.po_team_identifier; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).sort();
    var refs = (dataset.references || []).slice().sort(function (a, b) { return a.ref < b.ref ? -1 : 1; });
    return t`<form class="filters" aria-label="Filters" data-action="filters">
<label>Project <select data-action="filter-ref"><option value="">All projects</option>${raw(refs.map(function (r) {
      return String(t`<option value="${r.ref}"${raw(r.ref === ref ? ' selected' : '')}>${r.ref} · ${r.name}</option>`);
    }).join(''))}</select></label>
<label>Year <select data-action="filter-year"><option value="">All years</option>${raw(years.map(function (y) {
      return String(t`<option${raw(y === f.year ? ' selected' : '')}>${y}</option>`);
    }).join(''))}</select></label>
<fieldset class="team-filter"><legend>PO teams</legend>${raw(teams.map(function (tm) {
      return String(t`<label><input type="checkbox" data-action="filter-team" value="${tm}"${raw(f.poTeams.indexOf(tm) >= 0 ? ' checked' : '')}> ${tm}</label>`);
    }).join(''))}${raw(f.year || f.poTeams.length ? '<button type="button" class="btn btn-small" data-action="clear-filters">Clear filters</button>' : '')}</fieldset>
</form>`;
  }

  CFE.views.filters = { load: load, save: save, html: html };
})(CFE);
