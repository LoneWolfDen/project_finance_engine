// IMP-002: Continuum.hash (SHA-256). Runs in Node (pure-JS path) and in the browser (crypto.subtle
// path in a secure context, e.g. file:// in Chromium; the pure-JS path is checked there too).
// Expected values: NIST FIPS 180-4 examples, and Node's crypto module for the others.
(function () {
  // In Node the app scripts are not preloaded: evaluate the module in this context.
  if (typeof Continuum === 'undefined' || !Continuum.hash) (0, eval)(CFE_NODE.readFile('app/continuum-core/hash.js'));
  var T = CFE_TEST, assert = T.assert, H = Continuum.hash;

  var VECTORS = [
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    ['abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'],
    // Lengths around the 64-byte block and padding boundaries.
    [new Array(56).join('a'), '9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318'],
    [new Array(57).join('a'), 'b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a'],
    [new Array(65).join('a'), 'ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb'],
    ['é€😀', 'df9226927fd572c1ee66eec85de1bb139497614899f36e4e90474cb71f6ef9d0']
  ];
  var MILLION_A = 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0';

  function bytes10k() {
    var b = new Uint8Array(10000);
    for (var i = 0; i < b.length; i++) b[i] = (i * 31 + 7) & 255;
    return b.buffer;
  }

  T.suite('Continuum.hash', function () {
    T.test('pure-JS SHA-256: NIST vectors, block boundaries, UTF-8 text', function () {
      VECTORS.forEach(function (v) { assert.equal(H.sha256HexSync(v[0]), v[1], JSON.stringify(v[0].slice(0, 10))); });
    });

    T.test('pure-JS SHA-256: one million "a" (1 MB)', function () {
      assert.equal(H.sha256HexSync(new Array(1000001).join('a')), MILLION_A);
    });

    T.test('UTF-8 without TextEncoder gives the same result', function () {
      var saved = globalThis.TextEncoder;
      globalThis.TextEncoder = undefined;
      try { assert.equal(H.sha256HexSync('é€😀'), VECTORS[6][1]); } finally { globalThis.TextEncoder = saved; }
    });

    T.test('ArrayBuffer and typed-array input', function () {
      var buf = bytes10k();
      var want = '470b2cd71bff57ce8be0be3fc23df273052c4bb10a1235fddb8f158d6f928546';
      assert.equal(H.sha256HexSync(buf), want);
      assert.equal(H.sha256HexSync(new Uint8Array(buf)), want);
      assert.throws(function () { H.sha256HexSync(42); }, 'expected a string or an ArrayBuffer');
    });

    T.test('sha256Hex (async) agrees with the pure-JS path (' + (H.usesSubtle() ? 'crypto.subtle' : 'pure-JS') + ' here)', function () {
      var inputs = VECTORS.map(function (v) { return v[0]; }).concat([bytes10k(), new Array(1000001).join('a')]);
      return Promise.all(inputs.map(function (x) { return H.sha256Hex(x); })).then(function (got) {
        inputs.forEach(function (x, i) { assert.equal(got[i], H.sha256HexSync(x), 'input ' + i); });
        assert.equal(got[got.length - 1], MILLION_A);
      });
    });

    T.test('sha256Hex rejects unsupported input', function () {
      return H.sha256Hex({}).then(function () { throw new Error('should have rejected'); }, function (e) {
        assert.ok(/expected a string or an ArrayBuffer/.test(e.message));
      });
    });
  });
})();
