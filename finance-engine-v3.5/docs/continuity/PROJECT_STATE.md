# Project State

Last updated: 2026-10-04 (overnight run: after TST-002)

## Repository

| Item | Value |
|---|---|
| Repository | `LoneWolfDen/project_finance_engine` (GitHub; private, to become public). Local: `/Users/wolf/Developer/project_finance_engine` |
| App root | `finance-engine-v3.5/` (all backlog paths are relative to it; DEC-008) |
| Branch | `assessment/pwa-readiness-2026-10` (tracks `origin/assessment/pwa-readiness-2026-10`) |
| Commit | See `git log --oneline` on this branch. Overnight run started from `60ea319` (BAS-002 follow-up); items committed one per commit (DEC-034) |
| Uncommitted | None between items. During the overnight run (DEC-034) each item is committed locally on its own (`<ID>: <title>`), never pushed. See `git log` |
| Related repository | Continuum: `LoneWolfDen/project_onion` (public; separate; not assessed) |

## Current implementation state (unchanged since the assessment; no code has been modified)

* **Legacy app file:** `index.html` (SHL-004 not done). The legacy server is `server.py`.
* **What runs:** a single 2,279-line hand-written `index.html` (no framework, not minified) plus Python stdlib `server.py` with SQLite. Four parallel copies exist (v1, v2, v3, v3.5).
* **Works today:** dashboard, forecast, imports and exports. Confirmed on the work laptop when opened from `file://` (Downloads), with CDN libraries loading (OD-5a).
* **Not working or unsafe:**
  - ~~server open on all interfaces with wildcard CORS (SEC-01/02, BLOCKER)~~ **mitigated (legacy) by SEC-001 on 2026-10-04**: loopback bind, no CORS, Host/Origin/Content-Type checks, 25 MB body limit;
  - unescaped HTML (XSS);
  - silent data-loss paths (D-01…D-10), including a broken Factory Reset;
  - incomplete backup;
  - time-zone defect C-01;
  - no tests;
  - no PWA features;
  - runtime CDN dependency;
  - "Copilot" mode is an iframe placeholder; the PIN is cosmetic.
* **Where the owner's real legacy data may live:** browser storage of each origin used (`http://localhost:3005`, `file://` copies such as Downloads, possibly Codespaces) plus `finance_engine.db`. Not yet backed up (BAK-001).

Full detail: `docs/assessment/CURRENT_IMPLEMENTATION_ASSESSMENT.md`.

## Target

A human-readable, no-build app (classic scripts, vendored libraries, strict CSP, no network). It is opened from a user-chosen SharePoint/Teams-synced folder (`file://`).
* One publisher imports PeopleSoft CSV/XLSX (live column names), previews, and publishes a verified `dataset.js`/`.json` with snapshots.
* Leaders view with a readiness banner.
* Projects are keyed by the first-entered OpportunityID (permanent).
* Chat is deterministic and cited.
* Copilot is used via fact packs, a Work-mode handoff, and a shared Agent Builder agent grounded on a Teams channel folder.

Full detail: `docs/architecture/TARGET_ARCHITECTURE.md` (as amended by DOC-001 once done).

## Risks (top 6; full list in `docs/backlog/RISK_REGISTER.md`)

| ID | Risk |
|---|---|
| R-15 | Legacy data spread across browser origins becomes unreachable during migration. Mitigation: BAK-001 backups of every origin before SHL-004 and SRV-001 |
| R-01 | `file://` behaviours on the managed laptop (folder access, script loading from a synced folder, CSP) are unverified. Mitigation: BAS-002 probe |
| R-09 | Data leaving the tenant through Copilot Web mode. Mitigation: DEC-007 warning |
| R-10 | Real data committed once the repo is public. Mitigation: synthetic fixtures, `.gitignore`, static scan; Codespaces test-only (DEC-032) |
| R-03 | Golden tests encode existing defects. Mitigation: named defects; FIX items update named goldens only |
| R-20 | Manual V1 publishing is error-prone (downloads policy). Mitigation: `saveDialog`; Verify publication; SPO-001 early if the probe passes |

