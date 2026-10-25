// 📉 Burndown tab.

function renderBurndown(model) {
  const months = mergeMonthly(model);

  const detailCols = ["Month", "Forecast Spend", "Actuals Spend", "Forecast Burn", "Actuals Burn", "Variance"];
  let html = `<div class="box"><h2>PO Burndown (${model.fc.poCurrencies.length > 1 ? "converted to" : "Local:"} ${model.fc.currency})</h2>`;
  html += '<p style="font-size:.75rem;color:#666;margin-bottom:.8rem">';
  html += "Green=Actuals Burn, Blue=Forecast Burn, Red dashed=Cumulative PO Value available</p>";
  html += '<canvas id="c2" height="100"></canvas></div>';
  const showNorm = model.fc.normCurrency !== model.fc.currency;
  if (showNorm)
    html += `<div class="box"><h2>Normalized Burndown (${model.fc.normCurrency})</h2><canvas id="c2norm" height="80"></canvas></div>`;
  // Table
  html += `<div class="box"><h2>Monthly Detail</h2><div class="tw"><table>${tableHead(detailCols)}<tbody>`;
  months.forEach((m) => {
    const v = m.actuals != null && m.forecast != null ? Math.round((m.actuals - m.forecast) * 100) / 100 : null;
    html += tableRow([
      `<strong>${m.month}</strong>`,
      fmtMoney(m.forecast),
      fmtMoney(m.actuals),
      fmtMoney(m.forecast_burn),
      fmtMoney(m.actuals_burn),
      cell(fmtMoney(v), varianceStyle(v)),
    ]);
  });
  html += "</tbody></table></div></div>";
  // Normalized Monthly Detail table (not needed when the figures are already in the normalised currency)
  if (!showNorm) {
    html += `<p style="font-size:.72rem;color:#888">Figures are in the normalised currency (${model.fc.normCurrency}).</p>`;
    return html;
  }
  const normSym = currencySymbol(model.fc.normCurrency);
  const today3 = new Date().toISOString().slice(0, 10);
  const fxFn = fxRateAsOf(model.cfg.fx_rates, model.fc.currency || "GBP", today3);
  const fxTn = fxRateAsOf(model.cfg.fx_rates, model.fc.normCurrency || "USD", today3);
  const toNorm = (v) => (v != null ? Math.round((v / fxFn) * fxTn * 100) / 100 : null);
  html += `<div class="box"><h2>Normalized Monthly Detail (${model.fc.normCurrency})</h2>`;
  html += `<div class="tw"><table>${tableHead(detailCols)}<tbody>`;
  months.forEach((m) => {
    const v = m.actuals != null && m.forecast != null ? toNorm(m.actuals - m.forecast) : null;
    html += tableRow([
      `<strong>${m.month}</strong>`,
      fmtMoney(toNorm(m.forecast), normSym),
      fmtMoney(toNorm(m.actuals), normSym),
      fmtMoney(toNorm(m.forecast_burn), normSym),
      fmtMoney(toNorm(m.actuals_burn), normSym),
      cell(fmtMoney(v, normSym), varianceStyle(v)),
    ]);
  });
  html += "</tbody></table></div></div>";
  return html;
}

