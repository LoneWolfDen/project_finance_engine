// Working and master config: server API (SQLite via server.py) with a localStorage fallback.

const K_WORK = "pf_working",
  K_MASTER = "pf_master";

let _cache = { work: null, master: null };

// Saves go to the server one after another, so a slow request can't land after a newer one
let saveQueue = Promise.resolve();
function postConfig(url, cfg) {
  const body = JSON.stringify(cfg);
  saveQueue = saveQueue
    .then(() => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body }))
    .catch(() => {});
}
// The browser copy is a fallback only; a large timesheet can exceed its ~5 MB limit
function storeLocally(key, cfg) {
  try {
    localStorage.setItem(key, JSON.stringify(cfg));
  } catch (e) {
    localStorage.removeItem(key);
  }
}

function loadWork() {
  if (_cache.work) return JSON.parse(JSON.stringify(_cache.work));
  try {
    const s = localStorage.getItem(K_WORK);
    return s ? JSON.parse(s) : JSON.parse(JSON.stringify(DEFAULTS));
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

function saveWork(cfg) {
  _cache.work = cfg;
  postConfig("/api/config", cfg);
  storeLocally(K_WORK, cfg);
}

function loadMaster() {
  if (_cache.master) return JSON.parse(JSON.stringify(_cache.master));
  try {
    const s = localStorage.getItem(K_MASTER);
    return s ? JSON.parse(s) : JSON.parse(JSON.stringify(DEFAULTS));
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

function saveMaster(cfg) {
  _cache.master = cfg;
  postConfig("/api/config/master", cfg);
  storeLocally(K_MASTER, cfg);
}

// Settings → Save history: earlier versions of the working config kept by the server
async function loadHistory() {
  const box = document.getElementById("historyList");
  if (!box) return;
  await saveQueue; // include the latest save
  try {
    const list = await (await fetch("/api/history")).json();
    box.innerHTML = historyTable(list);
  } catch (e) {
    box.innerHTML = '<p style="font-size:.75rem;color:#c62828">Save history needs the server (python3 server.py).</p>';
  }
}
function historyTable(list) {
  if (!list.length)
    return '<p style="font-size:.75rem;color:#888">No earlier versions yet — they appear after the next save.</p>';
  const cols = ["Saved", "POs", "Resources", "Invoices", "Expenses", "Timesheet rows", "Versions", ""];
  let html = `<div class="tw"><table id="tblHistory">${tableHead(cols)}<tbody>`;
  list.forEach((h) => {
    const c = h.counts;
    html += tableRow([
      new Date(h.saved_at.replace(" ", "T") + "Z").toLocaleString("en-GB"),
      c.po_details,
      c.resources,
      c.invoices,
      c.expenses,
      c.raw_actuals,
      c.resource_versions,
      `<button class="btn btn-orange" style="font-size:.65rem" onclick="restoreHistory(${h.id})">↩️ Restore</button>`,
    ]);
  });
  return html + "</tbody></table></div>";
}
async function restoreHistory(id) {
  if (!confirm("Restore this saved version as the working config?\n\nThe current one is kept in the history.")) return;
  await saveQueue;
  const res = await fetch(`/api/history/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return toast("✗ Could not restore that version", false);
  const cfg = await res.json();
  _cache.work = cfg;
  storeLocally(K_WORK, cfg);
  toast("✓ Restored the saved version");
  render();
}

function restoreFromMaster() {
  const m = loadMaster();
  saveWork(JSON.parse(JSON.stringify(m)));
  toast("✓ Restored from Master");
}

// Load from server on startup (async, updates cache + localStorage)
async function initFromServer() {
  try {
    const [wRes, mRes] = await Promise.all([fetch("/api/config"), fetch("/api/config/master")]);
    if (wRes.ok) {
      const d = await wRes.json();
      if (d) {
        _cache.work = d;
        storeLocally(K_WORK, d);
      }
    }
    if (mRes.ok) {
      const d = await mRes.json();
      if (d) {
        _cache.master = d;
        storeLocally(K_MASTER, d);
      }
    }
    render();
  } catch (e) {
    /* server unavailable, use localStorage */
  }
}
