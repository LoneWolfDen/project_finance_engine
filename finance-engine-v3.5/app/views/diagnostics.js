// Diagnostics page, #/diagnostics (SHL-003; TARGET_ARCHITECTURE §22). Registers CFE.views.diagnostics;
// needs app/cfe.js, Continuum.html and Continuum.log.
//
//   CFE.views.diagnostics.environment(window)    // → env: what the page can find out about itself
//   CFE.views.diagnostics.sections(env)          // → [{heading, rows:[[label, value]]}] (pure)
//   CFE.views.diagnostics.text(env)              // → the plain text that Copy diagnostics copies (pure)
//   CFE.views.diagnostics.render(document, env)  // fills #main; the storage estimate arrives later
//
// Shows versions, the published data and readiness checks, the browser, feature support, the
// storage estimate and the last 50 log entries. Nothing leaves the computer: Copy puts the text on
// the clipboard only when the user clicks it.
(function (CFE) {
  'use strict';
  var SHOWN_LOG = 50;

  function yesNo(v) { return v ? 'yes' : 'no'; }

  function mb(bytes) { return (bytes / 1048576).toFixed(1) + ' MB'; }

  function environment(win) {
    var nav = win.navigator || {};
    return {
      version: CFE.version || {},
      coreVersion: Continuum.coreVersion,
      status: CFE.app && CFE.app.status,
      manifest: (CFE.app && CFE.app.manifest) || null,
      userAgent: nav.userAgent || '',
      secure: !!win.isSecureContext,
      protocol: win.location ? win.location.protocol : '',
      features: {
        'Folder picker (showDirectoryPicker)': typeof win.showDirectoryPicker === 'function',
        'Save picker (showSaveFilePicker)': typeof win.showSaveFilePicker === 'function',
        'Secure hashing (crypto.subtle)': !!(win.crypto && win.crypto.subtle),
        'Browser database (indexedDB)': !!win.indexedDB
      },
      storage: undefined,   // filled in by render: {usage, quota}, or null if unknown
      log: Continuum.log.entries().slice(-SHOWN_LOG)
    };
  }

  function showDate(iso) { return CFE.calc.dates ? CFE.calc.dates.toDisplayDate(iso) : iso; }

  function sections(env) {
    var v = env.version || {}, m = env.manifest, st = env.status;
    var out = [];
    out.push({ heading: 'Versions', rows: [
      ['App version', v.app || ''],
      ['Release date', showDate(v.date || '')],
      ['Dataset schema versions supported', v.supportsSchema ? v.supportsSchema.join(' to ') : ''],
      ['Continuum core version', env.coreVersion || '']
    ] });
    var data = [];
    if (st) {
      data.push(['Readiness', { 'ready': 'Ready', 'attention': 'Needs attention', 'not-ready': 'Not ready' }[st.level] || st.level]);
      (st.details && st.details.length ? st.details : [st.title]).forEach(function (d, i) { data.push([i ? '' : 'Checks', d]); });
    }
    if (m) {
      data.push(['Data as of', showDate(m.data_as_of || '')]);
      data.push(['Published', (m.published_utc || '') + (m.publisher ? ' by ' + m.publisher : '')]);
      data.push(['Publication', m.publication_id || '']);
      data.push(['Schema version', String(m.dataset_schema_version || '')]);
    } else data.push(['Published data', 'not loaded']);
    out.push({ heading: 'Published data', rows: data });
    out.push({ heading: 'Browser', rows: [
      ['User agent', env.userAgent],
      ['Secure context', yesNo(env.secure)],
      ['Opened from', env.protocol === 'file:' ? 'file: (a file on this computer)' : env.protocol]
    ] });
    out.push({ heading: 'Features', rows: Object.keys(env.features || {}).map(function (k) { return [k, yesNo(env.features[k])]; }) });
    out.push({ heading: 'Storage', rows: [['Storage estimate',
      env.storage === undefined ? 'checking…' : env.storage === null ? 'not available' : mb(env.storage.usage) + ' used of ' + mb(env.storage.quota)]] });
    return out;
  }

  function logLines(env) {
    return env.log && env.log.length ? env.log.map(Continuum.log.format) : ['(no entries)'];
  }

  function text(env) {
    var lines = ['Finance Engine diagnostics'];
    sections(env).forEach(function (s) {
      lines.push('', s.heading);
      s.rows.forEach(function (r) { lines.push((r[0] ? r[0] + ': ' : '  ') + r[1]); });
    });
    lines.push('', 'Log (last ' + SHOWN_LOG + ' entries)');
    return lines.concat(logLines(env)).join('\n');
  }

  function html(env) {
    var H = Continuum.html, t = H.t;
    var parts = sections(env).map(function (s) {
      return String(t`<h2>${s.heading}</h2><dl class="facts">${H.raw(s.rows.map(function (r) { return String(t`<dt>${r[0]}</dt><dd>${r[1]}</dd>`); }).join(''))}</dl>`);
    });
    parts.push(String(t`<h2>Log (last ${SHOWN_LOG} entries)</h2><pre class="log">${logLines(env).join('\n')}</pre>`));
    return String(t`<h1>Diagnostics</h1><p><button type="button" class="btn" data-action="copy-diagnostics">Copy diagnostics</button> <span class="copy-result" role="status"></span></p>`) + parts.join('');
  }

  function copy(doc, value) {
    var win = doc.defaultView || {};
    var clip = win.navigator && win.navigator.clipboard;
    if (clip && clip.writeText) return clip.writeText(value).then(function () { return true; }, function () { return fallbackCopy(doc, value); });
    return Promise.resolve(fallbackCopy(doc, value));
  }

  function fallbackCopy(doc, value) {
    var ta = doc.createElement('textarea');
    ta.value = value; ta.setAttribute('readonly', ''); ta.className = 'offscreen';
    doc.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  function render(doc, env) {
    var main = doc.getElementById('main');
    env = env || environment(doc.defaultView || window);
    main.innerHTML = html(env);
    main.querySelector('[data-action="copy-diagnostics"]').addEventListener('click', function () {
      var result = main.querySelector('.copy-result');
      copy(doc, text(env)).then(function (ok) {
        result.textContent = ok ? 'Copied. Paste it into your message to support.' : 'Copy did not work. Select the text on this page and copy it.';
        Continuum.log.info('diagnostics', ok ? 'Diagnostics copied' : 'Copy failed');
      });
    });
    if (env.storage === undefined) {
      var est = Continuum.storage && Continuum.storage.estimate ? Continuum.storage.estimate() : Promise.resolve(null);
      est.then(function (e) {
        env.storage = e || null;
        if (main.querySelector('[data-action="copy-diagnostics"]')) {   // still on this page
          var result = main.querySelector('.copy-result').textContent;
          render(doc, env);
          main.querySelector('.copy-result').textContent = result;
        }
      });
    }
    return env;
  }

  CFE.views.diagnostics = { environment: environment, sections: sections, text: text, render: render, shownLog: SHOWN_LOG };
})(CFE);
