// Excel, PDF and PowerPoint report exports.

function expSel(id) {
  const el = document.getElementById(id);
  return el ? el.checked : true;
}

function getExportData() {
  const model = buildData();
  const monthly = mergeMonthly(model).map((m) => ({
    Month: m.month,
    "Forecast Spend": m.forecast,
    "Actuals Spend": m.actuals,
    Variance: m.hasActuals && m.hasForecast ? Math.round((m.actuals - m.forecast) * 100) / 100 : null,
    "Forecast Burn": m.forecast_burn,
    "Actuals Burn": m.actuals_burn,
  }));
  const normFilter = selectedPoTeams.length ? selectedPoTeams.map((t) => t.replace(/\s+/g, "")) : null;
  const invs = (model.cfg.invoices || []).filter((i) =>
    normFilter ? normFilter.includes((i.po_team || "").replace(/\s+/g, "")) : true,
  );
  const res = normFilter
    ? model.cfg.resources.filter((r) => normFilter.includes((r.po_team || "").replace(/\s+/g, "")))
    : model.cfg.resources;
  const sel = {
    summary: expSel("exp_summary"),
    monthly: expSel("exp_monthly"),
    chart_spend: expSel("exp_chart_spend"),
    chart_burn: expSel("exp_chart_burn"),
    resources: expSel("exp_resources"),
    invoices: expSel("exp_invoices"),
    expenses: expSel("exp_expenses"),
    rollover: expSel("exp_rollover"),
  };
  return { model, monthly, invs, res, sel };
}

function exportExcel() {
  const { model, monthly, invs, res, sel } = getExportData();
  const wb = XLSX.utils.book_new();
  const sig = [[""], ["Crafted by Vamsi Yedlapalli | github.com/LoneWolfDen"]];
  if (sel.summary) {
    const summary = [
      ["Project Finance Engine — Export Report"],
      ["Generated", new Date().toISOString().slice(0, 16)],
      ["Filter", selectedPoTeams.length ? selectedPoTeams.join(", ") : "All Projects"],
      [],
      ["Metric", "Value"],
      ["PO Value (" + model.fc.currency + ")", model.fc.totalPOValue],
      ["PO Value (" + model.fc.normCurrency + ")", model.fc.normPO],
      ["Total Forecast", model.fc.total],
      ["Total Actuals", model.totalActuals],
      ["Total Expenses", model.totalExpenses],
      ["Remaining Budget", model.remaining],
      ["Burn Rate/Day", model.fc.rate],
      ...sig,
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
  }
  if (sel.monthly) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthly), "Monthly Burndown");
  if (sel.invoices && invs.length)
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        invs.map((i) => ({
          PO_Team: i.po_team,
          Invoice: i.invoice_number,
          From: i.period_from,
          To: i.period_to,
          Amount: i.amount,
          Status: i.status,
          Paid_Date: i.paid_date || "",
          Notes: i.notes || "",
        })),
      ),
      "Invoices",
    );
  if (sel.resources)
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        res.map((r) => ({
          Name: r.name,
          EmplID: r.empl_id,
          Role: r.role,
          Location: r.location,
          PO_Team: r.po_team,
          Start: r.start,
          End: r.end,
          BillRate: r.bill_rate,
          Alloc: r.alloc,
          "Forecast/Day": r.bill_rate * r.alloc * 8,
        })),
      ),
      "Resources",
    );
  if (sel.expenses && model.filteredExpenses.length)
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        model.filteredExpenses.map((e) => ({
          Name: e.name,
          Date: e.date,
          Amount: e.amount,
          Currency: e.currency,
          PO_Team: e.po_team || "",
          Description: e.desc,
        })),
      ),
      "Expenses",
    );
  if (sel.rollover && model.fc.rolloverByYear && Object.keys(model.fc.rolloverByYear).length > 1) {
    const ro = Object.entries(model.fc.rolloverByYear)
      .sort((a, b) => a[0] - b[0])
      .map(([yr, d]) => ({
        Year: yr,
        "PO Value": d.poValue,
        "Carry-In": d.carryIn,
        "Available Budget": d.available,
        "Forecast Spend": d.spent,
        "Unused (Rollover)": d.unused,
      }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ro), "PO Rollover");
  }
  XLSX.writeFile(wb, "Finance_Report_" + new Date().toISOString().slice(0, 10) + ".xlsx");
  toast("✓ Excel exported");
}

