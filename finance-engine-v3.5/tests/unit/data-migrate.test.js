// STO-001: CFE.data.migrate (pure forward migrations, newer data refused). Runs in Node and in the browser.
(function () {
  // In Node the app scripts are not preloaded: evaluate the modules in this context.
  if (typeof CFE === 'undefined') (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  if (!CFE.data.migrate) (0, eval)(CFE_NODE.readFile('app/data/migrate.js'));
  var T = CFE_TEST, assert = T.assert, M = CFE.data.migrate;

  // Runs body with a temporary extra version, then restores the module.
  function withVersion2(body) {
    var saved = M.current;
    M.current = 2;
    M.migrations[1] = function (o) { var c = JSON.parse(JSON.stringify(o)); c.schema_version = 2; c.renamed = c.old; delete c.old; return c; };
    try { return body(); } finally { M.current = saved; delete M.migrations[1]; }
  }

  T.suite('CFE.data.migrate', function () {
    T.test('version 1 is current and has no migrations yet', function () {
      assert.equal(M.current, 1);
      assert.deepEqual(Object.keys(M.migrations), []);
    });

    T.test('current data passes through unchanged', function () {
      var obj = { schema_version: 1, x: 1 };
      var r = M.toCurrent(obj);
      assert.equal(r.obj, obj);
      assert.equal(r.migratedFrom, null);
    });

    T.test('schema_version 2 throws NewerSchemaError', function () {
      var err = null;
      try { M.toCurrent({ schema_version: 2 }); } catch (e) { err = e; }
      assert.ok(err, 'threw');
      assert.equal(err.name, 'NewerSchemaError');
      assert.equal(err.found, 2);
      assert.ok(/Update the app/.test(err.message));
    });

    T.test('older data is migrated step by step; the input is not modified', function () {
      withVersion2(function () {
        var input = { schema_version: 1, old: 'v' };
        var r = M.toCurrent(input);
        assert.deepEqual(r.obj, { schema_version: 2, renamed: 'v' });
        assert.equal(r.migratedFrom, 1);
        assert.deepEqual(input, { schema_version: 1, old: 'v' });
      });
    });

    T.test('missing or broken migrations and invalid versions are errors', function () {
      assert.throws(function () { M.toCurrent({}); }, 'schema_version must be a whole number');
      assert.throws(function () { M.toCurrent({ schema_version: '1' }); }, 'schema_version must be a whole number');
      withVersion2(function () {
        M.migrations[1] = function (o) { return o; };
        assert.throws(function () { M.toCurrent({ schema_version: 1 }); }, 'did not produce version 2');
        delete M.migrations[1];
        assert.throws(function () { M.toCurrent({ schema_version: 1 }); }, 'No migration from schema version 1');
      });
    });
  });
})();
