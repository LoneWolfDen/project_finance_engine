// 📑 PO Details tab.

function renderPODetails(model) {
  const normFilterPO = selectedPoTeams.length ? selectedPoTeams.map((t) => t.replace(/\s+/g, "")) : null;
  const pos = (model.cfg.po_details || []).filter((p) =>
    normFilterPO ? normFilterPO.includes((p.PO_Team_Identifier || "").replace(/\s+/g, "")) : true,
  );
  const byTeam = {};
  pos.forEach((p) => {
    const k = (p.PO_Team_Identifier || "").replace(/\s+/g, "");
    const endDt = parseValidityEnd(poValidity(p));
    if (!byTeam[k])
      byTeam[k] = {
        value: 0,
        maxEnd: new Date(0),
        minStart: "9999",
        currency: p.PO_Currency_Code,
        normCurrency: p.Normalized_Currency_Code,
        count: 0,
        pos: [],
        rollover: false,
      };
    byTeam[k].value += p.PO_WO_value;
    if (endDt > byTeam[k].maxEnd) byTeam[k].maxEnd = endDt;
    if (p.WO_StartDate < byTeam[k].minStart) byTeam[k].minStart = p.WO_StartDate;
    if (p.rollover_allowed) byTeam[k].rollover = true;
    byTeam[k].count++;
    byTeam[k].pos.push(p);
  });
  const totalPO = pos.reduce((s, p) => s + p.PO_WO_value, 0);
  const today = new Date().toISOString().slice(0, 10);
  const normTotal = Object.values(byTeam).reduce((s, t) => {
    const fxFrom = fxRateAsOf(model.cfg.fx_rates, t.currency, today);
    const fxTo = fxRateAsOf(model.cfg.fx_rates, t.normCurrency, today);
    return s + (t.value / fxFrom) * fxTo;
  }, 0);

  let html = '<div class="cards">';
  html += statCard("b", "Total POs", pos.length);
  html += statCard("g", "Unique Projects", Object.keys(byTeam).length);
  html += statCard("o", "Total PO Value", fmtMoney(totalPO));
  html += statCard("p", "Normalized Total", fmtMoney(normTotal, "$"));
  html += "</div>";

  // Timeline view of POs
  const allStarts = pos.map((p) => new Date(p.WO_StartDate)).filter((d) => !isNaN(d));
  const allEnds = pos.map((p) => parseValidityEnd(poValidity(p)));
  const tStart = allStarts.length ? new Date(Math.min(...allStarts)) : new Date("2024-01-01");
  const tEnd = allEnds.length ? new Date(Math.max(...allEnds)) : new Date("2027-12-31");
  const span = tEnd - tStart || 1;
  const colors = ["#5c6bc0", "#26a69a", "#e65100", "#8e24aa", "#2e7d32", "#c62828"];
  html += '<div class="box"><h2>PO & Invoice Timeline</h2><div class="tl-scroll"><div class="tl-inner">';
  html += '<div style="margin-left:200px;position:relative;height:18px;font-size:.6rem;color:#888;margin-bottom:4px">';
  let monthStart = new Date(tStart.getFullYear(), 0, 1);
  while (monthStart <= tEnd) {
    const l = ((monthStart - tStart) / span) * 100;
    if (l >= 0 && l <= 100)
      html += `<span style="position:absolute;left:${l.toFixed(1)}%">${monthStart.getFullYear()}</span>`;
    monthStart = new Date(monthStart.getFullYear() + 1, 0, 1);
  }
  html += "</div>";
  const invAll = model.cfg.invoices || [];
  const statusColor = { Paid: "#4caf50", Submitted: "#ff9800", Draft: "#bdbdbd" };
  Object.entries(byTeam).forEach(([team, data], i) => {
    const rs = new Date(data.minStart),
      re = data.maxEnd;
    const left = Math.max(0, ((rs - tStart) / span) * 100).toFixed(1);
    const width = Math.max(2, ((re - rs) / span) * 100).toFixed(1);
    const poBarStyle = `left:${left}%;width:${width}%;background:${colors[i % colors.length]}`;
    const poBarLabel = `${fmtMoney(data.value)} (${data.count} POs)${data.rollover ? " 🔄" : ""}`;
    html += '<div class="tl-row">';
    html += `<span class="nm" style="min-width:200px;font-size:.68rem">${team}</span>`;
    html += `<div class="ba"><div class="br" style="${poBarStyle}">${poBarLabel}</div></div>`;
    html += "</div>";
    const teamInvs = invAll.filter((inv) => (inv.po_team || "").replace(/\s+/g, "") === team);
    if (teamInvs.length) {
      html += '<div class="tl-row">';
      html += '<span class="nm" style="min-width:200px;font-size:.6rem;color:#888">└ Invoices</span>';
      html += '<div class="ba" style="height:16px">';
      teamInvs.forEach((inv) => {
        const is = new Date(inv.period_from),
          ie = new Date(inv.period_to);
        if (isNaN(is) || isNaN(ie)) return;
        const invLeft = Math.max(0, ((is - tStart) / span) * 100).toFixed(1);
        const invWidth = Math.max(1, ((ie - is) / span) * 100).toFixed(1);
        const invBarStyle = `left:${invLeft}%;width:${invWidth}%;background:${statusColor[inv.status] || "#666"};height:16px;font-size:.55rem`;
        html += `<div class="br" style="${invBarStyle}">${fmtMoney(inv.amount)}</div>`;
      });
      html += `</div></div>`;
    }
  });
  html +=
    '<div style="margin-top:6px;font-size:.68rem">🟢 Paid &nbsp; 🟠 Submitted &nbsp; ⚪ Draft &nbsp; 🔄 Rollover Allowed</div></div></div></div>';

  // Invoice coverage
  const invs = model.cfg.invoices || [];
  if (invs.length) {
    const coverageCols = ["PO_Team", "PO Value", "Invoiced", "Paid", "Coverage %", "Remaining"];
    html += `<div class="box"><h2>Invoice Coverage</h2><div class="tw"><table>${tableHead(coverageCols)}<tbody>`;
    Object.entries(byTeam).forEach(([team, data]) => {
      const teamInvs = invs.filter((i) => (i.po_team || "").replace(/\s+/g, "") === team);
      const invoiced = teamInvs.reduce((s, i) => s + i.amount, 0);
      const paid = teamInvs.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
      const pct = data.value ? Math.round((invoiced / data.value) * 100) : 0;
      html += tableRow([
        cell(team, "font-size:.68rem"),
        fmtMoney(data.value),
        fmtMoney(invoiced),
        fmtMoney(paid),
        cell(pct + "%", "font-weight:600;color:" + pctColor(pct)),
        fmtMoney(data.value - invoiced),
      ]);
    });
    html += "</tbody></table></div></div>";
  }

  // Multi-year rollover summary
  if (model.fc.rolloverByYear && Object.keys(model.fc.rolloverByYear).length > 0) {
    const rolloverCols = ["Year", "PO Value", "Carry-In", "Available", "Forecast Spend", "Unused", "Rollover?"];
    html += '<div class="box"><h2>📅 Multi-Year PO Rollover</h2>';
    html += '<p style="font-size:.75rem;color:#666;margin-bottom:.5rem">';
    html += "Unused budget carries forward only when <code>rollover_allowed=true</code>.</p>";
    html += `<div class="tw"><table>${tableHead(rolloverCols)}<tbody>`;
    Object.entries(model.fc.rolloverByYear)
      .sort((a, b) => a[0] - b[0])
      .forEach(([yr, d]) => {
        html += tableRow([
          `<strong>${yr}</strong>`,
          fmtMoney(d.poValue),
          cell(fmtMoney(d.carryIn), "color:#2196f3;font-weight:600"),
          cell(fmtMoney(d.available), "font-weight:600"),
          fmtMoney(d.spent),
          cell(fmtMoney(d.unused), `color:${d.unused > 0 ? "#4caf50" : "#c62828"};font-weight:600`),
          d.rollover_allowed ? "✅ Yes" : "❌ No",
        ]);
      });
    html += "</tbody></table></div></div>";
  }

  // Detail table
  const poCols = [
    "PO_Team ⇅",
    "ProjectID ⇅",
    "PO Value ⇅",
    "Currency",
    "Norm Currency",
    "Start ⇅",
    "Validity ⇅",
    "Rollover",
    "Status",
    "PO Number",
  ];
  html += `<div class="box"><h2>All PO Entries</h2><div class="tw"><table id="tblPO">${tableHead(poCols)}<tbody>`;
  pos.forEach((p) => {
    html += tableRow([
      cell(p.PO_Team_Identifier, "font-size:.68rem"),
      p.ProjectID,
      fmtMoney(p.PO_WO_value),
      p.PO_Currency_Code,
      p.Normalized_Currency_Code,
      p.WO_StartDate,
      fmtValidity(poValidity(p)),
      p.rollover_allowed ? "✅" : "❌",
      p.WO_Approval_Status,
      p.PO_WO_Number,
    ]);
  });
  html += "</tbody></table></div></div>";
  return html;
}
