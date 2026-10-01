# Test and Release Readiness

Assessment date: 2026-10-01 · Baseline commit `5d453d1` (tag `pwa-assessment-baseline-2026-10-01`)
Mode: read-only.

## 1. Verdict

**Not release-ready** under the charter's definition of "production-ready" (maintainable source, predictable startup, safe data handling, observable failures, repeatable tests, recoverable storage, controlled releases, documented limitations).

| Charter criterion | Status | Key evidence |
|---|---|---|
| Maintainable source | PARTIAL | Readable, but a single 2,279-line file with duplicated logic and dead code (CURRENT_IMPLEMENTATION_ASSESSMENT §9) |
| Predictable startup | PARTIAL | Seven startup paths across four codebases; CDN failure aborts the UI (`index.html:431`) |
| Safe data handling | **FAIL** | SEC-01, SEC-02 (BLOCKER); SEC-03, SEC-05 (XSS) |
| Observable failures | **FAIL** | Server save errors swallowed (`index.html:166,175`); access logging disabled (`server.py:146-147`); `QuotaExceededError` unhandled (`164`) |
| Repeatable tests | **FAIL** | No automated tests of any kind |
| Recoverable storage | **FAIL** | Incomplete backup (F-15); broken reset (F-19); silent overwrites D-01…D-08 |
| Controlled releases | **FAIL** | No release tags, changelog, CI or version consistency |
| Documented limitations | **FAIL** | README omits CDN dependency, network exposure, data-loss behaviours and placeholder Copilot mode |

## 2. Test inventory

| Category | Present? | Evidence |
|---|---|---|
| Unit tests (JS) | No | No test files, no runner |
| Unit tests (Python) | No | No `test_*.py`, no `pytest`/`unittest` usage |
| Integration / API tests | No | — |
| End-to-end / browser tests | No | No Playwright, Cypress or Selenium |
| Accessibility tests | No | — |
| Security tests / scanners | No | — |
| CI execution | No | No workflow files |
| Manual test script | No | READMEs describe uploading fixtures but give no expected results |

## 3. Fixtures

| File (v3.5) | Rows | Content | Synthetic? | Usable as test oracle? |
|---|---|---|---|---|
| `test_Timesheet.csv` | 1,243 | 3 projects (111111, 222222, 333333), activity `PERFORM` only; `Empl Name` values such as `R1_Lead`; `TestCo`/`TestProject`; `CITY`/`POST` placeholders | Appears synthetic | Partly. **No** quoted fields, commas in values, duplicate Empl ID + date + project keys, OT/vacation variety or non-US dates, so the riskiest parsers (C-03, C-04, D-06) are not exercised |
| `test_ResourceRules.csv` | 14 | UK dd/mm/yyyy dates, legacy column names (`EmplID`, `RateEffectiveDt`, `BillRate`…) | Appears synthetic | Yes for the upload mapping path |
| `test_PO_Details.json` | 3 | Uses legacy `PO_Validity_Year` | Appears synthetic | **Fails `validateData`** (requires `PO_Validity`, `index.html:2015-2019`), so it cannot be saved via Settings. It works only through Full Config import, which skips validation (C-09) |
| `test_Invoices.json` | 9 | `INV-2025-00x` | Appears synthetic | Yes |
| `test_Expenses.json` | — | Single currency (GBP) | Appears synthetic | Does not exercise the mixed-currency defect (C-05) |
| No expected-output files | — | — | — | No golden values exist for forecast, actuals, burndown or rollover |

## 4. Verification performed during this assessment

| Check | Method | Result |
|---|---|---|
| `server.py` syntax | `python3 -c "import ast; ast.parse(...)"` (no bytecode written) | Pass |
| Inline JS syntax | Script blocks copied to scratchpad; `node --check` (Node v24.18.0) | Pass (both blocks) |
| Timezone weekday logic | Node replica of `isWorkingDay` loop under `TZ=Europe/London`, `America/New_York`, `Asia/Kolkata` | **Defect confirmed** for New York (Saturday counted as a working day, Monday excluded) |
| Historical DB contents | `git show` blobs to scratchpad, `sqlite3 -readonly` | Empty `config` tables |
| Fixture duplication | `md5` | 4 identical copies (one variant) |
| Fixture dedupe-key collisions | `awk` | 0 collisions |
| Server, browser, Docker, Ollama runtime | **Not run** (read-only scope) | — |

## 5. Runtime validation still required

| ID | What | Why |
|---|---|---|
| RV-01 | Start v3.5 server and load with the test fixtures; record golden KPI values | No oracle exists |
| RV-02 | Block CDN hosts and confirm blank UI | Confirms the offline/CDN failure path (`index.html:431`) |
| RV-03 | Confirm LAN reachability of `0.0.0.0:3005` on the managed laptop (firewall policy) | SEC-01 severity on target device |
| RV-04 | Cross-origin read/write PoC from a second local origin | SEC-02 |
| RV-05 | Upload a CSV with `<img src=x onerror=…>` in a name field | SEC-03 |
| RV-06 | Factory Reset after editing; then reload | F-19 |
| RV-07 | Restore from Master with no master saved | F-20 |
| RV-08 | Stop server, edit, restart server, reload | D-01 |
| RV-09 | Load a large timesheet (for example 50k rows) and save 3 scenarios | `localStorage` quota behaviour (save path aborts before server POST) |
| RV-10 | Run in a browser with timezone set west of UTC | C-01 in real browsers |
| RV-11 | Keyboard-only and contrast audit in Edge and Chrome; Safari smoke | Charter §10 |
| RV-12 | Ollama mode with a prompt-injection string in a resource name | SEC-05 |
| RV-13 | Advisory check of the six vendor libraries against a live database | SEC-06, SEC-07 |
| RV-14 | Docker build and run per README, with and without volume | EXPOSE mismatch, persistence |

## 6. Test adequacy assessment

**Inadequate.** There are zero automated tests, and calculation logic that drives financial figures (forecast, actuals, burndown, rollover, FX normalisation) has no oracle. At least three correctness defects (C-01 timezone, C-04 CSV quoting, C-05 mixed-currency expenses) would have been caught by basic unit tests. Destructive behaviours (D-01…D-09) are untested.

The calculation functions are already pure or nearly pure (`computeForecast`, `parseDate`, `parseValidityEnd`, `fxRateAsOf`, `otMultiplier`, `validateData`, `deduplicateActuals`, `computeActualsFromCache`). That makes **characterisation tests feasible before any refactor**, once the functions can be loaded outside the HTML page.

## 7. Release blockers (summary)

1. SEC-01: unauthenticated server on all interfaces.
2. SEC-02: wildcard CORS with no origin or host validation.
3. No automated tests or golden values for financial calculations.
4. Silent data-loss paths D-01, D-02 and a broken Factory Reset (F-19).
5. Runtime CDN dependency that disables the entire UI when unavailable.
6. Placeholder or mock features presented as real (PIN protection, Copilot mode, demo actuals).
