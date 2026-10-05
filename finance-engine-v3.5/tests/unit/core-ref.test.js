// REF-001: Continuum.ref (DEC-001-R1: no format regex; DEC-002: first number is primary).
// Runs in Node and in the browser.
(function () {
  // In Node the app scripts are not preloaded: evaluate the module in this context.
  if (typeof Continuum === 'undefined' || !Continuum.ref) (0, eval)(CFE_NODE.readFile('app/continuum-core/ref.js'));
  var T = CFE_TEST, assert = T.assert, R = Continuum.ref;

  function rec(ref, extra) {
    var r = { ref: ref, opportunity_numbers: [ref], aliases: [], status: 'active', superseded_by: null };
    Object.keys(extra || {}).forEach(function (k) { r[k] = extra[k]; });
    return r;
  }

  T.suite('Continuum.ref', function () {
    T.test('normalise: the V-08 table', function () {
      assert.deepEqual(R.normalise('o-5030460'), { ok: true, ref: 'O-5030460' });
      assert.deepEqual(R.normalise(' O 008891 '), { ok: true, ref: 'O008891' }, 'spaces removed, leading zeros kept');
      assert.equal(R.normalise('').error.code, 'empty');
      assert.equal(R.normalise('   ').error.code, 'empty');
      assert.equal(R.normalise(new Array(66).join('9')).error.code, 'too-long');
      assert.deepEqual(R.normalise(new Array(65).join('9')).ok, true, '64 characters is allowed');
      assert.deepEqual(R.normalise('a/b'), { ok: true, ref: 'A/B' });
    });

    T.test('normalise: no format regex, but control characters and non-text are refused', function () {
      assert.equal(R.normalise('OPP-2026-00042_x.y').ref, 'OPP-2026-00042_X.Y');
      assert.equal(R.normalise(5030460).ref, '5030460');
      assert.equal(R.normalise('O-1\u0007').error.code, 'control-characters');
      assert.equal(R.normalise(null).error.code, 'not-text');
      assert.ok(R.normalise('').error.message.length > 0, 'errors carry a readable message');
    });

    T.test('isValid: only already-normalised references', function () {
      assert.equal(R.isValid('O-5030460'), true);
      assert.equal(R.isValid('o-5030460'), false);
      assert.equal(R.isValid('O 5030460'), false);
      assert.equal(R.isValid(''), false);
    });

    T.test('fileNameFor: safe file names', function () {
      assert.equal(R.fileNameFor('O-5030460'), 'O-5030460');
      assert.equal(R.fileNameFor('A/B') + '.json', 'A%2FB.json');
      assert.equal(R.fileNameFor('A*B'), 'A%2AB');
      assert.equal(R.fileNameFor('.HIDDEN'), '%2EHIDDEN');
      assert.equal(R.fileNameFor('A:B\\C?"<>|'), 'A%3AB%5CC%3F%22%3C%3E%7C');
      assert.throws(function () { R.fileNameFor('o-1'); }, 'not a normalised reference');
    });

    T.test('toLink and parseFromLocation round-trip, including "/" in a reference', function () {
      assert.equal(R.toLink('index.html', 'O-5030460'), 'index.html#/ref/O-5030460');
      assert.equal(R.parseFromLocation({ hash: '#/ref/O-5030460', search: '' }), 'O-5030460');
      assert.equal(R.parseFromLocation({ hash: '#/ref/o-5030460' }), 'O-5030460', 'normalised on the way in');
      assert.equal(R.parseFromLocation({ hash: '', search: '?x=1&ref=o%205030460' }), 'O5030460');
      var link = R.toLink('app/index.html', 'A/B');
      assert.equal(R.parseFromLocation({ hash: link.slice(link.indexOf('#')) }), 'A/B');
      assert.equal(R.parseFromLocation({ hash: '#/other', search: '' }), null);
      assert.equal(R.parseFromLocation({ hash: '#/ref/%E0%A4%A' }), null, 'bad encoding → null');
      assert.equal(R.parseFromLocation(null), null);
    });

    T.test('resolve: by ref, then opportunity number, then alias; any case', function () {
      var a = rec('O-1', { opportunity_numbers: ['O-1', 'O-9'], aliases: ['Fin-Opp-041026120000'] });
      var records = [a, rec('O-2')];
      assert.deepEqual(R.resolve('o-1', records), { status: 'found', record: a, chain: ['O-1'] });
      assert.equal(R.resolve('O-9', records).record, a, 'a linked opportunity number');
      assert.equal(R.resolve('fin-opp-041026120000', records).record, a, 'an alias (e.g. an old Continuum ID)');
      assert.deepEqual(R.resolve('O-3', records), { status: 'not-found', record: null, chain: [] });
      assert.deepEqual(R.resolve('', records), { status: 'not-found', record: null, chain: [] });
    });

    T.test('resolve: a ref match wins over another record listing it as an opportunity number', function () {
      var a = rec('O-1'), b = rec('O-2', { opportunity_numbers: ['O-2', 'O-1'] });
      assert.equal(R.resolve('O-1', [b, a]).record, a);
    });

    T.test('resolve: superseded chains, retired records, loops, depth limit and conflicts', function () {
      var old = rec('O-OLD', { superseded_by: 'O-MID' }), mid = rec('O-MID', { superseded_by: 'o-new' }), now = rec('O-NEW');
      var r = R.resolve('O-OLD', [old, mid, now]);
      assert.equal(r.status, 'superseded');
      assert.equal(r.record, now);
      assert.deepEqual(r.chain, ['O-OLD', 'O-MID', 'O-NEW']);

      assert.equal(R.resolve('O-R', [rec('O-R', { status: 'retired' })]).status, 'retired');

      var loop = R.resolve('O-A', [rec('O-A', { superseded_by: 'O-B' }), rec('O-B', { superseded_by: 'O-A' })]);
      assert.equal(loop.status, 'conflict');
      assert.ok(/loop/.test(loop.reason));

      var long = [];
      for (var i = 0; i <= 6; i++) long.push(rec('O-' + i, i < 6 ? { superseded_by: 'O-' + (i + 1) } : {}));
      assert.equal(R.resolve('O-1', long).status, 'superseded', '5 steps are followed');
      assert.equal(R.resolve('O-0', long).status, 'conflict', 'a 6th step is refused');

      assert.equal(R.resolve('O-X', [rec('O-X', { superseded_by: 'O-MISSING' })]).status, 'conflict');
      var dup = R.resolve('O-D', [rec('O-D'), rec('O-D')]);
      assert.equal(dup.status, 'conflict');
      assert.equal(dup.candidates.length, 2);
    });

    T.test('recordFromForm: the first number is primary and becomes ref', function () {
      var r = R.recordFromForm({ opportunity_numbers: [' o-5030460', 'O-777', 'o-5030460'], name: ' Project Alpha ', client: 'TestCo' },
        { utc: '2026-10-05T09:30:00Z', by: 'V. Y.', app: 'finance 4.0.0' });
      assert.equal(r.ok, true);
      assert.deepEqual(r.record, {
        schema: 'continuum.reference', schema_version: 1, ref: 'O-5030460', opportunity_numbers: ['O-5030460', 'O-777'],
        opportunity_number_as_entered: ' o-5030460', name: 'Project Alpha', client: 'TestCo', status: 'active', superseded_by: null,
        aliases: [], links: { peoplesoft_project_ids: [], po_team_identifiers: [], other: {} },
        created: { utc: '2026-10-05T09:30:00Z', by: 'V. Y.', app: 'finance 4.0.0' },
        updated: { utc: '2026-10-05T09:30:00Z', by: 'V. Y.', app: 'finance 4.0.0' }
      });
    });

    T.test('recordFromForm: refusals', function () {
      var meta = { utc: '2026-10-05T09:30:00Z' };
      assert.equal(R.recordFromForm({ opportunity_numbers: [], name: 'P' }, meta).error.code, 'empty');
      assert.equal(R.recordFromForm({ opportunity_numbers: ['O-1'], name: ' ' }, meta).error.code, 'name');
      assert.equal(R.recordFromForm({ opportunity_numbers: ['O-1'], name: 'P', workstream: 'W02' }, meta).error.code, 'workstream');
      assert.equal(R.recordFromForm({ opportunity_numbers: ['O-1', 'O-2'], primary: 'O-2', name: 'P' }, meta).error.code, 'primary-not-first');
      assert.equal(R.recordFromForm({ primary: 'o-3', name: 'P' }, meta).record.ref, 'O-3');
      assert.equal(R.recordFromForm({ opportunity_numbers: ['O-1'], name: 'P' }, {}).error.code, 'meta');
    });

    T.test('the module is self-contained', function () {
      assert.equal(typeof R.version, 'string');
    });
  });

  if (typeof CFE_NODE === 'undefined') return;
  T.suite('Continuum.ref source (Node)', function () {
    T.test('no references to CFE, document or window', function () {
      var src = CFE_NODE.readFile('app/continuum-core/ref.js').replace(/^\s*\/\/.*$/gm, '');
      assert.ok(!/\bCFE\b|\bdocument\b|\bwindow\b/.test(src));
    });
  });
})();
