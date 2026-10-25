// 📈 Variance tab.

function renderVariance(model) {
  // Merge forecast (from resource rules) and actuals (from timesheets) by month
  const fcMap = {};
  model.fc.burndown.forEach((m) => {
    fcMap[m.month] = { forecast: m.forecast, forecast_burn: m.forecast_burn };
  });
  const actMap = {};
  model.actuals.forEach((m) => {
    actMap[m.month] = { actuals: m.actuals, actuals_burn: m.actuals_burn };
  });
  const allMonths = [...new Set([...Object.keys(fcMap), ...Object.keys(actMap)])].sort(
    (a, b) => new Date("1 " + a) - new Date("1 " + b),
  );
  const merged = allMonths.map((m) => ({
    month: m,
    forecast: fcMap[m] ? fcMap[m].forecast : null,
    actuals: actMap[m] ? actMap[m].actuals : null,
    actuals_burn: actMap[m] ? actMap[m].actuals_burn : null,
    forecast_burn: fcMap[m] ? fcMap[m].forecast_burn : null,
  }));
  let html = '<div class="box"><h2>Variance: Actuals − Forecast</h2><canvas id="c3" height="70"></canvas></div>';
  const cols = ["Month", "Forecast", "Actuals", "Variance", "Actuals Burn", "Forecast Burn"];
  html += `<div class="tw"><table>${tableHead(cols)}<tbody>`;
  merged.forEach((m) => {
    const v = m.actuals != null && m.forecast != null ? Math.round((m.actuals - m.forecast) * 100) / 100 : null;
    html += tableRow([
      `<strong>${m.month}</strong>`,
      fmtMoney(m.forecast),
      fmtMoney(m.actuals),
      cell(fmtMoney(v), varianceStyle(v)),
      fmtMoney(m.actuals_burn),
      fmtMoney(m.forecast_burn),
    ]);
  });
  html += "</tbody></table></div>";
  return html;
}
