// 🔀 Scenarios tab: save, load and compare what-if copies of the working config.

function renderScenarios(model) {
  const scenarios = JSON.parse(localStorage.getItem("pf_scenarios") || "{}");
  const names = Object.keys(scenarios);
  let html = '<div class="cards">';
  html += statCard("b", "Saved Scenarios", names.length);
  html += statCard("g", "Current Working", "Active");
  html += "</div>";
  // Save current as scenario
  html += '<div class="box"><h2>Save Current as Scenario</h2>';
  html += '<div style="display:flex;gap:.5rem;align-items:center">';
  html += '<input type="text" id="scenName" placeholder="Scenario name (e.g. With Contractor X)" ';
  html += 'style="flex:1;padding:.4rem;border:1px solid #ddd;border-radius:4px;font-size:.8rem">';
  html += '<button class="btn btn-green" onclick="saveScenario()">💾 Save Scenario</button></div></div>';
  // List saved scenarios
  if (names.length) {
    const cols = ["Name", "Resources", "POs", "Total Forecast", "Saved", "Actions"];
    html += `<div class="box"><h2>Saved Scenarios</h2><div class="tw"><table>${tableHead(cols)}<tbody>`;
    names.forEach((n) => {
      const s = scenarios[n];
      const jsName = n.replace(/'/g, "\\'");
      const actions =
        `<button class="btn btn-blue" style="font-size:.65rem" onclick="loadScenario('${jsName}')">Load</button> ` +
        `<button class="btn btn-red" style="font-size:.65rem" onclick="deleteScenario('${jsName}')">🗑️</button>`;
      html += tableRow([
        `<strong>${n}</strong>`,
        (s.resources || []).length,
        (s.po_details || []).length,
        fmtMoney(s._forecast || 0),
        cell(s._saved || "—", "font-size:.65rem"),
        actions,
      ]);
    });
    html += "</tbody></table></div></div>";
  }
  // Compare side-by-side
  if (names.length >= 1) {
    html += '<div class="box"><h2>Compare Scenarios</h2>';
    html += '<div style="display:flex;gap:.5rem;align-items:center;margin-bottom:1rem">';
    html +=
      '<select id="scenA" style="padding:.4rem;border:1px solid #ddd;border-radius:4px;font-size:.8rem"><option value="_current">Current Working</option>';
    names.forEach((n) => {
      html += `<option value="${n}">${n}</option>`;
    });
    html += '</select><span style="font-weight:700">vs</span>';
    html += '<select id="scenB" style="padding:.4rem;border:1px solid #ddd;border-radius:4px;font-size:.8rem">';
    names.forEach((n) => {
      html += `<option value="${n}">${n}</option>`;
    });
    html += '</select><button class="btn btn-blue" onclick="compareScenarios()">Compare</button></div>';
    html += '<div id="scenCompare"></div></div>';
  }
  return html;
}

function saveScenario() {
  const name = document.getElementById("scenName").value.trim();
  if (!name) {
    toast("Enter a scenario name", false);
    return;
  }
  const cfg = loadWork();
  const fc = computeForecast(cfg, []);
  cfg._forecast = fc.total;
  cfg._saved = new Date().toISOString().slice(0, 16);
  const scenarios = JSON.parse(localStorage.getItem("pf_scenarios") || "{}");
  scenarios[name] = cfg;
  localStorage.setItem("pf_scenarios", JSON.stringify(scenarios));
  toast('✓ Scenario "' + name + '" saved');
  render();
}

function loadScenario(name) {
  const scenarios = JSON.parse(localStorage.getItem("pf_scenarios") || "{}");
  if (!scenarios[name]) return;
  const cfg = scenarios[name];
  delete cfg._forecast;
  delete cfg._saved;
  saveWork(cfg);
  toast('✓ Loaded scenario "' + name + '"');
  render();
}

function deleteScenario(name) {
  const scenarios = JSON.parse(localStorage.getItem("pf_scenarios") || "{}");
  delete scenarios[name];
  localStorage.setItem("pf_scenarios", JSON.stringify(scenarios));
  toast('✓ Deleted "' + name + '"');
  render();
}

function compareScenarios() {
  const aName = document.getElementById("scenA").value;
  const bName = document.getElementById("scenB").value;
  const scenarios = JSON.parse(localStorage.getItem("pf_scenarios") || "{}");
  const cfgA = aName === "_current" ? loadWork() : scenarios[aName];
  const cfgB = scenarios[bName];
  if (!cfgA || !cfgB) {
    toast("Select two valid scenarios", false);
    return;
  }
  const fcA = computeForecast(cfgA, []);
  const fcB = computeForecast(cfgB, []);
  const resA = cfgA.resources || [],
    resB = cfgB.resources || [];
  let html = `<table>${tableHead(["Metric", aName === "_current" ? "Current" : aName, bName, "Difference"])}<tbody>`;
  const rows = [
    ["Resources", resA.length, resB.length],
    ["People", [...new Set(resA.map((r) => r.name))].length, [...new Set(resB.map((r) => r.name))].length],
    ["Total Forecast", fcA.total, fcB.total],
    ["PO Value", fcA.totalPOValue, fcB.totalPOValue],
    ["Burn Rate/Day", fcA.rate, fcB.rate],
    ["Forecast Days", fcA.days, fcB.days],
  ];
  rows.forEach(([label, a, b]) => {
    const diff = typeof a === "number" ? a - b : 0;
    const diffStr = typeof a === "number" ? (diff > 0 ? "+" : "") + fmtMoney(diff) : "—";
    const color = diff > 0 ? "color:#c62828" : diff < 0 ? "color:#2e7d32" : "";
    const fmt = (x) => (typeof x === "number" ? fmtMoney(x) : x);
    html += tableRow([`<strong>${label}</strong>`, fmt(a), fmt(b), cell(diffStr, color + ";font-weight:600")]);
  });
  html += "</tbody></table>";
  // Resource diff
  const namesA = new Set(resA.map((r) => r.name)),
    namesB = new Set(resB.map((r) => r.name));
  const added = [...namesB].filter((n) => !namesA.has(n));
  const removed = [...namesA].filter((n) => !namesB.has(n));
  if (added.length || removed.length) {
    html += '<div style="margin-top:.8rem;font-size:.78rem">';
    if (added.length) html += `<p style="color:#2e7d32">➕ In ${bName} only: ${added.join(", ")}</p>`;
    if (removed.length)
      html += `<p style="color:#c62828">➖ In ${aName === "_current" ? "Current" : aName} only: ${removed.join(", ")}</p>`;
    html += "</div>";
  }
  document.getElementById("scenCompare").innerHTML = html;
}
