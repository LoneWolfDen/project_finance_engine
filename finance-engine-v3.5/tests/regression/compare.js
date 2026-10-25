// usage: node compare.js base.json new.json  → exits 1 and prints first diffs if snapshots differ
const [a, b] = process.argv.slice(2).map((f) => require(require("path").resolve(f)));
const diffs = [];
(function walk(x, y, p) {
  if (diffs.length > 8) return;
  if (typeof x !== typeof y || Array.isArray(x) !== Array.isArray(y)) return diffs.push(`${p}: type ${typeof x} vs ${typeof y}`);
  if (x && typeof x === "object") {
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], p + "." + k);
  } else if (x !== y) {
    if (typeof x === "string") {
      let i = 0; while (x[i] === y[i]) i++;
      diffs.push(`${p} @${i}:\n   base: …${x.slice(Math.max(0, i - 80), i + 120)}\n   new : …${y.slice(Math.max(0, i - 80), i + 120)}`);
    } else diffs.push(`${p}: ${JSON.stringify(x)} vs ${JSON.stringify(y)}`);
  }
})(a, b, "");
if (b.errors.length) console.log("NEW ERRORS:", b.errors);
if (diffs.length) { console.log("DIFF:\n" + diffs.join("\n")); process.exit(1); }
console.log("IDENTICAL: all tabs, charts, chat, exports match baseline");
