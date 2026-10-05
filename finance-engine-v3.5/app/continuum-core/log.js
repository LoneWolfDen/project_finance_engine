// Continuum.log: an in-memory diagnostics log shared by all Continuum apps (SHL-003;
// TARGET_ARCHITECTURE §22). Classic script, no dependencies. Nothing is sent anywhere or saved
// to a file: entries live only in this page and are shown on the Diagnostics page.
//
//   Continuum.log.info('app', 'Route shown', {route: 'portfolio'});
//   Continuum.log.warn('import', 'Rows skipped', {count: 3, file: 'a1b2c3d4e5f6'});
//   Continuum.log.error('app', 'Unexpected error', {type: 'TypeError'});
//   Continuum.log.entries()   // → [{time, level, module, message, meta}], oldest first (copies)
//
// CONTRACT: the log never records data values (no names, rates, hours, amounts, references).
// `module` and `message` are fixed texts written by the developer; `meta` holds only counts,
// flags, file IDs and error types. To enforce this, `meta` keeps only numbers, booleans and
// strings of up to 80 characters (at most 10 keys); any other value (object, array, long text)
// is dropped and counted in meta.rejected. module is cut to 40 characters and message to 200.
// The buffer keeps the newest 500 entries.
(function (root) {
  'use strict';
  var C = root.Continuum = root.Continuum || {};
  var LIMIT = 500, MAX_KEYS = 10, MAX_TEXT = 80;
  var buffer = [];

  function clean(meta) {
    var out = {}, rejected = 0, kept = 0;
    if (meta === undefined || meta === null) return out;
    if (typeof meta !== 'object' || Array.isArray(meta)) return { rejected: 1 };
    Object.keys(meta).forEach(function (k) {
      var v = meta[k];
      var ok = (typeof v === 'number' && isFinite(v)) || typeof v === 'boolean' || (typeof v === 'string' && v.length <= MAX_TEXT);
      if (ok && kept < MAX_KEYS && k !== 'rejected') { out[k.slice(0, 40)] = v; kept++; } else rejected++;
    });
    if (rejected) out.rejected = rejected;
    return out;
  }

  function add(level, module, message, meta) {
    buffer.push({
      time: new Date().toISOString(),
      level: level,
      module: String(module == null ? '' : module).slice(0, 40),
      message: String(message == null ? '' : message).slice(0, 200),
      meta: clean(meta)
    });
    if (buffer.length > LIMIT) buffer.splice(0, buffer.length - LIMIT);
  }

  C.log = {
    limit: LIMIT,
    info: function (module, message, meta) { add('info', module, message, meta); },
    warn: function (module, message, meta) { add('warn', module, message, meta); },
    error: function (module, message, meta) { add('error', module, message, meta); },
    entries: function () {
      return buffer.map(function (e) { return { time: e.time, level: e.level, module: e.module, message: e.message, meta: Object.assign({}, e.meta) }; });
    },
    // One line of plain text per entry: "<time> WARN module: message (key=value, …)".
    format: function (e) {
      var keys = Object.keys(e.meta || {});
      return e.time + ' ' + e.level.toUpperCase() + ' ' + e.module + ': ' + e.message +
        (keys.length ? ' (' + keys.map(function (k) { return k + '=' + e.meta[k]; }).join(', ') + ')' : '');
    },
    clear: function () { buffer.length = 0; }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
