#!/usr/bin/env node
// Runs every Node test suite with the CFE_TEST harness. Built-in Node modules only.
//
//   node tests/run-node.js                      run everything
//   node tests/run-node.js --suite=Forecast     only suites whose name contains "Forecast"
//   node tests/run-node.js --tz=America/New_York
//   node tests/run-node.js --update-golden=legacy   rewrite golden files under tests/golden/legacy/ only
//
// Exit code 0 when all tests pass, 1 otherwise.
'use strict';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  if (!m) { console.error('Unknown argument: ' + a); process.exit(2); }
  return [m[1], m[2] === undefined ? true : m[2]];
}));
// The time zone must be set before any Date is created.
if (args.tz) process.env.TZ = args.tz;

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const TESTS_DIR = __dirname;
const GOLDEN_DIR = path.join(TESTS_DIR, 'golden');
const updateDir = typeof args['update-golden'] === 'string' ? args['update-golden'].replace(/^\/+|\/+$/g, '') : null;
if (args['update-golden'] !== undefined && (!updateDir || updateDir.split('/').includes('..'))) {
  console.error('--update-golden needs a folder name under tests/golden/, e.g. --update-golden=legacy');
  process.exit(2);
}

function findTests(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findTests(full);
    return entry.name.endsWith('.test.js') ? [full] : [];
  }).sort();
}

// Golden file access, limited to tests/golden/. Writing is allowed only inside the --update-golden folder.
function goldenPath(file) {
  const full = path.resolve(GOLDEN_DIR, file);
  if (!full.startsWith(GOLDEN_DIR + path.sep)) throw new Error('Golden path outside tests/golden/: ' + file);
  return full;
}
const io = {
  updating: file => updateDir !== null && (file === updateDir || file.startsWith(updateDir + '/')),
  readGolden: file => { const p = goldenPath(file); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; },
  writeGolden: (file, text) => {
    if (!io.updating(file)) throw new Error('Not allowed to write ' + file + ' (only tests/golden/' + updateDir + '/)');
    const p = goldenPath(file);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
    written.push(path.relative(TESTS_DIR, p));
  }
};
const written = [];

const context = vm.createContext({
  console, setTimeout, clearTimeout, setInterval, clearInterval, URL, TextEncoder, TextDecoder,
  // Node-only helpers for test files (e.g. the legacy sandbox, fixtures).
  CFE_NODE: {
    appDir: path.dirname(TESTS_DIR),
    testsDir: TESTS_DIR,
    support: name => require(path.join(TESTS_DIR, 'support', name)),
    readFile: rel => fs.readFileSync(path.join(path.dirname(TESTS_DIR), rel), 'utf8')
  }
});

function load(file) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: path.relative(path.dirname(TESTS_DIR), file) });
}

load(path.join(TESTS_DIR, 'harness.js'));
const harness = vm.runInContext('CFE_TEST', context);
harness.io = io;

const files = [...findTests(path.join(TESTS_DIR, 'unit')), ...findTests(path.join(TESTS_DIR, 'characterisation'))];
for (const file of files) {
  try {
    load(file);
  } catch (e) {
    console.error('✗ Could not load ' + path.relative(TESTS_DIR, file) + ': ' + (e && e.stack || e));
    process.exit(1);
  }
}

harness.run({ only: typeof args.suite === 'string' ? args.suite : null }).then(r => {
  let lastSuite = null;
  for (const res of r.results) {
    if (res.suite !== lastSuite) { console.log('\n' + res.suite); lastSuite = res.suite; }
    console.log((res.ok ? '  ✓ ' : '  ✗ ') + res.test);
    if (!res.ok) console.log(res.error.split('\n').map(l => '      ' + l).join('\n'));
  }
  if (written.length) console.log('\nGolden files written:\n  ' + written.join('\n  '));
  console.log(`\n${r.passed} passed, ${r.failed} failed (${files.length} files, TZ=${process.env.TZ || 'system default'})`);
  if (r.failed === 0) console.log('All suites passed');
  process.exit(r.failed === 0 ? 0 : 1);
});
