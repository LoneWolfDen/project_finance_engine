// A chart with a "Show as table" switch (UI-001). Registers CFE.views.chartBlock; needs app/cfe.js and
// Continuum.html; draws with the vendored Chart.js when it is loaded.
//
//   var spec = {id, title, note, labels:[…], datasets:[{label, data:[…], kind:'bar'|'line', color, dashed, axis:'y'|'y1'}],
//               axes:{y:'Monthly Spend', y1:'PO Burn'}, currency:'GBP'}
//   CFE.views.chartBlock.html(spec)   // → SafeHtml: heading, canvas, hidden table, switch button
//   CFE.views.chartBlock.draw(main, specs)   // draws the charts; returns a function that destroys them
// The table holds exactly the numbers the chart shows, so every chart is readable without colour or
// a mouse. The switch is a <button> with aria-pressed; the chart itself is aria-hidden.
(function (CFE) {
  'use strict';

  function H() { return Continuum.html; }

  function tableHtml(spec) {
    var t = H().t, raw = H().raw, fmt = CFE.require('views.format');
    return t`<table class="simple chart-table"><thead><tr><th scope="col">Month</th>${raw(spec.datasets.map(function (d) { return String(t`<th scope="col">${d.label}</th>`); }).join(''))}</tr></thead><tbody>${raw(spec.labels.map(function (l, i) {
      return String(t`<tr><th scope="row">${l}</th>${raw(spec.datasets.map(function (d) { return String(t`<td>${fmt.money(d.data[i], spec.currency)}</td>`); }).join(''))}</tr>`);
    }).join(''))}</tbody></table>`;
  }

  function html(spec) {
    var t = H().t;
    return t`<section class="box chart-block" data-chart="${spec.id}" aria-label="${spec.title}">
<div class="box-head"><h2>${spec.title}</h2><button type="button" class="btn btn-small" data-action="toggle-chart-table" data-chart="${spec.id}" aria-pressed="false">Show as table</button></div>
${spec.note ? t`<p class="note">${spec.note}</p>` : ''}
<div class="chart-wrap"><canvas id="chart-${spec.id}" aria-hidden="true"></canvas></div>
<div class="tw chart-table-wrap" hidden>${tableHtml(spec)}</div>
</section>`;
  }

  var COLORS = { blue: 'rgba(33,150,243,0.7)', green: 'rgba(76,175,80,0.7)', red: '#f44336', lineBlue: '#2196f3', lineGreen: '#4caf50' };

  var registered = false;

  function draw(main, specs) {
    var Chart = typeof window !== 'undefined' && window.Chart;
    var made = [];
    if (Chart && !registered && window.ChartDataLabels) { Chart.register(window.ChartDataLabels); registered = true; }   // labels stay off by default
    if (Chart) {
      specs.forEach(function (spec) {
        var canvas = main.querySelector('#chart-' + spec.id);
        if (!canvas || !canvas.ownerDocument.defaultView) return;   // not on a displayed page (e.g. a test document)
        var fmt = CFE.require('views.format');
        var scales = { y: { beginAtZero: spec.beginAtZero !== false, title: { display: !!(spec.axes && spec.axes.y), text: spec.axes && spec.axes.y }, ticks: { callback: function (v) { return fmt.money(v, spec.currency); } } } };
        if (spec.datasets.some(function (d) { return d.axis === 'y1'; })) {
          scales.y.position = 'left';
          scales.y1 = { position: 'right', title: { display: true, text: spec.axes && spec.axes.y1 }, grid: { drawOnChartArea: false }, ticks: { callback: function (v) { return fmt.money(v, spec.currency); } } };
        }
        try { made.push(new Chart(canvas, {
          type: 'bar',
          data: { labels: spec.labels, datasets: spec.datasets.map(function (d) {
            var line = d.kind === 'line';
            return { label: d.label, data: d.data, type: line ? 'line' : 'bar', yAxisID: d.axis || 'y', order: line ? (d.dashed ? 0 : 1) : 2,
              backgroundColor: d.colors || COLORS[d.color] || d.color, borderColor: COLORS[d.color] || d.color, borderWidth: line ? 2 : 0,
              borderDash: d.dashed ? [5, 5] : undefined, tension: 0.3, pointRadius: line ? (d.dashed ? 2 : 3) : 0, spanGaps: !!d.spanGaps };
          }) },
          options: { responsive: true, animation: false, plugins: { legend: { position: 'top' }, datalabels: { display: false } }, scales: scales }
        })); } catch (e) {
          // A chart that cannot be drawn never breaks the page: its "Show as table" view still works.
          Continuum.log.warn('chart', 'Chart not drawn', { chart: spec.id, type: (e && e.name) || 'Error' });
        }
      });
    }
    return function destroy() { made.forEach(function (c) { c.destroy(); }); };
  }

  // Switches one block between chart and table.
  function toggle(main, id) {
    var block = main.querySelector('[data-chart="' + id + '"].chart-block');
    if (!block) return;
    var btn = block.querySelector('[data-action="toggle-chart-table"]'), table = block.querySelector('.chart-table-wrap'), chart = block.querySelector('.chart-wrap');
    var showTable = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', showTable ? 'true' : 'false');
    btn.textContent = showTable ? 'Show as chart' : 'Show as table';
    table.hidden = !showTable; chart.hidden = showTable;
  }

  CFE.views.chartBlock = { html: html, draw: draw, toggle: toggle };
})(CFE);
