// Number formatting for views (UI-001). Registers CFE.views.format; needs app/cfe.js.
//   CFE.views.format.money(1450000, 'GBP')  // → '£1,450,000'   (whole units, as the legacy app showed)
//   CFE.views.format.money(1812500, 'USD')  // → '$1,812,500'
//   CFE.views.format.money(null, 'GBP')     // → '—'
// Uses Intl.NumberFormat with the record's currency code (never a hard-coded £), UK number style.
(function (CFE) {
  'use strict';
  var cache = {};

  function formatter(code) {
    code = /^[A-Z]{3}$/.test(code || '') ? code : 'GBP';
    if (!cache[code]) {
      try { cache[code] = new Intl.NumberFormat('en-GB', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0, minimumFractionDigits: 0 }); }
      catch (e) { cache[code] = new Intl.NumberFormat('en-GB', { style: 'currency', currency: code, maximumFractionDigits: 0, minimumFractionDigits: 0 }); }
    }
    return cache[code];
  }

  function money(n, code) { return n == null || isNaN(n) ? '—' : formatter(code).format(n); }

  // Short form for chart labels: '£1,450k'.
  function moneyK(n, code) { return n == null ? '' : money(Math.round(n / 1000), code) + 'k'; }

  CFE.views.format = { money: money, moneyK: moneyK };
})(CFE);
