// Published dataset loader (STO-004; ADR-005, DATA_AND_STORAGE §3.1, TARGET_ARCHITECTURE §3.3).
// Registers CFE.store.loader and CFE.store.loadPublished; needs app/cfe.js, Continuum.hash,
// CFE.data.schema and CFE.data.migrate.
//
//   CFE.store.loadPublished()   // → Promise of a result (below); never rejects
//   CFE.store.loader.fromFiles(fileList)   // the same checks for dataset.json + manifest.json picked by the user
//   CFE.store.loader.check(manifest, dataset)   // the checks alone (pure; used by both)
//
// loadPublished adds <script src="published/manifest.js"> and then published/dataset.js (DOM APIs
// and load/error listeners, no inline handlers), reads window.CFE_PUBLISHED_MANIFEST and
// window.CFE_PUBLISHED_DATASET, and runs check. check:
//   1. refuses anything that is not plain data (only objects, lists, text, numbers, true/false, null);
//   2. validates the manifest;
//   3. refuses data newer than this app ("Update the app"), else upgrades older data in memory;
//   4. validates the dataset;
//   5. recomputes sha256Hex(JSON.stringify(dataset)) and compares it with manifest.payload_sha256.
// Result: {ok, manifest, dataset, statusInput, problems:[text]}. statusInput is the input for
// Continuum.status.compute. Unknown fields are kept and are not banner warnings (newer
// publishers may add fields); the publisher's own warnings (manifest.validation.warnings) are.
(function (CFE) {
  'use strict';

  var MAX_DEPTH = 20;

  // Plain data only: no functions, dates, class instances or getters (a .js file could hold code).
  function plainProblem(value, path, depth) {
    if (depth > MAX_DEPTH) return path + ' is nested too deeply';
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return null;
    if (typeof value === 'number') return isFinite(value) ? null : path + ' is not a finite number';
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i++) { var p = plainProblem(value[i], path + '[' + i + ']', depth + 1); if (p) return p; }
      return null;
    }
    if (typeof value === 'object') {
      var proto = Object.getPrototypeOf(value);
      if (proto !== null && Object.getPrototypeOf(proto) !== null) return path + ' is not plain data';
      if (Object.prototype.toString.call(value) !== '[object Object]') return path + ' is not plain data';
      var keys = Object.keys(value);
      for (var k = 0; k < keys.length; k++) {
        var d = Object.getOwnPropertyDescriptor(value, keys[k]);
        if (!('value' in d)) return path + '.' + keys[k] + ' is not plain data';
        var q = plainProblem(d.value, path + '.' + keys[k], depth + 1); if (q) return q;
      }
      return null;
    }
    return path + ' is not plain data (' + typeof value + ')';
  }

  function messages(list) { return list.map(function (e) { return e.path + ': ' + e.message; }); }

  function check(manifest, dataset) {
    var schema = CFE.require('data.schema'), migrate = CFE.require('data.migrate');
    var supported = (CFE.version && CFE.version.supportsSchema) || [1, migrate.current];
    var input = { datasetLoaded: true, hashOk: true, errors: [], sample: false };
    var result = { ok: false, manifest: null, dataset: null, statusInput: input, problems: input.errors };
    function fail(text) { input.errors.push(text); return Promise.resolve(result); }

    if (manifest === undefined && dataset === undefined) {
      input.datasetLoaded = false;
      input.errors = []; result.problems = input.errors;
      return Promise.resolve(result);
    }
    if (manifest === undefined) return fail('manifest is missing');
    if (dataset === undefined) return fail('dataset is missing');
    var bad = plainProblem(manifest, 'manifest', 0) || plainProblem(dataset, 'dataset', 0);
    if (bad) return fail(bad);
    if (manifest.sample === true) input.sample = true;

    var newer = (typeof manifest.dataset_schema_version === 'number' && manifest.dataset_schema_version > supported[1]) ||
      (typeof dataset.schema_version === 'number' && dataset.schema_version > migrate.current);
    if (newer) { input.newerSchema = true; return Promise.resolve(result); }

    var mv = schema.validateManifest(manifest);
    if (mv.errors.length) { input.errors = messages(mv.errors); result.problems = input.errors; return Promise.resolve(result); }

    var current;
    try { current = migrate.toCurrent(dataset); } catch (e) { return fail(e.message); }
    if (current.migratedFrom !== null) input.schemaMigrated = true;
    var dv = schema.validateDataset(current.obj);
    if (dv.errors.length) { input.errors = messages(dv.errors); result.problems = input.errors; return Promise.resolve(result); }

    return Continuum.hash.sha256Hex(JSON.stringify(dataset)).then(function (hex) {
      if (hex !== manifest.payload_sha256) {
        input.hashOk = false;
        result.problems.push('The data does not match its checksum (payload_sha256).');
        return result;
      }
      result.ok = true;
      result.manifest = manifest;
      result.dataset = current.obj;
      return result;
    });
  }

  function addScript(doc, src) {
    return new Promise(function (resolve) {
      var s = doc.createElement('script');
      s.addEventListener('load', function () { resolve(true); });
      s.addEventListener('error', function () { resolve(false); });
      s.src = src;
      (doc.head || doc.body).appendChild(s);
    });
  }

  function loadPublished(win, doc) {
    win = win || window; doc = doc || document;
    delete win.CFE_PUBLISHED_MANIFEST;
    delete win.CFE_PUBLISHED_DATASET;
    return addScript(doc, 'published/manifest.js').then(function (found) {
      if (!found) return check(undefined, undefined);
      return addScript(doc, 'published/dataset.js').then(function () {
        return check(win.CFE_PUBLISHED_MANIFEST, win.CFE_PUBLISHED_DATASET);
      });
    }).catch(function (e) {
      return failed('Loading failed (' + ((e && e.name) || 'error') + ').');
    });
  }

  function readText(file) {
    if (file.text) return file.text();
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsText(file);
    });
  }

  function failed(text) {
    return { ok: false, manifest: null, dataset: null, problems: [text], statusInput: { datasetLoaded: true, errors: [text] } };
  }

  // The user picks dataset.json and manifest.json (both, any order). Never rejects.
  function fromFiles(files) {
    var list = Array.prototype.slice.call(files || []);
    function find(name) { return list.filter(function (f) { return f.name.toLowerCase() === name; })[0]; }
    var mf = find('manifest.json'), df = find('dataset.json');
    if (!mf || !df) return Promise.resolve(failed('Choose both dataset.json and manifest.json.'));
    return Promise.all([readText(mf), readText(df)]).then(function (texts) {
      var m, d;
      try { m = JSON.parse(texts[0]); d = JSON.parse(texts[1]); } catch (e) { return failed('A file is not valid JSON.'); }
      return check(m, d);
    }, function () {
      return failed('The chosen files could not be read. Choose them again.');
    });
  }

  CFE.store.loader = { check: check, fromFiles: fromFiles, plainProblem: plainProblem };
  CFE.store.loadPublished = loadPublished;
})(CFE);
