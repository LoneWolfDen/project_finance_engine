// 📈 Variance tab.

function renderVariance(model) {
  // Forecast (from resource rules) and actuals (from timesheets) by month
  const merged = mergeMonthly(model);
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

// Actuals − forecast per month (canvas c3): red over forecast, green under, grey unknown
function drawVarianceCharts(model) {
  const months = mergeMonthly(model);
  const varData = months.map((m) => (m.actuals != null && m.forecast != null ? m.actuals - m.forecast : null));
  addChart("c3", {
    type: "bar",
    data: {
      labels: months.map((m) => m.month),
      datasets: [
        {
          label: "Variance (Act−Fc)",
          data: varData,
          backgroundColor: varData.map((v) =>
            v != null ? (v > 0 ? "rgba(244,67,54,0.7)" : "rgba(76,175,80,0.7)") : "rgba(200,200,200,0.3)",
          ),
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" }, datalabels: kLabels() },
      scales: { y: { ticks: moneyTicks() } },
    },
  });
}
