// Legacy sandbox (Node only): runs the legacy app's inline scripts in a vm context with
// browser stubs, so characterisation tests can call legacy functions directly.
//
//   const { loadLegacy } = CFE_NODE.support('legacy-sandbox.js');
//   const L = loadLegacy({ now: '2026-10-01T12:00:00Z' });
//   L.get('computeForecast')(...);   L.get('DEFAULTS');   L.toasts
//
// Options: htmlPath (relative to finance-engine-v3.5, default the legacy index.html), now (ISO
// time returned by new Date() and Date.now()), protocol (location.protocol, default 'http:'),
// confirm / prompt (functions answering the legacy dialogs), webcrypto (true injects Node's
// crypto.subtle and TextEncoder, which the sandbox otherwise lacks, like a browser without SubtleCrypto).
// Each call returns a fresh, independent context. Nothing touches the network or the disk.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP_DIR = path.resolve(__dirname, '..', '..');

// Browser stubs, evaluated inside the context so every object belongs to that context.
const PRELUDE = String.raw`
(function (cfg) {
  'use strict';
  var g = globalThis;

  // Fixed clock: new Date() and Date.now() return cfg.now; new Date(x) behaves normally.
  var RealDate = Date;
  var NOW = RealDate.parse(cfg.now);
  if (isNaN(NOW)) throw new Error('legacy sandbox: invalid now ' + cfg.now);
  class FixedDate extends RealDate {
    constructor() {
      if (arguments.length === 0) super(NOW);
      else super(...arguments);
    }
    static now() { return NOW; }
  }
  g.Date = FixedDate;

  function noop() {}
  function element(id) {
    var el = {
      id: id || '', innerHTML: '', textContent: '', innerText: '', value: '', checked: false, disabled: false,
      files: [], children: [], options: [], dataset: {}, style: {},
      classList: { add: noop, remove: noop, toggle: noop, contains: function () { return false; } },
      addEventListener: noop, removeEventListener: noop, appendChild: function (c) { return c; },
      removeChild: noop, remove: noop, insertAdjacentHTML: noop, setAttribute: noop,
      getAttribute: function () { return null; }, focus: noop, blur: noop, click: noop, select: noop,
      scrollIntoView: noop, closest: function () { return null; },
      getContext: function () { return null; },
      querySelector: function () { return element(); },
      querySelectorAll: function () { return []; }
    };
    return el;
  }

  var store = {};
  g.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    clear: function () { store = {}; },
    key: function (i) { return Object.keys(store)[i] || null; },
    get length() { return Object.keys(store).length; }
  };

  g.window = g;
  g.self = g;
  g.location = { protocol: cfg.protocol, href: cfg.protocol + '//localhost/', hash: '', search: '', reload: noop };
  g.navigator = { userAgent: 'legacy-sandbox', clipboard: { writeText: function () { return Promise.resolve(); } } };
  g.document = {
    body: element('body'), head: element('head'), documentElement: element('html'),
    getElementById: function (id) { return element(id); },
    querySelector: function () { return element(); },
    querySelectorAll: function () { return []; },
    createElement: function (tag) { return element(tag); },
    addEventListener: noop, removeEventListener: noop
  };
  g.addEventListener = noop;
  g.removeEventListener = noop;
  g.fetch = function () { return Promise.reject(new Error('fetch is disabled in the legacy sandbox')); };
  g.setTimeout = function () { return 0; };
  g.clearTimeout = noop;
  g.setInterval = function () { return 0; };
  g.clearInterval = noop;
  g.requestAnimationFrame = function () { return 0; };
  g.alert = noop;
  g.confirm = function (m) { return cfg.confirm(m); };
  g.prompt = function (m, d) { return cfg.prompt(m, d); };

  function Chart() { this.destroy = noop; this.update = noop; }
  Chart.register = noop;
  Chart.defaults = { plugins: {} };
  g.Chart = Chart;
  g.ChartDataLabels = {};
  g.XLSX = { utils: {}, read: noop, writeFile: noop };
  g.jspdf = { jsPDF: function () {} };
  g.PptxGenJS = function () {};
})
`;

function extractScripts(html) {
  const scripts = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(m[1]);
    if (!src) scripts.push({ name: 'inline script ' + (scripts.length + 1), code: m[2] });
    else if (src[1].startsWith('app/')) scripts.push({ name: src[1], code: fs.readFileSync(path.join(APP_DIR, src[1]), 'utf8') });
    // Other src scripts (vendor libraries) are replaced by stubs.
  }
  return scripts;
}

function legacyHtmlPath() {
  // SHL-004 moves the legacy app to legacy/index.html.
  const moved = path.join(APP_DIR, 'legacy', 'index.html');
  return fs.existsSync(moved) ? 'legacy/index.html' : 'index.html';
}

function loadLegacy(options) {
  const opts = Object.assign({
    htmlPath: legacyHtmlPath(),
    now: '2026-10-01T12:00:00Z',
    protocol: 'http:',
    confirm: () => true,
    prompt: () => null
  }, options || {});
  const html = fs.readFileSync(path.join(APP_DIR, opts.htmlPath), 'utf8');
  const toasts = [];
  const ctx = vm.createContext({ console });
  if (opts.webcrypto) {
    ctx.crypto = require('crypto').webcrypto;
    ctx.TextEncoder = TextEncoder;
  }
  vm.runInContext(PRELUDE, ctx, { filename: 'legacy-sandbox-prelude.js' })({
    now: opts.now, protocol: opts.protocol, confirm: opts.confirm, prompt: opts.prompt
  });
  for (const s of extractScripts(html)) {
    vm.runInContext(s.code, ctx, { filename: opts.htmlPath + ' (' + s.name + ')' });
  }
  // Capture toast messages from here on (the legacy app defines its own toast()).
  ctx.toast = function (message) { toasts.push(String(message)); };

  return {
    ctx,
    toasts,
    // Reads any global, including const/let bindings such as DEFAULTS.
    get: name => vm.runInContext(name, ctx),
    // Assigns any global, including let bindings.
    set: (name, value) => {
      ctx.__sandboxValue = value;
      vm.runInContext(name + ' = __sandboxValue', ctx);
      delete ctx.__sandboxValue;
    }
  };
}

module.exports = { loadLegacy };
