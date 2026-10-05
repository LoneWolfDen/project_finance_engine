// About page, #/about (REL-001): app name and version, the author's credit and GitHub link, the
// licence and the third-party libraries. Registers CFE.views.about; needs app/cfe.js, Continuum.html
// and Continuum.storage.
//
//   CFE.views.about.render(document)
//   CFE.views.about.exportAttribution()        // → true (default) or false: whether exports carry the credit
//   CFE.views.about.setExportAttribution(bool) // → {ok} or {ok:false, error}; read by ODO-001
//
// The preference is stored as localStorage "continuum.finance.exportAttribution" (Continuum.storage.prefs).
// The GitHub link opens only when clicked (tests/security/allowlist.json).
(function (CFE) {
  'use strict';

  var PREF = 'exportAttribution';
  var GITHUB = 'https://github.com/LoneWolfDen';

  // Must match vendor/VENDOR.md (library, version, licence); a test compares them.
  var THIRD_PARTY = [
    ['Chart.js', '4.4.0', 'MIT'],
    ['chartjs-plugin-datalabels', '2.2.0', 'MIT'],
    ['SheetJS (xlsx)', '0.20.3', 'Apache-2.0'],
    ['jsPDF', '4.2.1', 'MIT'],
    ['jsPDF-AutoTable', '5.0.8', 'MIT'],
    ['PptxGenJS', '3.12.0', 'MIT']
  ];

  function prefs() { return Continuum.storage.prefs((CFE.config && CFE.config.appKey) || 'finance'); }

  function exportAttribution() { return prefs().get(PREF, true) !== false; }

  function setExportAttribution(on) { return prefs().set(PREF, !!on); }

  function render(doc) {
    var H = Continuum.html, t = H.t, v = CFE.version || {};
    var main = doc.getElementById('main');
    var rows = H.raw(THIRD_PARTY.map(function (r) { return String(t`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`); }).join(''));
    H.setHtml(main, t`<h1>About</h1>
<p><strong>Continuum Finance Engine</strong> ${v.app}</p>
<p>Crafted by Vamsi Yedlapalli · <a href="${GITHUB}" target="_blank" rel="noopener noreferrer">github.com/LoneWolfDen</a></p>
<h2>Licence</h2>
<p>MIT License. Copyright (c) 2026 Vamsi Yedlapalli. The full text is in the LICENSE file that comes with the app.</p>
<h2>Exports</h2>
<p><label><input type="checkbox" data-action="toggle-export-attribution"${H.raw(exportAttribution() ? ' checked' : '')}> Show “Crafted by Vamsi Yedlapalli” in exported reports</label> <span class="pref-result" role="status"></span></p>
<h2>Third-party libraries</h2>
<table class="simple"><thead><tr><th>Library</th><th>Version</th><th>Licence</th></tr></thead><tbody>${rows}</tbody></table>
<p>Their licence files are in the vendor folder.</p>`);
    var box = main.querySelector('[data-action="toggle-export-attribution"]');
    box.addEventListener('change', function () {
      var r = setExportAttribution(box.checked);
      var out = main.querySelector('.pref-result');
      if (r.ok) out.textContent = box.checked ? 'Saved: exports will show the credit.' : 'Saved: exports will not show the credit.';
      else { out.textContent = 'Could not save this setting: ' + r.error.message; box.checked = !box.checked; }
    });
  }

  CFE.views.about = { render: render, exportAttribution: exportAttribution, setExportAttribution: setExportAttribution, thirdParty: THIRD_PARTY.map(function (r) { return r.slice(); }) };
})(CFE);
