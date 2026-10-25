// 📉 Burndown tab.

function renderBurndown(model) {
  // Build merged data for table
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

  const detailCols = ["Month", "Forecast Spend", "Actuals Spend", "Forecast Burn", "Actuals Burn", "Variance"];
  let html = `<div class="box"><h2>PO Burndown (Local: ${model.fc.currency})</h2>`;
  html += '<p style="font-size:.75rem;color:#666;margin-bottom:.8rem">';
  html += "Green=Actuals Burn, Blue=Forecast Burn, Red dashed=Cumulative PO Value available</p>";
  html += '<canvas id="c2" height="100"></canvas></div>';
  html += `<div class="box"><h2>Normalized Burndown (${model.fc.normCurrency})</h2><canvas id="c2norm" height="80"></canvas></div>`;
  // Table
  html += `<div class="box"><h2>Monthly Detail</h2><div class="tw"><table>${tableHead(detailCols)}<tbody>`;
  allMonths.forEach((m) => {
    const fc = fcMap[m] || {},
      ac = actMap[m] || {};
    const v = ac.actuals != null && fc.forecast != null ? Math.round((ac.actuals - fc.forecast) * 100) / 100 : null;
    html += tableRow([
      `<strong>${m}</strong>`,
      fmtMoney(fc.forecast),
      fmtMoney(ac.actuals),
      fmtMoney(fc.forecast_burn),
      fmtMoney(ac.actuals_burn),
      cell(fmtMoney(v), varianceStyle(v)),
    ]);
  });
  html += "</tbody></table></div></div>";
  // Normalized Monthly Detail table
  const today3 = new Date().toISOString().slice(0, 10);
  const fxFn = fxRateAsOf(model.cfg.fx_rates, model.fc.currency || "GBP", today3);
  const fxTn = fxRateAsOf(model.cfg.fx_rates, model.fc.normCurrency || "USD", today3);
  const toNorm = (v) => (v != null ? Math.round((v / fxFn) * fxTn * 100) / 100 : null);
  html += `<div class="box"><h2>Normalized Monthly Detail (${model.fc.normCurrency})</h2>`;
  html += `<div class="tw"><table>${tableHead(detailCols)}<tbody>`;
  allMonths.forEach((m) => {
    const fc = fcMap[m] || {},
      ac = actMap[m] || {};
    const v = ac.actuals != null && fc.forecast != null ? toNorm(ac.actuals - fc.forecast) : null;
    html += tableRow([
      `<strong>${m}</strong>`,
      fmtMoney(toNorm(fc.forecast), "$"),
      fmtMoney(toNorm(ac.actuals), "$"),
      fmtMoney(toNorm(fc.forecast_burn), "$"),
      fmtMoney(toNorm(ac.actuals_burn), "$"),
      cell(fmtMoney(v, "$"), varianceStyle(v)),
    ]);
  });
  html += "</tbody></table></div></div>";
  return html;
}
