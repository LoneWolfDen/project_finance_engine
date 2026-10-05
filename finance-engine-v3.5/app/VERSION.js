// Version of the new Finance Engine app (SHL-001). Loaded first, before app/cfe.js.
// supportsSchema: the published dataset schema versions this app can read, [lowest, highest] (STO-001).
(function (root) {
  'use strict';
  var CFE = root.CFE = root.CFE || {};
  CFE.version = { app: '4.0.0-alpha.1', supportsSchema: [1, 1], date: '2026-10-05' };
})(typeof globalThis !== 'undefined' ? globalThis : this);