function exportPDF() {
  const { model, monthly, invs, res, sel } = getExportData();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const sig = "Crafted by Vamsi Yedlapalli | github.com/LoneWolfDen";
  doc.setFontSize(16);
  doc.text("Project Finance Report", 14, 18);
  doc.setFontSize(9);
  doc.text(
    "Generated: " +
      new Date().toISOString().slice(0, 16) +
      "  |  Filter: " +
      (selectedPoTeams.length ? selectedPoTeams.join(", ") : "All"),
    14,
    25,
  );
  if (sel.summary) {
    doc.setFontSize(12);
    doc.text("Summary", 14, 34);
    doc.autoTable({
      startY: 37,
      head: [["Metric", "Value"]],
      body: [
        ["PO Value (" + model.fc.currency + ")", fmtMoney(model.fc.totalPOValue)],
        ["PO Value (" + model.fc.normCurrency + ")", fmtMoney(model.fc.normPO, "$")],
        ["Total Forecast", fmtMoney(model.fc.total)],
        ["Total Actuals", fmtMoney(model.totalActuals)],
        ["Expenses", fmtMoney(model.totalExpenses)],
        ["Remaining", fmtMoney(model.remaining)],
        ["Burn Rate/Day", fmtMoney(model.fc.rate)],
      ],
      theme: "grid",
      styles: { fontSize: 8 },
    });
  }
  if (sel.chart_spend || sel.chart_burn) {
    const canvases = document.querySelectorAll("canvas");
    canvases.forEach((c, i) => {
      if (!c.width) return;
      try {
        const img = c.toDataURL("image/png");
        doc.addPage();
        doc.addImage(img, "PNG", 10, 10, 190, 90);
      } catch (e) {}
    });
  }
  if (sel.monthly) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Monthly Burndown", 14, 18);
    doc.autoTable({
      startY: 22,
      head: [["Month", "Forecast", "Actuals", "Variance", "Fc Burn", "Act Burn"]],
      body: monthly.map((m) => [
        m.Month,
        fmtMoney(m["Forecast Spend"]),
        fmtMoney(m["Actuals Spend"]),
        fmtMoney(m.Variance),
        fmtMoney(m["Forecast Burn"]),
        fmtMoney(m["Actuals Burn"]),
      ]),
      theme: "striped",
      styles: { fontSize: 7 },
    });
  }
  if (sel.resources && res.length) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Resources (" + res.length + ")", 14, 18);
    doc.autoTable({
      startY: 22,
      head: [["Name", "Role", "PO_Team", "Start", "End", "Rate", "Alloc", "£/Day"]],
      body: res
        .slice(0, 40)
        .map((r) => [
          r.name,
          r.role || "",
          r.po_team || "",
          r.start,
          r.end,
          "£" + r.bill_rate,
          r.alloc * 100 + "%",
          "£" + (r.bill_rate * r.alloc * 8).toFixed(0),
        ]),
      theme: "striped",
      styles: { fontSize: 6 },
    });
  }
  if (sel.invoices && invs.length) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Invoices (" + invs.length + ")", 14, 18);
    doc.autoTable({
      startY: 22,
      head: [["PO_Team", "Invoice", "Period", "Amount", "Status"]],
      body: invs.map((i) => [
        i.po_team,
        i.invoice_number,
        i.period_from + " → " + i.period_to,
        fmtMoney(i.amount),
        i.status,
      ]),
      theme: "striped",
      styles: { fontSize: 7 },
    });
  }
  if (sel.expenses && model.filteredExpenses.length) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Expenses (" + model.filteredExpenses.length + ")", 14, 18);
    doc.autoTable({
      startY: 22,
      head: [["Name", "Date", "Amount", "Currency", "PO_Team", "Description"]],
      body: model.filteredExpenses.map((e) => [
        e.name,
        e.date,
        fmtMoney(e.amount),
        e.currency,
        e.po_team || "",
        e.desc,
      ]),
      theme: "striped",
      styles: { fontSize: 7 },
    });
  }
  if (sel.rollover && model.fc.rolloverByYear && Object.keys(model.fc.rolloverByYear).length > 1) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text("PO Rollover", 14, 18);
    doc.autoTable({
      startY: 22,
      head: [["Year", "PO Value", "Carry-In", "Available", "Spent", "Unused", "Rollover?"]],
      body: Object.entries(model.fc.rolloverByYear)
        .sort((a, b) => a[0] - b[0])
        .map(([yr, d]) => [
          yr,
          fmtMoney(d.poValue),
          fmtMoney(d.carryIn),
          fmtMoney(d.available),
          fmtMoney(d.spent),
          fmtMoney(d.unused),
          d.rollover_allowed ? "Yes" : "No",
        ]),
      theme: "grid",
      styles: { fontSize: 8 },
    });
  }
  // Signature
  const pg = doc.internal.getNumberOfPages();
  doc.setPage(pg);
  doc.setFontSize(7);
  doc.setTextColor(180);
  doc.text(sig, 14, doc.internal.pageSize.height - 5);
  doc.setTextColor(0);
  doc.save("Finance_Report_" + new Date().toISOString().slice(0, 10) + ".pdf");
  toast("✓ PDF exported");
}

