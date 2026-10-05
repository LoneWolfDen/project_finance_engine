// Continuum.hash: SHA-256 fingerprints of files and text (IMP-002), shared by all Continuum apps.
// Classic script, no dependencies. Copy this folder verbatim between apps.
//
//   Continuum.hash.sha256Hex('abc').then(function (hex) { … });        // text is hashed as UTF-8
//   Continuum.hash.sha256Hex(arrayBuffer).then(function (hex) { … });  // e.g. from file.arrayBuffer()
//   Continuum.hash.sha256HexSync('abc')                                 // always the pure-JS version
//
// sha256Hex uses the browser's crypto.subtle in a secure context (file:// counts in Chromium) and
// otherwise the readable pure-JS implementation below. Both give the same 64-character lower-case hex.
(function (root) {
  'use strict';
  var C = root.Continuum = root.Continuum || {};

  // ─── input → bytes ──────────────────────────────────────────────────────
  function utf8(text) {
    if (typeof root.TextEncoder === 'function') return new root.TextEncoder().encode(text);
    var out = [];
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < text.length) {         // surrogate pair → one code point
        var d = text.charCodeAt(i + 1);
        if (d >= 0xDC00 && d <= 0xDFFF) { c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return new Uint8Array(out);
  }

  function toBytes(input) {
    if (typeof input === 'string') return utf8(input);
    if (input instanceof ArrayBuffer || Object.prototype.toString.call(input) === '[object ArrayBuffer]') return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError('Continuum.hash: expected a string or an ArrayBuffer');
  }

  function hex(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return s;
  }

  // ─── pure-JS SHA-256 (FIPS 180-4) ───────────────────────────────────────
  // Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes.
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  function sha256Bytes(message) {
    // Initial hash: first 32 bits of the fractional parts of the square roots of the first 8 primes.
    var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

    // Padding: a 1 bit, zeros, then the message length in bits as a 64-bit big-endian number.
    var bitLength = message.length * 8;
    var padded = new Uint8Array(Math.ceil((message.length + 9) / 64) * 64);
    padded.set(message);
    padded[message.length] = 0x80;
    var view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000));
    view.setUint32(padded.length - 4, bitLength >>> 0);

    var w = new Array(64);
    for (var block = 0; block < padded.length; block += 64) {
      for (var t = 0; t < 16; t++) w[t] = view.getUint32(block + t * 4);
      for (t = 16; t < 64; t++) {
        var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        var s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], k = h[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var temp1 = (k + S1 + ch + K[t] + w[t]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (S0 + maj) | 0;
        k = g; g = f; f = e; e = (d + temp1) | 0;
        d = c; c = b; b = a; a = (temp1 + temp2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + k) | 0;
    }

    var out = new Uint8Array(32);
    var outView = new DataView(out.buffer);
    for (var i = 0; i < 8; i++) outView.setUint32(i * 4, h[i] >>> 0);
    return out;
  }

  // ─── public API ─────────────────────────────────────────────────────────
  function sha256HexSync(input) { return hex(sha256Bytes(toBytes(input))); }

  function subtle() {
    try {
      return root.isSecureContext && root.crypto && root.crypto.subtle && root.crypto.subtle.digest ? root.crypto.subtle : null;
    } catch (e) { return null; }
  }

  function sha256Hex(input) {
    var bytes;
    try { bytes = toBytes(input); } catch (e) { return Promise.reject(e); }
    var s = subtle();
    if (!s) return Promise.resolve(hex(sha256Bytes(bytes)));
    return s.digest('SHA-256', bytes).then(function (buf) { return hex(new Uint8Array(buf)); });
  }

  C.hash = { sha256Hex: sha256Hex, sha256HexSync: sha256HexSync, usesSubtle: function () { return !!subtle(); } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
