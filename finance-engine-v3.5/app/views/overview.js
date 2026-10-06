// Overview view (UI-001; legacy rOV + its chart). Registers CFE.views.overview; needs CFE.views.format,
// CFE.views.chartBlock and Continuum.html. Figures come from CFE.views.model.build (views compute nothing).
//   CFE.views.overview.html(D) → SafeHtml      CFE.views.overview.charts(D) → chart specs
(function (CFE) {
  'use strict';

  function H() { return Continuum.html; }

  function card(title, value, cls, extra) {
    var t = H().t;
    return String(t`<div class="card ${cls || ''}"><h3>${title}</h3><div class="v">${value}</div>${extra || ''}</div>`);
  }

  function charts(D) {
    var by = {};
    D.rows.forEach(function (r) { by[r.month] = r; });
    var labels = D.rows.map(function (r) { return r.month; });
    return [{ id: 'overview-monthly', title: 'Monthly: Forecast vs Actuals', currency: D.currency, labels: labels, datasets: [
      { label: 'Forecast', data: labels.map(function (l) { return by[l].forecast || null; }), color: 'blue' },
      { label: 'Actuals', data: labels.map(function (l) { return by[l].actuals || null; }), color: 'green' }
    ] }];
  }

  function html(D) {
    var t = H().t, raw = H().raw, fmt = CFE.require('views.format'), k = D.kpi, cur = D.currency;
    var used = k.pctUsed > 90 ? 'bad' : k.pctUsed > 70 ? 'warn' : 'good';
    var cards = [
      card('PO Value (' + cur + ')', fmt.money(D.fc.totalPOValue, cur), 'b'),
      card('PO Value (' + D.normCurrency + ')', fmt.money(D.fc.normPO, D.normCurrency), 'p'),
      card('Total Actuals', fmt.money(D.tAct, cur), 'g'),
      card('Remaining Budget', fmt.money(D.rem, cur), 'o'),
      card('Burn Rate/Day', fmt.money(D.fc.rate, cur), 'r'),
      card('Total Forecast', fmt.money(D.fc.total, cur), 'b'),
      card('Expenses', fmt.money(D.tExp, cur), 'g'),
      String(t`<div class="card"><h3>Budget Used</h3><div class="v pct-${used}">${k.pctUsed}%</div></div>`),
      card('Forecast Accuracy', k.fcVsAct + '%'),
      card('Days Remaining', k.daysRem > 0 ? k.daysRem + ' days' : '—'),
      String(t`<div class="card"><h3>Status</h3><div class="v"><span class="badge ${k.risk === 'Low' ? 'badge-low' : 'badge-over'}">${D.fc.status} · ${k.risk}</span></div></div>`)
    ].join('');
    var teams = D.teamCards.map(function (c) {
      return String(t`<div class="card ${c.level}"><h3>${c.team}</h3><div class="v v-small">${fmt.money(c.po, cur)}</div><p class="card-note"><span class="badge ${c.overBudget ? 'badge-over' : 'badge-low'}">${c.status} · ${c.overBudget ? 'Over Budget' : 'On Track'}</span> · Fc: ${c.pct}% (${fmt.money(c.forecast, cur)})</p></div>`);
    }).join('');
    return t`<div class="cards">${raw(cards)}</div>
<section class="box"><h2>PO_Team Budget Status</h2>
<p class="note"><strong>Fc</strong> = Forecast utilisation % of PO value: total forecast cost ÷ PO value × 100. Forecast = sum of (bill rate × allocation × 8 hours × working days) for each resource, bounded by the PO validity end date. Under 85%: on track; 85–100%: watch; over 100%: over budget.</p>
<div class="cards">${raw(teams)}</div></section>
${raw(charts(D).map(function (s) { return String(CFE.require('views.chartBlock').html(s)); }).join(''))}`;
  }

  CFE.views.overview = { html: html, charts: charts };
})(CFE);
