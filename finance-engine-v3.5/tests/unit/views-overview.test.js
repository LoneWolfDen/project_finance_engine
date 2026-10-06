// UI-001: view model and the Overview, Burndown and Variance views on the sample publication.
// Runs in Node (sample read from disk) and in the browser (sample loaded with <script> tags).
// The figures must equal the legacy app's for the same data (legacy goldens: builddata-basic).
(function () {
  if (typeof CFE_NODE !== 'undefined') {
    if (typeof Continuum === 'undefined' || !Continuum.html || !Continuum.ref) ['html.js', 'ref.js'].forEach(function (f) { (0, eval)(CFE_NODE.readFile('app/continuum-core/' + f)); });
    if (typeof CFE === 'undefined' || !CFE.require) (0, eval)(CFE_NODE.readFile('app/cfe.js'));
    [['calc', 'dates'], ['data', 'calendars'], ['calc', 'calendar'], ['calc', 'fx'], ['calc', 'forecast']].forEach(function (p) {
      if (!CFE[p[0]][p[1]]) (0, eval)(CFE_NODE.readFile('app/' + p[0] + '/' + p[1] + '.js'));
    });
    if (!CFE.store.toCalcInput) (0, eval)(CFE_NODE.readFile('app/store/legacy-cfg-adapter.js'));
    ['format', 'chart-block', 'model', 'overview', 'burndown', 'variance'].forEach(function (f) {
      var key = { 'chart-block': 'chartBlock' }[f] || f;
      if (!CFE.views[key]) (0, eval)(CFE_NODE.readFile('app/views/' + f + '.js'));
    });
  }
  var T = CFE_TEST, assert = T.assert;
  var ASOF = '2026-10-01';

  var cached = null;
  function sample() {
    if (!cached) {
      cached = typeof CFE_NODE !== 'undefined'
        ? Promise.resolve(CFE_NODE.readFile('samples/published/dataset.json'))
        : new Promise(function (resolve, reject) {
          var s = document.createElement('script');
          s.onload = function () { var d = JSON.stringify(window.CFE_PUBLISHED_DATASET); delete window.CFE_PUBLISHED_DATASET; resolve(d); };
          s.onerror = function () { reject(new Error('cannot load the sample')); };
          s.src = '../samples/published/dataset.js';
          document.head.appendChild(s);
        });
    }
    return cached.then(function (text) { return JSON.parse(text); });
  }
  function text(safe) { return String(safe).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' '); }

  // Figures are compared in the reference time zone of the legacy goldens (month grouping uses local
  // time in the legacy arithmetic: known defect C-01, fixed by FIX-001).
  var TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  var REFERENCE = TZ === 'Europe/London' || TZ === 'GB';
  function figures(title, fn) {
    if (REFERENCE) T.test(title, fn);
    else T.test(title + ' (skipped: compared in Europe/London; TZ=' + TZ + ')', function () {});
  }

  T.suite('CFE.views (Overview, Burndown, Variance)', function () {
    T.test('money uses the currency code, UK style, whole units', function () {
      var F = CFE.views.format;
      assert.equal(F.money(1450000, 'GBP'), '£1,450,000');
      assert.equal(F.money(1812500, 'USD'), '$1,812,500');
      assert.equal(F.money(-1200.4, 'GBP'), '-£1,200');
      assert.equal(F.money(null, 'GBP'), '—');
      assert.equal(F.money(5, 'EUR'), '€5');
    });

    figures('model on the sample = the legacy Overview for the same data (builddata-basic)', function () {
      return sample().then(function (ds) {
        var D = CFE.views.model.build(ds, {}, ASOF);
        assert.deepEqual([D.fc.totalPOValue, D.tAct, D.tExp, D.rem, D.fc.total], [1450000, 298066, 1900, 1150034, 1438000]);
        assert.approx(D.fc.rate, 5135.71, 0.005);
        assert.deepEqual(D.allYears, [2025, 2026]);
        assert.deepEqual(D.allPoTeams, ['111111_ProjectAlpha_AWS', '222222_ProjectBeta_GCP', '333333_ProjectGamma_Azure']);
        assert.deepEqual(D.kpi, { pctUsed: 21, fcVsAct: 21, daysRem: 224, risk: 'Low' });
      });
    });

    figures('Overview shows the KPI strings and team cards', function () {
      return sample().then(function (ds) {
        var D = CFE.views.model.build(ds, {}, ASOF), s = text(CFE.views.overview.html(D));
        ['PO Value (GBP) £1,450,000', 'PO Value (USD) $1,812,500', 'Total Actuals £298,066', 'Remaining Budget £1,150,034', 'Burn Rate/Day £5,136',
         'Total Forecast £1,438,000', 'Expenses £1,900', 'Budget Used 21%', 'Forecast Accuracy 21%', 'Days Remaining 224 days', 'Approved · Low',
         '111111_ProjectAlpha_AWS £500,000', 'Fc: 103% (£516,760)', 'Fc: 250% (£374,400)', 'Fc: 68% (£546,840)', 'Monthly: Forecast vs Actuals', 'Show as table'].forEach(function (k) {
          assert.ok(s.indexOf(k) >= 0, 'missing: ' + k);
        });
      });
    });

    figures('Burndown and Variance tables: months, figures, normalised currency', function () {
      return sample().then(function (ds) {
        var D = CFE.views.model.build(ds, {}, ASOF);
        var b = text(CFE.views.burndown.html(D)), v = text(CFE.views.variance.html(D));
        assert.ok(b.indexOf('PO Burndown (Local: GBP)') >= 0 && b.indexOf('Normalized Monthly Detail (USD)') >= 0);
        assert.ok(/Jul-25 £147,384 £76,660 /.test(b), 'Jul-25 forecast and actuals');
        assert.ok(v.indexOf('Variance: Actuals − Forecast') >= 0);
        assert.ok(/Jul-25 £147,384 £76,660 -£70,724 £1,373,340/.test(v), v.slice(0, 400));
        var specs = CFE.views.burndown.charts(D);
        assert.deepEqual(specs.map(function (x) { return x.datasets.length; }), [5, 5]);
        assert.equal(specs[0].labels.length, specs[0].datasets[4].data.length);
      });
    });

    T.test('filters: a project, a year, a PO team', function () {
      return sample().then(function (ds) {
        var M = CFE.views.model;
        var a = M.build(ds, { ref: 'O-0000001' }, ASOF);
        assert.equal(a.fc.totalPOValue, 500000);
        assert.equal(a.tAct, 298066);
        assert.equal(M.build(ds, { year: '2026' }, ASOF).fc.totalPOValue, 1000000);
        var t = M.build(ds, { poTeams: ['222222_ProjectBeta_GCP'] }, ASOF);
        assert.equal(t.fc.totalPOValue, 150000);
        assert.deepEqual(t.allPoTeams, ['111111_ProjectAlpha_AWS', '222222_ProjectBeta_GCP', '333333_ProjectGamma_Azure'], 'the team list stays complete');
      });
    });

    T.test('names and teams are escaped', function () {
      return sample().then(function (ds) {
        ds.purchase_orders[0].po_team_identifier = '<img src=x onerror=1>';
        var s = String(CFE.views.overview.html(CFE.views.model.build(ds, {}, ASOF)));
        assert.ok(s.indexOf('<img') < 0 && s.indexOf('&lt;imgsrc=xonerror=1&gt;') >= 0, 'escaped (team keys lose their spaces, as in the legacy app)');
      });
    });
  });

  if (typeof document === 'undefined' || !CFE.views.portfolio) return;

  T.suite('CFE.views.portfolio (browser)', function () {
    T.test('renders the filter bar and views; the switch, chart-table toggle and filters work', function () {
      return sample().then(function (ds) {
        var saved = CFE.state.published, savedPrefs = { f: localStorage.getItem('continuum.finance.filters'), v: localStorage.getItem('continuum.finance.view') };
        CFE.state.published = { dataset: ds, manifest: {} };
        localStorage.removeItem('continuum.finance.filters'); localStorage.removeItem('continuum.finance.view');
        var doc = document.implementation.createHTMLDocument('t');
        doc.body.innerHTML = '<main id="main"></main>';
        try {
          var st = CFE.views.portfolio.render(doc, { name: 'portfolio' }, { asOf: ASOF });
          var main = doc.getElementById('main');
          assert.ok(main.querySelector('.filters select[data-action="filter-year"]'));
          assert.ok(text(main.innerHTML).indexOf('Total Actuals £298,066') >= 0);
          main.querySelector('[data-action="switch-view"][data-view="variance"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
          assert.ok(text(main.innerHTML).indexOf('Variance: Actuals − Forecast') >= 0);
          assert.equal(main.querySelector('[data-view="variance"]').getAttribute('aria-pressed'), 'true');
          var btn = main.querySelector('[data-action="toggle-chart-table"]');
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          assert.equal(btn.getAttribute('aria-pressed'), 'true');
          assert.equal(main.querySelector('.chart-table-wrap').hidden, false);
          var year = main.querySelector('[data-action="filter-year"]');
          year.value = '2026'; year.dispatchEvent(new Event('change', { bubbles: true }));
          assert.equal(st.D.fc.totalPOValue, 1000000);
          assert.deepEqual(JSON.parse(localStorage.getItem('continuum.finance.filters')), { year: '2026', poTeams: [] }, 'remembered');
          var st2 = CFE.views.portfolio.render(doc, { name: 'ref', ref: 'O-0000001' }, { asOf: ASOF });
          assert.ok(text(doc.getElementById('main').innerHTML).indexOf('Project O-0000001') >= 0);
          assert.equal(st2.D.filters.ref, 'O-0000001');
          CFE.views.portfolio.render(doc, { name: 'ref', ref: 'O-9' }, { asOf: ASOF });
          assert.ok(/not in the published data/.test(doc.getElementById('main').textContent));
        } finally {
          CFE.views.portfolio.cleanup();
          CFE.state.published = saved;
          if (savedPrefs.f === null) localStorage.removeItem('continuum.finance.filters'); else localStorage.setItem('continuum.finance.filters', savedPrefs.f);
          if (savedPrefs.v === null) localStorage.removeItem('continuum.finance.view'); else localStorage.setItem('continuum.finance.view', savedPrefs.v);
        }
      });
    });
  });
})();
