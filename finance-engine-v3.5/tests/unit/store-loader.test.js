// STO-004: published dataset loader (CFE.store.loadPublished, CFE.store.loader) and CFE.state.
// Runs in Node (sample read from disk; script loading with an injected fake document) and in the
// browser (sample loaded with <script> tags; the real loader finds no tests/published/ folder).
(function () {
  if (typeof CFE_NODE !== 'undefined' && (typeof Continuum === 'undefined' || !Continuum.status)) {
    ['app/continuum-core/ref.js', 'app/continuum-core/hash.js', 'app/continuum-core/status.js'].forEach(function (f) { (0, eval)(CFE_NODE.readFile(f)); });
  }
  if (typeof CFE === 'undefined' || !CFE.version) {
    (0, eval)(CFE_NODE.readFile('app/VERSION.js'));
    (0, eval)(CFE_NODE.readFile('app/config.js'));
  }
  if (!CFE.require) (0, eval)(CFE_NODE.readFile('app/cfe.js'));
  if (!CFE.data.schema) (0, eval)(CFE_NODE.readFile('app/data/schema.js'));
  if (!CFE.data.migrate) (0, eval)(CFE_NODE.readFile('app/data/migrate.js'));
  if (!CFE.actions) (0, eval)(CFE_NODE.readFile('app/store/state.js'));
  if (!CFE.store.loader) (0, eval)(CFE_NODE.readFile('app/store/dataset-loader.js'));
  var T = CFE_TEST, assert = T.assert, L = CFE.store.loader;
  var NOW = '2026-10-05T12:00:00Z';

  var cached = null;
  // The sample publication as fresh copies {manifest, dataset}.
  function sample() {
    if (!cached) {
      if (typeof CFE_NODE !== 'undefined') {
        cached = Promise.resolve({ manifest: CFE_NODE.readFile('samples/published/manifest.json'), dataset: CFE_NODE.readFile('samples/published/dataset.json') });
      } else {
        cached = ['manifest', 'dataset'].reduce(function (p, n) {
          return p.then(function () {
            return new Promise(function (resolve, reject) {
              var s = document.createElement('script');
              s.onload = resolve; s.onerror = function () { reject(new Error('cannot load ' + n)); };
              s.src = '../samples/published/' + n + '.js';
              document.head.appendChild(s);
            });
          });
        }, Promise.resolve()).then(function () {
          var out = { manifest: JSON.stringify(window.CFE_PUBLISHED_MANIFEST), dataset: JSON.stringify(window.CFE_PUBLISHED_DATASET) };
          delete window.CFE_PUBLISHED_MANIFEST; delete window.CFE_PUBLISHED_DATASET;
          return out;
        });
      }
    }
    return cached.then(function (s) { return { manifest: JSON.parse(s.manifest), dataset: JSON.parse(s.dataset) }; });
  }

  function statusOf(r) {
    return Continuum.status.compute(Object.assign({}, r.statusInput, { manifest: r.manifest || {}, nowUtc: NOW, staleAfterDays: 7 }));
  }

  T.suite('CFE.store.loader', function () {
    T.test('the sample loads: plain data, valid, checksum matches; banner ready (sample)', function () {
      return sample().then(function (s) { return L.check(s.manifest, s.dataset); }).then(function (r) {
        assert.equal(r.ok, true, JSON.stringify(r.problems));
        assert.equal(r.statusInput.hashOk, true);
        assert.equal(r.dataset.references.length, 2);
        var st = statusOf(r);
        assert.equal(st.level, 'ready');
        assert.ok(/^Sample data \(not real\) · Data as of 19-12-2025/.test(st.title), st.title);
      });
    });

    T.test('one changed number: checksum mismatch, banner not ready', function () {
      return sample().then(function (s) {
        s.dataset.purchase_orders[0].value += 1;
        return L.check(s.manifest, s.dataset);
      }).then(function (r) {
        assert.equal(r.ok, false);
        assert.equal(r.statusInput.hashOk, false);
        var st = statusOf(r);
        assert.equal(st.level, 'not-ready');
        assert.ok(/damaged/.test(st.title));
      });
    });

    T.test('nothing published: "No published data found"', function () {
      return L.check(undefined, undefined).then(function (r) {
        assert.equal(r.ok, false);
        assert.ok(/^No published data found/.test(statusOf(r).title));
      });
    });

    T.test('manifest without dataset (or the reverse) cannot be read', function () {
      return sample().then(function (s) {
        return Promise.all([L.check(s.manifest, undefined), L.check(undefined, s.dataset)]);
      }).then(function (rs) {
        assert.deepEqual(rs.map(function (r) { return r.problems[0]; }), ['dataset is missing', 'manifest is missing']);
        rs.forEach(function (r) { assert.ok(/could not be read/.test(statusOf(r).title)); });
      });
    });

    T.test('schema 2: "Update the app"', function () {
      return sample().then(function (s) {
        var m2 = JSON.parse(JSON.stringify(s.manifest)); m2.dataset_schema_version = 2;
        var d2 = JSON.parse(JSON.stringify(s.dataset)); d2.schema_version = 2;
        return Promise.all([L.check(m2, s.dataset), L.check(s.manifest, d2)]);
      }).then(function (rs) {
        rs.forEach(function (r) {
          assert.equal(r.statusInput.newerSchema, true);
          assert.ok(/Update the app/.test(statusOf(r).title));
        });
      });
    });

    T.test('functions, dates, getters and class instances inside the payload are refused', function () {
      return sample().then(function (s) {
        var cases = [];
        var a = JSON.parse(JSON.stringify(s.dataset)); a.references[0].name = function () { return 'x'; }; cases.push([s.manifest, a, 'dataset.references[0].name']);
        var b = JSON.parse(JSON.stringify(s.dataset)); b.purchase_orders[1].start = new Date(); cases.push([s.manifest, b, 'dataset.purchase_orders[1].start']);
        var c = JSON.parse(JSON.stringify(s.manifest)); Object.defineProperty(c, 'publisher', { get: function () { return 'x'; }, enumerable: true }); cases.push([c, s.dataset, 'manifest.publisher']);
        function K() { this.x = 1; }
        var d = JSON.parse(JSON.stringify(s.dataset)); d.people[0] = new K(); cases.push([s.manifest, d, 'dataset.people[0]']);
        var e = JSON.parse(JSON.stringify(s.dataset)); e.actuals[0].hours = Infinity; cases.push([s.manifest, e, 'dataset.actuals[0].hours']);
        return Promise.all(cases.map(function (x) { return L.check(x[0], x[1]).then(function (r) { return [r, x[2]]; }); }));
      }).then(function (rs) {
        rs.forEach(function (x) {
          assert.equal(x[0].ok, false, x[1]);
          assert.ok(x[0].problems[0].indexOf(x[1]) === 0, x[0].problems[0]);
          assert.equal(statusOf(x[0]).level, 'not-ready');
        });
      });
    });

    T.test('schema errors are listed and block loading', function () {
      return sample().then(function (s) {
        delete s.dataset.purchase_orders[0].currency;
        s.manifest.publisher = '';
        return Promise.all([L.check(JSON.parse(JSON.stringify(s.manifest)), s.dataset), sample().then(function (t) { delete t.dataset.purchase_orders[0].currency; return L.check(t.manifest, t.dataset); })]);
      }).then(function (rs) {
        assert.equal(rs[0].ok, false);
        assert.ok(/publisher/.test(rs[0].problems[0]), rs[0].problems[0]);
        assert.equal(rs[1].ok, false);
        assert.ok(/purchase_orders\[0\]\.currency/.test(rs[1].problems[0]), rs[1].problems[0]);
      });
    });

    T.test('fromFiles: needs both files, valid JSON, then the same checks', function () {
      function file(name, text) { return { name: name, text: function () { return Promise.resolve(text); } }; }
      return sample().then(function (s) {
        return Promise.all([
          L.fromFiles([file('Dataset.json', JSON.stringify(s.dataset)), file('manifest.json', JSON.stringify(s.manifest))]),
          L.fromFiles([file('dataset.json', '{}')]),
          L.fromFiles([file('dataset.json', '{'), file('manifest.json', '{}')]),
          L.fromFiles([{ name: 'dataset.json', text: function () { return Promise.reject(new Error('NotFoundError')); } }, file('manifest.json', '{}')])
        ]);
      }).then(function (rs) {
        assert.equal(rs[0].ok, true, JSON.stringify(rs[0].problems));
        assert.deepEqual(rs[1].problems, ['Choose both dataset.json and manifest.json.']);
        assert.deepEqual(rs[2].problems, ['A file is not valid JSON.']);
        assert.deepEqual(rs[3].problems, ['The chosen files could not be read. Choose them again.'], 'a read error is reported, not thrown');
      });
    });

    T.test('CFE.actions.setPublished stores the result and notifies subscribers', function () {
      var seen = [], saved = CFE.state.published;
      var off = CFE.actions.subscribe(function (state, change) { seen.push(change + ':' + (state.published ? 'set' : 'null')); });
      try {
        CFE.actions.setPublished({ manifest: {}, dataset: {} });
        CFE.actions.setPublished(null);
        off();
        CFE.actions.setPublished({ manifest: {}, dataset: {} });
        assert.deepEqual(seen, ['published:set', 'published:null']);
      } finally { CFE.state.published = saved; }
    });
  });

  if (typeof CFE_NODE !== 'undefined') {
    T.suite('CFE.store.loadPublished (Node, fake document)', function () {
      function fakePage(files) {
        var win = { CFE_PUBLISHED_MANIFEST: 'stale', CFE_PUBLISHED_DATASET: 'stale' }, added = [];
        var doc = {
          head: { appendChild: function (el) {
            added.push(el.src);
            setTimeout(function () {
              var f = files[el.src];
              if (!f) { el.fire('error'); return; }
              win[f[0]] = f[1];
              el.fire('load');
            }, 0);
          } },
          createElement: function (tag) {
            assert.equal(tag, 'script');
            var handlers = {};
            return { addEventListener: function (t, fn) { handlers[t] = fn; }, fire: function (t) { handlers[t](); } };
          }
        };
        return { win: win, doc: doc, added: added };
      }

      T.test('loads manifest.js then dataset.js and checks them', function () {
        return sample().then(function (s) {
          var p = fakePage({ 'published/manifest.js': ['CFE_PUBLISHED_MANIFEST', s.manifest], 'published/dataset.js': ['CFE_PUBLISHED_DATASET', s.dataset] });
          return CFE.store.loadPublished(p.win, p.doc).then(function (r) {
            assert.deepEqual(p.added, ['published/manifest.js', 'published/dataset.js']);
            assert.equal(r.ok, true, JSON.stringify(r.problems));
          });
        });
      });

      T.test('no published folder: no data, stale globals are not used', function () {
        var p = fakePage({});
        return CFE.store.loadPublished(p.win, p.doc).then(function (r) {
          assert.deepEqual(p.added, ['published/manifest.js'], 'dataset.js is not tried');
          assert.equal(r.statusInput.datasetLoaded, false);
          assert.equal(p.win.CFE_PUBLISHED_MANIFEST, undefined);
        });
      });

      T.test('manifest.js present but dataset.js missing: cannot be read', function () {
        return sample().then(function (s) {
          var p = fakePage({ 'published/manifest.js': ['CFE_PUBLISHED_MANIFEST', s.manifest] });
          return CFE.store.loadPublished(p.win, p.doc);
        }).then(function (r) {
          assert.deepEqual(r.problems, ['dataset is missing']);
        });
      });
    });
  } else {
    T.suite('CFE.store.loadPublished (browser)', function () {
      T.test('tests/ has no published/ folder: "No published data found"', function () {
        return CFE.store.loadPublished(window, document).then(function (r) {
          assert.equal(r.statusInput.datasetLoaded, false);
        });
      });
    });
  }
})();
