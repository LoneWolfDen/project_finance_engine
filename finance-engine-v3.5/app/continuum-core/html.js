// Continuum.html: safe HTML building, shared by all Continuum apps (ADR-021).
// Classic script, no dependencies. Copy this folder verbatim between apps.
//
//   const H = Continuum.html;
//   el.innerHTML = String(H.t`<strong>${name}</strong> spent ${amount}`);  // values are escaped
//   H.t`${H.raw('<br>')}`                                                   // raw() marks trusted markup
//   H.setText(el, userText);                                                // always plain text
//
// t`` returns a SafeHtml value (use String(...) to get the markup), so t results can be nested
// inside other t templates without being escaped twice.
(function (root) {
  'use strict';
  var C = root.Continuum = root.Continuum || {};

  var ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function SafeHtml(markup) { this.markup = markup; }
  SafeHtml.prototype.toString = function () { return this.markup; };

  function escape(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, function (c) { return ENTITIES[c]; });
  }

  function raw(markup) { return markup instanceof SafeHtml ? markup : new SafeHtml(String(markup)); }

  function isRaw(value) { return value instanceof SafeHtml; }

  function piece(value) {
    if (value instanceof SafeHtml) return value.markup;
    if (Array.isArray(value)) return value.map(piece).join('');
    return escape(value);
  }

  // Tagged template: every interpolated value is escaped unless it is a raw()/t`` result.
  function t(strings) {
    var out = strings[0];
    for (var i = 1; i < arguments.length; i++) out += piece(arguments[i]) + strings[i];
    return new SafeHtml(out);
  }

  function setText(el, value) { el.textContent = value === null || value === undefined ? '' : String(value); }

  C.html = { escape: escape, t: t, raw: raw, isRaw: isRaw, setText: setText };
})(typeof globalThis !== 'undefined' ? globalThis : this);
