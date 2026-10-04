// Version of the shared continuum-core folder (ADR-021). Diagnostics shows it, so differing
// copies across Continuum apps are visible. Bump it whenever any file in this folder changes.
(function (root) {
  'use strict';
  var C = root.Continuum = root.Continuum || {};
  C.coreVersion = '0.1.0';
})(typeof globalThis !== 'undefined' ? globalThis : this);
