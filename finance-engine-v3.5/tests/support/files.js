// Lists files under a folder of finance-engine-v3.5 (Node only), for tests that scan source files.
//   CFE_NODE.support('files.js').list('app', /\.js$/)  // → ['app/app.js', 'app/calc/dates.js', …] (sorted, '/' separators)
'use strict';
const fs = require('fs');
const path = require('path');

const APP_DIR = path.resolve(__dirname, '..', '..');

function list(rel, pattern) {
  const out = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(path.join(APP_DIR, dir))) {
      const child = dir + '/' + name;
      if (fs.statSync(path.join(APP_DIR, child)).isDirectory()) walk(child);
      else if (!pattern || pattern.test(child)) out.push(child);
    }
  })(rel);
  return out.sort();
}

module.exports = { list };
