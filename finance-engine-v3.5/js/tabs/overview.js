// 📊 Overview tab.

function renderOverview(model) {
  const risk = model.remaining > 0 ? "Low" : "Over Budget";
  // Additional metrics
  const pctUsed = model.fc.totalPOValue
    ? Math.round(((model.totalActuals + model.totalExpenses) / model.fc.totalPOValue) * 100)
    : 0;
  const fcVsAct = model.fc.total ? Math.round((model.totalActuals / model.fc.total) * 100) : 0;
  const daysRem = model.fc.rate > 0 ? Math.round(model.remaining / model.fc.rate) : 0;
  let html = "";
  // Onboarding hint for new users (show if no actuals loaded)
  if (!model.cfg.raw_actuals || !model.cfg.raw_actuals.length) {
    html +=
      '<div style="padding:.8rem 1rem;background:#e3f2fd;border-radius:8px;border:1px solid #90caf9;margin-bottom:1rem;font-size:.78rem">';
    html +=
      "<strong>👋 Welcome!</strong> This dashboard shows sample data. To use your own: go to <strong>📤 Upload</strong> tab → Import your Full Config JSON or upload Resource Rules + Timesheets. ";
    html +=
      '<a href="#" onclick="show(\'upload\');return false" style="color:#1565c0;font-weight:600">Go to Upload →</a></div>';
  }
  const statusBadge = `<span class="badge ${risk === "Low" ? "badge-low" : "badge-over"}">${model.fc.status} · ${risk}</span>`;
  html += '<div class="cards">';
  html += statCard("b", `PO Value (${model.fc.currency})`, fmtMoney(model.fc.totalPOValue));
  if (model.fc.normCurrency !== model.fc.currency)
    html += statCard(
      "p",
      `PO Value (${model.fc.normCurrency})`,
      fmtMoney(model.fc.normPO, currencySymbol(model.fc.normCurrency)),
    );
  html += statCard("g", "Total Actuals", fmtMoney(model.totalActuals));
  html += statCard("o", "Remaining Budget", fmtMoney(model.remaining));
  html += statCard("r", "Burn Rate/Day", fmtMoney(model.fc.rate));
  html += statCard("b", "Total Forecast", fmtMoney(model.fc.total));
  html += statCard("g", "Expenses", fmtMoney(model.totalExpenses));
  html += statCard("", "Budget Used", pctUsed + "%", "color:" + pctColor(pctUsed));
  html += statCard("", "Forecast Accuracy", fcVsAct + "%");
  html += statCard("", "Days Remaining", daysRem > 0 ? daysRem + " days" : "—");
  html += statCard("", "Status", statusBadge);
  html += "</div>";
  // PO_Team status cards
  const poArr = model.cfg.po_details || [];
  const teamBudgets = {};
  poArr.forEach((p) => {
    const t = (p.PO_Team_Identifier || "").replace(/\s+/g, "");
    if (!teamBudgets[t]) teamBudgets[t] = { po: 0, status: p.WO_Approval_Status || "Approved" };
    teamBudgets[t].po += p.PO_WO_value;
  });
  // Compute forecast per team independently from resource rules
  // Compute PO validity end per team for bounding forecast
  const teamValidityEnd = {};
  (model.cfg.po_details || []).forEach((p) => {
    const t = (p.PO_Team_Identifier || "").replace(/\s+/g, "");
    const endDt = parseValidityEnd(poValidity(p));
    if (!teamValidityEnd[t] || endDt > teamValidityEnd[t]) teamValidityEnd[t] = endDt;
  });
  const fcPerTeam = {};
  model.cfg.resources.forEach((r) => {
    if (!r.bill_rate) return;
    const t = (r.po_team || "").replace(/\s+/g, "");
    if (!fcPerTeam[t]) fcPerTeam[t] = 0;
    const rStart = new Date(r.start);
    const poEnd = teamValidityEnd[t] || new Date(r.end);
    const rEnd = new Date(Math.min(new Date(r.end), poEnd));
    if (isNaN(rStart) || isNaN(rEnd) || rStart > rEnd) return;
    const dailyCost = r.bill_rate * r.alloc * 8;
    let d = new Date(rStart);
    while (d <= rEnd) {
      if (isWorkingDay(d, r.location)) fcPerTeam[t] += dailyCost;
      d = new Date(d.getTime() + 86400000);
    }
  });
  html += '<div class="box"><h2>PO_Team Budget Status</h2>';
  html += '<p style="font-size:.72rem;color:#666;margin-bottom:.8rem">';
  html += "<strong>Fc</strong> = Forecast utilization % of PO value. ";
  html += "Calculated as: <code>Total Forecast Cost ÷ PO Value × 100</code>. ";
  html += "Forecast = sum of (BillRate × Allocation × 8hrs × working days) for each resource, ";
  html += "bounded by PO validity end date. ";
  html += '<span style="color:#2e7d32">🟢 &lt;85%</span> On Track · ';
  html += '<span style="color:#e65100">🟠 85-100%</span> At Risk · ';
  html += '<span style="color:#c62828">🔴 &gt;100%</span> Over Budget</p>';
  html += '<div class="cards">';
  // each team's PO value and forecast are in that team's PO currency
  Object.entries(teamBudgets).forEach(([team, data]) => {
    const sym = currencySymbol(model.teamCurrency[team]);
    const teamFc = fcPerTeam[team] || 0;
    const overBudget = teamFc > data.po;
    const pct = data.po ? Math.round((teamFc / data.po) * 100) : 0;
    const color = overBudget ? "r" : pct > 85 ? "o" : "g";
    const statusMsg = overBudget ? `${data.status} · Over Budget` : `${data.status} · On Track`;
    html += `<div class="card ${color}">`;
    html += `<h3 style="font-size:.68rem">${team}</h3>`;
    html += `<div class="v" style="font-size:1rem">${fmtMoney(data.po, sym)}</div>`;
    html += `<div style="font-size:.7rem;margin-top:3px">`;
    html += `<span class="badge ${overBudget ? "badge-over" : "badge-low"}">${statusMsg}</span> · Fc: ${pct}% (${fmtMoney(teamFc, sym)})`;
    html += `</div></div>`;
  });
  html += "</div></div>";
  html += '<div class="box"><h2>Monthly: Forecast vs Actuals</h2><canvas id="c1" height="80"></canvas></div>';
  return html;
}

// Monthly forecast vs actuals bars (canvas c1)
function drawOverviewCharts(model) {
  const months = mergeMonthly(model);
  addChart("c1", {
    type: "bar",
    data: {
      labels: months.map((m) => m.month),
      datasets: [
        {
          label: `Forecast (${moneySymbol})`,
          data: months.map((m) => m.forecast || null),
          backgroundColor: "rgba(33,150,243,0.7)",
        },
        {
          label: `Actuals (${moneySymbol})`,
          data: months.map((m) => m.actuals || null),
          backgroundColor: "rgba(76,175,80,0.7)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" }, datalabels: kLabels({ skipZero: true }) },
      scales: { y: { beginAtZero: true, ticks: moneyTicks() } },
    },
  });
}
