// ⏱️ Utilization tab.

function renderUtilization(model) {
  const cfg = model.cfg;
  const validTeams = new Set((cfg.po_details || []).map((p) => (p.PO_Team_Identifier || "").replace(/\s+/g, "")));
  const normFilter = selectedPoTeams.length ? selectedPoTeams.map((t) => t.replace(/\s+/g, "")) : null;
  const fullCfg = loadWork();
  const resources = (fullCfg.resources || []).filter((r) => {
    const t = (r.po_team || "").replace(/\s+/g, "");
    if (!validTeams.has(t)) return false;
    return normFilter ? normFilter.includes(t) : true;
  });
  // Group by person
  const byPerson = {};
  resources.forEach((r) => {
    const key = r.empl_id + "|" + r.name;
    if (!byPerson[key]) byPerson[key] = { name: r.name, empl_id: r.empl_id, rules: [], totalAvail: 0, totalActual: 0 };
    byPerson[key].rules.push(r);
  });
  Object.values(byPerson).forEach((p) => {
    p.rules.forEach((r) => {
      const s = new Date(r.start),
        e = new Date(r.end);
      if (isNaN(s) || isNaN(e)) return;
      let d = new Date(s);
      while (d <= e) {
        if (isWorkingDay(d, r.location)) p.totalAvail += 8 * r.alloc;
        d = new Date(d.getTime() + 86400000);
      }
    });
  });
  // Compute actual hours + per-project coverage (UNFILTERED for date range table)
  const projCoverage = {};
  const allProjToTeam = {};
  (fullCfg.resources || []).forEach((r) => {
    const t = (r.po_team || "").replace(/\s+/g, "");
    if (r.projectID && t) allProjToTeam[r.projectID] = t;
  });
  (fullCfg.po_details || []).forEach((p) => {
    const t = (p.PO_Team_Identifier || "").replace(/\s+/g, "");
    if (p.ProjectID && t) allProjToTeam[p.ProjectID] = t;
  });
  if (fullCfg.raw_actuals && fullCfg.raw_actuals.length) {
    fullCfg.raw_actuals.forEach((row) => {
      const eid = parseInt(row["Empl ID"] || 0);
      const key = Object.keys(byPerson).find((k) => k.startsWith(eid + "|"));
      const dt = parseDate(row["Reported Dt"] || "", "us");
      const projId = row["Project ID"] || "";
      const team = allProjToTeam[parseInt(projId)] || "";
      if (dt && projId) {
        if (!projCoverage[projId]) projCoverage[projId] = { min: dt, max: dt, team, rows: 0 };
        if (dt < projCoverage[projId].min) projCoverage[projId].min = dt;
        if (dt > projCoverage[projId].max) projCoverage[projId].max = dt;
        projCoverage[projId].rows++;
      }
      if (!key) return;
      const reg = parseFloat(row["Regular Hours"] || 0);
      const ot = parseFloat(row["Overtime Hours"] || 0);
      const rule = byPerson[key].rules[0];
      const hm = rule ? rule.hour_mult : 1;
      byPerson[key].totalActual += (reg + ot) * (hm === 8 ? 8 : 1);
      if (dt) {
        if (!byPerson[key].minDt || dt < byPerson[key].minDt) byPerson[key].minDt = dt;
        if (!byPerson[key].maxDt || dt > byPerson[key].maxDt) byPerson[key].maxDt = dt;
      }
    });
  }
  const people = Object.values(byPerson);
  const overUtil = people.filter((p) => p.totalAvail > 0 && p.totalActual > p.totalAvail);
  const underUtil = people.filter((p) => p.totalAvail > 0 && p.totalActual > 0 && p.totalActual < p.totalAvail * 0.7);
  const noData = people.filter((p) => p.totalActual === 0);
  const totalHrs = (key) => Math.round(people.reduce((s, p) => s + p[key], 0)).toLocaleString();
  let html = '<div class="cards">';
  html += statCard("b", "People", people.length);
  html += statCard("g", "Total Available Hrs", totalHrs("totalAvail"));
  html += statCard("o", "Total Actual Hrs", totalHrs("totalActual"));
  html += statCard("r", "Over-utilized", overUtil.length);
  html += `<div class="card" style="border-left-color:#ff9800"><h3>Under-utilized (&lt;70%)</h3><div class="v">${underUtil.length}</div></div>`;
  html += statCard("", "No Actuals Data", noData.length);
  html += "</div>";

  // ── PROJECT TIMELINE VIEW (resources grouped by project) ──
  html += `<div class="box" id="projTimeline"><h2>📅 Project Resource Timeline ${expandCollapseButtons("projTimeline")}</h2>`;
  html += '<p style="font-size:.72rem;color:#666;margin-bottom:.5rem">';
  html +=
    "Resources allocated per project within the PO_Team. Bar width = allocation period, opacity = allocation %.</p>";
  // Group resources by projectID
  const byProject = {};
  resources.forEach((r) => {
    const pid = r.projectID || "Unknown";
    if (!byProject[pid]) byProject[pid] = [];
    byProject[pid].push(r);
  });
  const allStarts = resources.map((r) => new Date(r.start)).filter((d) => !isNaN(d));
  const allEnds = resources.map((r) => new Date(r.end)).filter((d) => !isNaN(d));
  const tlStart = allStarts.length ? new Date(Math.min(...allStarts)) : new Date("2025-01-01");
  const tlEnd = allEnds.length ? new Date(Math.max(...allEnds)) : new Date("2026-12-31");
  const tlSpan = tlEnd - tlStart || 1;
  const colors = ["#5c6bc0", "#26a69a", "#e65100", "#8e24aa", "#2e7d32", "#c62828", "#1565c0", "#4e342e", "#00838f"];
  html += '<div class="tl-scroll"><div class="tl-inner">';
  html += monthAxis(tlStart, tlEnd, tlSpan, 140, 18);
  let colorIdx = 0;
  Object.entries(byProject).forEach(([pid, members]) => {
    const team = members[0] ? members[0].po_team || "" : "";
    const byPersonProj = {};
    members.forEach((r) => {
      const key = `${r.empl_id}|${r.name}`;
      if (!byPersonProj[key]) byPersonProj[key] = [];
      byPersonProj[key].push(r);
    });
    html += `<div class="grp-hdr" onclick="toggleGrp(this)">Project ${pid} · ${team} (${Object.keys(byPersonProj).length} people)</div><div class="grp-rows">`;
    Object.entries(byPersonProj).forEach(([key, rules]) => {
      const [eid, name] = key.split("|");
      html += `<div class="tl-row"><span class="nm">${name}</span><div class="ba">`;
      rules.forEach((r) => {
        const rs = new Date(r.start),
          re = new Date(r.end);
        if (isNaN(rs) || isNaN(re) || rs > re) return;
        const left = Math.max(0, ((rs - tlStart) / tlSpan) * 100).toFixed(1);
        const width = Math.max(1, ((re - rs) / tlSpan) * 100).toFixed(1);
        const barStyle = `left:${left}%;width:${width}%;background:${colors[colorIdx % colors.length]};opacity:${0.6 + r.alloc * 0.4}`;
        const tooltip = `${r.role} · ${r.alloc * 100}% · ${rateSymbol(model, r)}${r.bill_rate}/hr`;
        html += `<div class="br" style="${barStyle}" title="${tooltip}">${r.alloc * 100}% ${r.role || ""}</div>`;
      });
      html += `</div></div>`;
      colorIdx++;
    });
    html += "</div>";
  });
  if (!resources.length) html += '<p style="color:#888;font-size:.8rem">No resources for selected filter</p>';
  html += "</div></div></div>";

  // ── UTILIZATION TABLE ──
  const utilCols = [
    "Name ⇅",
    "EmplID ⇅",
    "PO_Team",
    "Available Hrs ⇅",
    "Actual Hrs ⇅",
    "Utilization % ⇅",
    "Status",
    "Actuals Period",
  ];
  html += `<div class="tw"><table>${tableHead(utilCols)}<tbody>`;
  people.sort((a, b) => {
    const ua = a.totalAvail ? a.totalActual / a.totalAvail : 0;
    const ub = b.totalAvail ? b.totalActual / b.totalAvail : 0;
    return ub - ua;
  });
  people.forEach((p) => {
    const pct = p.totalAvail ? Math.round((p.totalActual / p.totalAvail) * 100) : 0;
    const hasActuals = p.totalActual > 0;
    const status = !hasActuals ? "⚪ No Data" : pct > 100 ? "🔴 Over" : pct >= 70 ? "🟢 OK" : "🟡 Under";
    const color = !hasActuals
      ? "color:#888"
      : pct > 100
        ? "color:#c62828"
        : pct >= 70
          ? "color:#2e7d32"
          : "color:#e65100";
    const teams = [...new Set(p.rules.map((r) => r.po_team))].join(", ");
    const period = p.minDt ? `${p.minDt} → ${p.maxDt}` : "—";
    html += tableRow([
      p.name,
      p.empl_id,
      cell(teams, "font-size:.65rem"),
      Math.round(p.totalAvail),
      Math.round(p.totalActual),
      cell(pct + "%", "font-weight:700;" + color),
      status,
      cell(period, "font-size:.65rem"),
    ]);
  });
  html += "</tbody></table></div>";
  if (!fullCfg.raw_actuals || !fullCfg.raw_actuals.length)
    html +=
      '<p style="color:#888;font-size:.8rem;margin-top:1rem">⚠️ Upload timesheet actuals to see actual hours utilization.</p>';

  // ── ACTUALS DATE RANGE BY PROJECT (UNFILTERED — shows ALL projects) ──
  const allProjEntries = Object.entries(projCoverage);
  if (allProjEntries.length) {
    html += '<div class="box" style="margin-top:1rem"><h2>📊 Actuals Date Range by Project ';
    html += '<span style="font-size:.7rem;font-weight:400;color:#888">(All projects — no filter impact)</span></h2>';
    html += '<p style="font-size:.72rem;color:#666;margin-bottom:.5rem">';
    html += "Shows data availability across all projects regardless of Year/PO_Team filter selection.</p>";
    html += `<div class="tw"><table id="tblDateRange">${tableHead(DATE_RANGE_COLS)}<tbody>`;
    allProjEntries
      .sort((a, b) => a[0] - b[0])
      .forEach(([pid, d]) => {
        const days = Math.max(1, Math.round((new Date(d.max) - new Date(d.min)) / 86400000));
        const weeks = Math.max(1, Math.ceil(days / 7));
        const avgPerWeek = Math.round((d.rows / weeks) * 10) / 10;
        html += tableRow([
          pid,
          cell(d.team, "font-size:.65rem"),
          d.min,
          d.max,
          d.rows.toLocaleString(),
          days,
          avgPerWeek,
        ]);
      });
    html += "</tbody></table></div></div>";
  }

  // ── MONTHLY ACTUALS (COLLAPSIBLE, filtered by slicer) ──
  const filteredProj = Object.entries(projCoverage).filter(([pid, d]) => {
    const t = (d.team || "").replace(/\s+/g, "");
    if (!validTeams.has(t)) return false;
    return normFilter ? normFilter.includes(t) : true;
  });
  if (filteredProj.length) {
    html += '<div class="box" style="margin-top:1rem">';
    html += collapsibleHeader(`📈 Monthly Actuals (Filtered by Slicer) — ${filteredProj.length} projects`);
    html += '<div class="collapsible-body">';
    const monthlyCols = ["Project ID ⇅", "PO_Team", "From ⇅", "To ⇅", "Rows ⇅", "Weeks"];
    html += `<div class="tw"><table>${tableHead(monthlyCols)}<tbody>`;
    filteredProj.forEach(([pid, d]) => {
      const weeks = Math.max(1, Math.round((new Date(d.max) - new Date(d.min)) / 604800000) + 1);
      html += tableRow([pid, cell(d.team, "font-size:.65rem"), d.min, d.max, d.rows, weeks]);
    });
    html += "</tbody></table></div></div></div>";
  }
  return html;
}