// Monthly series for the burndown charts: spend per month, and burn lines (PO value available
// at each month minus cumulative forecast / actuals spend; actuals include expenses).
function burndownSeries(model) {
  const actualsMonthly = model.actuals,
    fm = model.fc.burndown;
  const allMonths = [...new Set([...actualsMonthly.map((m) => m.month), ...fm.map((m) => m.month)])];
  // Aggregate expenses by month for burndown inclusion
  const expByMonth = {};
  (model.filteredExpenses || []).forEach((e) => {
    const d = new Date(e.date);
    if (isNaN(d)) return;
    const key = d.toLocaleString("en", { month: "short" }) + "-" + String(d.getFullYear()).slice(2);
    expByMonth[key] = (expByMonth[key] || 0) + model.toBase(e.amount, e.currency);
  });
  // Ensure expense months are in allMonths
  Object.keys(expByMonth).forEach((m) => {
    if (!allMonths.includes(m)) allMonths.push(m);
  });
  allMonths.sort((a, b) => new Date("1 " + a) - new Date("1 " + b));
  // Actuals burn: PO_Available_at_month - cumulative actuals
  // Forecast burn: PO_Available_at_month - cumulative forecast
  // First compute cumPO per month
  const poArr = model.cfg.po_details || [];
  const normFilter2 = selectedPoTeams.length ? selectedPoTeams.map((t) => t.replace(/\s+/g, "")) : null;
  const cumPO = allMonths.map((mKey) => {
    const [mName, yy] = mKey.split("-");
    const yr = parseInt("20" + yy);
    const mIdx = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(mName);
    const monthEnd = new Date(yr, mIdx + 1, 0);
    let total = 0;
    poArr.forEach((p) => {
      const t = (p.PO_Team_Identifier || "").replace(/\s+/g, "");
      if (normFilter2 && !normFilter2.includes(t)) return;
      const poEnd2 = parseValidityEnd(poValidity(p));
      if (new Date(p.WO_StartDate) <= monthEnd && poEnd2 >= monthEnd)
        total += model.toBase(p.PO_WO_value, p.PO_Currency_Code);
    });
    return total;
  });
  // Now compute burn lines using cumPO as the baseline (expenses included in actuals burn)
  let cumAct = 0;
  const actBurn = allMonths.map((l, i) => {
    const m = actualsMonthly.find((x) => x.month === l);
    const exp = expByMonth[l] || 0;
    if (m && m.actuals) {
      cumAct += m.actuals + exp;
      return cumPO[i] - cumAct;
    } else if (exp) {
      cumAct += exp;
      return cumPO[i] - cumAct;
    }
    return cumPO[i] ? cumPO[i] - cumAct : null;
  });
  let cumFc = 0;
  const fcBurn = allMonths.map((l, i) => {
    const m = fm.find((x) => x.month === l);
    if (m) {
      cumFc += m.forecast;
      return cumPO[i] - cumFc;
    }
    return cumPO[i] ? cumPO[i] - cumFc : null;
  });
  const fcSpend = allMonths.map((l) => {
    const m = fm.find((x) => x.month === l);
    return m ? m.forecast : null;
  });
  const actSpend = allMonths.map((l) => {
    const m = actualsMonthly.find((x) => x.month === l);
    return m ? m.actuals : null;
  });
  return { allMonths, cumPO, actBurn, fcBurn, fcSpend, actSpend };
}

// Spend bars (left axis) and burn lines against PO available (right axis).
// suffix is appended to labels and titles, symbol is the axis currency, conv converts values.
function burndownChartConfig(s, { suffix, symbol, actualsSpanGaps, conv }) {
  return {
    type: "bar",
    data: {
      labels: s.allMonths,
      datasets: [
        {
          label: "Forecast Spend" + suffix,
          data: s.fcSpend.map(conv),
          backgroundColor: "rgba(33,150,243,0.4)",
          order: 2,
        },
        {
          label: "Actuals Spend" + suffix,
          data: s.actSpend.map(conv),
          backgroundColor: "rgba(76,175,80,0.4)",
          order: 2,
        },
        {
          label: "Actuals Burn" + suffix,
          type: "line",
          data: s.actBurn.map(conv),
          borderColor: "#4caf50",
          borderWidth: 2,
          tension: 0.3,
          spanGaps: actualsSpanGaps,
          pointRadius: 3,
          order: 1,
          yAxisID: "y1",
        },
        {
          label: "Forecast Burn" + suffix,
          type: "line",
          data: s.fcBurn.map(conv),
          borderColor: "#2196f3",
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
          order: 1,
          yAxisID: "y1",
        },
        {
          label: "PO Available" + suffix,
          type: "line",
          data: s.cumPO.map(conv),
          borderColor: "#f44336",
          borderDash: [5, 5],
          pointRadius: 2,
          borderWidth: 2,
          order: 0,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" }, datalabels: kLabels({ size: 9, symbol }) },
      scales: {
        y: {
          position: "left",
          title: { display: true, text: "Monthly Spend" + suffix },
          beginAtZero: true,
          ticks: moneyTicks(symbol),
        },
        y1: {
          position: "right",
          title: { display: true, text: "PO Burn" + suffix },
          ticks: moneyTicks(symbol),
          grid: { drawOnChartArea: false },
        },
      },
    },
  };
}

// Burndown in PO currency (canvas c2) and normalized currency (canvas c2norm)
function drawBurndownCharts(model) {
  const s = burndownSeries(model);
  if (
    !addChart("c2", burndownChartConfig(s, { suffix: "", symbol: moneySymbol, actualsSpanGaps: false, conv: (v) => v }))
  )
    return;
  const today = new Date().toISOString().slice(0, 10);
  const fxF = fxRateAsOf(model.cfg.fx_rates, model.fc.currency || "GBP", today);
  const fxT = fxRateAsOf(model.cfg.fx_rates, model.fc.normCurrency || "USD", today);
  const norm = (v) => (v != null ? Math.round((v / fxF) * fxT) : null);
  addChart(
    "c2norm",
    burndownChartConfig(s, {
      suffix: " (" + model.fc.normCurrency + ")",
      symbol: currencySymbol(model.fc.normCurrency),
      actualsSpanGaps: true,
      conv: norm,
    }),
  );
}
