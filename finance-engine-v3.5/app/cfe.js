// CFE: the Continuum Finance Engine namespace (ADR-001: classic scripts, one global per layer).
// Load this first; every app/ module registers itself into one of the layers below.
//
//   CFE.calc.dates.parseDate(...)              // call a loaded module
//   CFE.require('calc.dates')                  // the same, but throws a clear error if the
//                                              // module's <script> tag is missing or out of order
(function (root) {
  'use strict';
  var CFE = root.CFE = root.CFE || {};
  ['calc', 'data', 'store', 'views', 'chat', 'export'].forEach(function (layer) { CFE[layer] = CFE[layer] || {}; });

  CFE.require = function (path) {
    var node = CFE;
    String(path).split('.').forEach(function (key) { node = node == null ? undefined : node[key]; });
    if (node == null) throw new Error('CFE module ' + path + ' not loaded – check script order in index.html');
    return node;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
