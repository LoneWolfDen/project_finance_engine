// Burndown view (UI-001; legacy rBD + its charts). Registers CFE.views.burndown.
//   CFE.views.burndown.html(D) → SafeHtml      CFE.views.burndown.charts(D) → chart specs
(function (CFE) {
  'use strict';

  function H() { return Continuum.html; }

  function charts(D) {
    var b = D.burndown, M = CFE.require('views.model'), n = function (v) { return M.normalise(D, v, true); };
    function sets(map, suffix) {
      return [
        { label: 'Forecast Spend' + suffix, data: b.fcSpend.map(map), color: 'blue' },
        { label: 'Actuals Spend' + suffix, data: b.actSpend.map(map), color: 'green' },
        { label: 'Actuals Burn' + suffix, data: b.actBurn.map(map), kind: 'line', color: 'lineGreen', axis: 'y1', spanGaps: !!suffix },
        { label: 'Forecast Burn' + suffix, data: b.fcBurn.map(map), kind: 'line', color: 'lineBlue', axis: 'y1' },
        { label: 'PO Available' + suffix, data: b.cumPO.map(map), kind: 'line', color: 'red', dashed: true, axis: 'y1' }
      ];
    }
    var same = function (v) { return v; };
    return [
      { id: 'burndown-local', title: 'PO Burndown (Local: ' + D.currency + ')', note: 'Green = actuals burn, blue = forecast burn, red dashed = PO value available.',
        currency: D.currency, labels: b.labels, datasets: sets(same, ''), axes: { y: 'Monthly Spend', y1: 'PO Burn' } },
      { id: 'burndown-norm', title: 'Normalized Burndown (' + D.normCurrency + ')', currency: D.normCurrency, labels: b.labels,
        datasets: sets(n, ' (' + D.normCurrency + ')'), axes: { y: 'Monthly Spend (' + D.normCurrency + ')', y1: 'PO Burn (' + D.normCurrency + ')' } }
    ];
  }

  function detail(D, title, conv, code) {
    var t = H().t, raw = H().raw, fmt = CFE.require('views.format');
    return String(t`<section class="box"><h2>${title}</h2><div class="tw"><table class="simple"><thead><tr><th scope="col">Month</th><th scope="col">Forecast Spend</th><th scope="col">Actuals Spend</th><th scope="col">Forecast Burn</th><th scope="col">Actuals Burn</th><th scope="col">Variance</th></tr></thead><tbody>${raw(D.rows.map(function (r) {
      var v = r.variance == null ? null : conv(r.actuals - r.forecast);
      return String(t`<tr><th scope="row">${r.month}</th><td>${fmt.money(conv(r.forecast), code)}</td><td>${fmt.money(conv(r.actuals), code)}</td><td>${fmt.money(conv(r.forecast_burn), code)}</td><td>${fmt.money(conv(r.actuals_burn), code)}</td><td class="${v == null ? '' : v > 0 ? 'over' : 'under'}">${fmt.money(v, code)}</td></tr>`);
    }).join(''))}</tbody></table></div></section>`);
  }

  function html(D) {
    var t = H().t, raw = H().raw, M = CFE.require('views.model'), block = CFE.require('views.chartBlock');
    var specs = charts(D);
    var local = function (v) { return v == null ? null : Math.round(v * 100) / 100; };
    return t`${raw(String(block.html(specs[0])))}${raw(String(block.html(specs[1])))}
${raw(detail(D, 'Monthly Detail', local, D.currency))}
${raw(detail(D, 'Normalized Monthly Detail (' + D.normCurrency + ')', function (v) { return M.normalise(D, v, false); }, D.normCurrency))}`;
  }

  CFE.views.burndown = { html: html, charts: charts };
})(CFE);
