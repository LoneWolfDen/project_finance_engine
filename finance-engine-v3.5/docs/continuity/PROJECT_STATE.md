# Project State

Last updated: 2026-10-05 (end of overnight run, after BLD-002)

## Repository

| Item | Value |
|---|---|
| Repository | `LoneWolfDen/project_finance_engine` (GitHub; private, to become public). Local: `/Users/wolf/Developer/project_finance_engine` |
| App root | `finance-engine-v3.5/` (all backlog paths are relative to it; DEC-008) |
| Branch | `assessment/pwa-readiness-2026-10` (tracks `origin/assessment/pwa-readiness-2026-10`) |
| Commit | HEAD `ea12a3a` (BLD-002). Overnight run (DEC-034): 15 local commits after `60ea319`, **not pushed**. Note: `d96c227` is labelled "SEC-001" but contains only the DEC-034 row in DECISIONS.md; SEC-001 itself is the owner's commit `a9b34df` (history not rewritten) |
| Uncommitted | Nothing |
| Related repository | Continuum: `LoneWolfDen/project_onion` (public; separate; not assessed) |

## Current implementation state (legacy app hardened in Phase 0; see Backlog status)

* **Legacy app file:** `index.html` (SHL-004 not done). The legacy server is `server.py`. Shared code starts in `app/continuum-core/` (`html.js`, `CORE_VERSION.js` 0.1.0).
* **What runs:** a single 2,279-line hand-written `index.html` (no framework, not minified) plus Python stdlib `server.py` with SQLite. Four parallel copies exist (v1, v2, v3, v3.5).
* **Works today:** dashboard, forecast, imports and exports. Confirmed on the work laptop when opened from `file://` (Downloads), with CDN libraries loading (OD-5a).
* **Not working or unsafe:**
  - ~~server open on all interfaces with wildcard CORS (SEC-01/02, BLOCKER)~~ **mitigated (legacy) by SEC-001 on 2026-10-04**: loopback bind, no CORS, Host/Origin/Content-Type checks, 25 MB body limit;
  - unescaped HTML (XSS) outside the chat (chat fixed by SEC-002; rest is SEC-003/004);
  - silent data-loss paths (D-01…D-10), including a broken Factory Reset;
  - ~~incomplete backup~~ **fixed by BAK-001** (complete, checksummed backup + validated import);
  - time-zone defect C-01;
  - ~~no tests~~ **TST-001…004**: Node + browser harness, legacy sandbox, synthetic fixtures, 60 legacy golden files;
  - no PWA features;
  - ~~runtime CDN dependency~~ **fixed by BLD-001** (vendored); SheetJS upgraded to 0.20.3 (BLD-002);
  - ~~"Copilot" iframe and Ollama modes~~ **off by default (CHT-002)**; the PIN is cosmetic;
  - sample DEFAULTS data is now labelled everywhere (MIG-001); chat answers carry a scope line (CHT-001);
  - pre-existing chart error L-01 (see Findings).
