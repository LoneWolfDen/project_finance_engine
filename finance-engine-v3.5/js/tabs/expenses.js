// 💳 Expenses tab.

function renderExpenses(model) {
  const exps = model.filteredExpenses;
  const total = exps.reduce((s, e) => s + e.amount, 0);
  // Outer table and each group's inner table share column widths so they line up
  const colgroup =
    "<colgroup>" + [14, 12, 12, 8, 10, 22, 22].map((w) => `<col style="width:${w}%">`).join("") + "</colgroup>";
  const cols = ["Name", "Date", "Amount", "Currency", "ProjectID", "PO_Team", "Description"];
  let html =
    '<div class="cards">' + statCard("g", "Total", fmtMoney(total)) + statCard("b", "Claims", exps.length) + "</div>";
  html += '<div class="tw" id="expTableBox">';
  html += `<div style="margin-bottom:4px">${expandCollapseButtons("expTableBox")}</div>`;
  html += `<table id="tblExp" style="table-layout:fixed">${colgroup}${tableHead(cols)}<tbody>`;
  const expGroups = {};
  exps.forEach((e) => {
    const t = e.po_team || "Unknown";
    if (!expGroups[t]) expGroups[t] = [];
    expGroups[t].push(e);
  });
  Object.entries(expGroups).forEach(([team, items]) => {
    html += groupHeaderRow(7, `${team} (${items.length} claims, ${fmtMoney(items.reduce((s, e) => s + e.amount, 0))})`);
    html += '<tr class="grp-rows"><td colspan="7" style="padding:0">';
    html += `<table style="width:100%;margin:0;box-shadow:none;table-layout:fixed">${colgroup}<tbody>`;
    items.forEach((e) => {
      html += tableRow([
        e.name,
        e.date,
        fmtMoney(e.amount),
        e.currency,
        e.projectID || "",
        cell(e.po_team || "", "font-size:.65rem"),
        e.desc,
      ]);
    });
    html += `</tbody></table></td></tr>`;
  });
  html += "</tbody></table></div>";
  return html;
}
