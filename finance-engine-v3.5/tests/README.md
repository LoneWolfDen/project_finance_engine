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

## Golden files (`tests/golden/legacy/`, TST-003)

They record what the **legacy** calculations output today, defects included, with the clock fixed at `2026-10-01T12:00:00Z` (one file uses `2025-08-15`). Money values may differ by at most 0.005. Files ending `.tz-<zone>.json` hold the output in that time zone and exist because of **KNOWN DEFECT C-01** (results depend on the computer's time zone); Europe/London is the reference. Change goldens only when a backlog item names them (FIX-* items), with `--update-golden=legacy`.

Run: `node tests/run-node.js --suite=legacy-calc --tz=Europe/London` (also `--tz=America/New_York`, `--tz=Asia/Kolkata`). In any other time zone the time-zone-dependent cases are skipped and say so.

| File | What it records | Input | Time zone |
|---|---|---|---|
| `actuals-cache-basic.json` | `aggregateActuals` → stored `actuals_by_project` / `actuals_monthly`, `computeActualsFromCache`, toasts | `tests/fixtures/legacy-config-basic.json` | Europe/London (reference) |
| `actuals-cache-basic.tz-America_New_York.json` | `aggregateActuals` → stored `actuals_by_project` / `actuals_monthly`, `computeActualsFromCache`, toasts | `tests/fixtures/legacy-config-basic.json` | America/New_York (KNOWN DEFECT C-01) |
| `actuals-cache-basic.tz-Asia_Kolkata.json` | `aggregateActuals` → stored `actuals_by_project` / `actuals_monthly`, `computeActualsFromCache`, toasts | `tests/fixtures/legacy-config-basic.json` | Asia/Kolkata (KNOWN DEFECT C-01) |
| `actuals-cache-defaults.json` | `aggregateActuals` → stored `actuals_by_project` / `actuals_monthly`, `computeActualsFromCache`, toasts | legacy `DEFAULTS` (sample data in `index.html`) | Europe/London (reference) |
| `actuals-cache-defaults.tz-America_New_York.json` | `aggregateActuals` → stored `actuals_by_project` / `actuals_monthly`, `computeActualsFromCache`, toasts | legacy `DEFAULTS` (sample data in `index.html`) | America/New_York (KNOWN DEFECT C-01) |
| `actuals-cache-defaults.tz-Asia_Kolkata.json` | `aggregateActuals` → stored `actuals_by_project` / `actuals_monthly`, `computeActualsFromCache`, toasts | legacy `DEFAULTS` (sample data in `index.html`) | Asia/Kolkata (KNOWN DEFECT C-01) |
| `actuals-cache-multicurrency.json` | `aggregateActuals` → stored `actuals_by_project` / `actuals_monthly`, `computeActualsFromCache`, toasts | `tests/fixtures/legacy-config-multicurrency.json` | Europe/London (reference) |
| `actuals-cache-multicurrency.tz-America_New_York.json` | `aggregateActuals` → stored `actuals_by_project` / `actuals_monthly`, `computeActualsFromCache`, toasts | `tests/fixtures/legacy-config-multicurrency.json` | America/New_York (KNOWN DEFECT C-01) |
| `actuals-cache-multicurrency.tz-Asia_Kolkata.json` | `aggregateActuals` → stored `actuals_by_project` / `actuals_monthly`, `computeActualsFromCache`, toasts | `tests/fixtures/legacy-config-multicurrency.json` | Asia/Kolkata (KNOWN DEFECT C-01) |
| `actuals-cache-y2027.json` | `aggregateActuals` → stored `actuals_by_project` / `actuals_monthly`, `computeActualsFromCache`, toasts | `tests/fixtures/legacy-config-2027.json` | Europe/London (reference) |
| `actuals-cache-y2027.tz-America_New_York.json` | `aggregateActuals` → stored `actuals_by_project` / `actuals_monthly`, `computeActualsFromCache`, toasts | `tests/fixtures/legacy-config-2027.json` | America/New_York (KNOWN DEFECT C-01) |
| `actuals-cache-y2027.tz-Asia_Kolkata.json` | `aggregateActuals` → stored `actuals_by_project` / `actuals_monthly`, `computeActualsFromCache`, toasts | `tests/fixtures/legacy-config-2027.json` | Asia/Kolkata (KNOWN DEFECT C-01) |
| `actuals-monthly-basic.json` | `computeActualsMonthly(cfg, null, projToTeam)` | `tests/fixtures/legacy-config-basic.json` | Europe/London (reference) |
| `actuals-monthly-basic.tz-America_New_York.json` | `computeActualsMonthly(cfg, null, projToTeam)` | `tests/fixtures/legacy-config-basic.json` | America/New_York (KNOWN DEFECT C-01) |
| `actuals-monthly-basic.tz-Asia_Kolkata.json` | `computeActualsMonthly(cfg, null, projToTeam)` | `tests/fixtures/legacy-config-basic.json` | Asia/Kolkata (KNOWN DEFECT C-01) |
| `actuals-monthly-defaults.json` | `computeActualsMonthly(cfg, null, projToTeam)` | legacy `DEFAULTS` (sample data in `index.html`) | Europe/London (reference) |
| `actuals-monthly-defaults.tz-America_New_York.json` | `computeActualsMonthly(cfg, null, projToTeam)` | legacy `DEFAULTS` (sample data in `index.html`) | America/New_York (KNOWN DEFECT C-01) |
| `actuals-monthly-defaults.tz-Asia_Kolkata.json` | `computeActualsMonthly(cfg, null, projToTeam)` | legacy `DEFAULTS` (sample data in `index.html`) | Asia/Kolkata (KNOWN DEFECT C-01) |
| `actuals-monthly-multicurrency.json` | `computeActualsMonthly(cfg, null, projToTeam)` | `tests/fixtures/legacy-config-multicurrency.json` | Europe/London (reference) |
| `actuals-monthly-multicurrency.tz-America_New_York.json` | `computeActualsMonthly(cfg, null, projToTeam)` | `tests/fixtures/legacy-config-multicurrency.json` | America/New_York (KNOWN DEFECT C-01) |
| `actuals-monthly-multicurrency.tz-Asia_Kolkata.json` | `computeActualsMonthly(cfg, null, projToTeam)` | `tests/fixtures/legacy-config-multicurrency.json` | Asia/Kolkata (KNOWN DEFECT C-01) |
| `actuals-monthly-y2027.json` | `computeActualsMonthly(cfg, null, projToTeam)` | `tests/fixtures/legacy-config-2027.json` | Europe/London (reference) |
| `actuals-monthly-y2027.tz-America_New_York.json` | `computeActualsMonthly(cfg, null, projToTeam)` | `tests/fixtures/legacy-config-2027.json` | America/New_York (KNOWN DEFECT C-01) |
| `actuals-monthly-y2027.tz-Asia_Kolkata.json` | `computeActualsMonthly(cfg, null, projToTeam)` | `tests/fixtures/legacy-config-2027.json` | Asia/Kolkata (KNOWN DEFECT C-01) |
| `builddata-basic.json` | `buildData()` totals: tAct, tExp, rem, fc.total, fc.rate, years, teams | `tests/fixtures/legacy-config-basic.json` | Europe/London (reference) |
| `builddata-basic.tz-America_New_York.json` | `buildData()` totals: tAct, tExp, rem, fc.total, fc.rate, years, teams | `tests/fixtures/legacy-config-basic.json` | America/New_York (KNOWN DEFECT C-01) |
| `builddata-basic.tz-Asia_Kolkata.json` | `buildData()` totals: tAct, tExp, rem, fc.total, fc.rate, years, teams | `tests/fixtures/legacy-config-basic.json` | Asia/Kolkata (KNOWN DEFECT C-01) |
| `builddata-defaults.json` | `buildData()` totals: tAct, tExp, rem, fc.total, fc.rate, years, teams | legacy `DEFAULTS` (sample data in `index.html`) | Europe/London (reference) |
| `builddata-defaults.tz-America_New_York.json` | `buildData()` totals: tAct, tExp, rem, fc.total, fc.rate, years, teams | legacy `DEFAULTS` (sample data in `index.html`) | America/New_York (KNOWN DEFECT C-01) |
| `builddata-defaults.tz-Asia_Kolkata.json` | `buildData()` totals: tAct, tExp, rem, fc.total, fc.rate, years, teams | legacy `DEFAULTS` (sample data in `index.html`) | Asia/Kolkata (KNOWN DEFECT C-01) |
| `builddata-multicurrency.json` | `buildData()` totals: tAct, tExp, rem, fc.total, fc.rate, years, teams | `tests/fixtures/legacy-config-multicurrency.json` | Europe/London (reference) |
| `builddata-multicurrency.tz-America_New_York.json` | `buildData()` totals: tAct, tExp, rem, fc.total, fc.rate, years, teams | `tests/fixtures/legacy-config-multicurrency.json` | America/New_York (KNOWN DEFECT C-01) |
| `builddata-multicurrency.tz-Asia_Kolkata.json` | `buildData()` totals: tAct, tExp, rem, fc.total, fc.rate, years, teams | `tests/fixtures/legacy-config-multicurrency.json` | Asia/Kolkata (KNOWN DEFECT C-01) |
| `builddata-y2027.json` | `buildData()` totals: tAct, tExp, rem, fc.total, fc.rate, years, teams | `tests/fixtures/legacy-config-2027.json` | Europe/London (reference) |
| `builddata-y2027.tz-America_New_York.json` | `buildData()` totals: tAct, tExp, rem, fc.total, fc.rate, years, teams | `tests/fixtures/legacy-config-2027.json` | America/New_York (KNOWN DEFECT C-01) |
| `builddata-y2027.tz-Asia_Kolkata.json` | `buildData()` totals: tAct, tExp, rem, fc.total, fc.rate, years, teams | `tests/fixtures/legacy-config-2027.json` | Asia/Kolkata (KNOWN DEFECT C-01) |
| `deduplicate-actuals.json` | `deduplicateActuals`. **Changed by DAT-006 (DEC-016, 2026-10-05):** only rows identical in every column are removed, so `removed` went from 2 to 1 and the 6 h PERFORM row of employee 1001 (same day and project as the 2 h TRAVEL row) is now kept | `tests/fixtures/timesheet-duplicates.csv` | any |
| `forecast-basic-now-2025-08-15.json` | `computeForecast(cfg, [])` with the clock at 2025-08-15 | `tests/fixtures/legacy-config-basic.json` | Europe/London (reference) |
| `forecast-basic-now-2025-08-15.tz-America_New_York.json` | `computeForecast(cfg, [])` with the clock at 2025-08-15 | `tests/fixtures/legacy-config-basic.json` | America/New_York (KNOWN DEFECT C-01) |
| `forecast-basic-now-2025-08-15.tz-Asia_Kolkata.json` | `computeForecast(cfg, [])` with the clock at 2025-08-15 | `tests/fixtures/legacy-config-basic.json` | Asia/Kolkata (KNOWN DEFECT C-01) |
| `forecast-basic.json` | `computeForecast(cfg, [])` and for the first PO team | `tests/fixtures/legacy-config-basic.json` | Europe/London (reference) |
| `forecast-basic.tz-America_New_York.json` | `computeForecast(cfg, [])` and for the first PO team | `tests/fixtures/legacy-config-basic.json` | America/New_York (KNOWN DEFECT C-01) |
| `forecast-basic.tz-Asia_Kolkata.json` | `computeForecast(cfg, [])` and for the first PO team | `tests/fixtures/legacy-config-basic.json` | Asia/Kolkata (KNOWN DEFECT C-01) |
| `forecast-defaults.json` | `computeForecast(cfg, [])` and for the first PO team | legacy `DEFAULTS` (sample data in `index.html`) | Europe/London (reference) |
| `forecast-defaults.tz-America_New_York.json` | `computeForecast(cfg, [])` and for the first PO team | legacy `DEFAULTS` (sample data in `index.html`) | America/New_York (KNOWN DEFECT C-01) |
| `forecast-defaults.tz-Asia_Kolkata.json` | `computeForecast(cfg, [])` and for the first PO team | legacy `DEFAULTS` (sample data in `index.html`) | Asia/Kolkata (KNOWN DEFECT C-01) |
| `forecast-multicurrency.json` | `computeForecast(cfg, [])` and for the first PO team | `tests/fixtures/legacy-config-multicurrency.json` | Europe/London (reference) |
| `forecast-multicurrency.tz-America_New_York.json` | `computeForecast(cfg, [])` and for the first PO team | `tests/fixtures/legacy-config-multicurrency.json` | America/New_York (KNOWN DEFECT C-01) |
| `forecast-multicurrency.tz-Asia_Kolkata.json` | `computeForecast(cfg, [])` and for the first PO team | `tests/fixtures/legacy-config-multicurrency.json` | Asia/Kolkata (KNOWN DEFECT C-01) |
| `forecast-y2027.json` | `computeForecast(cfg, [])` and for the first PO team | `tests/fixtures/legacy-config-2027.json` | Europe/London (reference) |
| `forecast-y2027.tz-America_New_York.json` | `computeForecast(cfg, [])` and for the first PO team | `tests/fixtures/legacy-config-2027.json` | America/New_York (KNOWN DEFECT C-01) |
| `forecast-y2027.tz-Asia_Kolkata.json` | `computeForecast(cfg, [])` and for the first PO team | `tests/fixtures/legacy-config-2027.json` | Asia/Kolkata (KNOWN DEFECT C-01) |
| `fx-and-ot.json` | `fxRateAsOf`, `otMultiplier` over 5 dates | `tests/fixtures/legacy-config-multicurrency.json` | any |
| `parse-date.json` | `parseDate` over 20 inputs × uk / us / auto | inline table | Europe/London (reference) |
| `parse-date.tz-America_New_York.json` | `parseDate` over 20 inputs × uk / us / auto | inline table | America/New_York (KNOWN DEFECT C-01) |
| `parse-date.tz-Asia_Kolkata.json` | `parseDate` over 20 inputs × uk / us / auto | inline table | Asia/Kolkata (KNOWN DEFECT C-01) |
| `parse-validity-end.json` | `parseValidityEnd` over 10 inputs | inline table | Europe/London (reference) |
| `parse-validity-end.tz-America_New_York.json` | `parseValidityEnd` over 10 inputs | inline table | America/New_York (KNOWN DEFECT C-01) |
| `parse-validity-end.tz-Asia_Kolkata.json` | `parseValidityEnd` over 10 inputs | inline table | Asia/Kolkata (KNOWN DEFECT C-01) |
| `validate-data.json` | `validateData` per key, valid and invalid samples (incl. `test_PO_Details.json`) | `legacy-config-basic.json` + inline samples | any |
