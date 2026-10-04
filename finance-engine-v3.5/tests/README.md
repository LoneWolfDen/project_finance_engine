# Tests

No npm, no `package.json`, no third-party test libraries. Everything uses one small harness, `tests/harness.js` (`CFE_TEST`).

## Commands (run from `finance-engine-v3.5/`)

| What | Command | Needs |
|---|---|---|
| All Node suites | `node tests/run-node.js` | Node 18+ |
| One suite (name contains the text) | `node tests/run-node.js --suite=Forecast` | Node |
| In another time zone | `node tests/run-node.js --tz=America/New_York` | Node |
| Rewrite golden files in one folder | `node tests/run-node.js --update-golden=legacy` (writes only under `tests/golden/legacy/`) | Node |
| Browser suites | Open `tests/index.html` from Finder or File Explorer (Edge or Chrome). It should say **All suites passed** | A browser |
| Legacy server | `python3 -m unittest discover -s tests/server -v` | Python 3.11+ |

The Node runner prints each test with ✓ or ✗, then `All suites passed`, and exits with code 0. Any failure gives exit code 1.

## Folders

| Folder | Contents | Runs in |
|---|---|---|
| `unit/` | Tests of small modules and of the harness itself | Node; browser if listed in `browser-suites.js` |
| `characterisation/` | Tests that pin down what the legacy app does today (they may read files from disk) | Node only |
| `support/` | Node-only helpers (e.g. the legacy sandbox) | — |
| `golden/` | Expected outputs written with `--update-golden`. Change them only when a backlog item names them | — |
| `fixtures/` | Synthetic input files. **Never real data** | — |
| `server/` | Python tests for `server.py` | Python |

## Writing a test

```js
(function () {
  var T = CFE_TEST, assert = T.assert;
  T.suite('Burn rate', function () {
    T.test('divides spend by working days', function () {
      assert.approx(burnRate(1000, 3), 333.33, 0.01);
    });
  });
})();
```

Assertions: `equal`, `deepEqual` (reports the path of the first difference), `ok`, `throws(fn, textOrRegExp)`, `approx(a, b, eps)`. Tests may return a Promise. `CFE_TEST.golden('legacy/name.json', value)` compares a value with a golden file (Node only).

Node test files can use `CFE_NODE`: `appDir`, `testsDir`, `support('<file>')` to load a helper from `tests/support/`, and `readFile('<path relative to finance-engine-v3.5>')`.

To make a test run in the browser too, add its path to `SUITES` in `tests/browser-suites.js` (and any `app/` scripts it needs to `APP_SCRIPTS`).
