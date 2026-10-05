// Continuum.status: the readiness status shown in every Continuum app's banner (SHL-002;
// TARGET_ARCHITECTURE §3.4). Classic script, no dependencies; touches no page or app namespace.
//
//   Continuum.status.compute({datasetLoaded:true, hashOk:true, manifest, nowUtc:new Date(), staleAfterDays:7})
//   // → {level:'ready'|'attention'|'not-ready', title:'Data as of 01-10-2026 · …', details:[…]}
//
// input (all optional except datasetLoaded):
//   datasetLoaded   false → not ready ("No published data found")
//   hashOk          false → not ready (the published files do not match their checksum)
//   newerSchema     true  → not ready (the data needs a newer app)
//   errors          blocking errors (list of messages, or a number) → not ready
//   refState        'not-found' → not ready; 'partial' → attention; 'found' or absent → no effect
//   ref             the reference in the link, used in the refState messages
//   schemaMigrated  true → attention (older data was upgraded in memory)
//   warnings        list of messages (or a number) → attention; manifest.validation.warnings also count
//   manifest        {data_as_of:'YYYY-MM-DD', published_utc, publisher, …}
//   nowUtc          Date or ISO time; with staleAfterDays, data older than that many days → attention
//   sample          true for a publication marked "sample" (synthetic demo data): the age check is
//                   skipped (its date is fixed) and the summary starts with "Sample data (not real)"
// The worst level wins. title is the message of the first rule at that level; details lists every
// message, then the data summary. Dates are shown DD-MM-YYYY, times in UTC.
(function (root) {
  'use strict';
  var C = root.Continuum = root.Continuum || {};
  var DAY = 86400000;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function showDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
  }

  function showTime(iso) {
    var d = new Date(iso);
    if (!iso || isNaN(d)) return '';
    return showDate(d.toISOString()) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' UTC';
  }

  function count(v) { return Array.isArray(v) ? v.length : (typeof v === 'number' && v > 0 ? Math.floor(v) : 0); }

  // Whole days from the data date (midnight UTC) to now; null if either is unknown.
  function ageDays(asOf, now) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(asOf || ''));
    var t = now instanceof Date ? now.getTime() : Date.parse(now);
    if (!m || isNaN(t)) return null;
    return Math.floor((t - Date.UTC(+m[1], +m[2] - 1, +m[3])) / DAY);
  }

  function summary(manifest, warnings, sample) {
    var parts = sample ? ['Sample data (not real)'] : [];
    if (manifest.data_as_of) parts.push('Data as of ' + showDate(manifest.data_as_of));
    var when = showTime(manifest.published_utc);
    if (when) parts.push('published ' + when + (manifest.publisher ? ' by ' + manifest.publisher : ''));
    if (warnings) parts.push(warnings + (warnings === 1 ? ' warning' : ' warnings'));
    return parts.join(' · ');
  }

  function compute(input) {
    input = input || {};
    var manifest = input.manifest || {};
    var notReady = [], attention = [];
    var refText = input.ref ? ' "' + input.ref + '"' : '';

    if (!input.datasetLoaded) {
      notReady.push('No published data found. Ask the publisher to publish, or check that the published folder is next to this app.');
    } else {
      if (input.hashOk === false) notReady.push('The published data is damaged: it does not match its checksum. Ask the publisher to publish again.');
      if (input.newerSchema) notReady.push('This data needs a newer version of the app. Update the app.');
      var errors = count(input.errors);
      if (errors) notReady.push('The data could not be read (' + errors + (errors === 1 ? ' error' : ' errors') + '). Ask the publisher to check it.');
    }
    if (input.refState === 'not-found') notReady.push('Project reference' + refText + ' was not found.');

    var warnings = count(input.warnings) + count(manifest.validation && manifest.validation.warnings);
    if (input.datasetLoaded) {
      var age = ageDays(manifest.data_as_of, input.nowUtc);
      var limit = typeof input.staleAfterDays === 'number' ? input.staleAfterDays : 7;
      if (!input.sample && age !== null && age > limit) attention.push('Data is ' + age + ' days old. Ask the publisher to refresh.');
      if (input.schemaMigrated) attention.push('This data was published by an older version of the app; it was upgraded for display.');
      if (warnings) attention.push('The data has ' + warnings + (warnings === 1 ? ' warning' : ' warnings') + '. See Details.');
    }
    if (input.refState === 'partial') attention.push('Project reference' + refText + ' matched only partly. Check that this is the right project.');

    var line = input.datasetLoaded ? summary(manifest, warnings, input.sample) : '';
    var level = notReady.length ? 'not-ready' : attention.length ? 'attention' : 'ready';
    var messages = notReady.concat(attention);
    return {
      level: level,
      title: messages.length ? messages[0] : (line || 'Data loaded.'),
      details: line ? messages.concat([line]) : messages
    };
  }

  C.status = { compute: compute, ageDays: ageDays };
})(typeof globalThis !== 'undefined' ? globalThis : this);
