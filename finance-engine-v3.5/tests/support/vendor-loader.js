// Loads vendored libraries that index.html uses into vm contexts (Node only; BLD-002 and BLD-003 tests).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP_DIR = path.resolve(__dirname, '..', '..');
let cached = null;

function sheetjs() {
  if (cached) return cached;
  const html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script src="(vendor\/xlsx-[^"]+)"/g)].map(m => m[1]);
  if (srcs.length !== 1) throw new Error('Expected one vendored SheetJS script in index.html, found ' + srcs.length);
  const ctx = vm.createContext({ console });
  ctx.window = ctx;
  vm.runInContext(fs.readFileSync(path.join(APP_DIR, srcs[0]), 'utf8'), ctx, { filename: srcs[0] });
  cached = { src: srcs[0], XLSX: ctx.XLSX };
  return cached;
}

// Loads the vendored jsPDF and jsPDF-AutoTable that index.html uses, in page order (BLD-003 tests).
let cachedPdf = null;
function jspdf() {
  if (cachedPdf) return cachedPdf;
  const html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script src="(vendor\/jspdf-[^"]+)"/g)].map(m => m[1]);
  if (srcs.length !== 2) throw new Error('Expected jsPDF and AutoTable scripts in index.html, found ' + srcs.length);
  const ctx = vm.createContext({ console, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, setTimeout, clearTimeout });
  ctx.window = ctx;
  ctx.navigator = { userAgent: 'node' };
  ctx.atob = atob; ctx.btoa = btoa;
  for (const src of srcs) vm.runInContext(fs.readFileSync(path.join(APP_DIR, src), 'utf8'), ctx, { filename: src });
  cachedPdf = { srcs, jspdf: ctx.jspdf };
  return cachedPdf;
}

// A file's bytes as a plain array (relative to finance-engine-v3.5/).
function bytes(rel) { return Array.from(fs.readFileSync(path.join(APP_DIR, rel))); }

module.exports = { sheetjs, jspdf, bytes };
