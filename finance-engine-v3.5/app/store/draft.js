// The publisher's import draft (IMP-008; DATA_AND_STORAGE §4). Registers CFE.store.draft; needs
// app/cfe.js, Continuum.storage and Continuum.hash.
//
//   var d = CFE.store.draft.build(entries)   // from the Publish page's file entries (pure)
//   CFE.store.draft.save(d)      // → Promise of {ok:true} or {ok:false, error:{kind:'quota'|'unavailable'|'unknown', message}}
//   CFE.store.draft.load()       // → Promise of the draft, or null (none, or storage unavailable)
//   CFE.store.draft.discard()    // → Promise of {ok} …
//   CFE.store.draft.toFile(d)    // → Promise of {name, text}: "Save draft to file" (JSON with schema_version and sha256)
//   CFE.store.draft.fromFileText(text)   // → Promise of {ok:true, draft} or {ok:false, message}
//   CFE.store.draft.create(appKey)       // another instance (tests use their own key)
//
// Draft (schema_version 1): {schema_version, saved_utc, files:[provenance record], records:{<entity>:[record + _file + _row]}}
// (_file: the provenance file_id; _row: the row number in that file, header = row 1).
// Stored in IndexedDB "continuum-<appKey>", store "drafts", key "current". It holds raw imported
// rows, so the Publish page makes Discard prominent.
(function (CFE) {
  'use strict';

  var STORE = 'drafts', KEY = 'current', FILE_FORMAT = 'cfe.draft-file';

  function build(entries) {
    var draft = { schema_version: 1, saved_utc: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), files: [], records: {} };
    (entries || []).forEach(function (e) {
      if (!e.result || !e.provenance || !e.profile) return;
      draft.files.push(Object.assign({}, e.provenance));
      var list = draft.records[e.profile.entity] || (draft.records[e.profile.entity] = []);
      e.result.records.forEach(function (r, i) {
        list.push(Object.assign({}, r, { _file: e.provenance.file_id, _row: e.result.recordRows ? e.result.recordRows[i] : null }));
      });
    });
    return draft;
  }

  function isDraft(d) {
    return !!d && typeof d === 'object' && d.schema_version === 1 && Array.isArray(d.files) && d.records && typeof d.records === 'object';
  }

  function create(appKey) {
    var opened = null;
    function db() {
      if (!opened) opened = Continuum.storage.db(appKey, [STORE]).catch(function (e) { opened = null; throw e; });
      return opened;
    }
    function unavailable(e) { return { ok: false, error: { kind: (e && e.kind) || 'unavailable', message: (e && e.message) || 'Browser storage is not available' } }; }

    return {
      build: build,
      save: function (draft) {
        if (!isDraft(draft)) return Promise.resolve({ ok: false, error: { kind: 'unknown', message: 'Not a draft' } });
        return db().then(function (h) { return h.put(STORE, KEY, draft); }, unavailable);
      },
      load: function () {
        return db().then(function (h) { return h.get(STORE, KEY); }).then(function (r) {
          return r && r.ok && isDraft(r.value) ? r.value : null;
        }, function () { return null; });
      },
      discard: function () {
        return db().then(function (h) { return h.delete(STORE, KEY); }, unavailable);
      },
      toFile: function (draft) {
        var body = JSON.stringify(draft);
        return Continuum.hash.sha256Hex(body).then(function (sha) {
          var stamp = (draft.saved_utc || '').slice(0, 10) || 'draft';
          return { name: 'finance-draft-' + stamp + '.json', text: JSON.stringify({ format: FILE_FORMAT, schema_version: 1, sha256: sha, draft: draft }) };
        });
      },
      fromFileText: function (text) {
        var obj;
        try { obj = JSON.parse(text); } catch (e) { return Promise.resolve({ ok: false, message: 'The file is not valid JSON.' }); }
        if (!obj || obj.format !== FILE_FORMAT) return Promise.resolve({ ok: false, message: 'This is not a saved draft file.' });
        if (obj.schema_version !== 1) return Promise.resolve({ ok: false, message: 'This draft file needs a newer version of the app.' });
        if (!isDraft(obj.draft)) return Promise.resolve({ ok: false, message: 'The draft in this file is incomplete.' });
        return Continuum.hash.sha256Hex(JSON.stringify(obj.draft)).then(function (sha) {
          return sha === obj.sha256 ? { ok: true, draft: obj.draft } : { ok: false, message: 'The draft file has been changed or damaged (checksum mismatch).' };
        });
      },
      create: create
    };
  }

  CFE.store.draft = create((CFE.config && CFE.config.appKey) || 'finance');
})(CFE);
