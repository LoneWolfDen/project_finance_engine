// Variance view (UI-001; legacy rMo + its chart). Registers CFE.views.variance.
//   CFE.views.variance.html(D) → SafeHtml      CFE.views.variance.charts(D) → chart specs
(function (CFE) {
  'use strict';

  function H() { return Continuum.html; }

  function charts(D) {
    var data = D.rows.map(function (r) { return r.actuals != null && r.forecast != null ? r.actuals - r.forecast : null; });
    return [{ id: 'variance', title: 'Variance: Actuals − Forecast', note: 'Red bars: actuals above forecast. Green bars: actuals below forecast.', currency: D.currency, beginAtZero: false,
      labels: D.rows.map(function (r) { return r.month; }),
      datasets: [{ label: 'Variance (Act−Fc)', data: data, colors: data.map(function (v) { return v != null ? (v > 0 ? 'rgba(244,67,54,0.7)' : 'rgba(76,175,80,0.7)') : 'rgba(200,200,200,0.3)'; }) }] }];
  }

  function html(D) {
    var t = H().t, raw = H().raw, fmt = CFE.require('views.format'), c = D.currency;
    return t`${raw(String(CFE.require('views.chartBlock').html(charts(D)[0])))}
<section class="box"><h2>Monthly variance</h2><div class="tw"><table class="simple"><thead><tr><th scope="col">Month</th><th scope="col">Forecast</th><th scope="col">Actuals</th><th scope="col">Variance</th><th scope="col">Actuals Burn</th><th scope="col">Forecast Burn</th></tr></thead><tbody>${raw(D.rows.map(function (r) {
      return String(t`<tr><th scope="row">${r.month}</th><td>${fmt.money(r.forecast, c)}</td><td>${fmt.money(r.actuals, c)}</td><td class="${r.variance == null ? '' : r.variance > 0 ? 'over' : 'under'}">${fmt.money(r.variance, c)}</td><td>${fmt.money(r.actuals_burn, c)}</td><td>${fmt.money(r.forecast_burn, c)}</td></tr>`);
    }).join(''))}</tbody></table></div></section>`;
  }

  CFE.views.variance = { html: html, charts: charts };
})(CFE);