## Blockers

| Blocker | Blocks | Resolution |
|---|---|---|
| Probe results missing (OV-1…OV-6, CSP, storage origin, save picker) | DEC-020, DEC-023, DEC-026 → SEC-005, PUB-001, ODI-002, SPO-001 | BAS-002 is built; the owner runs it from the synced folder (`tools/probe/README.md`) |
| No tests or goldens | All refactors (SRC-*), upgrades (BLD-002/003), DAT-006, FIX-* | TST-001 → TST-004 → TST-002 → TST-003 |

## Backlog status

Status of the 88 items. Order: `docs/backlog/FINAL_EXECUTION_SEQUENCE.md`. Executed items are recorded below (newest last) using CONT-STD from `docs/backlog/SMALL_MODEL_EXECUTION_RULES.md`.

| Date | ID | Status | Files changed | Tests | Unverified checks |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
| 2026-10-04 | BAS-001 | Done | Committed by the owner as `d43cb51` ("Add target architecture, backlog, validation and continuity docs (BAS-001)") | None (no tests named) | None |
| 2026-10-04 | DOC-001 | Done (committed as `d9619fb`) | `docs/architecture/ADR_REGISTER.md`, `DATA_AND_STORAGE_ARCHITECTURE.md`, `ONEDRIVE_SHAREPOINT_ARCHITECTURE.md`, `TARGET_ARCHITECTURE.md`, `COPILOT_AND_CHAT_ARCHITECTURE.md` (66 lines added; 4 table rows extended in place; no text deleted) | None named; `grep -n "CR-"` manual check run, see the known gap | None |

**Known gap after DOC-001:** six `CR-` mentions sit in sections DOC-001 was not allowed to edit, and have no "Superseded" note next to them:
* `ADR_REGISTER.md` ADR-007;
* `COPILOT_AND_CHAT_ARCHITECTURE.md` §2.1 (Scope example);
* `DATA_AND_STORAGE_ARCHITECTURE.md` §5 step 7;
* `TARGET_ARCHITECTURE.md` §3.1, §3.2 and §26 row 5.

DEC-001-R1 and `SOURCE_OF_TRUTH.md` already take precedence over them. They need an owner-approved scope extension, or the next DOCUMENTATION item, to annotate them.

