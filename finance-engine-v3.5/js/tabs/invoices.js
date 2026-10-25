// 🧾 Invoices tab.

function renderInvoices(model) {
  // Filter invoices by year-valid PO_Teams AND PO_Team slicer
  const validTeamsInv = new Set(
    (model.cfg.po_details || []).map((p) => (p.PO_Team_Identifier || "").replace(/\s+/g, "")),
  );
  const normFilter = selectedPoTeams.length ? selectedPoTeams.map((t) => t.replace(/\s+/g, "")) : null;
  const fullCfgInv = loadWork();
  const invs = (fullCfgInv.invoices || []).filter((i) => {
    const t = (i.po_team || "").replace(/\s+/g, "");
    if (!validTeamsInv.has(t)) return false;
    return normFilter ? normFilter.includes(t) : true;
  });
  const paid = invs.filter((i) => i.status === "Paid");
  const submitted = invs.filter((i) => i.status === "Submitted");
  const draft = invs.filter((i) => i.status === "Draft");
  const totalInv = invs.reduce((s, i) => s + i.amount, 0);
  const totalPaid = paid.reduce((s, i) => s + i.amount, 0);

  const sumAmount = (list) => list.reduce((s, i) => s + i.amount, 0);
  let html = '<div class="cards">';
  html += statCard("b", "Total Invoices", invs.length);
  html += statCard("g", "Total Invoiced", fmtMoney(totalInv));
  html += `<div class="card" style="border-left-color:#4caf50"><h3>Paid</h3><div class="v">${fmtMoney(totalPaid)} (${paid.length})</div></div>`;
  html += statCard("o", "Submitted", `${fmtMoney(sumAmount(submitted))} (${submitted.length})`);
  html += statCard("r", "Draft", `${fmtMoney(sumAmount(draft))} (${draft.length})`);
  html += statCard("p", "PO Remaining (uninvoiced)", fmtMoney(model.fc.totalPOValue - totalInv));
  html += "</div>";

  // Invoice timeline by PO_Team
  if (invs.length) {
    const allStarts = invs.map((i) => new Date(i.period_from)).filter((d) => !isNaN(d));
    const allEnds = invs.map((i) => new Date(i.period_to)).filter((d) => !isNaN(d));
    const tStart = new Date(Math.min(...allStarts)),
      tEnd = new Date(Math.max(...allEnds));
    const span = tEnd - tStart || 1;
    const statusColor = { Paid: "#4caf50", Submitted: "#ff9800", Draft: "#9e9e9e" };
    html += `<div class="box" id="invTimeline"><h2>Invoice Timeline ${expandCollapseButtons("invTimeline")}</h2>`;
    html += '<div class="tl-scroll"><div class="tl-inner">';
    html += monthAxis(tStart, tEnd, span, 160, 16);
    // Group by po_team
    const groups = {};
    invs.forEach((i) => {
      const t = i.po_team || "Unknown";
      if (!groups[t]) groups[t] = [];
      groups[t].push(i);
    });
    Object.entries(groups).forEach(([team, items]) => {
      html += `<div class="grp-hdr" onclick="toggleGrp(this)">${team} (${items.length} invoices)</div><div class="grp-rows">`;
      items.forEach((i) => {
        const rs = new Date(i.period_from),
          re = new Date(i.period_to);
        const left = Math.max(0, ((rs - tStart) / span) * 100).toFixed(1);
        const width = Math.max(2, ((re - rs) / span) * 100).toFixed(1);
        const barStyle = `left:${left}%;width:${width}%;background:${statusColor[i.status] || "#666"}`;
        html += '<div class="tl-row">';
        html += `<span class="nm" style="min-width:160px;font-size:.65rem">${i.invoice_number}</span>`;
        html += `<div class="ba"><div class="br" style="${barStyle}">${fmtMoney(i.amount)} · ${i.status}</div></div>`;
        html += "</div>";
      });
      html += "</div>";
    });
    html +=
      '<div style="margin-top:8px;font-size:.7rem">🟢 Paid &nbsp; 🟠 Submitted &nbsp; ⚪ Draft</div></div></div></div>';
  }

  // Table with collapsible PO_Team groups
  const invCols = ["PO_Team", "Invoice #", "From", "To", "Amount", "Status", "Paid Date", "Notes"];
  html += `<div class="box" id="invTable"><h2>Invoice Details ${expandCollapseButtons("invTable")}</h2>`;
  html += `<div class="tw"><table id="tblInv">${tableHead(invCols)}<tbody>`;
  const invGroups = {};
  invs.forEach((i) => {
    const t = i.po_team || "Unknown";
    if (!invGroups[t]) invGroups[t] = [];
    invGroups[t].push(i);
  });
  Object.entries(invGroups).forEach(([team, items]) => {
    html += groupHeaderRow(8, `${team} (${items.length} invoices, ${fmtMoney(sumAmount(items))})`);
    html += `<tr class="grp-rows"><td colspan="8" style="padding:0"><table style="width:100%;margin:0;box-shadow:none"><tbody>`;
    items.forEach((i) => {
      const statusStyle =
        i.status === "Paid" ? "color:#2e7d32" : i.status === "Submitted" ? "color:#e65100" : "color:#666";
      html += tableRow([
        cell(i.po_team, "font-size:.65rem"),
        i.invoice_number,
        i.period_from,
        i.period_to,
        fmtMoney(i.amount),
        cell(i.status, statusStyle + ";font-weight:600"),
        i.paid_date || "—",
        i.notes || "",
      ]);
    });
    html += `</tbody></table></td></tr>`;
  });
  html += "</tbody></table></div></div>";
  return html;
}
