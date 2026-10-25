// Working and master config: server API (SQLite via server.py) with a localStorage fallback.

const K_WORK = "pf_working",
  K_MASTER = "pf_master";

let _cache = { work: null, master: null };

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
  localStorage.setItem(K_WORK, JSON.stringify(cfg));
  // Async save to server
  fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cfg),
  }).catch(() => {});
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
  localStorage.setItem(K_MASTER, JSON.stringify(cfg));
  fetch("/api/config/master", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cfg),
  }).catch(() => {});
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
        localStorage.setItem(K_WORK, JSON.stringify(d));
      }
    }
    if (mRes.ok) {
      const d = await mRes.json();
      if (d) {
        _cache.master = d;
        localStorage.setItem(K_MASTER, JSON.stringify(d));
      }
    }
    render();
  } catch (e) {
    /* server unavailable, use localStorage */
  }
}
