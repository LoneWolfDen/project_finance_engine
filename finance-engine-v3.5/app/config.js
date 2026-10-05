// Settings of the new Finance Engine app (SHL-001). Loaded after app/VERSION.js, before app/cfe.js.
//   staleAfterDays    a published dataset older than this is shown as stale (SHL-002)
//   enabledProviders  chat providers that may be used; 'none' = no chat provider (CHT-*)
//   appKey            storage key for Continuum.storage.prefs / db (STO-002)
//   historyKeep       how many published datasets to keep in history
(function (root) {
  'use strict';
  var CFE = root.CFE = root.CFE || {};
  CFE.config = { staleAfterDays: 7, enabledProviders: ['none'], appKey: 'finance', historyKeep: 60 };
})(typeof globalThis !== 'undefined' ? globalThis : this);
