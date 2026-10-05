// Continuum.ref: the Continuum Reference shared by all Continuum apps (REF-001; DEC-001-R1, DEC-002).
// Classic script, no dependencies. Copy this folder verbatim between apps.
// Contract: docs/schema/CONTINUUM_REFERENCE.md.
//
// The reference ("ref") is the FIRST opportunity number a user enters for a project, normalised only
// by trimming, removing all whitespace and upper-casing. It is stored once and never changed;
// a wrong one is corrected by creating a new record and setting superseded_by on the old one.
//
//   Continuum.ref.normalise(' o-5030460 ')            // → {ok:true, ref:'O-5030460'}
//   Continuum.ref.fileNameFor('A/B')                  // → 'A%2FB'  (registry file 'A%2FB.json')
//   Continuum.ref.toLink('index.html', 'O-5030460')   // → 'index.html#/ref/O-5030460'
//   Continuum.ref.resolve('o-5030460', records)       // → {status, record, chain}
(function (root) {
  'use strict';
  var C = root.Continuum = root.Continuum || {};

  var MAX_LENGTH = 64;
  var MAX_STEPS = 5;
  var CONTROL = /[\u0000-\u001F\u007F-\u009F]/;

  function fail(code, message) { return { ok: false, error: { code: code, message: message } }; }

  // ─── normalise / isValid ────────────────────────────────────────────────
  function normalise(input) {
    if (typeof input !== 'string' && typeof input !== 'number') return fail('not-text', 'Enter the opportunity number as text.');
    var ref = String(input).replace(/\s+/g, '').toUpperCase();
    if (!ref) return fail('empty', 'Enter an opportunity number.');
    if (CONTROL.test(ref)) return fail('control-characters', 'The opportunity number contains invisible control characters. Retype it.');
    var length = Array.from(ref).length;
    if (length > MAX_LENGTH) return fail('too-long', 'The opportunity number is ' + length + ' characters long; the limit is ' + MAX_LENGTH + '.');
    return { ok: true, ref: ref };
  }

  // True only for an already-normalised reference.
  function isValid(ref) {
    var n = normalise(ref);
    return n.ok && n.ref === ref;
  }

  // ─── file names and links ───────────────────────────────────────────────
  // Safe as a Windows/macOS file name and a URL part: percent-encoding, plus * and a leading dot.
  function fileNameFor(ref) {
    if (!isValid(ref)) throw new Error('fileNameFor: not a normalised reference: ' + JSON.stringify(ref));
    return encodeURIComponent(ref).replace(/\*/g, '%2A').replace(/^\./, '%2E');
  }

  function toLink(indexPath, ref) {
    if (!isValid(ref)) throw new Error('toLink: not a normalised reference: ' + JSON.stringify(ref));
    return String(indexPath) + '#/ref/' + encodeURIComponent(ref);
  }

  function decode(s) {
    try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { return null; }
  }

  // Reads "#/ref/<ref>" or "?ref=<ref>" from a location-like object; returns the normalised ref or null.
  function parseFromLocation(loc) {
    if (!loc) return null;
    var raw = null;
    var hash = /^#\/ref\/([^?#]+)/.exec(String(loc.hash || ''));
    if (hash) raw = decode(hash[1]);
    if (raw === null) {
      var query = /[?&]ref=([^&#]*)/.exec(String(loc.search || ''));
      if (query) raw = decode(query[1]);
    }
    if (raw === null) return null;
    var n = normalise(raw);
    return n.ok ? n.ref : null;
  }

  // ─── resolve ────────────────────────────────────────────────────────────
  function key(value) { var n = normalise(value); return n.ok ? n.ref : null; }

  function matches(records, ref, field) {
    return records.filter(function (r) {
      if (!r) return false;
      if (field === 'ref') return key(r.ref) === ref;
      return (r[field] || []).some(function (v) { return key(v) === ref; });
    });
  }

  // Finds the record for a reference (case-insensitive): by ref, then opportunity_numbers, then aliases,
  // and follows superseded_by up to 5 steps.
  // status: 'found' | 'superseded' (followed at least one step) | 'retired' | 'conflict' | 'not-found'.
  // chain: the refs visited, starting with the matched record. conflict also carries a reason.
  function resolve(input, records) {
    records = records || [];
    var ref = key(input);
    if (!ref) return { status: 'not-found', record: null, chain: [] };

    var found = [];
    ['ref', 'opportunity_numbers', 'aliases'].some(function (field) { found = matches(records, ref, field); return found.length > 0; });
    if (!found.length) return { status: 'not-found', record: null, chain: [] };
    if (found.length > 1) return { status: 'conflict', record: null, chain: [], candidates: found, reason: 'More than one record matches ' + ref + '.' };

    var record = found[0], chain = [key(record.ref)], seen = {};
    seen[chain[0]] = true;
    while (record.superseded_by) {
      if (chain.length > MAX_STEPS) return { status: 'conflict', record: record, chain: chain, reason: 'More than ' + MAX_STEPS + ' superseded steps.' };
      var next = key(record.superseded_by);
      var nextRecords = next ? matches(records, next, 'ref') : [];
      if (nextRecords.length !== 1) return { status: 'conflict', record: record, chain: chain, reason: 'superseded_by ' + record.superseded_by + ' does not lead to exactly one record.' };
      if (seen[next]) return { status: 'conflict', record: record, chain: chain.concat([next]), reason: 'superseded_by forms a loop.' };
      seen[next] = true;
      record = nextRecords[0];
      chain.push(next);
    }
    var status = record.status === 'retired' ? 'retired' : chain.length > 1 ? 'superseded' : 'found';
    return { status: status, record: record, chain: chain };
  }

  // ─── recordFromForm ─────────────────────────────────────────────────────
  // Builds a new registry record (schema continuum.reference v1). The first opportunity number is the
  // primary and becomes ref (DEC-002); there is no workstream suffix (DEC-011-R1).
  // meta: {utc, by, app}. Returns {ok:true, record} or {ok:false, error:{code, message}}.
  function recordFromForm(form, meta) {
    form = form || {}; meta = meta || {};
    var entered = (form.opportunity_numbers || []).filter(function (v) { return String(v).trim() !== ''; });
    if (form.primary !== undefined && form.primary !== null && String(form.primary).trim() !== '') {
      if (entered.length && key(entered[0]) !== key(form.primary)) return fail('primary-not-first', 'The primary opportunity number must be the first one entered.');
      if (!entered.length) entered = [form.primary];
    }
    if (!entered.length) return fail('empty', 'Enter an opportunity number.');
    if (form.workstream) return fail('workstream', 'Workstream suffixes are not used (DEC-011-R1). Create the workstream as its own project with its own first opportunity number.');

    var numbers = [];
    for (var i = 0; i < entered.length; i++) {
      var n = normalise(entered[i]);
      if (!n.ok) return fail(n.error.code, (i === 0 ? '' : 'Opportunity number ' + (i + 1) + ': ') + n.error.message);
      if (numbers.indexOf(n.ref) < 0) numbers.push(n.ref);
    }
    var name = String(form.name == null ? '' : form.name).trim();
    if (!name) return fail('name', 'Enter the project name.');
    if (!meta.utc || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(meta.utc)) return fail('meta', 'meta.utc must be a UTC time such as 2026-10-05T09:30:00Z.');

    var stamp = { utc: meta.utc, by: meta.by == null ? null : String(meta.by), app: meta.app == null ? null : String(meta.app) };
    return {
      ok: true,
      record: {
        schema: 'continuum.reference',
        schema_version: 1,
        ref: numbers[0],
        opportunity_numbers: numbers,
        opportunity_number_as_entered: String(entered[0]),
        name: name,
        client: form.client == null || String(form.client).trim() === '' ? null : String(form.client).trim(),
        status: 'active',
        superseded_by: null,
        aliases: [],
        links: { peoplesoft_project_ids: [], po_team_identifiers: [], other: {} },
        created: stamp,
        updated: { utc: stamp.utc, by: stamp.by, app: stamp.app }
      }
    };
  }

  C.ref = {
    version: '1.0.0',
    normalise: normalise,
    isValid: isValid,
    fileNameFor: fileNameFor,
    toLink: toLink,
    parseFromLocation: parseFromLocation,
    resolve: resolve,
    recordFromForm: recordFromForm
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
