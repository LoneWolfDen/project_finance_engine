// Schema migrations for persisted structures (STO-001; ADR-010, DATA_AND_STORAGE §8).
// Registers CFE.data.migrate; needs app/cfe.js first.
//
//   var r = CFE.data.migrate.toCurrent(obj);   // → {obj, migratedFrom}  (migratedFrom: null if already current)
//
// Older data is upgraded in memory, one version at a time, by pure functions
// migrations[n](obj) → new object at version n+1. The input is never modified, and history files are
// never rewritten. Data newer than this app throws NewerSchemaError ("update the app").
(function (CFE) {
  'use strict';

  function NewerSchemaError(found, current) {
    var e = new Error('This data uses schema version ' + found + ', but this app understands up to version ' + current + '. Update the app.');
    e.name = 'NewerSchemaError';
    e.found = found;
    e.current = current;
    return e;
  }

  var migrate = {
    current: 1,
    // migrations[n]: version n → n+1. None yet: version 1 is the first.
    migrations: {},
    NewerSchemaError: NewerSchemaError,
    toCurrent: function (obj) {
      var v = obj && obj.schema_version;
      if (typeof v !== 'number' || Math.floor(v) !== v || v < 1) throw new Error('schema_version must be a whole number from 1 (found ' + JSON.stringify(v) + ').');
      if (v > migrate.current) throw NewerSchemaError(v, migrate.current);
      var from = v, out = obj;
      while (v < migrate.current) {
        var step = migrate.migrations[v];
        if (typeof step !== 'function') throw new Error('No migration from schema version ' + v + ' to ' + (v + 1) + '.');
        out = step(out);
        if (!out || out.schema_version !== v + 1) throw new Error('The migration from version ' + v + ' did not produce version ' + (v + 1) + '.');
        v++;
      }
      return { obj: out, migratedFrom: from === migrate.current ? null : from };
    }
  };

  CFE.data.migrate = migrate;
})(CFE);