| Date | ID | Status | Files changed | Tests | Unverified checks |
|---|---|---|---|---|---|
| 2026-10-04 | BAS-002 | **Partial**: probe built and pre-checked; acceptance criterion 4 (managed-laptop Edge results recorded) waits for the owner | New `tools/probe/index.html`, `probe.js`, `probe.css`, `second.html`, `data/probe-data.js`, `README.md` | `node --check tools/probe/probe.js` → OK. Developer pre-check in headless Chrome on macOS; owner run in Chrome on macOS; reload-persistence fix verified headless (see Probe results) | All of the probe on the managed laptop: owner runs `tools/probe/README.md` from the synced Teams channel folder |
| 2026-10-04 | SEC-001 | Done (committed `d96c227`; follow-up fix `bee586c` reads rejected bodies before replying, which removed a flaky connection-reset test failure) | `server.py`, `Dockerfile`, `/README.md`, new `tests/server/test_server.py` | `python3 -m unittest discover -s tests/server -v` → Ran 18 tests, OK. Manual 1 (headless Chrome, temp DB, port 3099): app loaded, POST 200, round-trip OK. Manual 2: socket listens on `127.0.0.1` only; connecting through the Mac's LAN IP failed; LAN-style Host → 421 | Owner: run `python3 server.py` with the real database, open `http://localhost:3005`, save, reload, check data persists. Codespaces: the forwarded Host value is not verified; set `ALLOWED_HOSTS` if it returns 421 (test data only, DEC-032). Docker image not built here |
| 2026-10-04 | BLD-004 | Done | `server.py` (`_serve_static`, static path rules), `Dockerfile` (COPY app, vendor), new `tests/server/test_static.py`, `app/.keep`, `vendor/.keep` | TEST-SERVER: Ran 28 tests, OK. Manual: `/vendor/.keep` → 404; app loads and renders through the server (headless Chrome screenshot) | None (Docker image not built here) |
| 2026-10-04 | BLD-001 | Done (criterion 4 UNVERIFIED: managed laptop) | `index.html` lines 4–9 only (six `<script src>` → `vendor/…`), new `vendor/<lib>-<ver>/` (6 libraries + 6 licence files), `vendor/VENDOR.md`, `tests/server/test_static.py` (hash + path tests). `server.py` unchanged (amendment V-01); Dockerfile COPY vendor already added by BLD-004 | TEST-SERVER: Ran 32 tests, OK (incl. SHA-256 of all 12 files vs VENDOR.md). Manual (headless Chrome, CDN hosts blocked), via server and via file://: all six libraries defined; all 11 tabs render with no new errors; Excel, PDF (4 pages) and PPTX exports downloaded and are valid files; only hosts contacted: localhost / file:. `grep https:// index.html` → only the GitHub profile link. Integrity: datalabels and xlsx match jsDelivr's published npm hashes; chart.umd.min.js is jsDelivr's auto-minified build (noted in VENDOR.md) | Owner: open the app on the managed laptop with DevTools → Network and confirm no CDN hosts (acceptance criterion 4) |
| 2026-10-04 | TST-001 | Done | New `tests/harness.js`, `tests/run-node.js`, `tests/index.html` (styles inline: no CSS file is listed), `tests/browser-suites.js`, `tests/unit/harness.test.js`, `tests/README.md`. Sandbox and smoke test moved to TST-004 (V-03) | `node tests/run-node.js` → 10 passed, 0 failed, All suites passed (exit 0). `--suite` and `--tz` work. A temporary failing test made it exit 1 (removed). `tests/index.html` via file:// in headless Chrome → "All suites passed (10 tests)" | Owner: open `tests/index.html` from Finder/Explorer in Edge and see "All suites passed" |
| 2026-10-04 | TST-004 | Done | New `tests/support/legacy-sandbox.js` (`loadLegacy`), `tests/characterisation/legacy-smoke.test.js` | `node tests/run-node.js` → 15 passed, 0 failed (also with `--tz=America/New_York`). Smoke: computeForecast is a function; DEFAULTS.po_details.length = 1; fixed clock; two loads independent; toasts, protocol and confirm configurable | None |
| 2026-10-04 | TST-002 | Done | New `tests/fixtures/`: 3 legacy configs (basic, multicurrency, 2027), 4 CSVs (quoted+BOM+CRLF, duplicates, ambiguous dates, UK-date resources), `xlsx/timesheet-basic.xlsx`, `README.md`; new `tests/support/make-xlsx-fixtures.js` (generator; also exports `listFiles`/`readBytes` used by the fixture test); new `tests/unit/fixtures.test.js` (Node only). `test_*` files unchanged | `node tests/run-node.js` → 22 passed, 0 failed (7 fixture checks: parse, headers, BOM/CRLF, duplicates, xlsx signature, no @ or undocumented 7+ digit numbers, every file documented) | None |
<!-- overnight-rows -->

Assessment findings **SEC-01 and SEC-02: mitigated (legacy)** by SEC-001. SEC-11 and SEC-16 partially closed (fixed error texts; body limit).

Everything else is **Not started**.

**Findings during execution** (not in the assessment; not fixed, because outside the item that found them):
* **L-01 (2026-10-04, found during BLD-004):** when served by `server.py`, the legacy app throws `Uncaught Error: Canvas is already in use. Chart with ID '0' must be destroyed before the canvas with ID 'c1' can be reused.` on every load (headless Chrome). It also happens with the original pre-SEC-001 server (`5d453d1`), so it is pre-existing. It does not occur when the app is opened from `file://`. Likely cause: the overview renders twice (initial render plus the server config load) without destroying chart c1. The dashboard still renders. Candidate for a FIX item or TST-003 golden note
* **BLD-001 result (2026-10-04):** the legacy app works without any CDN. All six libraries load from `vendor/` (byte-identical, same versions)
<!-- findings -->