function exportPPTX() {
  const { model, monthly, invs, res, sel } = getExportData();
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const titleColor = "1A1A2E";
  const hdrOpts = { fill: "1A1A2E", color: "FFFFFF", bold: true, fontSize: 9 };
  const cellOpts = { fontSize: 8 };
  const sigTxt = "🐺 Crafted by Vamsi Yedlapalli | github.com/LoneWolfDen";
  const sigOpts = { x: 0.5, y: 7.2, fontSize: 7, color: "AAAAAA", italic: true };

  if (sel.summary) {
    let slide = pptx.addSlide();
    slide.addText("Project Finance Summary", { x: 0.5, y: 0.2, fontSize: 22, bold: true, color: titleColor });
    slide.addText(
      "Generated: " +
        new Date().toISOString().slice(0, 16) +
        "  |  Filter: " +
        (selectedPoTeams.length ? selectedPoTeams.join(", ") : "All Projects"),
      { x: 0.5, y: 0.6, fontSize: 10, color: "666666" },
    );
    const summaryRows = [
      ["PO Value (" + model.fc.currency + ")", fmtMoney(model.fc.totalPOValue)],
      ["PO Value (" + model.fc.normCurrency + ")", fmtMoney(model.fc.normPO, "$")],
      ["Total Forecast", fmtMoney(model.fc.total)],
      ["Total Actuals", fmtMoney(model.totalActuals)],
      ["Expenses", fmtMoney(model.totalExpenses)],
      ["Remaining Budget", fmtMoney(model.remaining)],
      ["Burn Rate/Day", fmtMoney(model.fc.rate)],
    ];
    slide.addTable(
      [
        [
          { text: "Metric", options: hdrOpts },
          { text: "Value", options: hdrOpts },
        ],
        ...summaryRows.map((r) => [
          { text: r[0], options: cellOpts },
          { text: r[1], options: { ...cellOpts, bold: true } },
        ]),
      ],
      { x: 0.5, y: 1.0, w: 5, border: { type: "solid", pt: 0.5, color: "CCCCCC" }, colW: [2.5, 2.5] },
    );
    slide.addText(sigTxt, sigOpts);
  }

  if (sel.monthly) {
    let slide = pptx.addSlide();
    slide.addText("Monthly Burndown", { x: 0.5, y: 0.2, fontSize: 20, bold: true, color: titleColor });
    const mHdr = [
      { text: "Month", options: hdrOpts },
      { text: "Forecast", options: hdrOpts },
      { text: "Actuals", options: hdrOpts },
      { text: "Variance", options: hdrOpts },
      { text: "Fc Burn", options: hdrOpts },
      { text: "Act Burn", options: hdrOpts },
    ];
    const mRows = monthly.map((m) => [
      { text: m.Month, options: cellOpts },
      { text: fmtMoney(m["Forecast Spend"]), options: cellOpts },
      { text: fmtMoney(m["Actuals Spend"]), options: cellOpts },
      { text: fmtMoney(m.Variance), options: { ...cellOpts, color: m.Variance > 0 ? "C62828" : "2E7D32" } },
      { text: fmtMoney(m["Forecast Burn"]), options: cellOpts },
      { text: fmtMoney(m["Actuals Burn"]), options: cellOpts },
    ]);
    slide.addTable([mHdr, ...mRows], {
      x: 0.3,
      y: 0.6,
      w: 12.5,
      border: { type: "solid", pt: 0.5, color: "CCCCCC" },
      colW: [1.5, 2.2, 2.2, 2.2, 2.2, 2.2],
      autoPage: true,
    });
  }

  if (sel.chart_spend) {
    let slide = pptx.addSlide();
    slide.addText("Forecast vs Actuals (Monthly Spend)", {
      x: 0.5,
      y: 0.2,
      fontSize: 20,
      bold: true,
      color: titleColor,
    });
    const chartLabels = monthly.map((m) => m.Month);
    const fcData = monthly.map((m) => m["Forecast Spend"] || 0);
    const actData = monthly.map((m) => m["Actuals Spend"] || 0);
    slide.addChart(
      pptx.charts.BAR,
      [
        { name: "Forecast", labels: chartLabels, values: fcData },
        { name: "Actuals", labels: chartLabels, values: actData },
      ],
      {
        x: 0.5,
        y: 0.7,
        w: 12,
        h: 6.3,
        showValue: false,
        catAxisLabelFontSize: 8,
        valAxisLabelFontSize: 8,
        legendFontSize: 9,
        chartColors: ["2196F3", "4CAF50"],
      },
    );
  }

  if (sel.chart_burn) {
    let slide = pptx.addSlide();
    slide.addText("PO Burndown", { x: 0.5, y: 0.2, fontSize: 20, bold: true, color: titleColor });
    const fcBurn = monthly.map((m) => m["Forecast Burn"] || 0);
    const actBurn = monthly.map((m) => m["Actuals Burn"] || 0);
    slide.addChart(
      pptx.charts.LINE,
      [
        { name: "Forecast Burn", labels: monthly.map((m) => m.Month), values: fcBurn },
        { name: "Actuals Burn", labels: monthly.map((m) => m.Month), values: actBurn },
      ],
      {
        x: 0.5,
        y: 0.7,
        w: 12,
        h: 6.3,
        showValue: false,
        catAxisLabelFontSize: 8,
        valAxisLabelFontSize: 8,
        legendFontSize: 9,
        chartColors: ["2196F3", "4CAF50"],
        lineSmooth: true,
      },
    );
  }

  if (sel.resources && res.length) {
    let slide = pptx.addSlide();
    slide.addText("Resource Allocation (" + res.length + " rules)", {
      x: 0.5,
      y: 0.2,
      fontSize: 20,
      bold: true,
      color: titleColor,
    });
    const rHdr = [
      { text: "Name", options: hdrOpts },
      { text: "Role", options: hdrOpts },
      { text: "PO_Team", options: hdrOpts },
      { text: "Start", options: hdrOpts },
      { text: "End", options: hdrOpts },
      { text: "Rate", options: hdrOpts },
      { text: "Alloc", options: hdrOpts },
      { text: "£/Day", options: hdrOpts },
    ];
    const rRows = res.slice(0, 20).map((r) => [
      { text: r.name, options: cellOpts },
      { text: r.role || "", options: cellOpts },
      { text: r.po_team || "", options: { fontSize: 7 } },
      { text: r.start, options: cellOpts },
      { text: r.end, options: cellOpts },
      { text: "£" + r.bill_rate, options: cellOpts },
      { text: r.alloc * 100 + "%", options: cellOpts },
      { text: "£" + (r.bill_rate * r.alloc * 8).toFixed(0), options: cellOpts },
    ]);
    slide.addTable([rHdr, ...rRows], {
      x: 0.2,
      y: 0.6,
      w: 13,
      border: { type: "solid", pt: 0.5, color: "CCCCCC" },
      colW: [1.5, 1.8, 2.5, 1.2, 1.2, 1, 0.8, 1],
      autoPage: true,
    });
    if (res.length > 20)
      slide.addText("Showing 20 of " + res.length + " resources", {
        x: 0.5,
        y: 7.0,
        fontSize: 8,
        color: "888888",
      });
  }

  if (sel.invoices && invs.length) {
    let slide = pptx.addSlide();
    slide.addText("Invoices (" + invs.length + ")", {
      x: 0.5,
      y: 0.2,
      fontSize: 20,
      bold: true,
      color: titleColor,
    });
    const iHdr = [
      { text: "PO_Team", options: hdrOpts },
      { text: "Invoice #", options: hdrOpts },
      { text: "From", options: hdrOpts },
      { text: "To", options: hdrOpts },
      { text: "Amount", options: hdrOpts },
      { text: "Status", options: hdrOpts },
    ];
    const iRows = invs.slice(0, 20).map((i) => [
      { text: i.po_team || "", options: { fontSize: 7 } },
      { text: i.invoice_number || "", options: cellOpts },
      { text: i.period_from, options: cellOpts },
      { text: i.period_to, options: cellOpts },
      { text: fmtMoney(i.amount), options: cellOpts },
      {
        text: i.status,
        options: {
          ...cellOpts,
          color: i.status === "Paid" ? "2E7D32" : i.status === "Submitted" ? "E65100" : "666666",
        },
      },
    ]);
    slide.addTable([iHdr, ...iRows], {
      x: 0.3,
      y: 0.6,
      w: 12.5,
      border: { type: "solid", pt: 0.5, color: "CCCCCC" },
      colW: [3, 2, 1.5, 1.5, 1.5, 1.5],
      autoPage: true,
    });
  }

  if (sel.rollover && model.fc.rolloverByYear && Object.keys(model.fc.rolloverByYear).length > 1) {
    let slide = pptx.addSlide();
    slide.addText("Multi-Year PO Rollover", { x: 0.5, y: 0.2, fontSize: 20, bold: true, color: titleColor });
    const roHdr = [
      { text: "Year", options: hdrOpts },
      { text: "PO Value", options: hdrOpts },
      { text: "Carry-In", options: hdrOpts },
      { text: "Available", options: hdrOpts },
      { text: "Spent", options: hdrOpts },
      { text: "Unused", options: hdrOpts },
      { text: "Rollover?", options: hdrOpts },
    ];
    const roRows = Object.entries(model.fc.rolloverByYear)
      .sort((a, b) => a[0] - b[0])
      .map(([yr, d]) => [
        { text: yr, options: { ...cellOpts, bold: true } },
        { text: fmtMoney(d.poValue), options: cellOpts },
        { text: fmtMoney(d.carryIn), options: cellOpts },
        { text: fmtMoney(d.available), options: cellOpts },
        { text: fmtMoney(d.spent), options: cellOpts },
        { text: fmtMoney(d.unused), options: { ...cellOpts, color: d.unused > 0 ? "4CAF50" : "C62828" } },
        { text: d.rollover_allowed ? "Yes" : "No", options: cellOpts },
      ]);
    slide.addTable([roHdr, ...roRows], {
      x: 0.5,
      y: 0.7,
      w: 12,
      border: { type: "solid", pt: 0.5, color: "CCCCCC" },
      colW: [1.2, 2, 2, 2, 2, 2, 1],
    });
  }

  pptx.writeFile({ fileName: "Finance_Report_" + new Date().toISOString().slice(0, 10) + ".pptx" });
  toast("✓ PowerPoint exported");
}
