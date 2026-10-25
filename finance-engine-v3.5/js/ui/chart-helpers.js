// Shared Chart.js setup for the tab charts (each tab draws its own in tabs/*.js).

// Draws a chart on the canvas with this id and tracks it so render() can destroy it.
// Returns false when the canvas isn't on the page.
function addChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return false;
  charts.push(new Chart(canvas, config));
  return true;
}

// Value labels ("£12k") on bars/points, shown when "Show Data Labels" is ticked.
// skipZero: also hide labels for 0 (the Overview chart treats 0 as "no value").
function kLabels({ size = 10, skipZero = false, symbol = moneySymbol } = {}) {
  return {
    display: showDataLabels,
    formatter: (v) => ((skipZero ? v : v != null) ? symbol + Math.round(v / 1000) + "k" : ""),
    font: { size },
    anchor: "end",
    align: "top",
  };
}

// Axis ticks as money: 12000 -> "£12,000"
function moneyTicks(symbol = moneySymbol) {
  return { callback: (v) => symbol + v.toLocaleString() };
}