## Test commands (from `finance-engine-v3.5/`)

| Suite | Command |
|---|---|
| Node (TEST-NODE) | `node tests/run-node.js` (options `--suite=`, `--tz=`, `--update-golden=<dir>`) |
| Browser (TEST-BROWSER) | open `tests/index.html` via `file://` → "All suites passed" |
| Legacy server (TEST-SERVER) | `python3 -m unittest discover -s tests/server -v` |

## Probe results

Paste each "Copy results" output below, with the date, the laptop and the folder type. The managed-laptop Edge run from the **synced Teams channel folder** is the one that decides DEC-020, DEC-023 and DEC-026 (V-24).

### Developer pre-check (not a substitute for the owner run)

2026-10-04, headless Chrome on the developer Mac, opened from the repository folder (not synced, no policies). Automatic checks only, no clicks:
* PASS: 1 (`isSecureContext=true`, origin `file://`), 2, 3, 4 (quota about 10 GB; `persist()` false), 5, 6, 7, 8, 9a, 11a, 15 (`script-src 'self'` loads local scripts), 17 (only the two expected CSP violations).
* N/A, as designed: 9b, 9c, 10, 11b, 12, 13, 14, 16 (click or manual checks).
* `second.html#/ref/O-1234567` displayed the hash.

### Owner's Mac, Chrome 154, local folder (not synced): 2026-10-04 21:30 UTC

Pasted by the owner. Run after the reload in step 9:
* PASS: 1 (`isSecureContext=true`, origin `file://`), 2, 3, 4 (quota 10 GB; `persist()` false), 5, 6, 7, 8, 9a, 11a, 15, 17 (2 violations, both expected).
* **9c PASS:** the stored folder handle survived the reload with `queryPermission = granted`. This also shows that button 9 (pick, write, read back) had succeeded before the reload.
* **16 PASS:** a value written by the probe opened from a different folder was visible, so `file://` pages share one storage origin in Chrome on macOS (ADR-009 assumption holds here; V-21).
* N/A: 9b, 10, 11b, 12, 13, 14. These were lost on the reload, a probe defect fixed the same day: `probe.js` now keeps button results and drop-down choices across a reload. They need re-running.

### Owner's Mac, Chrome 154, local folder (not synced): 2026-10-04 21:39 UTC (second run, button checks)

Pasted by the owner, with the reload-persistence fix:
* PASS: 1–8, 9a, **9b** (wrote and read back the test file), **9c** (after reload, permission granted on click and file re-read), **10** (folder listing: 1 file), 11a, **11b** (save dialog wrote the file), **12** (`.js` download: no warning in Chrome), **13** (`file://` → `file://` link opened and showed `#/ref/O-1234567`), 15, 17.
* N/A: 14 (clipboard button not clicked; optional on the Mac).
* N/A: 16. This was a probe quirk: it remembered only the last folder, and this run compared against the previous run from the same folder. The first run already showed PASS. Fixed the same day: the probe now remembers every folder it has been opened from.

**Mac/Chrome summary:** every behaviour the architecture relies on works in Chrome on macOS from a local folder: script-tag data loading, the strict CSP with `script-src 'self'`, folder access with persisted handles, the save dialog, `file://` links with a hash, and shared storage. This is supporting evidence only.

Not decided by these runs (needs the managed laptop): DEC-020, DEC-023, DEC-026, OV-4 (Edge `.js` download warning), OV-6 (policies), and synced-folder behaviour (OV-3 from a OneDrive folder).

### Managed laptop, Edge, synced Teams channel folder

(not yet run)

## Next task

The owner reviews and commits BAS-002 (`tools/probe/`), then runs the probe on the work laptop from the synced Teams channel folder (`tools/probe/README.md`) and pastes the results above. SEC-001 is done (uncommitted). Next model item: **BLD-004** (F0.3).

When the results arrive, a model records them and marks the DEPENDENCY_MAP §3 alternatives they point to as **Proposed** in `DECISIONS.md` (append-only; `docs/backlog/` stays unchanged under MNC-STD). The owner confirms them.