* **Where the owner's real legacy data may live:** browser storage of each origin used (`http://localhost:3005`, `file://` copies such as Downloads, possibly Codespaces) plus `finance_engine.db`. **Not yet backed up**: the owner exports a backup from every origin with the new Export Full Config (BAK-001 checkpoint).

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
| 2026-10-04 | SEC-001 | Done (owner commit `a9b34df`; follow-up fix `bee586c` reads rejected bodies before replying, which removed a flaky connection-reset test failure) | `server.py`, `Dockerfile`, `/README.md`, new `tests/server/test_server.py` | `python3 -m unittest discover -s tests/server -v` → Ran 18 tests, OK. Manual 1 (headless Chrome, temp DB, port 3099): app loaded, POST 200, round-trip OK. Manual 2: socket listens on `127.0.0.1` only; connecting through the Mac's LAN IP failed; LAN-style Host → 421 | Owner: run `python3 server.py` with the real database, open `http://localhost:3005`, save, reload, check data persists. Codespaces: the forwarded Host value is not verified; set `ALLOWED_HOSTS` if it returns 421 (test data only, DEC-032). Docker image not built here |
| 2026-10-04 | BLD-004 | Done | `server.py` (`_serve_static`, static path rules), `Dockerfile` (COPY app, vendor), new `tests/server/test_static.py`, `app/.keep`, `vendor/.keep` | TEST-SERVER: Ran 28 tests, OK. Manual: `/vendor/.keep` → 404; app loads and renders through the server (headless Chrome screenshot) | None (Docker image not built here) |
| 2026-10-04 | BLD-001 | Done (criterion 4 UNVERIFIED: managed laptop) | `index.html` lines 4–9 only (six `<script src>` → `vendor/…`), new `vendor/<lib>-<ver>/` (6 libraries + 6 licence files), `vendor/VENDOR.md`, `tests/server/test_static.py` (hash + path tests). `server.py` unchanged (amendment V-01); Dockerfile COPY vendor already added by BLD-004 | TEST-SERVER: Ran 32 tests, OK (incl. SHA-256 of all 12 files vs VENDOR.md). Manual (headless Chrome, CDN hosts blocked), via server and via file://: all six libraries defined; all 11 tabs render with no new errors; Excel, PDF (4 pages) and PPTX exports downloaded and are valid files; only hosts contacted: localhost / file:. `grep https:// index.html` → only the GitHub profile link. Integrity: datalabels and xlsx match jsDelivr's published npm hashes; chart.umd.min.js is jsDelivr's auto-minified build (noted in VENDOR.md) | Owner: open the app on the managed laptop with DevTools → Network and confirm no CDN hosts (acceptance criterion 4) |
| 2026-10-04 | TST-001 | Done | New `tests/harness.js`, `tests/run-node.js`, `tests/index.html` (styles inline: no CSS file is listed), `tests/browser-suites.js`, `tests/unit/harness.test.js`, `tests/README.md`. Sandbox and smoke test moved to TST-004 (V-03) | `node tests/run-node.js` → 10 passed, 0 failed, All suites passed (exit 0). `--suite` and `--tz` work. A temporary failing test made it exit 1 (removed). `tests/index.html` via file:// in headless Chrome → "All suites passed (10 tests)" | Owner: open `tests/index.html` from Finder/Explorer in Edge and see "All suites passed" |
| 2026-10-04 | TST-004 | Done | New `tests/support/legacy-sandbox.js` (`loadLegacy`), `tests/characterisation/legacy-smoke.test.js` | `node tests/run-node.js` → 15 passed, 0 failed (also with `--tz=America/New_York`). Smoke: computeForecast is a function; DEFAULTS.po_details.length = 1; fixed clock; two loads independent; toasts, protocol and confirm configurable | None |
| 2026-10-04 | TST-002 | Done | New `tests/fixtures/`: 3 legacy configs (basic, multicurrency, 2027), 4 CSVs (quoted+BOM+CRLF, duplicates, ambiguous dates, UK-date resources), `xlsx/timesheet-basic.xlsx`, `README.md`; new `tests/support/make-xlsx-fixtures.js` (generator; also exports `listFiles`/`readBytes` used by the fixture test); new `tests/unit/fixtures.test.js` (Node only). `test_*` files unchanged | `node tests/run-node.js` → 22 passed, 0 failed (7 fixture checks: parse, headers, BOM/CRLF, duplicates, xlsx signature, no @ or undocumented 7+ digit numbers, every file documented) | None |
| 2026-10-04 | TST-003 | Done | New `tests/characterisation/legacy-calc.test.js`; 60 golden files in `tests/golden/legacy/` (London reference + `.tz-America_New_York` and `.tz-Asia_Kolkata` variants for time-zone-dependent results); `tests/README.md` gains the "Golden files" section (criterion 4). One extra case beyond the item: basic forecast with the clock at 2025-08-15 (otherwise all fixture POs have ended) | Generated once per zone with `--update-golden=legacy`. Then 3 clean runs × 3 zones all pass (criterion 2). NY differs from London (criterion 3): DEFAULTS forecast £249,320.60 London vs £251,690.60 NY; y2027 £1,039,560 vs £1,045,280. London DEFAULTS total matches the £249,321 Total Forecast card seen in the BLD-004 screenshot. Default `node tests/run-node.js` → 44 passed | None (manual spot-check removed by amendment V-20) |
| 2026-10-04 | BAK-001 | Done (owner checkpoint pending: back up every origin) | `index.html`: new `hasMaster`, `buildBackup`, `sha256Hex`, `downloadBackup`, `bakEsc` (local escaper: the app has no esc() yet); rewritten `exportFullConfig`, `importFullConfig`; checkbox "Also restore master and scenarios" in `rUpload`. New `tests/unit/legacy-backup.test.js`. Also `tests/support/legacy-sandbox.js`: opt-in `webcrypto` option (needed to inject Node's crypto.subtle as the item's tests require; not in the item's file list) | TEST-NODE 56 passed (goldens unchanged); TEST-SERVER OK. 12 backup tests: v1 shape + SHA-256, round trip (working/master/scenarios identical), checkbox off leaves master/scenarios, tampered checksum refused, stale actuals cleared after confirm (declining imports nothing), invalid po_details refused, no-crypto path (hash_unavailable + confirm), unsupported version. Manual round trip in headless Chrome (server, temp DB): export → fresh profile → import via real file input with checkbox → KPIs before = after (Total Actuals £298,066; Remaining £1,150,034; Total Forecast £1,438,000), master and scenario restored, pre-import backup downloaded | Owner checkpoint (F0.5): export a backup from EVERY place the legacy app has been used: http://localhost:3005, each file:// copy (e.g. Downloads), any Codespaces URL. Each has separate browser data |
| 2026-10-04 | MIG-001 | Done | `index.html`: new `sampleConfig`, `sampleSections`, `markReal`; `loadWork`/`loadMaster` fallbacks flag all DEFAULTS sections; `markReal` in `doSave`, `processUpload` (resources, actuals), `applySolutionResources`, `aggregateActuals`, `importFullConfig` (old format; a full backup carries its own flag); amber banner in `render()` on every tab; "SAMPLE DATA – " prefix plus a note sheet/line/slide note in Excel, PDF and PPTX. New `tests/unit/legacy-sample-flag.test.js` | TEST-NODE 63 passed (goldens unchanged). 7 sample-flag tests. Manual (headless Chrome, fresh profile, temp DB): banner on all 11 tabs; after uploading test_ResourceRules.csv through the real upload input the banner no longer lists resources; PDF title "SAMPLE DATA – Project Finance Report" plus note line (en dash encoded as WinAnsi 0x96, renders correctly) | None |
| 2026-10-04 | SEC-002 | Done | New `app/continuum-core/html.js` (`Continuum.html`: escape, t, raw, setText, plus isRaw), `app/continuum-core/CORE_VERSION.js` (0.1.0); `index.html`: script tags for both before the chat script, `.chat-msg` white-space:pre-wrap, new `appendChatMessage`, the four innerHTML sites converted, `smartAnswer` templates built with `Continuum.html.t`; new `tests/unit/html.test.js` (Node + browser), `tests/unit/legacy-chat-escape.test.js`; `tests/browser-suites.js` lists the core scripts and html.test.js | TEST-NODE 72 passed (goldens unchanged); TEST-BROWSER via file:// in headless Chrome → All suites passed (16 tests). `grep msgs.innerHTML index.html` → none. Manual (headless Chrome, server): typed `<b>hi</b>` shows literally (no <b> element); the budget answer keeps its <strong>; Continuum.coreVersion = 0.1.0 | None |
| 2026-10-04 | CHT-001 | Done | `index.html`: `smartAnswer` rewritten (scope line on every answer, Fact: labels, budget regex `\b(budget\|remaining budget\|remaining)\b`, zero-burn-rate text, "Planned allocation above 80% (not measured utilisation)", invoices filtered by team and year, whole-word person match; two unused variables removed); new `scopeLine`, `wholeWord`. New `tests/unit/legacy-smart-answer.test.js` | TEST-NODE 79 passed (goldens unchanged); 7 smart-answer tests. Manual (headless Chrome, sample data): "remaining budget" → "Scope: All years · All PO teams · Source: SAMPLE DATA (not real) · Actuals to Dec-25 \| Fact: 💰 PO Value: £249,590 \| … Remaining: £30,803 \| Burn rate: £2,624/day (~12 working days left)"; "who is over utilized" → "… Planned allocation above 80% (not measured utilisation): Resource_6 (100%) …"; "invoices" → "… 0 invoices in scope …" | None |
| 2026-10-04 | CHT-002 | Done | `index.html` chat script: `CHAT_FLAGS={ollama:false,copilotIframe:false}`, `enabledChatModes`, `initChatMode` (resets a stored disabled mode to smart, hides the Mode button, replaces the 'click Mode to switch' hint), `switchChatMode` cycles enabled modes only, `sendChat` uses Smart whenever the mode is not enabled, Ollama errors name the server's model (no more phi3:mini). `server.py`: `/api/chat` → 404 unless `ENABLE_OLLAMA=1`; its 503 includes `model`. Tests: new `tests/unit/legacy-chat-modes.test.js`, 2 new cases in `tests/server/test_server.py`. Code is kept (REP-003); `pf_copilot_url` untouched | TEST-NODE 84 passed (London and New York); TEST-SERVER 34 OK; TEST-BROWSER All suites passed (16). Manual (headless Chrome, server): Mode button hidden; stored 'ollama' reset to 'smart'; "burn rate" answered locally with scope line; POST /api/chat → 404 | None |
| 2026-10-04 | SEC-002 (test fix) | Done | `tests/server/test_static.py`: the vendored-scripts test now allows `app/` scripts (SEC-002 added two). Commit `f96e4ef` | TEST-SERVER was failing 1 test after the SEC-002 commit `29a6bdf` because TEST-SERVER was not run for SEC-002; now 34 OK | None |
| 2026-10-04 | BLD-002 | Done (criterion 2 UNVERIFIED: open the export in Excel) | `index.html` (one line → `vendor/xlsx-0.20.3/`), new `vendor/xlsx-0.20.3/` (xlsx.full.min.js + LICENSE), removed `vendor/xlsx-0.18.5/`, `vendor/VENDOR.md` (rows, upgrade and advisory notes), new `tests/unit/vendor-xlsx.test.js`, new `tests/golden/vendor/xlsx-basic.json` (made with 0.18.5 before the swap). Also (not in the item's list): new `tests/support/vendor-loader.js` (loads the app's SheetJS for tests; test files cannot require), and `tests/support/make-xlsx-fixtures.js` now uses it instead of the deleted 0.18.5 path | 0.20.3 = latest on cdn.sheetjs.com; SHA-256 identical to the official xlsx-0.20.3.tgz. Advisory check (GitHub advisory DB): CVE-2024-22363 (<0.20.2) and CVE-2023-30533 (<0.19.3) fixed. 0.20.3 parses the xlsx fixture into the same rows as 0.18.5; write/read round trip OK. All suites: NODE 87 (London, New York), SERVER 34 OK, BROWSER 16. Manual (headless Chrome): uploaded test_ResourceRules.csv (14 rules) and timesheet-basic.xlsx (20 rows) through the real inputs; Export Excel → valid zip, 5 sheets, re-read with 0.20.3 | Owner: open an Excel export from the app in Microsoft Excel; it must open without a repair prompt (acceptance criterion 2) |
| 2026-10-05 | DAT-001 | Done | `index.html`: `restoreFromMaster` and `loadScenario` now async; new `workingSummary`. No master → error toast "No master has been saved yet. Nothing was changed." and nothing changes (no more fall-back to sample data); otherwise confirm (names the working copy size and the master/scenario date when known) → `downloadBackup(pre-restore / pre-scenario-load)` → replace → `render()` inside the function (button markup unchanged, so the button's own `render()` runs first and is harmless). New `tests/unit/legacy-restore.test.js` | TEST-NODE 92 passed (London, New York); TEST-SERVER 34 OK; TEST-BROWSER All suites passed (16). 5 restore tests. Manual (headless Chrome, server, temp DB, fresh profile): uploaded timesheet-basic.xlsx (20 rows), no master, clicked Settings → Restore from Master → error toast, no dialog, no download, 20 rows still there after reload | None |
| 2026-10-05 | DAT-002 | Done | `index.html`: new `chooseActualsMode(existingCount)` (modal using `.modal-bg`/`.modal`; buttons Append and remove exact duplicates / Replace all <n> rows / Cancel; Escape or click outside cancels; Replace asks a second confirm), replaces the `prompt()` in the `processUpload` actuals branch; Replace downloads `pre-replace` backup first. `processUpload` declared `async` (callers ignore its result). New `tests/unit/legacy-actuals-mode.test.js` | TEST-NODE 96 passed (London, New York); TEST-SERVER 34 OK; TEST-BROWSER 16. 4 mode tests. Manual (headless Chrome, server, temp DB): uploaded timesheet-basic.xlsx twice → dialog with the three buttons (screenshot checked); Cancel, Escape and click-outside each left 20 rows; Replace + declined second confirm → no change, no download; Replace + confirm → `…_pre-replace.json` downloaded; Append of the same file → 20 rows. `grep -n "prompt(" index.html` → only the Copilot URL prompt (not in processUpload) | None |
| 2026-10-05 | DAT-003 | Done | `index.html`: header gains `<span id="saveStatus">`; new `saveStatus`, `SAVE_STATUS_TEXT`, `setSaveStatus(kind, detail)`, `persistConfig(key, url, cfg)`; `saveWork`/`saveMaster` use it (browser storage and server attempted independently, `setItem` in try/catch, `!resp.ok` counts as failure; they now return a Promise). Chip: `Saved ✓ HH:MM`, `Browser storage full ⚠`, `Server not reachable ⚠` (+ button "Export a backup now" → `exportFullConfig`), `Saved in this browser only (no server)` from file:// (no POST, no warning; V-07). Failures raise an error toast naming the action. Storage keys, payload and save timing unchanged. New `tests/unit/legacy-save-status.test.js` | TEST-NODE 102 passed (London, New York); TEST-SERVER 34 OK; TEST-BROWSER 16. 6 save-status tests (quota → storage-full and fetch still called; !ok → server-failed; reject → server-failed; both OK → saved; file:// → local-only, no fetch; file:// + quota → storage-full). Manual (headless Chrome, server, temp DB): Resources → Save All → "Saved ✓ 03:48"; server stopped → Save All → "Server not reachable ⚠" + button + error toast (screenshot checked); opened from file:// → "Saved in this browser only (no server)", no error toast | None |
| 2026-10-05 | DAT-004 | Done | `index.html`: new `stampMeta` (called in `saveWork`/`saveMaster`), `savedUtc`, `pickNewer(local, server)`, `readStored`, `offerSupersededDownload`, `syncOne`; `initFromServer` returns at once from file:// (V-07) and otherwise keeps the newer copy (missing stamp = oldest; tie → server, as before), re-POSTs a winning browser copy, keeps the losing copy in `pf_working_superseded` / `pf_master_superseded` (one slot each) and shows a toast with a "Download the older copy" button. New `tests/unit/legacy-startup-sync.test.js`. Also (not in the item's list): `tests/unit/legacy-backup.test.js` and `tests/unit/legacy-restore.test.js` compare stored configs without the new `_meta` stamp (one `read` helper line each) | TEST-NODE 112 passed (London, New York); TEST-SERVER 34 OK; TEST-BROWSER 16. 10 sync tests (stamp; local newer; server newer; local stamp missing; server stamp missing; server empty; browser empty; identical; master; file://). Manual (headless Chrome, server, temp DB kept across restart): saved with server up; stopped server; edited a resource (rate 999) → chip "Server not reachable ⚠"; restarted server on the same DB and reloaded → edit still present (999), server copy now 999, older copy in the superseded slot, toast button downloaded `finance_older_working_….json` | None |
| 2026-10-05 | DAT-005 | Done | `index.html`: `checkPin` reset branch → new `factoryReset()`: `downloadBackup(pre-factory-reset)` → `_cache.work=_cache.master=null` → remove `pf_working`/`pf_master` → POST `null` to `/api/config` and `/api/config/master` (skipped from file://, toast "Browser data reset (no server in use)", V-07) → toast "Working and master data reset. Scenarios were kept." → render. If a POST fails, an error toast says the server copy was not cleared. Scenarios, chat preferences, PIN and the DAT-004 superseded slots are kept. New `tests/unit/legacy-factory-reset.test.js` | TEST-NODE 117 passed (London, New York); TEST-SERVER 34 OK; TEST-BROWSER 16. 5 reset tests. Manual (headless Chrome, server, temp DB): uploaded timesheet-basic.xlsx (20 rows) → Settings → Factory Reset → PIN → backup `…_pre-factory-reset.json` downloaded, toast shown, server `/api/config` → `null`; reload → 0 rows, sample banner visible | None |
<!-- overnight-rows -->

Assessment findings **SEC-01 and SEC-02: mitigated (legacy)** by SEC-001. SEC-11 and SEC-16 partially closed (fixed error texts; body limit).

**Backups confirmed (2026-10-05, DEC-036):** the owner exported a backup from every origin; DAT-001…DAT-006 are released (DEC-035 closed). Managed-laptop checks are deferred until the owner can use the work laptop (DEC-038).

Everything else is **Not started**.

**Findings during execution** (not in the assessment; not fixed, because outside the item that found them):
* **L-01 (2026-10-04, found during BLD-004):** when served by `server.py`, the legacy app throws `Uncaught Error: Canvas is already in use. Chart with ID '0' must be destroyed before the canvas with ID 'c1' can be reused.` on every load (headless Chrome). It also happens with the original pre-SEC-001 server (`5d453d1`), so it is pre-existing. It does not occur when the app is opened from `file://`. Likely cause: the overview renders twice (initial render plus the server config load) without destroying chart c1. The dashboard still renders. Candidate for a FIX item or TST-003 golden note
* **BLD-001 result (2026-10-04):** the legacy app works without any CDN. All six libraries load from `vendor/` (byte-identical, same versions)
* **C-01 measured (TST-003):** the same legacy data gives different forecast totals by computer time zone: DEFAULTS £249,320.60 (London) vs £251,690.60 (New York); basic fixture at 2025-08-15: £1,438,000 (London), £1,446,920 (New York), £1,436,192 (Kolkata). Recorded in `tests/golden/legacy/*.tz-*.json` for FIX-001
* **Interpretation in BAK-001:** import validation treats year-only POs (`PO_Validity_Year`, as in `test_PO_Details.json`) as valid, because the rest of the legacy app accepts them. Otherwise a real backup containing such POs could never be restored. Stored data is unchanged
* Assessment findings **F-15, F-16, D-07: fixed (legacy)** by BAK-001
* **MIG-001 storage note:** stored configs may now carry an optional `_sample_sections` array. Configs without it are treated as real data (no banner), so existing users see no change
* Assessment finding **SEC-05: fixed for the chat panel (legacy)** by SEC-002. Other renderers remain for SEC-003/SEC-004
* Assessment findings **CH-02…CH-05: fixed (legacy)** by CHT-001
* Assessment findings **SEC-09, SEC-10: closed by default (legacy)** by CHT-002 (Ollama proxy and Copilot iframe off unless re-enabled)
* Assessment finding **SEC-06: closed (legacy)** by BLD-002 (SheetJS 0.20.3; advisories checked 2026-10-04)
* Assessment findings **F-20, D-02, D-03: fixed (legacy)** by DAT-001
* Assessment finding **D-04: fixed (legacy)** by DAT-002. Note: "Append" still uses the old employee+date+project key until DAT-006
* Behaviour note (DAT-003): a full browser storage no longer throws out of `saveWork`/`saveMaster`, so callers now show their usual success toast **and** the red storage-full toast and chip
* Assessment finding **D-01: fixed (legacy)** by DAT-004. Storage note: saved configs now carry `_meta.saved_utc`; configs without it count as oldest
* Assessment findings **F-19, D-09: fixed (legacy)** by DAT-005
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

Owner (in order):
1. Review the overnight commits (`git log --oneline 60ea319..HEAD`), run the app once (`python3 server.py` → http://localhost:3005), then push when happy.
2. **Back up every origin** with Export Full Config (BAK-001 checkpoint): `http://localhost:3005`, each `file://` copy, any Codespaces URL. This unblocks DAT-001…006.
3. On the work laptop: run the BAS-002 probe from the synced Teams channel folder; open the app and confirm no CDN requests (BLD-001 criterion 4); open an Excel export in Excel (BLD-002 criterion 2).

Model: after step 2, DAT-001 → DAT-006 (F0.7). Phase 0 is otherwise complete.
