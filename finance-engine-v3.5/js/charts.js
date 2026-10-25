// Chart.js charts for each tab (called by render() after the HTML is in place).

function drawCharts(tab, model) {
  if (tab === "overview") {
    const actualsMonthly = model.actuals,
      fc = model.fc.burndown;
    const fcMap = {};
    fc.forEach((m) => {
      fcMap[m.month] = m.forecast;
    });
    const actMap = {};
    actualsMonthly.forEach((m) => {
      actMap[m.month] = m.actuals;
    });
    const labels = [...new Set([...Object.keys(fcMap), ...Object.keys(actMap)])].sort(
      (a, b) => new Date("1 " + a) - new Date("1 " + b),
    );
    const ctx = document.getElementById("c1");
    if (!ctx) return;
    charts.push(
      new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Forecast (£)",
              data: labels.map((l) => fcMap[l] || null),
              backgroundColor: "rgba(33,150,243,0.7)",
            },
            {
              label: "Actuals (£)",
              data: labels.map((l) => actMap[l] || null),
              backgroundColor: "rgba(76,175,80,0.7)",
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "top" },
            datalabels: {
              display: showDataLabels,
              formatter: (v) => (v ? "£" + Math.round(v / 1000) + "k" : ""),
              font: { size: 10 },
              anchor: "end",
              align: "top",
            },
          },
          scales: { y: { beginAtZero: true, ticks: { callback: (v) => "£" + v.toLocaleString() } } },
        },
      }),
    );
  }
  if (tab === "burndown") {
    const actualsMonthly = model.actuals,
      fm = model.fc.burndown;
    const allMonths = [...new Set([...actualsMonthly.map((m) => m.month), ...fm.map((m) => m.month)])];
    const ctx = document.getElementById("c2");
    if (!ctx) return;
    // Aggregate expenses by month for burndown inclusion
    const expByMonth = {};
    (model.filteredExpenses || []).forEach((e) => {
      const d = new Date(e.date);
      if (isNaN(d)) return;
      const key = d.toLocaleString("en", { month: "short" }) + "-" + String(d.getFullYear()).slice(2);
      expByMonth[key] = (expByMonth[key] || 0) + e.amount;
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
        if (new Date(p.WO_StartDate) <= monthEnd && poEnd2 >= monthEnd) total += p.PO_WO_value;
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
    charts.push(
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: allMonths,
          datasets: [
            { label: "Forecast Spend", data: fcSpend, backgroundColor: "rgba(33,150,243,0.4)", order: 2 },
            { label: "Actuals Spend", data: actSpend, backgroundColor: "rgba(76,175,80,0.4)", order: 2 },
            {
              label: "Actuals Burn",
              type: "line",
              data: actBurn,
              borderColor: "#4caf50",
              borderWidth: 2,
              tension: 0.3,
              spanGaps: false,
              pointRadius: 3,
              order: 1,
              yAxisID: "y1",
            },
            {
              label: "Forecast Burn",
              type: "line",
              data: fcBurn,
              borderColor: "#2196f3",
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 3,
              order: 1,
              yAxisID: "y1",
            },
            {
              label: "PO Available",
              type: "line",
              data: cumPO,
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
          plugins: {
            legend: { position: "top" },
            datalabels: {
              display: showDataLabels,
              formatter: (v) => (v != null ? "£" + Math.round(v / 1000) + "k" : ""),
              font: { size: 9 },
              anchor: "end",
              align: "top",
            },
          },
          scales: {
            y: {
              position: "left",
              title: { display: true, text: "Monthly Spend" },
              beginAtZero: true,
              ticks: { callback: (v) => "£" + v.toLocaleString() },
            },
            y1: {
              position: "right",
              title: { display: true, text: "PO Burn" },
              ticks: { callback: (v) => "£" + v.toLocaleString() },
              grid: { drawOnChartArea: false },
            },
          },
        },
      }),
    );
    // Normalized chart (combo: bars for spend + lines for burn)
    const today2 = new Date().toISOString().slice(0, 10);
    const fxF = fxRateAsOf(model.cfg.fx_rates, model.fc.currency || "GBP", today2);
    const fxT = fxRateAsOf(model.cfg.fx_rates, model.fc.normCurrency || "USD", today2);
    const norm = (v) => (v != null ? Math.round((v / fxF) * fxT) : null);
    const ctx2 = document.getElementById("c2norm");
    if (ctx2) {
      charts.push(
        new Chart(ctx2, {
          type: "bar",
          data: {
            labels: allMonths,
            datasets: [
              {
                label: "Forecast Spend (" + model.fc.normCurrency + ")",
                data: fcSpend.map(norm),
                backgroundColor: "rgba(33,150,243,0.4)",
                order: 2,
              },
              {
                label: "Actuals Spend (" + model.fc.normCurrency + ")",
                data: actSpend.map(norm),
                backgroundColor: "rgba(76,175,80,0.4)",
                order: 2,
              },
              {
                label: "Actuals Burn (" + model.fc.normCurrency + ")",
                type: "line",
                data: actBurn.map(norm),
                borderColor: "#4caf50",
                borderWidth: 2,
                tension: 0.3,
                spanGaps: true,
                pointRadius: 3,
                order: 1,
                yAxisID: "y1",
              },
              {
                label: "Forecast Burn (" + model.fc.normCurrency + ")",
                type: "line",
                data: fcBurn.map(norm),
                borderColor: "#2196f3",
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 3,
                order: 1,
                yAxisID: "y1",
              },
              {
                label: "PO Available (" + model.fc.normCurrency + ")",
                type: "line",
                data: cumPO.map(norm),
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
            plugins: {
              legend: { position: "top" },
              datalabels: {
                display: showDataLabels,
                formatter: (v) => (v != null ? "£" + Math.round(v / 1000) + "k" : ""),
                font: { size: 9 },
                anchor: "end",
                align: "top",
              },
            },
            scales: {
              y: {
                position: "left",
                title: { display: true, text: "Monthly Spend (" + model.fc.normCurrency + ")" },
                beginAtZero: true,
                ticks: { callback: (v) => "$" + v.toLocaleString() },
              },
              y1: {
                position: "right",
                title: { display: true, text: "PO Burn (" + model.fc.normCurrency + ")" },
                ticks: { callback: (v) => "$" + v.toLocaleString() },
                grid: { drawOnChartArea: false },
              },
            },
          },
        }),
      );
    }
  }
  if (tab === "monthly") {
    const actualsMonthly = model.actuals,
      fc = model.fc.burndown;
    const fcMap = {};
    fc.forEach((m) => {
      fcMap[m.month] = m.forecast;
    });
    const actMap = {};
    actualsMonthly.forEach((m) => {
      actMap[m.month] = m.actuals;
    });
    const labels = [...new Set([...Object.keys(fcMap), ...Object.keys(actMap)])].sort(
      (a, b) => new Date("1 " + a) - new Date("1 " + b),
    );
    const varData = labels.map((l) => (actMap[l] != null && fcMap[l] != null ? actMap[l] - fcMap[l] : null));
    const ctx = document.getElementById("c3");
    if (!ctx) return;
    charts.push(
      new Chart(ctx, {
        type: "bar",
        data: {
          labels,
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
          plugins: {
            legend: { position: "top" },
            datalabels: {
              display: showDataLabels,
              formatter: (v) => (v != null ? "£" + Math.round(v / 1000) + "k" : ""),
              font: { size: 10 },
              anchor: "end",
              align: "top",
            },
          },
          scales: { y: { ticks: { callback: (v) => "£" + v.toLocaleString() } } },
        },
      }),
    );
  }
}
