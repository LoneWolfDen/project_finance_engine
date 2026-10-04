# Master Backlog: Continuum Finance Engine

Date: 2026-10-04 · Baseline: code `5d453d1`, assessment `991cacf`
Sources: `docs/assessment/*`, `docs/architecture/*`, owner answers of 2026-10-02 and 2026-10-04 (see `DECISION_REGISTER.md`).
Execution rules: `SMALL_MODEL_EXECUTION_RULES.md`. Codes MNC-STD, RB-STD, CB-STD, CONT-STD, TEST-NODE, TEST-BROWSER and TEST-SERVER are defined there.
All paths are relative to `finance-engine-v3.5/` unless they start with `/` (repository root). "Legacy" means the current v3.5 application (`index.html`, `server.py`).

## Index

| ID | Title | Capability group | Priority | Phase | Depends on |
|---|---|---|---|---|---|
| BAS-001 | Put planning artefacts under version control | BASELINE AND RECOVERY | P0 | 0 | — |
| DOC-001 | Record identity and Continuum decisions in architecture docs | DOCUMENTATION | P1 | 0 | BAS-001 |
| BAS-002 | Environment probe page for managed-laptop validation | BASELINE AND RECOVERY | P0 | 0 | BAS-001 |
| SEC-001 | Harden legacy `server.py` (loopback, origin checks, no wildcard CORS) | SECURITY AND PRIVACY | P0 | 0 | BAS-001 |
| BLD-004 | Safe static file serving in the legacy server | BUILD AND STARTUP | P0 | 0 | SEC-001 |
| BLD-001 | Vendor the six libraries locally at current versions | BUILD AND STARTUP | P0 | 0 | BLD-004 |
| TST-001 | Test harness for Node and browser, with legacy sandbox | TESTING | P0 | 0 | BLD-001 |
| TST-004 | Legacy sandbox for characterisation tests | TESTING | P0 | 0 | TST-001 |
| TST-002 | Synthetic edge-case fixtures | TESTING | P0 | 0 | TST-001 |
| TST-003 | Characterisation golden tests of legacy calculations | TESTING | P0 | 0 | TST-002, TST-004 |
| BAK-001 | Complete, checksummed legacy backup export and validated import | BACKUP AND RESTORE | P0 | 0 | TST-003 |
| MIG-001 | Label demo `DEFAULTS` data as sample everywhere it is shown | MINIFIED CODE MIGRATION | P0 | 0 | TST-003 |
| DAT-001 | Confirmation and backup before Restore-from-Master and Load-scenario | DATA AND STORAGE | P0 | 0 | BAK-001 |
| DAT-002 | Explicit Append/Replace dialog for timesheet upload | DATA AND STORAGE | P0 | 0 | BAK-001 |
| DAT-003 | Visible storage and server-save failures | DATA AND STORAGE | P0 | 0 | BAK-001 |
| DAT-004 | Startup sync must not overwrite newer browser data | DATA AND STORAGE | P0 | 0 | DAT-003 |
| DAT-005 | Make Factory Reset reset what it claims (after a backup) | DATA AND STORAGE | P0 | 0 | BAK-001 |
| DAT-006 | De-duplicate only exact duplicate timesheet rows | DATA AND STORAGE | P0 | 0 | TST-003, DAT-002 |
| SEC-002 | Safe rendering in the chat panel (`continuum-core/html.js`) | SECURITY AND PRIVACY | P0 | 0 | TST-001, BLD-004 |
| CHT-001 | Truthful Smart-mode answers (scope, sample flag, no misleading maths) | CHAT AND RETRIEVAL | P0 | 0 | SEC-002, MIG-001 |
| CHT-002 | Disable Ollama and Copilot-iframe modes by default | SECURITY AND PRIVACY | P0 | 0 | SEC-002 |
| BLD-002 | Upgrade SheetJS to a patched release | BUILD AND STARTUP | P0 | 0 | TST-003 |
| SEC-003 | Escape data in Overview, Burndown, Variance, PO, Invoices, Expenses renderers | SECURITY AND PRIVACY | P0 | 1 | SEC-002, TST-003 |
| SEC-004 | Escape data in Resources, Utilisation, Scenarios, Upload, Settings renderers | SECURITY AND PRIVACY | P0 | 1 | SEC-003 |
| SRC-001 | Extract date, calendar and FX helpers to `app/calc/` | HUMAN-READABLE SOURCE | P0 | 1 | TST-003 |
| SRC-002 | Extract forecast and rollover to `app/calc/` | HUMAN-READABLE SOURCE | P0 | 1 | SRC-001 |
| SRC-003 | Extract actuals and de-duplication to `app/calc/` | HUMAN-READABLE SOURCE | P0 | 1 | SRC-002, DAT-006 |
| SRC-004 | Externalise the holiday calendar with provenance | MINIFIED CODE MIGRATION | P1 | 1 | SRC-001 |
| BLD-003 | Upgrade jsPDF and jspdf-autotable to patched releases | BUILD AND STARTUP | P1 | 1 | TST-003 |
| REP-001 | Remove dead legacy functions | REPOSITORY CLEANUP | P1 | 1 | SRC-003, SEC-004 |
| STO-001 | Published dataset schema v1, validator and migration framework | DATA AND STORAGE | P1 | 1 | SRC-003 |
| STO-002 | Namespaced browser-storage adapter | DATA AND STORAGE | P1 | 1 | TST-001 |
| REF-001 | Continuum Reference module `continuum-core/ref.js` | DATA AND STORAGE | P1 | 1 | TST-001, DOC-001 |
| IMP-001 | RFC 4180 CSV parser | FILE IMPORT | P1 | 1 | TST-001 |
| IMP-002 | SHA-256 hashing and provenance records | FILE IMPORT | P1 | 1 | TST-001 |
| IMP-003 | Declarative mapping profiles for PeopleSoft and other sources | FILE IMPORT | P1 | 1 | IMP-001, STO-001 |
| SHL-004 | Relocate the legacy app to `legacy/` without changing its origin | HUMAN-READABLE SOURCE | P1 | 1 | SRC-003, SEC-004, BAK-001 |
| SHL-001 | New application shell, namespaces and router; relocate legacy | HUMAN-READABLE SOURCE | P1 | 1 | SHL-004 |
| SHL-002 | Readiness banner | UI AND ACCESSIBILITY | P1 | 1 | SHL-001 |
| SHL-003 | Diagnostics view and log | DIAGNOSTICS | P1 | 1 | SHL-001 |
| STO-003 | Synthetic sample published dataset | DATA AND STORAGE | P1 | 1 | STO-001, REF-001 |
| STO-004 | Published dataset loader (script tag, JSON fallback, hash check) | DATA AND STORAGE | P1 | 1 | STO-003, SHL-002, IMP-002 |
| SEC-005 | Content-Security-Policy and security tests for the new shell | SECURITY AND PRIVACY | P0 | 1 | SHL-001, STO-004 |
| IMP-004 | Import workflow V1: pick or drop files, parse, map, validate, preview, draft | FILE IMPORT | P1 | 1 | IMP-002, IMP-003, SHL-001 |
| IMP-008 | Persist the import draft (IndexedDB) with quota handling | FILE IMPORT | P1 | 1 | IMP-004, STO-002 |
| IMP-005 | Normalise, resolve Continuum References and minimise | FILE IMPORT | P1 | 1 | IMP-008, REF-001 |
| IMP-006 | Import a legacy backup into a draft | FILE IMPORT | P1 | 1 | IMP-005, BAK-001 |
| REL-001 | MIT licence, About panel and switchable export attribution | RELEASE AND OPERATIONS | P1 | 1 | SHL-001 |
| REP-002 | Archive v1, v2, v3 folders | REPOSITORY CLEANUP | P2 | 1 | TST-003 |
| UI-007 | Dataset-to-calculation adapter with golden equivalence | DATA AND STORAGE | P1 | 2 | STO-004, SRC-003 |
| UI-001 | Overview, Burndown and Variance views in the new shell | UI AND ACCESSIBILITY | P1 | 2 | UI-007, SEC-005 |
| UI-002 | PO, Invoices and Expenses views in the new shell | UI AND ACCESSIBILITY | P1 | 2 | UI-001 |
| UI-003 | Resources and Utilisation views (read-only) in the new shell | UI AND ACCESSIBILITY | P1 | 2 | UI-001 |
| UI-004 | Personal what-if scenarios stored as deltas | UI AND ACCESSIBILITY | P2 | 2 | UI-003, STO-002 |
| UI-005 | Accessibility baseline | UI AND ACCESSIBILITY | P1 | 2 | UI-001 |
| UI-008 | Accessible markup in every view | UI AND ACCESSIBILITY | P1 | 2 | UI-005, UI-002, UI-003 |
| UI-006 | Present mode with privacy masking | UI AND ACCESSIBILITY | P2 | 2 | UI-008 |
| FIX-001 | Time-zone-safe working-day calculation | DATA AND STORAGE | P1 | 2 | SRC-001, SRC-002 |
| FIX-002 | Convert expenses to PO currency before totals | DATA AND STORAGE | P1 | 2 | SRC-003, UI-002 |
| FIX-003 | Apply overtime multipliers per PO team | DATA AND STORAGE | P1 | 2 | SRC-003 |
| FIX-004 | Correct "Forecast Accuracy" and utilisation labels | UI AND ACCESSIBILITY | P1 | 2 | UI-001, UI-003 |
| PUB-001 | Publish writer V1 (snapshot first; save-dialog or download transport) | SHAREPOINT OUTPUT | P1 | 2 | IMP-005, STO-004 |
| PUB-002 | Publication history and rollback by republish | BACKUP AND RESTORE | P1 | 2 | PUB-001 |
| ODO-001 | Export dialog with data-boundary notice, provenance footer and naming | ONEDRIVE OUTPUT | P1 | 2 | UI-002, REL-001 |
| ODO-002 | PDF and PowerPoint exports with provenance | ONEDRIVE OUTPUT | P1 | 2 | ODO-001, BLD-003 |
| ODI-001 | Synced-folder input guidance and data-boundary notice | ONEDRIVE INPUT | P1 | 2 | IMP-004 |
| SPI-001 | Read the shared Continuum Registry folder; detect conflict copies | SHAREPOINT INPUT | P1 | 2 | REF-001, IMP-004 |
| REF-002 | Create-once registry record and crosswalk mapping | DATA AND STORAGE | P1 | 2 | SPI-001, PUB-001 |
| REF-003 | Deep-link routing, paste-reference and not-found states | UI AND ACCESSIBILITY | P1 | 2 | REF-001, UI-001 |
| CHT-003 | `AnswerProvider` interface and `none` provider | CHAT AND RETRIEVAL | P1 | 2 | UI-001 |
| CHT-004 | Deterministic retrieval chat with labels, scope and citations | CHAT AND RETRIEVAL | P0 | 2 | CHT-003, IMP-005 |
| CHT-005 | Remaining chat intents, keyword fallback and ambiguity handling | CHAT AND RETRIEVAL | P0 | 2 | CHT-004 |
| COP-001 | Copilot fact packs (V1 package) | MICROSOFT 365 COPILOT | P2 | 2 | PUB-001, CHT-005 |
| COP-002 | "Ask Copilot" handoff with Work-mode warning | MICROSOFT 365 COPILOT | P2 | 2 | COP-001, CHT-003 |
| PWA-001 | Offline and degraded states for `file://` use | PWA AND OFFLINE | P1 | 2 | STO-004 |
| REL-002 | Release packaging and stale-version detection | RELEASE AND OPERATIONS | P1 | 2 | SHL-003 |
| DOC-002 | Set-up, publish and rollback guides | DOCUMENTATION | P1 | 2 | PUB-002, REL-002, PWA-001 |
| SRV-001 | Retire `server.py`, Dockerfile and server-based start-up | BUILD AND STARTUP | P1 | 2 | IMP-006, PUB-001, UI-003, DOC-002 |
| XREP-001 | Continuum (project_onion): adopt the shared reference contract | DATA AND STORAGE | P1 | 2 | REF-001, DOC-001 |
| ODI-002 | Connected drop folder with Refresh and changed-file preview (V2) | ONEDRIVE INPUT | P2 | 3 | IMP-004, BAS-002 |
| SPO-001 | Direct write to `published/` through a folder handle (V2) | SHAREPOINT OUTPUT | P2 | 3 | PUB-001, BAS-002 |
| IMP-007 | Multi-sheet XLSX and legacy `.xls` import | FILE IMPORT | P2 | 3 | IMP-004, BLD-002 |
| COP-003 | Agent Builder instructions and set-up guide (Copilot V2) | MICROSOFT 365 COPILOT | P3 | 3 | COP-001 |
| COP-004 | Store pasted Copilot replies as Draft notes | MICROSOFT 365 COPILOT | P2 | 3 | COP-002 |
| REP-003 | Remove legacy app, demo defaults, PIN, Ollama and iframe | REPOSITORY CLEANUP | P2 | 3 | SRV-001, UI-004, CHT-005, DOC-002 |
| PWA-002 | Dormant manifest and service worker gated on HTTPS, with kill-switch | PWA AND OFFLINE | P3 | 4 | DEC-015 |
| GRF-001 | Microsoft Graph and File Picker integration decision record | MICROSOFT GRAPH | P3 | 4 | DEC-015, admin approval |
| COP-005 | Copilot Studio / connector / API evaluation record | MICROSOFT 365 COPILOT | P3 | 4 | COP-003, tenant evidence |

---

# Phase 0: Baseline, backups, no outbound leakage, truthful chat, tests

### BAS-001: Put planning artefacts under version control
- **Capability group:** BASELINE AND RECOVERY
- **Priority:** P0 · **Phase:** 0
- **Current classification:** DOCUMENTED ONLY (untracked files)
- **Evidence:** `git status` on 2026-10-04 shows `?? finance-engine-v3.5/.claude/` and `?? finance-engine-v3.5/docs/architecture/`; `docs/backlog/` is new. Owner decision of 2026-10-02: commit prompts and docs until development is complete.
- **Exact problem:** The charter, architecture, prompts and backlog exist only in the working tree.
- **Reason this matters:** Every later item reads these files. They are lost with a `git clean`, a fresh clone or a new branch.
- **Target behaviour:** `.claude/prompts/*`, `docs/architecture/*` and `docs/backlog/*` are tracked on the working branch.
- **Smallest safe change:** `git add finance-engine-v3.5/.claude finance-engine-v3.5/docs`. The owner commits.
- **Explicit exclusions:** No edits to any file content. No other files staged. No push.
- **Files expected to change:** None (staging only). Newly tracked: `.claude/prompts/*.md`, `docs/architecture/*.md`, `docs/backlog/*.md`.
- **Files that must not change:** All files (content).
- **Functions, symbols or components likely affected:** None.
- **Dependencies:** None.
- **Prerequisite decisions:** DEC-013 (owner commits).
- **External approvals:** None.
- **Data-boundary impact:** None now. When the repo becomes public these files become public; they contain no data or secrets (verified in assessment SEC-20).
- **Storage or migration impact:** None.
- **Security and privacy impact:** Before staging, confirm with `git grep -n -i -E "password|token|secret" -- finance-engine-v3.5/.claude finance-engine-v3.5/docs` that only explanatory text matches.
- **Automated tests:** None.
- **Manual verification:** `git status --short` lists only the intended paths as staged.
- **Acceptance criteria:** (1) `git diff --cached --name-only` lists only files under `finance-engine-v3.5/.claude/` and `finance-engine-v3.5/docs/`. (2) No content modified.
- **Rollback:** `git restore --staged finance-engine-v3.5/.claude finance-engine-v3.5/docs`.
- **Recommended commit boundary:** `BAS-001: track planning artefacts` (owner).
- **Completion evidence:** Output of `git diff --cached --name-only`.
- **Continuity updates:** CONT-STD.

### DOC-001: Record identity and Continuum decisions in architecture docs
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-10.** Where this note conflicts with the fields below, this note wins. **Additional content to record:**
> - (a) No format regex; first-entered opportunity number is permanent and primary; no workstream suffix (V-08, V-09; DEC-011 proposed "not used").
> - (b) The OD-5 "CDN blocked" statement is superseded: the owner's 2026-10-04 test shows CDN libraries loading on the work laptop. Vendoring remains required by charter and ADR-008.
> - (c) Agent Builder accepts **Teams channel folders** as knowledge, not SharePoint links (owner test). Recommend that `Continuum/` lives in the Files of a Teams channel (DEC-033 proposed).
> - (d) Edge "Ask where to save each file" is disabled by policy on the work laptop.
>
> **Additional files:** `ONEDRIVE_SHAREPOINT_ARCHITECTURE.md` §2 (folder roles) and `COPILOT_AND_CHAT_ARCHITECTURE.md` §4 V2.
- **Capability group:** DOCUMENTATION
- **Priority:** P1 · **Phase:** 0
- **Current classification:** DOCUMENTED ONLY (architecture predates owner answers)
- **Evidence:** `docs/architecture/ADR_REGISTER.md` ADR-006 and `DATA_AND_STORAGE_ARCHITECTURE.md` §2.2 propose the `CR-<OpportunityID>` format. Owner, 2026-10-04: OpportunityID format is `O-XXXXXX` (digits). Continuum `modules/experience-pwa/static/js/core/schema.js` `genProjectReferenceID` builds `Prefix-Opp-DDMMYYHHMMSS`, which is time-based, and the Continuum data dictionary holds `opportunity_numbers` as a list. Continuum is served from `http://localhost:8002` (Continuum README). Owner: real names in published data; MIT licence.
- **Exact problem:** The architecture describes a `CR-` prefixed key and does not record that Continuum runs on an `http://localhost` origin, that projects can carry several opportunity numbers, or the owner's licence and name-policy answers.
- **Reason this matters:** REF-001 and XREP-001 implement the key; a small model would otherwise implement the superseded format.
- **Target behaviour:** The architecture docs state DEC-001, DEC-002, DEC-003, DEC-004, DEC-005, DEC-006 and DEC-007 consistently.
- **Smallest safe change:** Edit only these sections:
  - ADR-006 and ADR-017 in `ADR_REGISTER.md`;
  - `DATA_AND_STORAGE_ARCHITECTURE.md` §2.2–§2.5 and §9;
  - `ONEDRIVE_SHAREPOINT_ARCHITECTURE.md` §4 table;
  - `TARGET_ARCHITECTURE.md` §0 (OD-7 row, plus a new OD-11 row recording the real-name policy);
  - `COPILOT_AND_CHAT_ARCHITECTURE.md` §4 V1 (Work-mode warning).

  Each edit adds "Superseded on 2026-10-04 by DEC-00n" notes and does not delete the old text.
- **Explicit exclusions:** No other sections. No assessment edits. No code.
- **Files expected to change:** `docs/architecture/ADR_REGISTER.md`, `docs/architecture/DATA_AND_STORAGE_ARCHITECTURE.md`, `docs/architecture/ONEDRIVE_SHAREPOINT_ARCHITECTURE.md`, `docs/architecture/TARGET_ARCHITECTURE.md`, `docs/architecture/COPILOT_AND_CHAT_ARCHITECTURE.md`.
- **Files that must not change:** MNC-STD minus the five files above.
- **Functions, symbols or components likely affected:** None (docs).
- **Dependencies:** BAS-001.
- **Prerequisite decisions:** DEC-001 to DEC-007.
- **External approvals:** None.
- **Data-boundary impact:** Documents the Copilot Web-mode boundary (DEC-007).
- **Storage or migration impact:** Documents that the registry key is `O-<digits>[-Wnn]`.
- **Security and privacy impact:** Records the real-name publication decision and the masking that remains in Present mode.
- **Automated tests:** None.
- **Manual verification:** `grep -n "CR-" docs/architecture/*.md`: every remaining occurrence sits next to a "Superseded" note.
- **Acceptance criteria:**
  1. The examples in ADR-006 read `O-5030460` and `O-5030460-W02`.
  2. Multiple opportunity numbers are described: one primary is the reference and the others are aliases.
  3. Continuum's `http://localhost:8002` origin and the copy/paste handoff are recorded.
  4. MIT is recorded in ADR-017.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** `git diff --stat` showing the five files.
- **Continuity updates:** CONT-STD; also append DEC-001…DEC-007 to `docs/continuity/DECISIONS.md` if it exists.

### BAS-002: Environment probe page for managed-laptop validation
- **Capability group:** BASELINE AND RECOVERY
- **Priority:** P0 · **Phase:** 0
- **Current classification:** UNKNOWN (browser behaviour under `file://` on the managed laptop is unverified)
- **Evidence:** Validation items OV-1…OV-6 (`ONEDRIVE_SHAREPOINT_ARCHITECTURE.md` §6), CV-3, ADR-009, ADR-015 and TARGET §27 all say "validate".
- **Exact problem:** The architecture relies on behaviours that have not been observed on the target laptop.
- **Reason this matters:** If one of these fails, the chosen alternative changes (DEPENDENCY_MAP §3). Discovering that late wastes several items.
- **Target behaviour:** A self-contained page the owner copies into a OneDrive-synced SharePoint folder, opens in managed Edge and runs. It shows a PASS/FAIL/N/A table and a "Copy results" button.
- **Smallest safe change:** Create `tools/probe/` containing:
  - `index.html`, with a CSP meta tag `default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self' data:`;
  - `probe.js`, `probe.css`;
  - `second.html`, which displays its own `location.hash`;
  - `data/probe-data.js`, which assigns `window.PROBE_DATA = {"ok":true}`;
  - `README.md` with the steps.

  Checks:
  1. `isSecureContext`, `location.origin`, user agent.
  2. `localStorage` write/read.
  3. IndexedDB open/write/read.
  4. `navigator.storage.estimate()` and `persist()`.
  5. Script-tag load of `data/probe-data.js`.
  6. Inline script blocked (a test `<script>` inline block must not run).
  7. `fetch('data/probe-data.js')` result (expected to fail).
  8. `crypto.subtle.digest` available.
  9. `showDirectoryPicker` present. On button click: pick a folder, store the handle in IndexedDB, write `probe-write-test.txt`, read it back; after reload, re-read the handle and check `queryPermission`.
  10. `<input webkitdirectory>` listing count.
  11. `showSaveFilePicker` present.
  12. Download of a generated `probe-download.js` blob (owner records any Edge warning).
  13. Link to `second.html#/ref/O-1234567` (owner records whether it opens and shows the hash).
  14. `navigator.clipboard.readText` on button click.
- **Explicit exclusions:** No application code changes. No network requests. No reading of any file except via the explicit pickers. No upload anywhere.
- **Files expected to change:** New `tools/probe/index.html`, `tools/probe/probe.js`, `tools/probe/probe.css`, `tools/probe/second.html`, `tools/probe/data/probe-data.js`, `tools/probe/README.md`.
- **Files that must not change:** MNC-STD, `index.html`, `server.py`.
- **Functions, symbols or components likely affected:** New `Probe.run()`, `Probe.report()`.
- **Dependencies:** BAS-001.
- **Prerequisite decisions:** None.
- **External approvals:** None (runs locally; writes only into a folder the user picks).
- **Data-boundary impact:** None. The CSP forbids network use.
- **Storage or migration impact:** Writes keys prefixed `continuum.probe.` and IndexedDB `continuum-probe`. The README explains how to delete them (Diagnostics button "Clear probe data").
- **Security and privacy impact:** None. The results text must not include file contents, only names and counts.
- **Automated tests:** None (browser-only behaviour). `node --check tools/probe/probe.js` passes.
- **Manual verification:** The owner runs it per `tools/probe/README.md` in:
  - (a) Edge on the managed laptop, from the synced folder;
  - (b) Edge on macOS, if used;
  - (c) Chrome, optionally.

  The owner pastes the "Copy results" output into `docs/continuity/PROJECT_STATE.md` under "Probe results".
- **Acceptance criteria:**
  1. The page renders with no console CSP errors other than the deliberate inline-script test.
  2. Every check shows PASS, FAIL or N/A with a reason.
  3. "Copy results" produces plain text.
  4. Results from at least the managed-laptop Edge run are recorded.
- **Rollback:** Delete `tools/probe/`.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Recorded probe output.
- **Continuity updates:** CONT-STD plus a "Probe results" section. Mark DEPENDENCY_MAP alternatives chosen as **Proposed** (the owner confirms).

### SEC-001: Harden legacy `server.py` (loopback, origin checks, no wildcard CORS)
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-04.** Where this note conflicts with the fields below, this note wins. **Host check made configurable:** allowed hosts come from env `ALLOWED_HOSTS` (comma-separated `host:port` values; default `localhost:<PORT>,127.0.0.1:<PORT>`). The POST `Origin` check accepts `http(s)://<allowed host>`. **Reason:** the owner's Continuum footer links Finance to a `*.app.github.dev` (Codespaces) URL; a fixed allowlist would break that use. Running in Codespaces with a forwarded port is an **external data boundary** (GitHub-hosted). README must say so, and continued use needs owner decision DEC-032 (see `BACKLOG_VALIDATION.md` §2). Add a TEST-SERVER case: with `ALLOWED_HOSTS=example.test:3005`, Host `example.test:3005` → 200.
- **Capability group:** SECURITY AND PRIVACY
- **Priority:** P0 · **Phase:** 0
- **Current classification:** WORKING but insecure (assessment SEC-01, SEC-02 BLOCKER; SEC-11, SEC-16)
- **Evidence:**
  - `server.py:154` `HTTPServer(("", PORT), Handler)`;
  - `server.py:74` and `server.py:139-144` `Access-Control-Allow-Origin: *`;
  - `server.py:103-104`, `126-127` unbounded `Content-Length`;
  - `server.py:122-123`, `131` return `str(e)`.
- **Exact problem:** The legacy server is reachable from the network and from any website, and accepts unlimited bodies.
- **Reason this matters:** The owner still runs the legacy app until SRV-001. Its data is exposed today.
- **Target behaviour:**
  - The server binds `127.0.0.1` by default (`HOST` env overrides; Docker sets `HOST=0.0.0.0` inside the container).
  - No `Access-Control-Allow-*` headers are sent.
  - `OPTIONS` returns 405.
  - Requests whose `Host` header is not `localhost:<PORT>` or `127.0.0.1:<PORT>` get 421.
  - `POST` requires `Content-Type: application/json` (else 415) and, when an `Origin` header is present, it must equal `http://localhost:<PORT>` or `http://127.0.0.1:<PORT>` (else 403).
  - Bodies larger than `MAX_BODY_BYTES` (default 25 MB) get 413.
  - Error responses use a fixed message per status, not `str(e)`.
  - The DB path can be overridden with env `FINANCE_DB` (for tests).
- **Smallest safe change:** Edit `server.py` only for the behaviours above. Edit `Dockerfile` to add `ENV HOST=0.0.0.0` and `EXPOSE 3005`. Edit the root `/README.md` Docker command to `-p 127.0.0.1:3005:3005`. Add `tests/server/test_server.py` using `unittest`, `http.client` and `threading`, starting the server on port 0 with a temp DB.
- **Explicit exclusions:** Do not add static file serving (that is BLD-001). Do not change `/api/chat` behaviour (that is CHT-002). Do not change the JSON shapes of `/api/config*`. Do not add authentication.
- **Files expected to change:** `server.py`, `Dockerfile`, `/README.md`, new `tests/server/test_server.py`.
- **Files that must not change:** MNC-STD, `index.html`.
- **Functions, symbols or components likely affected:** `Handler.send_json`, `Handler.do_GET`, `Handler.do_POST`, `Handler.do_OPTIONS`, new `Handler._check_host`, `Handler._check_post`, `__main__` block; `DB_FILE`.
- **Dependencies:** BAS-001.
- **Prerequisite decisions:** DEC-010 (harden the legacy server in the interim).
- **External approvals:** None.
- **Data-boundary impact:** Removes network and cross-origin exposure. The device-to-LAN boundary is closed.
- **Storage or migration impact:** None. The same DB file and schema.
- **Security and privacy impact:** Closes SEC-01 and SEC-02 for the legacy app; partially closes SEC-11 and SEC-16.
- **Automated tests:** TEST-SERVER covering:
  - GET `/` 200;
  - GET `/api/config` 200 with no ACAO header;
  - POST with a wrong `Origin` → 403;
  - POST with a wrong content type → 415;
  - POST over the limit → 413;
  - wrong `Host` → 421;
  - `OPTIONS` → 405;
  - round-trip save/load;
  - the server socket bound to 127.0.0.1 when `HOST` is unset.
- **Manual verification:**
  1. `python3 server.py`, open `http://localhost:3005`, load the app, save something, reload: the data persists.
  2. From another device on the same network, `http://<laptop-ip>:3005` does not connect.
- **Acceptance criteria:** All TEST-SERVER cases pass. Manual steps 1–2 hold. `grep -n "Allow-Origin" server.py` returns nothing.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output and the manual check notes.
- **Continuity updates:** CONT-STD; mark SEC-01 and SEC-02 "mitigated (legacy)".

### BLD-001: Vendor the six libraries locally at current versions
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-01.** Where this note conflicts with the fields below, this note wins. **Classification corrected:** "WORKING with a runtime dependency on three public CDN hosts". On 2026-10-04 the owner opened the app on the work laptop and the CDN-loaded libraries worked, so the "BROKEN on the corporate network" premise is withdrawn. Priority stays P0 (no outbound third-party requests, supply-chain integrity; charter §10–11, ADR-008). **Scope reduced:** step 4 (static serving in `server.py`) and `tests/server/test_static.py` move to BLD-004. Do not edit `server.py` in this item. **Dependencies:** BLD-004 (replaces SEC-001). Acceptance criterion 4 becomes "the app on the managed laptop makes no requests to CDN hosts (DevTools Network panel)".
- **Capability group:** BUILD AND STARTUP
- **Priority:** P0 · **Phase:** 0
- **Current classification:** WORKING only with CDN access; BROKEN on the corporate network (owner: proxy blocks CDNs)
- **Evidence:** `index.html:4-9` load from `cdn.jsdelivr.net` and `cdnjs.cloudflare.com`. `index.html:431` calls `Chart.register` at top level. `server.py:91-97` serves `index.html` for every non-API path, so it cannot serve other files.
- **Exact problem:** The app renders nothing when CDNs are blocked, and the server cannot serve local script files.
- **Reason this matters:** The current app is unusable at work. It is also the precondition for every later file split.
- **Target behaviour:**
  - The six libraries load from `vendor/…` with byte-identical content to today's CDN files.
  - `server.py` serves files under `vendor/` and `app/` with correct content types and path-traversal protection.
  - The app works with CDN hosts blocked.
- **Smallest safe change:**
  1. On a machine with internet, download the exact six URLs from `index.html:4-9`, plus each package's licence file from the same version, into:
     - `vendor/chart.js-4.4.0/`
     - `vendor/chartjs-plugin-datalabels-2.2.0/`
     - `vendor/xlsx-0.18.5/`
     - `vendor/jspdf-2.5.1/`
     - `vendor/jspdf-autotable-3.8.2/`
     - `vendor/pptxgenjs-3.12.0/`
  2. Write `vendor/VENDOR.md`: one row per file with name, version, licence, source URL, retrieval date, SHA-256 (`shasum -a 256`) and size.
  3. Replace the six `src` attributes in `index.html` with relative `vendor/…` paths. These are the only lines changed in `index.html`.
  4. In `server.py`, add GET handling: a path matching `^/(vendor|app)/[A-Za-z0-9._/-]+\.(js|css|json)$`, with no `..` segment, resolved with `Path.resolve()` and required to be inside `BASE_DIR/vendor` or `BASE_DIR/app`, is served with the content type from a fixed map (`.js` → `text/javascript`, `.css` → `text/css`, `.json` → `application/json`) and `Cache-Control: no-cache`. A missing file returns 404. All other non-API paths keep returning `index.html`.
  5. Add `tests/server/test_static.py`.
- **Explicit exclusions:** No version upgrades (BLD-002 and BLD-003 do that). No other `index.html` edits. Do not serve directory listings or any extension outside the map.
- **Files expected to change:** `index.html` (lines 4–9 only), `server.py`, `Dockerfile` (add `COPY vendor ./vendor`), new `vendor/**`, new `tests/server/test_static.py`.
- **Files that must not change:** MNC-STD except `vendor/**`.
- **Functions, symbols or components likely affected:** `Handler.do_GET`, new `Handler._serve_static`.
- **Dependencies:** SEC-001.
- **Prerequisite decisions:** ADR-008 accepted (DEC-000).
- **External approvals:** None (public open-source files; licences recorded).
- **Data-boundary impact:** Removes six third-party requests per page load. No data leaves the device for libraries.
- **Storage or migration impact:** None. The origin `http://localhost:3005` is unchanged, so browser data is preserved.
- **Security and privacy impact:** Closes SEC-04 (supply chain at runtime). A traversal guard is added.
- **Automated tests:** TEST-SERVER plus `test_static.py`:
  - `/vendor/chart.js-4.4.0/chart.umd.min.js` → 200 `text/javascript`;
  - `/vendor/../server.py` → 404;
  - `/vendor/%2e%2e/server.py` → 404;
  - `/app/missing.js` → 404;
  - `/anything` → `index.html`.

  A hash test compares each file's SHA-256 with `VENDOR.md`.
- **Manual verification:** In Edge DevTools → Network → **Block request domain** for `cdn.jsdelivr.net` and `cdnjs.cloudflare.com`, reload: all tabs render, the Excel/PDF/PPTX exports download, and the Network panel shows no external hosts.
- **Acceptance criteria:**
  1. `grep -n "https://" index.html` matches only the GitHub profile link.
  2. All tests pass.
  3. The manual check passes on the developer machine.
  4. **UNVERIFIED until the owner opens it on the managed laptop:** the app renders there.
- **Rollback:** RB-STD (restores the CDN URLs).
- **Recommended commit boundary:** CB-STD (vendor files and code in one commit, so hashes match).
- **Completion evidence:** `VENDOR.md`, test output, screenshot or notes of the blocked-CDN run.
- **Continuity updates:** CONT-STD; record "legacy app works without CDN".

### TST-001: Test harness for Node and browser, with legacy sandbox
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-03.** Where this note conflicts with the fields below, this note wins. **Scope reduced:** `tests/support/legacy-sandbox.js` and `tests/characterisation/legacy-smoke.test.js` move to TST-004. This item delivers the harness, both runners, `tests/index.html`, `tests/browser-suites.js`, `tests/README.md` and the harness self-test only.
- **Capability group:** TESTING
- **Priority:** P0 · **Phase:** 0
- **Current classification:** Absent (TEST_AND_RELEASE_READINESS §2)
- **Evidence:** No test files, runner or CI exist (DEPENDENCY_BUILD_REGISTER §7).
- **Exact problem:** No change can be verified.
- **Reason this matters:** Characterisation tests (TST-003) and every refactor depend on it.
- **Target behaviour:** `node tests/run-node.js` runs Node suites. `tests/index.html` (via `file://`) runs browser suites. Both use one tiny readable harness. A Node-only `tests/support/legacy-sandbox.js` loads the legacy inline scripts into a `vm` context with stubs, so legacy functions can be called.
- **Smallest safe change:** Create:
  - `tests/harness.js`: a classic script defining `globalThis.CFE_TEST = {suite(name, fn), test(name, fn), assert: {equal, deepEqual, ok, throws, approx(a, b, eps)}, run() → {passed, failed, results}}`, about 150 lines, no dependencies.
  - `tests/run-node.js`:
    - loads the harness and every `tests/unit/**/*.test.js` and `tests/characterisation/**/*.test.js` file into one `vm` context;
    - supports `--suite=<name>`, `--update-golden=<dir>` (writes only under `tests/golden/<dir>/`) and `--tz=<IANA>` (sets `process.env.TZ` before loading);
    - exits non-zero on failure.
  - `tests/index.html`: loads the harness, the `app/**` scripts as they appear, and browser-safe test files from a list in `tests/browser-suites.js`; it prints the results and "All suites passed".
  - `tests/support/legacy-sandbox.js`, exporting `loadLegacy({htmlPath, now, tz})`:
    - reads the legacy HTML, extracts every inline `<script>` without `src` in order, and runs them in a `vm` context;
    - stubs `document` (`getElementById` returns inert element objects; `querySelectorAll` returns `[]`; `addEventListener` and `createElement` no-op), `window`, `localStorage` (in-memory), `fetch` (rejects), `setTimeout` (no-op), `Chart` (`register`, `defaults.plugins`), `ChartDataLabels`, `XLSX`, `jspdf`, `PptxGenJS`, `toast` capture;
    - replaces the context's `Date` so that `new Date()` and `Date.now()` return `now` (default `2026-10-01T12:00:00Z`) while `new Date(x)` behaves normally;
    - returns `{ctx, get(name)}`, where `get` uses `vm.runInContext(name, ctx)` so `const` declarations such as `DEFAULTS` are reachable.
  - `tests/unit/harness.test.js`: a self-test of the harness.
  - `tests/characterisation/legacy-smoke.test.js`: the sandbox loads, and `typeof computeForecast === 'function'`.
- **Explicit exclusions:** No npm, no `package.json`, no third-party test libraries. No legacy code changes.
- **Files expected to change:** New `tests/harness.js`, `tests/run-node.js`, `tests/index.html`, `tests/browser-suites.js`, `tests/support/legacy-sandbox.js`, `tests/unit/harness.test.js`, `tests/characterisation/legacy-smoke.test.js`, `tests/README.md`.
- **Files that must not change:** MNC-STD, `index.html`, `server.py`.
- **Functions, symbols or components likely affected:** New `CFE_TEST`, `loadLegacy`.
- **Dependencies:** BLD-001 (the sandbox reads the HTML after the vendor change).
- **Prerequisite decisions:** DEC-014 (Node allowed for developer tests).
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None. Tests use only synthetic fixtures.
- **Automated tests:** TEST-NODE (self-test + smoke). TEST-BROWSER (self-test).
- **Manual verification:** Open `tests/index.html` from Finder/Explorer in Edge. It shows the harness self-test passing.
- **Acceptance criteria:** Both runners pass; a deliberately failing test (temporary, not committed) makes `run-node.js` exit 1; the sandbox exposes `DEFAULTS` via `get('DEFAULTS')`.
- **Rollback:** Delete `tests/`.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Runner output.
- **Continuity updates:** CONT-STD; record the test commands in `PROJECT_STATE.md`.

### TST-002: Synthetic edge-case fixtures
- **Capability group:** TESTING
- **Priority:** P0 · **Phase:** 0
- **Current classification:** PARTIAL (TEST_AND_RELEASE_READINESS §3: fixtures lack edge cases; `test_PO_Details.json` fails `validateData`)
- **Evidence:** `test_Timesheet.csv` has no quoted fields and no duplicate keys, and uses a single activity type. `test_Expenses.json` uses one currency. `test_PO_Details.json` uses `PO_Validity_Year`.
- **Exact problem:** The riskiest parsing and calculation paths (C-01, C-03, C-04, C-05, D-06) cannot be characterised.
- **Reason this matters:** Golden tests are only as good as their inputs.
- **Target behaviour:** `tests/fixtures/` contains clearly synthetic inputs, each with a `README.md` line describing what it exercises.
- **Smallest safe change:** Create:
  - `tests/fixtures/legacy-config-basic.json`: a legacy working-config object built from the existing `test_*` data, already in normalised legacy shape (`po_details` with `PO_Validity` `mm-yy`, `resources`, `fx_rates`, `ot_params`, `expenses`, `invoices`, `raw_actuals` = first 200 timesheet rows);
  - `legacy-config-multicurrency.json`: GBP PO, USD and INR expenses;
  - `legacy-config-2027.json`: POs and resources spanning 2026–2027;
  - `timesheet-quoted.csv`: names containing commas in quotes, CRLF line endings, a BOM;
  - `timesheet-duplicates.csv`: the same employee, date and project on two rows with different activities, plus one exact duplicate row;
  - `timesheet-ambiguous-dates.csv`: 03/04/2026 style dates;
  - `resources-uk-dates.csv`;
  - `xlsx/timesheet-basic.xlsx`, generated by `tests/support/make-xlsx-fixtures.js` using the vendored SheetJS 0.18.5 in a `vm` context;
  - `tests/fixtures/README.md`, stating that all names are fictitious (`R1_Lead`…, `TestCo`).
- **Explicit exclusions:** No real names, IDs or rates. Use only `R<n>_<Role>`, IDs 1001–1099, `TestCo`, `O-0000001`-style opportunity numbers. Do not modify the existing `test_*` files.
- **Files expected to change:** New files under `tests/fixtures/`, new `tests/support/make-xlsx-fixtures.js`.
- **Files that must not change:** MNC-STD, `test_*.json`, `test_*.csv`, `index.html`.
- **Functions, symbols or components likely affected:** None.
- **Dependencies:** TST-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Synthetic only. The repo will be public.
- **Automated tests:** `tests/unit/fixtures.test.js`: every fixture parses (JSON) or has the expected header (CSV), and no fixture contains a string matching `/@|\b\d{7,}\b/` except documented IDs.
- **Manual verification:** Read `tests/fixtures/README.md`.
- **Acceptance criteria:** All fixtures are present, documented and pass `fixtures.test.js`.
- **Rollback:** Delete the new fixture files.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** File list and test output.
- **Continuity updates:** CONT-STD.

### TST-003: Characterisation golden tests of legacy calculations
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-03, V-20.** Where this note conflicts with the fields below, this note wins. **Dependencies:** TST-002 and TST-004. **Manual verification replaced:** no manual spot check, because comparing with the live UI depends on the clock. Acceptance is by automated criteria 1–4 only.
- **Capability group:** TESTING
- **Priority:** P0 · **Phase:** 0
- **Current classification:** Absent
- **Evidence:** CURRENT_IMPLEMENTATION_ASSESSMENT §8 (C-01…C-09); `MINIFIED_CODE_MIGRATION_STRATEGY.md` §3.
- **Exact problem:** Nothing records what the legacy app currently computes.
- **Reason this matters:** Refactors (SRC-*) must provably preserve figures leadership already sees, and the behaviour fixes (FIX-*) must change exactly the intended values.
- **Target behaviour:** Golden JSON files under `tests/golden/legacy/` capture outputs. Tests fail on any difference beyond 0.005 for money values.
- **Smallest safe change:** `tests/characterisation/legacy-calc.test.js`, using `loadLegacy({now:'2026-10-01T12:00:00Z'})`. For each fixture config from TST-002 and the sandbox `DEFAULTS`, record:
  - `computeForecast(cfg, [])` and `computeForecast(cfg, [firstTeam])`;
  - `computeActualsMonthly`;
  - `aggregateActuals` followed by `computeActualsFromCache` (read `cfg` from the sandbox `localStorage` stub after the call);
  - `parseDate` over a table of 20 inputs × formats `uk`/`us`/auto;
  - `parseValidityEnd` over 10 inputs;
  - `validateData` per key with valid and invalid samples;
  - `deduplicateActuals` on `timesheet-duplicates`;
  - `fxRateAsOf`, `otMultiplier`;
  - `buildData()` totals `tAct`, `tExp`, `rem`, `fc.total`, `fc.rate`, with the sandbox `localStorage` seeded with the fixture as `pf_working`.

  The test runs the forecast cases under `--tz=Europe/London` (reference), and records additional golden files for `America/New_York` and `Asia/Kolkata` named `*.tz-<zone>.json`, with a comment `KNOWN DEFECT C-01`. Generate the goldens once with `--update-golden=legacy` and commit them.
- **Explicit exclusions:** Do not fix any defect. Do not edit legacy code. Do not round values differently from the legacy output.
- **Files expected to change:** New `tests/characterisation/legacy-calc.test.js`, new `tests/golden/legacy/*.json`.
- **Files that must not change:** MNC-STD, `index.html`, `server.py`, `tests/fixtures/**`.
- **Functions, symbols or components likely affected:** Legacy `computeForecast`, `computeActualsMonthly`, `aggregateActuals`, `computeActualsFromCache`, `parseDate`, `parseValidityEnd`, `validateData`, `deduplicateActuals`, `fxRateAsOf`, `otMultiplier`, `buildData` (all read-only).
- **Dependencies:** TST-002.
- **Prerequisite decisions:** London is the reference time zone (DEC-009 context).
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** TEST-NODE, including `--tz` runs: `node tests/run-node.js --tz=America/New_York --suite=legacy-calc`, etc.
- **Manual verification:** Spot-check one value. The `DEFAULTS` total forecast in the golden file equals the "Total Forecast" card in the running legacy app with no data loaded and the clock at the same date (or note the date dependency).
- **Acceptance criteria:**
  1. Goldens are committed.
  2. Re-running without `--update-golden` passes three times in a row.
  3. The New York golden differs from London for the forecast (proving C-01 is captured).
  4. The `tests/README.md` "Golden files" section lists each file and its fixture.
- **Rollback:** Delete the new test and golden files.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Runner output, golden file list.
- **Continuity updates:** CONT-STD.

### BAK-001: Complete, checksummed legacy backup export and validated import
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-05.** Where this note conflicts with the fields below, this note wins. **Works under every origin the owner uses:**
> 1. If `crypto.subtle` is unavailable (for example on `file://`), export writes `"sha256": null, "hash_unavailable": true`, and import accepts such files only after a confirmation saying integrity cannot be checked.
> 2. Add an owner checkpoint to the report: "Export a backup from every place the legacy app has been used: `http://localhost:3005`, each `file://` copy (for example the copy in Downloads) and any Codespaces URL. Each origin has its own separate browser data."
>
> Add a sandbox test for path 1.
- **Capability group:** BACKUP AND RESTORE
- **Priority:** P0 · **Phase:** 0
- **Current classification:** PARTIAL (F-15, F-16, D-07)
- **Evidence:**
  - `exportFullConfig` (`index.html:1968-1974`) omits `raw_actuals`, `actuals_by_project`, master and scenarios.
  - `importFullConfig` (`1975-1996`) does not call `validateData` and leaves a stale `actuals_by_project`, which then overrides imported `actuals_monthly` (`buildData` `371`).
- **Exact problem:** The only backup is incomplete, and restoring it can show stale actuals.
- **Reason this matters:** Every destructive-operation fix (DAT-*) and the move to the new app (IMP-006) relies on a complete backup.
- **Target behaviour:**
  - **Export Full Config** downloads `finance_backup_<YYYY-MM-DD_HHMM>.json` with this shape: `{format:"cfe-legacy-backup", schema_version:1, exported_utc, app_version:"3.5", working:<full working cfg>, master:<master cfg or null if never saved>, scenarios:<pf_scenarios object>, sha256:<hex of JSON.stringify({working,master,scenarios})>}`.
  - Import accepts this format (verifies `sha256`; on mismatch it refuses with a message) and the old sections-only format.
  - For both formats it runs `validateData` per section and shows errors without applying.
  - Before applying, it calls `downloadBackup('pre-import')`.
  - When the imported data lacks `actuals_by_project`/`raw_actuals` but contains `actuals_monthly`, it removes the stale `actuals_by_project` and `raw_actuals` after an explicit confirmation listing them.
  - Master and scenarios are restored only if the user ticks "Also restore master and scenarios".
- **Smallest safe change:**
  - Add the helpers `hasMaster()`, `buildBackup()`, `sha256Hex(text)` (SubtleCrypto; `http://localhost` is a secure context) and `downloadBackup(reason)`.
  - Rewrite the bodies of `exportFullConfig` and `importFullConfig`.
  - Add a checkbox to the Import Full Config section markup in `rUpload`.
- **Explicit exclusions:** Do not change storage keys or the server API. Do not change any other import path. Do not auto-download a backup on page load.
- **Files expected to change:** `index.html`; new `tests/unit/legacy-backup.test.js`.
- **Files that must not change:** MNC-STD, `server.py`.
- **Functions, symbols or components likely affected:** `exportFullConfig`, `importFullConfig`, `rUpload` (import section markup), new `hasMaster`, `buildBackup`, `sha256Hex`, `downloadBackup`.
- **Dependencies:** TST-003.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** The backup file goes wherever the user saves it. The export toast reminds: "Saving into a synced folder copies it to Microsoft 365."
- **Storage or migration impact:** New backup format v1. Old exports still import.
- **Security and privacy impact:** The backup contains all raw timesheets (personal data). The toast says so.
- **Automated tests:** `legacy-backup.test.js` in the sandbox, with `crypto.subtle` from Node's `webcrypto` injected:
  - round-trip export→import restores identical working/master/scenarios;
  - a tampered `sha256` is refused;
  - an old format with `actuals_monthly` clears `actuals_by_project` after the confirm stub returns true;
  - an invalid `po_details` is refused.

  Plus TEST-NODE (goldens unchanged).
- **Manual verification:**
  1. Run the legacy app at localhost and upload the fixtures.
  2. Save a scenario and Save as Master.
  3. Export.
  4. Factory-reset in a private window profile.
  5. Import, ticking master and scenarios.
  6. All tabs show the same totals as before.
- **Acceptance criteria:** All tests pass. The manual round-trip matches the KPI values (record before/after). The backup file has a `sha256` field.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, before/after KPI table.
- **Continuity updates:** CONT-STD; mark F-15, F-16, D-07 "fixed (legacy)".

### MIG-001: Label demo `DEFAULTS` data as sample everywhere it is shown
- **Capability group:** MINIFIED CODE MIGRATION (generated/placeholder data, register G-05)
- **Priority:** P0 · **Phase:** 0
- **Current classification:** PLACEHOLDER presented as real (F-21)
- **Evidence:** `DEFAULTS` (`index.html:110-131`) includes fabricated `actuals_monthly` (`129`). The sample banner (`514-518`) shows only on Overview and only while `raw_actuals` is empty. `loadWork`/`loadMaster` fall back to `DEFAULTS` (`160`, `170`).
- **Exact problem:** Demo figures can be presented, exported and answered by chat as if real.
- **Reason this matters:** Prevents fabricated answers (P0).
- **Target behaviour:**
  - A working config tracks which sections are still sample: `_sample_sections` (array of section keys).
  - It is initialised to all `DEFAULTS` keys when a config comes from `DEFAULTS`.
  - A section key is removed whenever that section is replaced by upload, Settings save or import.
  - While any remain, every tab shows a persistent amber banner: "Contains SAMPLE data (not real): <sections>".
  - Excel, PDF and PPTX exports prefix their title with "SAMPLE DATA – " and add a sheet, page or slide note.
- **Smallest safe change:**
  - In `loadWork`/`loadMaster` fallback paths, attach `_sample_sections`.
  - Add `markReal(cfg, key)`, called in `doSave`, `processUpload` (resources, actuals), `applySolutionResources`, `importFullConfig` and `aggregateActuals`.
  - In `render()`, prepend the banner when `_sample_sections.length`.
  - Prefix the titles in `exportExcel`, `exportPDF` and `exportPPTX`.
- **Explicit exclusions:** Do not delete `DEFAULTS` (REP-003). Do not change any calculation. Do not change Smart chat text (CHT-001 reads the flag).
- **Files expected to change:** `index.html`; new `tests/unit/legacy-sample-flag.test.js`.
- **Files that must not change:** MNC-STD, `server.py`.
- **Functions, symbols or components likely affected:** `loadWork`, `loadMaster`, `render`, `doSave`, `processUpload`, `applySolutionResources`, `importFullConfig`, `aggregateActuals`, `exportExcel`, `exportPDF`, `exportPPTX`, new `markReal`, `sampleSections`.
- **Dependencies:** TST-003.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** Adds the optional field `_sample_sections` to stored configs. Configs without it are treated as real (no banner), so existing users are not alarmed. Document this.
- **Security and privacy impact:** None.
- **Automated tests:**
  - A fresh sandbox has the flag with all sections.
  - After `doSave('resources')` (with the textarea stub), `resources` is removed.
  - `buildData` numbers are unchanged (goldens).
  - TEST-NODE.
- **Manual verification:** Open a fresh browser profile: the banner appears on every tab. Upload resources: the banner no longer lists `resources`. Export PDF: the title has the prefix.
- **Acceptance criteria:** Tests and manual checks pass. Goldens are unchanged.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, screenshots of the banner.
- **Continuity updates:** CONT-STD.

### DAT-001: Confirmation and backup before Restore-from-Master and Load-scenario
- **Capability group:** DATA AND STORAGE
- **Priority:** P0 · **Phase:** 0
- **Current classification:** WORKING but destructive (F-20, D-02, D-03)
- **Evidence:** `restoreFromMaster` (`index.html:177`), called from buttons at `698`, `1910`, `1929` without confirmation; `loadMaster` returns `DEFAULTS` when no master exists (`170`). `loadScenario` (`956-964`) overwrites without confirmation.
- **Exact problem:** One click can replace real data with demo data or an old scenario.
- **Reason this matters:** Prevents data loss (P0).
- **Target behaviour:**
  - `restoreFromMaster`:
    - if `!hasMaster()` → error toast "No master has been saved yet. Nothing was changed." and return;
    - else confirm "Replace the working copy (<n> resources, <n> timesheet rows) with the master saved <date if known>? A backup will be downloaded first." → `downloadBackup('pre-restore')` → restore.
  - `loadScenario`: the same pattern, with `downloadBackup('pre-scenario-load')`.
- **Smallest safe change:** Edit those two functions only. Use the existing `confirm()` for now (UI-005 replaces dialogs later).
- **Explicit exclusions:** Do not alter the button markup or labels. Do not change master save.
- **Files expected to change:** `index.html`; new `tests/unit/legacy-restore.test.js`.
- **Files that must not change:** MNC-STD, `server.py`.
- **Functions, symbols or components likely affected:** `restoreFromMaster`, `loadScenario`.
- **Dependencies:** BAK-001 (`hasMaster`, `downloadBackup`).
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** A downloaded backup goes to the user's chosen location.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:**
  - With no master: working is unchanged and `saveWork` is not called.
  - With master and confirm=false: unchanged.
  - With confirm=true: the backup function is called once, then the working copy equals the master.

  TEST-NODE.
- **Manual verification:** A fresh profile with uploaded data, no master → click Restore from Master → the data is still there.
- **Acceptance criteria:** Tests pass. Manual check passes.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD; mark F-20, D-02, D-03 fixed (legacy).

### DAT-002: Explicit Append/Replace dialog for timesheet upload
- **Capability group:** DATA AND STORAGE
- **Priority:** P0 · **Phase:** 0
- **Current classification:** WORKING but destructive (D-04)
- **Evidence:** `processUpload` actuals branch (`index.html:1557-1561`) uses `prompt()`; any answer other than "A" replaces all rows.
- **Exact problem:** A mistyped answer silently replaces all timesheets.
- **Reason this matters:** Prevents data loss.
- **Target behaviour:** When rows exist, a modal (using the existing `.modal-bg`/`.modal` classes) offers three buttons: **Append and remove exact duplicates**, **Replace all <n> rows** (second confirmation, then `downloadBackup('pre-replace')`), **Cancel**. Escape or clicking outside cancels. With no existing rows, the import proceeds as today.
- **Smallest safe change:** Add `chooseActualsMode(existingCount) → Promise<'append'|'replace'|null>` and use it in place of the `prompt()` block. `processUpload` becomes `async` only in the actuals branch.
- **Explicit exclusions:** Do not change validation, aggregation or the dedupe rule (DAT-006).
- **Files expected to change:** `index.html`; new `tests/unit/legacy-actuals-mode.test.js`.
- **Files that must not change:** MNC-STD, `server.py`.
- **Functions, symbols or components likely affected:** `processUpload`, new `chooseActualsMode`.
- **Dependencies:** BAK-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** With the stubbed chooser: `null` → unchanged; `replace` → backup called, then rows replaced; `append` → rows concatenated and deduped. TEST-NODE.
- **Manual verification:** Upload a timesheet twice. The dialog appears with three buttons, and Cancel leaves the row count unchanged.
- **Acceptance criteria:** Tests and manual check pass. `grep -n "prompt(" index.html` no longer matches in `processUpload`.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### DAT-003: Visible storage and server-save failures
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-07.** Where this note conflicts with the fields below, this note wins. **`file://` behaviour:** when `location.protocol === "file:"`, skip the server POST entirely and show the neutral status "Saved in this browser only (no server)". Never show a permanent warning for a server that cannot exist. Add a sandbox test with `location.protocol` stubbed to `file:`.
- **Capability group:** DATA AND STORAGE
- **Priority:** P0 · **Phase:** 0
- **Current classification:** BROKEN (failures silent)
- **Evidence:** `saveWork` (`index.html:162-167`) calls `localStorage.setItem` unguarded before the `fetch`, which swallows errors (`.catch(()=>{})`). `saveMaster` (`172-176`) does the same.
- **Exact problem:** A quota error aborts both saves while the UI says "Saved". Server failures are invisible.
- **Reason this matters:** Prevents silent data loss.
- **Target behaviour:**
  - Saves are attempted to both stores independently.
  - A status chip in the header shows `Saved ✓ <time>`, `Browser storage full ⚠` or `Server not reachable ⚠`.
  - Any failure raises an error toast with the recommended action ("Export a backup now"). The chip has a button that runs `exportFullConfig`.
  - Server responses with `!resp.ok` count as failures.
- **Smallest safe change:**
  - Add `setSaveStatus(kind, detail)` and a `<span id="saveStatus">` inside the existing `.hdr` markup (`index.html:105`).
  - Wrap `setItem` in try/catch.
  - Change the `fetch` chains to check `resp.ok`.
- **Explicit exclusions:** Do not change storage keys, the payload or when saves happen. No retry loops.
- **Files expected to change:** `index.html`; new `tests/unit/legacy-save-status.test.js`.
- **Files that must not change:** MNC-STD, `server.py`.
- **Functions, symbols or components likely affected:** `saveWork`, `saveMaster`, header markup, new `setSaveStatus`.
- **Dependencies:** BAK-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:**
  - `localStorage` stub throwing `QuotaExceededError` → the fetch is still called and the status is `storage-full`.
  - Fetch resolving `{ok:false}` → status `server-failed`.
  - Both OK → `saved`.

  TEST-NODE.
- **Manual verification:** Stop `server.py` while the app is open and save a resource edit: the chip shows "Server not reachable ⚠".
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### DAT-004: Startup sync must not overwrite newer browser data
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-07.** Where this note conflicts with the fields below, this note wins. When `location.protocol === "file:"`, `initFromServer` must return immediately (no fetch, no comparison). Add a test.
- **Capability group:** DATA AND STORAGE
- **Priority:** P0 · **Phase:** 0
- **Current classification:** BROKEN (D-01)
- **Evidence:** `initFromServer` (`index.html:180-188`) unconditionally replaces `localStorage` with the server copy.
- **Exact problem:** Edits saved locally while the server was down are discarded on the next load.
- **Reason this matters:** Prevents data loss.
- **Target behaviour:**
  - Every save stamps `cfg._meta = {saved_utc}` before storing.
  - On startup, if both copies exist and differ:
    - the copy with the newer `saved_utc` wins (a missing stamp counts as oldest);
    - if the browser copy wins, it is re-POSTed;
    - the losing copy is kept under `pf_working_superseded` (one slot, overwritten each time) and a toast offers "Download the older copy".
  - The same logic applies to master.
- **Smallest safe change:** Add `stampMeta(cfg)` (called in `saveWork`/`saveMaster`) and `pickNewer(local, server)`, and use them in `initFromServer`.
- **Explicit exclusions:** No merge of contents. No server changes.
- **Files expected to change:** `index.html`; new `tests/unit/legacy-startup-sync.test.js`.
- **Files that must not change:** MNC-STD, `server.py`.
- **Functions, symbols or components likely affected:** `initFromServer`, `saveWork`, `saveMaster`, new `stampMeta`, `pickNewer`.
- **Dependencies:** DAT-003.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** Adds optional `_meta.saved_utc`. Configs without it are treated as oldest.
- **Security and privacy impact:** None.
- **Automated tests:** The four combinations (local newer / server newer / local missing / server missing). The superseded copy is stored. TEST-NODE.
- **Manual verification:**
  1. Stop the server and edit a resource (the chip shows server failure).
  2. Restart the server and reload.
  3. The edit is still present.
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD; mark D-01 fixed (legacy).

### DAT-005: Make Factory Reset reset what it claims (after a backup)
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-07.** Where this note conflicts with the fields below, this note wins. When `location.protocol === "file:"`, skip the two POSTs. The toast says "Browser data reset (no server in use)". Add a test.
- **Capability group:** DATA AND STORAGE
- **Priority:** P0 · **Phase:** 0
- **Current classification:** BROKEN (F-19, D-09)
- **Evidence:** `checkPin` reset branch (`index.html:2091`) removes `localStorage` keys only. `_cache.work`/`_cache.master` remain, and `initFromServer` restores the server copies on reload.
- **Exact problem:** The reset appears to work, then does not.
- **Reason this matters:** Users must be able to trust destructive actions.
- **Target behaviour:**
  1. `downloadBackup('pre-factory-reset')`.
  2. `_cache.work = _cache.master = null`.
  3. Remove `pf_working` and `pf_master`.
  4. POST the JSON literal `null` to `/api/config` and `/api/config/master` (the server stores `"null"`, which `initFromServer` ignores).
  5. Toast: "Working and master data reset. Scenarios were kept."
  6. Render.
- **Smallest safe change:** Edit the reset branch only.
- **Explicit exclusions:** Do not remove scenarios or chat preferences. Do not remove the PIN (REP-003).
- **Files expected to change:** `index.html`; new `tests/unit/legacy-factory-reset.test.js`.
- **Files that must not change:** MNC-STD, `server.py`.
- **Functions, symbols or components likely affected:** `checkPin`.
- **Dependencies:** BAK-001, SEC-001 (the POST must pass the new Content-Type/Origin checks; the legacy fetch already sends `application/json` from the same origin).
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** Server rows become `"null"`.
- **Security and privacy impact:** None.
- **Automated tests:** After reset, `loadWork()` returns sample data, both fetches were POSTed with body `null`, and the backup was called once. TEST-NODE.
- **Manual verification:** Reset, then reload the page: sample data is shown and the sample banner (MIG-001) is visible.
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### DAT-006: De-duplicate only exact duplicate timesheet rows
- **Capability group:** DATA AND STORAGE
- **Priority:** P0 · **Phase:** 0
- **Current classification:** BROKEN (D-05, D-06)
- **Evidence:**
  - `deduplicateActuals` (`index.html:2066-2078`) keys on Empl ID + Reported Dt + Project ID, so the last row wins.
  - It is called on Save as Master (`2085`) and on append (`1564`).
  - The duplicate warning at upload (`1551-1553`) uses the same key.
- **Exact problem:** Legitimate separate rows (for example different activities or hours types on the same day) are deleted.
- **Reason this matters:** Prevents data loss and under-reported actuals.
- **Target behaviour:** The dedupe key is the full row: all columns in sorted key order with trimmed values, joined by `\u001f`. Only exact duplicates are removed. The upload warning reports both "exact duplicates (will be removed on append)" and "same employee+date+project (kept)".
- **Smallest safe change:** Change the key in `deduplicateActuals` and the warning computation. Update the golden `deduplicateActuals` file **only** (behaviour change), with a note in `tests/README.md`.
- **Explicit exclusions:** No other calculation changes.
- **Files expected to change:** `index.html`, `tests/golden/legacy/deduplicateActuals*.json`, `tests/README.md`; new `tests/unit/legacy-dedupe.test.js`.
- **Files that must not change:** MNC-STD (except the named golden), `server.py`.
- **Functions, symbols or components likely affected:** `deduplicateActuals`, the `processUpload` actuals warning.
- **Dependencies:** TST-003, DAT-002.
- **Prerequisite decisions:** DEC-016 (exact-row dedupe).
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** Future saves keep rows that would previously have been dropped. Rows already dropped cannot be recovered except from a backup or the source files.
- **Security and privacy impact:** None.
- **Automated tests:** On `timesheet-duplicates.csv`, one exact duplicate is removed and the two different-activity rows are kept. Other goldens unchanged. TEST-NODE.
- **Manual verification:** Upload `tests/fixtures/timesheet-duplicates.csv` twice with Append. The row count increases only by the non-identical rows.
- **Acceptance criteria:** Tests pass. Only the named golden changed (`git diff --stat tests/golden`).
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output and golden diff.
- **Continuity updates:** CONT-STD; record the behaviour change in `PROJECT_STATE.md`.

### SEC-002: Safe rendering in the chat panel (`continuum-core/html.js`)
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-02.** Where this note conflicts with the fields below, this note wins. **Dependencies:** TST-001 and BLD-004 (replaces BLD-001; static serving of `app/` comes from BLD-004).
- **Capability group:** SECURITY AND PRIVACY
- **Priority:** P0 · **Phase:** 0
- **Current classification:** BROKEN (SEC-05)
- **Evidence:** `index.html:2254` (user message), `2261` (smart answer containing data values), `2273` (`err.error`) and `2274` (Ollama `data.content`) use `innerHTML +=`.
- **Exact problem:** Typed text, data values and model output can execute as HTML.
- **Reason this matters:** Prevents script injection, and from there leakage.
- **Target behaviour:**
  - A shared helper `app/continuum-core/html.js` defines `Continuum.html = {escape(s), t(strings,...values) /* tagged template; escapes every value unless wrapped by raw() */, raw(s), setText(el, s)}`.
  - The chat appends message elements created with `document.createElement` and `textContent` for user, model and error text.
  - Smart answers are built with `Continuum.html.t`, so data values are escaped while `<strong>`/`<br>` stay.
- **Smallest safe change:**
  - Create `app/continuum-core/html.js` and `app/continuum-core/CORE_VERSION.js` (`Continuum.coreVersion = '0.1.0'`).
  - Add a `<script src="app/continuum-core/html.js">` before the chat script.
  - Add `appendChatMessage(kind, textOrSafeHtml)`.
  - Convert the four sites and the `smartAnswer` template strings.
  - Add CSS `.chat-msg{white-space:pre-wrap}`.
- **Explicit exclusions:** Do not touch renderers outside the chat (SEC-003/004). Do not change chat logic (CHT-001).
- **Files expected to change:** `index.html`; new `app/continuum-core/html.js`, `app/continuum-core/CORE_VERSION.js`, `tests/unit/html.test.js`, `tests/unit/legacy-chat-escape.test.js`; `tests/browser-suites.js`.
- **Files that must not change:** MNC-STD, `server.py`.
- **Functions, symbols or components likely affected:** `sendChat`, `smartAnswer`, new `appendChatMessage`, `Continuum.html.*`.
- **Dependencies:** TST-001, BLD-001 (static serving of `app/`).
- **Prerequisite decisions:** ADR-021 (shared core).
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Closes SEC-05 for the chat.
- **Automated tests:**
  - `html.test.js`: escaping of `<>&"'`, and `t` escaping values but not `raw`.
  - `legacy-chat-escape.test.js`: a resource named `<img src=x onerror=alert(1)>` appears escaped in the smart answer string.

  TEST-NODE, TEST-BROWSER.
- **Manual verification:** Type `<b>hi</b>` in chat. It shows literally.
- **Acceptance criteria:** Tests and manual check pass. `grep -n "msgs.innerHTML" index.html` returns no matches.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### CHT-001: Truthful Smart-mode answers (scope, sample flag, no misleading maths)
- **Capability group:** CHAT AND RETRIEVAL
- **Priority:** P0 · **Phase:** 0
- **Current classification:** PARTIAL (CH-01…CH-06)
- **Evidence:** `smartAnswer` (`index.html:2186-2247`):
  - `2195` divides by the burn rate without a zero check;
  - `2194` regex `/budget|remaining|left|how much/` is too broad;
  - `2202-2207` reports allocation as "utilization";
  - `2225-2229` invoices ignore filters;
  - there is no scope or sample indication.
- **Exact problem:** Answers can be misleading, unscoped or based on demo data without saying so.
- **Reason this matters:** Prevents fabricated or misleading answers (P0).
- **Target behaviour:** Every answer starts with a scope line: `Scope: <Year or All> · <n PO teams or All> · Source: <loaded data | SAMPLE DATA (not real)> · Actuals to <last month or none>`. In addition:
  - Zero burn rate gives "cannot estimate days remaining (burn rate is 0)".
  - Budget regex: `/\b(budget|remaining budget|remaining)\b/`.
  - The utilisation answer is titled "Planned allocation above 80% (not measured utilisation)".
  - The invoice answer filters by the current year/team as other answers do.
  - The person match requires a whole-word match.
  - A wording-only label prefix "Fact:" is added for computed values.
- **Smallest safe change:** Edit `smartAnswer` only. Add `scopeLine(D)` and `wholeWord(q, term)`.
- **Explicit exclusions:** No new intents, no citations (CHT-004), no Ollama changes.
- **Files expected to change:** `index.html`; new `tests/unit/legacy-smart-answer.test.js`.
- **Files that must not change:** MNC-STD, `server.py`.
- **Functions, symbols or components likely affected:** `smartAnswer`, new `scopeLine`, `wholeWord`.
- **Dependencies:** SEC-002, MIG-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:**
  - "how much did R1 claim" no longer returns the budget answer.
  - Zero rate gives the no-estimate text.
  - The invoice answer counts only filtered invoices.
  - The sample banner text appears in the scope when `_sample_sections` is non-empty.
  - Names containing a substring of another name do not cross-match.

  TEST-NODE.
- **Manual verification:** Ask "remaining budget", "who is over utilized", "invoices". Each answer shows a scope line.
- **Acceptance criteria:** Tests and manual checks pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, sample answers pasted into the report.
- **Continuity updates:** CONT-STD; mark CH-02…CH-05 fixed (legacy).

### CHT-002: Disable Ollama and Copilot-iframe modes by default
- **Capability group:** SECURITY AND PRIVACY
- **Priority:** P0 · **Phase:** 0
- **Current classification:** PARTIAL / PLACEHOLDER (CH-07, CH-08, CH-10; SEC-09, SEC-10)
- **Evidence:**
  - Chat modes in `index.html:2159-2183`; Ollama call at `2271`; iframe at `2156`/`2175`.
  - `server.py:102-123` proxies to `OLLAMA_URL`.
  - The UI suggests `phi3:mini` (`2275`) while the server uses `llama3.2`.
- **Exact problem:** Experimental modes that send data off the page, or embed arbitrary URLs, are one click away and labelled as product features ("Copilot").
- **Reason this matters:** Prevents outbound leakage. The Copilot label misrepresents integration.
- **Target behaviour:**
  - Constants `const CHAT_FLAGS = {ollama:false, copilotIframe:false}` sit at the top of the chat script.
  - `switchChatMode` cycles only enabled modes. A stored `pf_chat_mode` that is not enabled resets to `smart`. The Mode button is hidden when only `smart` is enabled.
  - `server.py` `/api/chat` returns 404 unless env `ENABLE_OLLAMA=1`.
  - When re-enabled, the Ollama error text names the model from the server's 503 response, not `phi3:mini`.
- **Smallest safe change:** Edit the chat script and the `/api/chat` branch only.
- **Explicit exclusions:** Do not delete the code (REP-003). Do not touch `pf_copilot_url`.
- **Files expected to change:** `index.html`, `server.py`, `tests/server/test_server.py`; new `tests/unit/legacy-chat-modes.test.js`.
- **Files that must not change:** MNC-STD.
- **Functions, symbols or components likely affected:** `switchChatMode`, `showCopilotFrame`, `showCopilotSetup`, `sendChat`, chat initialisation; `Handler.do_POST`.
- **Dependencies:** SEC-002.
- **Prerequisite decisions:** ADR-012.
- **External approvals:** None.
- **Data-boundary impact:** Removes the device→Ollama and iframe paths by default.
- **Storage or migration impact:** `pf_chat_mode` may be rewritten to `smart`.
- **Security and privacy impact:** Closes SEC-09 and SEC-10 by default.
- **Automated tests:** With flags off, mode stays `smart` after `switchChatMode`. A stored `copilot` mode resets. TEST-SERVER: `/api/chat` → 404 without the env var. TEST-NODE.
- **Manual verification:** The chat panel shows no Mode button. Typing a question works in Smart mode.
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### BLD-002: Upgrade SheetJS to a patched release
- **Capability group:** BUILD AND STARTUP
- **Priority:** P0 · **Phase:** 0
- **Current classification:** WORKING but vulnerable (SEC-06)
- **Evidence:** `vendor/xlsx-0.18.5/` (after BLD-001). Assessment SEC-06 lists CVE-2023-30533 and CVE-2024-22363, to be confirmed.
- **Exact problem:** The library that parses every user-supplied workbook has known advisories, and npm does not carry fixed versions.
- **Reason this matters:** Parsing untrusted files is the app's core input path.
- **Target behaviour:** SheetJS Community Edition at the latest release published on `https://cdn.sheetjs.com/` at execution time, vendored as `vendor/xlsx-<version>/xlsx.full.min.js` with its licence, with `VENDOR.md` updated (including the advisory check result and date). The legacy app loads the new path.
- **Smallest safe change:**
  1. Download the file and licence; record the SHA-256.
  2. Change the single `<script src>` line.
  3. Delete `vendor/xlsx-0.18.5/` **after** the tests pass.
  4. Add `tests/unit/vendor-xlsx.test.js`: parse `tests/fixtures/xlsx/timesheet-basic.xlsx` with the new library and compare the rows with a golden `tests/golden/vendor/xlsx-basic.json` produced with 0.18.5 **before** the swap.
  5. Write a round-trip test for `XLSX.utils.json_to_sheet` + `write`.
- **Explicit exclusions:** No API usage changes in the app unless a test proves a break. If one does, stop and report.
- **Files expected to change:** `index.html` (one line), `vendor/xlsx-*/**`, `vendor/VENDOR.md`, `tests/unit/vendor-xlsx.test.js`, `tests/golden/vendor/xlsx-basic.json`, `Dockerfile` (unchanged unless the path is listed explicitly).
- **Files that must not change:** MNC-STD except the named vendor paths.
- **Functions, symbols or components likely affected:** `handleUpload`, `parseSolutionExcel`, `cfgImportFile`, `exportExcel` (verify only).
- **Dependencies:** TST-003 (and the TST-002 xlsx fixture).
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Closes SEC-06 once the advisory check confirms the release.
- **Automated tests:** As above, plus TEST-NODE (all goldens).
- **Manual verification:** In the legacy app: upload `test_ResourceRules.csv` and `tests/fixtures/xlsx/timesheet-basic.xlsx`, then export Excel and open it in Excel.
- **Acceptance criteria:**
  1. Tests pass.
  2. The exported workbook opens without a repair prompt.
  3. `VENDOR.md` records the version, SHA-256 and advisory check date.
- **Rollback:** RB-STD (the old vendor folder is restored from Git).
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, `VENDOR.md` diff.
- **Continuity updates:** CONT-STD.

---

# Phase 1: Maintainable application shell, reliable storage, file import, provenance

### SEC-003: Escape data in Overview, Burndown, Variance, PO, Invoices, Expenses renderers
- **Capability group:** SECURITY AND PRIVACY
- **Priority:** P0 · **Phase:** 1
- **Current classification:** BROKEN (SEC-03)
- **Evidence:** Data interpolated into HTML strings:
  - `rOV` (`index.html:506-572`): team names at `568`;
  - `rBD` (`573-602`), `rMo` (`603-613`);
  - `rInv` (`616-681`): `656`, `661`, `672`, `676`;
  - `rPO` (`1240-1333`): `1287`, `1329`;
  - `rExp` (`1224-1237`): `1233`;
  - nav (`render` `437-456`): PO-team values inside `onclick` and `value` attributes at `452`.
- **Exact problem:** Imported or stored strings execute as HTML.
- **Reason this matters:** Imported files come from other systems. Stored XSS can read all data.
- **Target behaviour:**
  - Every data-derived value in these renderers passes through `Continuum.html.escape`, or the template is built with `Continuum.html.t`.
  - Inline `onclick` handlers that embed data (`togglePoTeam('${pt}')`) are replaced by `data-action="toggle-po-team" data-value="<escaped>"` plus one delegated click/change listener on `#nav`.
  - Static handlers without data may stay until SHL-001.
- **Smallest safe change:**
  - Wrap interpolations with `esc()` (local alias `const esc = Continuum.html.escape`).
  - Add a single `document.getElementById('nav').addEventListener('change'|'click', …)` dispatcher for `data-action` values `toggle-po-team`, `set-year`.
- **Explicit exclusions:** No layout or CSS changes. Other renderers belong to SEC-004. No calculation changes.
- **Files expected to change:** `index.html`; new `tests/unit/legacy-render-escape-a.test.js`.
- **Files that must not change:** MNC-STD, `server.py`, `app/**`.
- **Functions, symbols or components likely affected:** `render`, `rOV`, `rBD`, `rMo`, `rInv`, `rPO`, `rExp`, `togglePoTeam`, `setYear`.
- **Dependencies:** SEC-002, TST-003.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Closes SEC-03 for these views.
- **Automated tests:**
  - In the sandbox, set a PO team to `X"><img src=x onerror=1>` and an invoice note to `<script>`. Call each renderer and assert the output contains `&lt;img` and no raw `<img`.
  - Goldens unchanged.
  - TEST-NODE.
- **Manual verification:** Import a JSON with a malicious team name. The tab shows the literal text. Year buttons and the PO-team slicer still work.
- **Acceptance criteria:** Tests and manual check pass. Every year button and slicer checkbox behaves as before.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### SEC-004: Escape data in Resources, Utilisation, Scenarios, Upload, Settings renderers
- **Capability group:** SECURITY AND PRIVACY
- **Priority:** P0 · **Phase:** 1
- **Current classification:** BROKEN (SEC-03)
- **Evidence:**
  - `rRes` `705`, `709`; `addResRowTo` `718-726`;
  - `rUtil` `840-868`, `883`, `901`;
  - `rScen` `924`, `933`; `compareScenarios` `982`, `1004-1005`;
  - `rActDataInline` `1216`;
  - `processUpload` reports `1473`, `1517-1519`, `1548`, `1577`;
  - `parseSolutionExcel` preview `1660-1663`;
  - `rCfg` textarea `1927`; `cfgImportFile` status `2004-2008`; `importFullConfig` status `1981-1992`.
- **Exact problem:** As in SEC-003, for the remaining views. The textarea case allows `</textarea>` break-out.
- **Reason this matters:** Same as SEC-003.
- **Target behaviour:**
  - All data values are escaped.
  - Textarea content is set via `.value` after render, not inside the HTML.
  - Scenario actions use `data-action="load-scenario|delete-scenario" data-name="<escaped>"` with delegated listeners.
  - `addResRowTo(tid, team)` stops receiving the team name inside an `onclick` string. The team is read from `data-team` on the button.
- **Smallest safe change:** As in SEC-003. For the textarea: render `<textarea id="cfg_<key>"></textarea>`, then after `innerHTML` assignment set `document.getElementById('cfg_'+key).value = JSON.stringify(...)` in a post-render hook `afterRender(tab)` called from `render()`.
- **Explicit exclusions:** No layout changes. No calculation changes.
- **Files expected to change:** `index.html`; new `tests/unit/legacy-render-escape-b.test.js`.
- **Files that must not change:** MNC-STD, `server.py`, `app/**`.
- **Functions, symbols or components likely affected:** `rRes`, `addResRowTo`, `rUtil`, `rScen`, `compareScenarios`, `loadScenario`, `deleteScenario`, `rActDataInline`, `processUpload`, `parseSolutionExcel`, `rCfg`, `cfgImportFile`, `importFullConfig`, `render`, new `afterRender`.
- **Dependencies:** SEC-003.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Completes SEC-03 for the legacy app.
- **Automated tests:**
  - Malicious-string tests for each renderer.
  - A config containing `"</textarea><img src=x>"` round-trips through Settings save unchanged.
  - TEST-NODE.
- **Manual verification:**
  1. Resources: edit, Save All and Add row still work.
  2. Scenarios: save, load (with DAT-001 confirm) and delete still work.
  3. Settings: the textarea shows JSON; Save works.
- **Acceptance criteria:** Tests and manual checks pass. `grep -n -E "onclick=\"[^\"]*\\$\\{" index.html` returns no matches (no data in inline handlers).
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, grep output.
- **Continuity updates:** CONT-STD; mark SEC-03 mitigated (legacy).

### SRC-001: Extract date, calendar and FX helpers to `app/calc/`
- **Capability group:** HUMAN-READABLE SOURCE
- **Priority:** P0 · **Phase:** 1
- **Current classification:** WORKING (inline in a 2,279-line file)
- **Evidence:** `parseValidityEnd` `index.html:135-147`; `HOLIDAYS_BY_LOC`/`HOLIDAY_SETS` `192-193`; `isWorkingDay` `195-200`; `fxRateAsOf` `203-207`; `otMultiplier` `222-226`; `parseDate` `230-251`.
- **Exact problem:** Pure logic is buried in the page and cannot be loaded by the new shell or tested in isolation.
- **Reason this matters:** This is the first vertical slice of the migration strategy (§4 S1).
- **Target behaviour:**
  - The functions live in readable files:
    - `app/cfe.js` creates `window.CFE` with `calc`, `data`, `store`, `views`, `chat`, `export`, plus `CFE.require(path)`, which throws `"CFE module <path> not loaded – check script order in index.html"`;
    - `app/calc/dates.js` (`parseDate`, `parseValidityEnd`);
    - `app/calc/calendar.js` (`HOLIDAYS_BY_LOC`, `isWorkingDay`);
    - `app/calc/fx.js` (`fxRateAsOf`, `otMultiplier`).
  - The legacy file loads them with `<script src>` placed before its inline script, and keeps the old global names as aliases (`var parseDate = CFE.calc.dates.parseDate;` …).
  - Behaviour is byte-for-byte identical.
- **Smallest safe change:**
  - Move the code verbatim (wrapped in IIFEs registering into `CFE.calc.*`).
  - Delete the originals from the inline script and add the aliases.
  - Extend `tests/support/legacy-sandbox.js` to execute local `<script src="app/...">` tags in document order (read from disk; vendor `src` tags stay stubbed).
  - Add `tests/unit/calc-dates.test.js` etc. that load the modules directly.
- **Explicit exclusions:** No logic change (C-01 stays until FIX-001). No renaming. No other functions.
- **Files expected to change:** `index.html`, `tests/support/legacy-sandbox.js`, `tests/browser-suites.js`; new `app/cfe.js`, `app/calc/dates.js`, `app/calc/calendar.js`, `app/calc/fx.js`, `tests/unit/calc-dates.test.js`, `tests/unit/calc-calendar.test.js`, `tests/unit/calc-fx.test.js`.
- **Files that must not change:** MNC-STD, `server.py`.
- **Functions, symbols or components likely affected:** As listed. Every caller in the legacy file (unchanged through the aliases).
- **Dependencies:** TST-003.
- **Prerequisite decisions:** ADR-001 (classic scripts, namespaces).
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** TEST-NODE (all goldens unchanged, including the TZ variants). TEST-BROWSER (new unit suites).
- **Manual verification:** Run the legacy app via `server.py`: Overview totals equal the values before the change (note them before starting).
- **Acceptance criteria:** Goldens are unchanged. The new files contain no DOM references (`grep -n "document\|window\." app/calc` returns only `window.CFE` registration). The legacy app works.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### SRC-002: Extract forecast and rollover to `app/calc/`
- **Capability group:** HUMAN-READABLE SOURCE
- **Priority:** P0 · **Phase:** 1
- **Current classification:** WORKING (inline)
- **Evidence:** `computeForecast` `index.html:253-350` (rollover at `322-347`). Per-team forecast duplicated in `rOV` `540-560`.
- **Exact problem:** As in SRC-001. The per-team forecast is a second implementation inside a view.
- **Reason this matters:** Forecasts are leadership's key figure. One tested implementation is needed.
- **Target behaviour:**
  - `app/calc/forecast.js` exports `CFE.calc.forecast.computeForecast(cfg, filterPoTeams, asOf)`. `asOf` is optional; if missing, it uses today, exactly as now.
  - It also exports `forecastPerTeam(cfg)` (moved verbatim from the `rOV` loop).
  - The legacy file keeps the alias `computeForecast`, and `rOV` calls `forecastPerTeam`.
- **Smallest safe change:** Move the code verbatim; add the `asOf` parameter, used only where `new Date()` produced "today"; add aliases.
- **Explicit exclusions:** No logic change. No change to rollover semantics.
- **Files expected to change:** `index.html`, `tests/browser-suites.js`; new `app/calc/forecast.js`, `tests/unit/calc-forecast.test.js`.
- **Files that must not change:** MNC-STD, `server.py`, `app/calc/dates.js`, `app/calc/calendar.js`, `app/calc/fx.js`.
- **Functions, symbols or components likely affected:** `computeForecast`, `rOV`.
- **Dependencies:** SRC-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** Goldens unchanged. A new test checks that `forecastPerTeam` equals the old `rOV` loop output (captured in the golden before moving). TEST-NODE, TEST-BROWSER.
- **Manual verification:** Overview per-team cards show the same Fc % as before.
- **Acceptance criteria:** As in SRC-001.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### SRC-003: Extract actuals and de-duplication to `app/calc/`
- **Capability group:** HUMAN-READABLE SOURCE
- **Priority:** P0 · **Phase:** 1
- **Current classification:** WORKING with duplicates (U-08)
- **Evidence:** `computeActualsMonthly` `index.html:392-425`; `aggregateActuals` `1683-1716` (mixes calculation with `loadWork`/`saveWork`/`toast`); `computeActualsFromCache` `1719-1735`; `deduplicateActuals` `2066-2078`.
- **Exact problem:** Calculation and side effects are mixed, and four cost formulas exist.
- **Reason this matters:** The publisher pipeline (IMP-005) needs one pure actuals cost function.
- **Target behaviour:** `app/calc/actuals.js` contains:
  - `computeActualsMonthly` (verbatim);
  - `aggregateActualsByProject(cfg, rows) → {byProject, matched, unmatched}` (the pure part of `aggregateActuals`);
  - `computeActualsFromCache` (verbatim);
  - `deduplicateActuals` (verbatim after DAT-006);
  - `rowCost(cfg, row, dt)` (the cost formula used by `aggregateActuals`).

  The legacy `aggregateActuals` keeps its side effects but calls `aggregateActualsByProject`.
- **Smallest safe change:** Move verbatim; split `aggregateActuals` into the pure function plus the existing wrapper; add aliases.
- **Explicit exclusions:** Do not change `rActData` (dead; REP-001). Do not fix OT handling (FIX-003).
- **Files expected to change:** `index.html`, `tests/browser-suites.js`; new `app/calc/actuals.js`, `tests/unit/calc-actuals.test.js`.
- **Files that must not change:** MNC-STD, `server.py`, the other `app/calc/*` files.
- **Functions, symbols or components likely affected:** As listed.
- **Dependencies:** SRC-002, DAT-006.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** Goldens unchanged. TEST-NODE, TEST-BROWSER.
- **Manual verification:** Upload `test_Timesheet.csv` in the legacy app. The toast shows the same matched/unmatched counts as before.
- **Acceptance criteria:** As in SRC-001.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### SRC-004: Externalise the holiday calendar with provenance
- **Capability group:** MINIFIED CODE MIGRATION (register G-04)
- **Priority:** P1 · **Phase:** 1
- **Current classification:** GENERATED data without generator
- **Evidence:** `HOLIDAYS_BY_LOC` (now in `app/calc/calendar.js` after SRC-001), a 2,531-character line with the comment "from Burndown_Template_v4.7.xlsx". Owner, 2026-10-02: synthetic test data. It covers 2025–2026 only (C-07).
- **Exact problem:** Data is mixed with code, its provenance is unclear, and its coverage is not declared.
- **Reason this matters:** Later years silently forecast without holidays.
- **Target behaviour:**
  - `app/data/calendars.js` defines `CFE.data.calendars = {schema_version:1, source:"Synthetic test calendar (owner confirmation 2026-10-02); originally transcribed from Burndown_Template_v4.7.xlsx", valid_years:[2025,2026], locations:{UK:[…], …}}`, formatted one location per line.
  - `calendar.js` reads from it.
  - A new `calendarCoverage(year) → {covered:boolean, locations:[…]}` is added.
- **Smallest safe change:** Move the data; add `calendarCoverage`. `isWorkingDay` behaviour is unchanged.
- **Explicit exclusions:** No new holidays. No UI warning yet (PWA-001/UI-001 use `calendarCoverage`).
- **Files expected to change:** `app/calc/calendar.js`, `index.html` (script tag), `tests/browser-suites.js`; new `app/data/calendars.js`, `tests/unit/data-calendars.test.js`.
- **Files that must not change:** MNC-STD, `server.py`.
- **Functions, symbols or components likely affected:** `isWorkingDay`, `HOLIDAY_SETS`, new `calendarCoverage`.
- **Dependencies:** SRC-001.
- **Prerequisite decisions:** DEC-017 (calendar is synthetic test data until replaced).
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** Goldens unchanged. `calendarCoverage(2027).covered === false`. TEST-NODE, TEST-BROWSER.
- **Manual verification:** None beyond tests.
- **Acceptance criteria:** Tests pass. No line in `app/data/calendars.js` is over 400 characters.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD; update register G-04 status in `PROJECT_STATE.md`.

### BLD-003: Upgrade jsPDF and jspdf-autotable to patched releases
- **Capability group:** BUILD AND STARTUP
- **Priority:** P1 · **Phase:** 1
- **Current classification:** WORKING but advisories likely (SEC-07)
- **Evidence:** `vendor/jspdf-2.5.1/`, `vendor/jspdf-autotable-3.8.2/` (after BLD-001); `exportPDF` `index.html:1787-1830`.
- **Exact problem:** The PDF library has later security fixes.
- **Reason this matters:** Hygiene before the repo becomes public and the release is packaged.
- **Target behaviour:**
  - jsPDF is at the latest release without open advisories at execution time.
  - jspdf-autotable is at the latest release whose documented peer range includes that jsPDF version.
  - Both are vendored with licences and hashes.
  - The legacy PDF export works unchanged.
- **Smallest safe change:**
  - Download the UMD builds from the npm packages (`dist/jspdf.umd.min.js`, `dist/jspdf.plugin.autotable.min.js`) via `https://cdn.jsdelivr.net/npm/<pkg>@<ver>/…`.
  - Update `VENDOR.md` and the two `<script src>` lines.
  - Add `tests/unit/vendor-jspdf.test.js` (a `vm` smoke test: create a doc, call `autoTable` with 3 rows, `output('arraybuffer').byteLength > 1000`).
- **Explicit exclusions:** No changes to `exportPDF` unless a test proves an API break. If one does, stop and report.
- **Files expected to change:** `index.html` (two lines), `vendor/jspdf-*/**`, `vendor/jspdf-autotable-*/**`, `vendor/VENDOR.md`; new `tests/unit/vendor-jspdf.test.js`.
- **Files that must not change:** MNC-STD except the named vendor paths.
- **Functions, symbols or components likely affected:** `exportPDF` (verify only).
- **Dependencies:** TST-003.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Closes SEC-07 after the advisory check.
- **Automated tests:** As above. TEST-NODE.
- **Manual verification:** Export a PDF from the legacy app with all sections. It opens in Edge and Acrobat; tables and charts are present.
- **Acceptance criteria:** Tests and manual check pass. `VENDOR.md` is updated.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, PDF page count before and after.
- **Continuity updates:** CONT-STD.

### REP-001: Remove dead legacy functions
- **Capability group:** REPOSITORY CLEANUP
- **Priority:** P1 · **Phase:** 1
- **Current classification:** UNUSED (U-01…U-07)
- **Evidence:** One reference each (definition only): `rTL` `index.html:1011-1057`, `rActData` `1101-1190`, `rFX` `1334-1341`, `rExport` `1738-1751`, `addResRow` `727`, `findResourceRule` `210-219`; `tabGroups` `435`.
- **Exact problem:** Dead code confuses readers and models. `rActData` contains a divergent cost formula.
- **Reason this matters:** Maintainability; it prevents reuse of wrong logic.
- **Target behaviour:** These symbols no longer exist.
- **Smallest safe change:** Before deleting, re-verify that each symbol has exactly one occurrence with `grep -c -w <name> index.html` (`findResourceRule` may have moved to `app/calc/`; check there too). Then delete.
- **Explicit exclusions:** Nothing else is removed.
- **Files expected to change:** `index.html` (and `app/calc/*.js` only if `findResourceRule` moved there).
- **Files that must not change:** MNC-STD, `server.py`.
- **Functions, symbols or components likely affected:** As listed.
- **Dependencies:** SRC-003, SEC-004 (so escape edits in these functions are not wasted).
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** TEST-NODE (goldens unchanged). The sandbox loads without a ReferenceError.
- **Manual verification:** Click through all 11 legacy tabs. No console errors.
- **Acceptance criteria:** Each symbol has zero occurrences. Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** grep counts before and after.
- **Continuity updates:** CONT-STD.

### STO-001: Published dataset schema v1, validator and migration framework
- **Capability group:** DATA AND STORAGE
- **Priority:** P1 · **Phase:** 1
- **Current classification:** Absent (no schema version anywhere; assessment §4)
- **Evidence:** `DATA_AND_STORAGE_ARCHITECTURE.md` §3 and §8; ADR-010.
- **Exact problem:** There is no defined, versioned contract between publisher and viewer.
- **Reason this matters:** It is the foundation for the loader, the importer, backups and future migrations.
- **Target behaviour:**
  - `app/data/schema.js` defines manifest v1 and dataset v1 field specifications (entities: `references`, `purchase_orders`, `resource_rules`, `people`, `actuals`, `invoices`, `expenses`, `fx_rates`, `ot_rules`, `calendars`). The reference key field is named `ref` and uses the DEC-001 format.
  - `validateManifest(m)` and `validateDataset(ds)` return `{errors:[{code, path, message}], warnings:[…]}`.
  - `app/data/migrate.js` defines `CFE.data.migrate = {current:1, migrations:{}, toCurrent(obj) → {obj, migratedFrom|null}}`, which throws `NewerSchemaError` when `schema_version > current`.
- **Smallest safe change:** Create the two files and tests. Field lists are copied from DATA_AND_STORAGE §3.2–3.3. Money values are numbers with explicit `currency`. Dates are ISO `YYYY-MM-DD` strings.
- **Explicit exclusions:** No loader, no UI. Do not change legacy data.
- **Files expected to change:** `tests/browser-suites.js`; new `app/data/schema.js`, `app/data/migrate.js`, `tests/unit/data-schema.test.js`, `tests/unit/data-migrate.test.js`, `docs/schema/DATASET_V1.md` (a human-readable table of every field).
- **Files that must not change:** MNC-STD, `index.html`, `server.py`, `app/calc/**`.
- **Functions, symbols or components likely affected:** New `CFE.data.schema`, `CFE.data.migrate`.
- **Dependencies:** SRC-003.
- **Prerequisite decisions:** DEC-001 (`ref` format), ADR-010, ADR-016 (aggregated actuals), DEC-006 (names included).
- **External approvals:** None.
- **Data-boundary impact:** Defines what leaves the publisher's private drop folder for the shared library (aggregates plus names).
- **Storage or migration impact:** Establishes `schema_version` 1.
- **Security and privacy impact:** The schema has no fields for worksite city, postal code or personal hours detail (minimisation).
- **Automated tests:** Valid sample passes. Each missing required field is reported. An unknown entity gives a warning. `schema_version: 2` throws `NewerSchemaError`. TEST-NODE, TEST-BROWSER.
- **Manual verification:** Review `docs/schema/DATASET_V1.md`.
- **Acceptance criteria:** Tests pass. Every field in DATA_AND_STORAGE §3 appears in `DATASET_V1.md`.
- **Rollback:** Delete the new files.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### STO-002: Namespaced browser-storage adapter
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-21.** Where this note conflicts with the fields below, this note wins. ADR-009 says every `file://` page shares one storage origin. This is **unverified**, so record the BAS-002 origin and storage results in the item report. Namespacing is required either way.
- **Capability group:** DATA AND STORAGE
- **Priority:** P1 · **Phase:** 1
- **Current classification:** Absent
- **Evidence:** ADR-009 (shared `file://` storage origin); DATA_AND_STORAGE §4; assessment §4 ("visible storage failures absent").
- **Exact problem:** The new app needs local storage that cannot collide with other Continuum apps and that never fails silently.
- **Reason this matters:** It holds drafts, scenarios, preferences and folder handles.
- **Target behaviour:** `app/continuum-core/storage.js` exposes:
  - `Continuum.storage.prefs(appKey)` → `{get(key, default), set(key, value), remove(key), keys()}` on `localStorage` with prefix `continuum.<appKey>.`; `set` returns `{ok:true}` or `{ok:false, error:{kind:'quota'|'unavailable'|'unknown', message}}`;
  - `Continuum.storage.db(appKey, stores[])` → a Promise of `{put(store, key, value), get, delete, getAll, clear}` over IndexedDB database `continuum-<appKey>`, with the same result convention;
  - `Continuum.storage.estimate()` → `{usage, quota}` or `null`.
- **Smallest safe change:** Create the file and tests. In Node tests, use an in-memory `localStorage` stub and a minimal IndexedDB fake in `tests/support/fake-idb.js`.
- **Explicit exclusions:** Do not migrate legacy `pf_*` keys. No UI.
- **Files expected to change:** `tests/browser-suites.js`; new `app/continuum-core/storage.js`, `tests/unit/core-storage.test.js`, `tests/support/fake-idb.js`.
- **Files that must not change:** MNC-STD, `index.html`, `server.py`.
- **Functions, symbols or components likely affected:** New `Continuum.storage`.
- **Dependencies:** TST-001.
- **Prerequisite decisions:** ADR-009.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** Defines the namespaces. Legacy keys are untouched.
- **Security and privacy impact:** No secrets are stored.
- **Automated tests:** Prefix isolation between two app keys. Quota error mapping (stub throws a `DOMException` named `QuotaExceededError`). IndexedDB CRUD. TEST-NODE, TEST-BROWSER (the real IndexedDB in Edge under `file://`).
- **Manual verification:** TEST-BROWSER run from the synced folder on the managed laptop (records BAS-002-consistent behaviour).
- **Acceptance criteria:** Tests pass in Node and Edge.
- **Rollback:** Delete the new files.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output (both runners).
- **Continuity updates:** CONT-STD.

### REF-001: Continuum Reference module `continuum-core/ref.js`
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-08.** Where this note conflicts with the fields below, this note wins. **Owner decision 2026-10-04: no format regex.** The reference is the first opportunity number the user enters, stored once and never editable.
> - **`normalise`:** trim; remove all whitespace; upper-case; then require 1–64 characters with no control characters. Nothing else is rejected.
> - **Remove** `config.digits`, the `O-`/digit checks and the `-Wnn` suffix.
> - **New function `fileNameFor(ref)`:** `encodeURIComponent(ref)` with `*` replaced by `%2A` and `.` at the start replaced by `%2E`. The Registry file is `<fileNameFor(ref)>.json`.
> - **Test table replaced:** `o-5030460` → `O-5030460`; ` O 008891 ` → `O008891` (spaces removed, by design); `""` → error; a 65-character string → error; `a/b` → `A/B` with file name `A%2FB.json`.
> - **`resolve` and immutability rules unchanged.**
>
> The DATA_AND_STORAGE §2.2 grammar is superseded by this note.
- **Capability group:** DATA AND STORAGE
- **Priority:** P1 · **Phase:** 1
- **Current classification:** Absent in Finance. Continuum uses a time-based ID (`genProjectReferenceID`, project_onion `schema.js`).
- **Evidence:** DEC-001 (format `O-<digits>[-Wnn]`), DEC-002 (multiple opportunity numbers → primary plus aliases), `DATA_AND_STORAGE_ARCHITECTURE.md` §2 (as amended by DOC-001).
- **Exact problem:** There is no shared, non-temporal identifier across Continuum apps.
- **Reason this matters:** It enables deep links, the registry and "create once, recognised everywhere".
- **Target behaviour:** A dependency-free `app/continuum-core/ref.js` exposes:
  - `Continuum.ref.normalise(input)` → `{ok:true, ref:'O-5030460'}` or `{ok:false, error}`. Rules: trim; upper-case; remove internal spaces; accept `O5030460` → `O-5030460`; digits `^\d{6,8}$` (from `Continuum.ref.config.digits = {min:6, max:8}`); keep leading zeros; optional suffix `-W\d{2}`; anything else is an error with a readable message.
  - `isValid(ref)`.
  - `parseFromLocation(loc)`: reads `#/ref/<ref>` or `?ref=<ref>`.
  - `toLink(indexPath, ref)` → `<indexPath>#/ref/<ref>`.
  - `resolve(input, records)`: matches `record.ref`, then `record.opportunity_numbers[]`, then `record.aliases[]`; follows `superseded_by` (max 5 steps); returns `{status:'found'|'superseded'|'retired'|'conflict'|'not-found', record, chain}`.
  - `recordFromForm({opportunity_numbers, primary, name, client, workstream}, meta)` builds a registry record (fields per DATA_AND_STORAGE §2.3 as amended; `opportunity_numbers` uses the same field name as Continuum).
  - `Continuum.ref.version`.

  `docs/schema/CONTINUUM_REFERENCE.md` documents the contract for copying into other apps.
- **Smallest safe change:** Create the module, the doc and tests.
- **Explicit exclusions:** No registry file I/O (SPI-001, REF-002). No UI. No changes to Continuum (XREP-001).
- **Files expected to change:** `tests/browser-suites.js`; new `app/continuum-core/ref.js`, `docs/schema/CONTINUUM_REFERENCE.md`, `tests/unit/core-ref.test.js`.
- **Files that must not change:** MNC-STD, `index.html`, `server.py`.
- **Functions, symbols or components likely affected:** New `Continuum.ref`.
- **Dependencies:** TST-001, DOC-001.
- **Prerequisite decisions:** DEC-001, DEC-002, DEC-011 (workstream suffix policy; until decided, accept the suffix but do not generate it).
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** Defines the key used by the dataset (`ref`) and the registry.
- **Security and privacy impact:** Rejecting anything outside `[A-Z0-9-]` makes refs safe in file names and URLs.
- **Automated tests:**
  - Table tests: `o-5030460` → `O-5030460`; `O 008891` → `O-008891`; `O-12345` → error; `O-5030460-W02` OK; `O-5030460-W2` → error; `X-5030460` → error.
  - `resolve` across primary, alias, superseded chain, loop protection and conflict.

  TEST-NODE, TEST-BROWSER.
- **Manual verification:** Review `CONTINUUM_REFERENCE.md`.
- **Acceptance criteria:** Tests pass. The module has no references to `CFE`, `document` or `window` other than the `Continuum` global registration.
- **Rollback:** Delete the new files.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### IMP-001: RFC 4180 CSV parser
- **Capability group:** FILE IMPORT
- **Priority:** P1 · **Phase:** 1
- **Current classification:** BROKEN (C-04: `split(',')` at `index.html:1435-1440`, `2006`)
- **Evidence:** As stated; fixture `tests/fixtures/timesheet-quoted.csv`.
- **Exact problem:** Quoted commas, quotes and CRLF corrupt rows.
- **Reason this matters:** Correct import is prerequisite to trustworthy figures.
- **Target behaviour:** `app/continuum-core/csv.js` exposes `Continuum.csv.parse(text)` → `{header:[…], rows:[{col:value}], errors:[{line, message}]}`. It handles a UTF-8 BOM, CRLF/LF, quoted fields with commas and newlines, and `""` escapes. Ragged rows are reported with their line number, not padded silently. Empty trailing lines are ignored.
- **Smallest safe change:** Create the module and tests.
- **Explicit exclusions:** Do not replace the legacy parsing in `index.html` (it is retired with the legacy app). No delimiter auto-detection.
- **Files expected to change:** `tests/browser-suites.js`; new `app/continuum-core/csv.js`, `tests/unit/core-csv.test.js`.
- **Files that must not change:** MNC-STD, `index.html`.
- **Functions, symbols or components likely affected:** New `Continuum.csv.parse`.
- **Dependencies:** TST-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Values are returned as strings only. No evaluation.
- **Automated tests:** All TST-002 CSV fixtures. `test_Timesheet.csv` parses 1,243 rows with 23 columns. TEST-NODE, TEST-BROWSER.
- **Manual verification:** None.
- **Acceptance criteria:** Tests pass.
- **Rollback:** Delete the new files.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### IMP-002: SHA-256 hashing and provenance records
- **Capability group:** FILE IMPORT
- **Priority:** P1 · **Phase:** 1
- **Current classification:** Absent (assessment §7: no provenance)
- **Evidence:** Charter §6 provenance list; DATA_AND_STORAGE §7.
- **Exact problem:** Imported data cannot be traced to a file, row or version.
- **Reason this matters:** Citations in chat and Copilot packs, change detection (ODI-002) and dataset integrity (STO-004) all need hashes and provenance.
- **Target behaviour:**
  - `app/continuum-core/hash.js` exposes `Continuum.hash.sha256Hex(input: string|ArrayBuffer) → Promise<string>`. It uses `crypto.subtle` when `isSecureContext`, otherwise a readable pure-JS SHA-256 in the same file.
  - `app/continuum-core/provenance.js` exposes `Continuum.provenance.fileRecord({name, size, lastModified, sha256, sourceSystem, parser, parserVersion, mappingProfile, sheet, headerRow, rowsRead, rowsUsed, asOf, importedUtc})` (validates and freezes) and `rowRef(fileId, sheet, row)`.
- **Smallest safe change:** Create the two modules and tests.
- **Explicit exclusions:** No UI. No file reading.
- **Files expected to change:** `tests/browser-suites.js`; new `app/continuum-core/hash.js`, `app/continuum-core/provenance.js`, `tests/unit/core-hash.test.js`, `tests/unit/core-provenance.test.js`.
- **Files that must not change:** MNC-STD, `index.html`.
- **Functions, symbols or components likely affected:** New `Continuum.hash`, `Continuum.provenance`.
- **Dependencies:** TST-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Provenance holds file names. Names may reveal project names; acceptable inside the tenant.
- **Automated tests:** NIST vectors (`""`, `"abc"`, a 1 MB string). The pure-JS and SubtleCrypto paths agree. TEST-NODE, TEST-BROWSER.
- **Manual verification:** None.
- **Acceptance criteria:** Tests pass.
- **Rollback:** Delete the new files.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### IMP-003: Declarative mapping profiles for PeopleSoft and other sources
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-11.** Where this note conflicts with the fields below, this note wins. **Owner confirmed 2026-10-04 that the fixture column names are the live PeopleSoft column names** (DEC-018 accepted for columns).
> - Date tokens become `M/D/YYYY`, `D/M/YYYY` and `YYYY-MM-DD`, where `M`/`D` accept one or two digits (live data contains `7/1/2025`).
> - Profile `peoplesoft-timesheet-v1` uses `M/D/YYYY`; `resource-rules-v1` uses `D/M/YYYY`.
> - The owner still confirms the resource-rule date order on a live file (record in DECISIONS).
> - Add a test with `7/1/2025` and `12/31/2025`.
- **Capability group:** FILE IMPORT
- **Priority:** P1 · **Phase:** 1
- **Current classification:** PARTIAL (column aliases hard-coded in `processUpload` `index.html:1452-1487`, heuristic `parseSolutionExcel` aliases `1593-1605`, date format guessing in `parseDate`)
- **Evidence:** C-03; DATA_AND_STORAGE §5 step 5.
- **Exact problem:** Column mapping and date formats are implicit and guessed.
- **Reason this matters:** Wrong mappings silently produce wrong figures.
- **Target behaviour:**
  - Profiles in `app/data/mappings/<id>.js` register into `CFE.data.mappings`. Each has the shape `{id, version, sourceSystem, entity, columns:{<target>:{aliases:[…], type:'string'|'int'|'number'|'date'|'bool', dateFormat:'MM/DD/YYYY'|'DD/MM/YYYY'|'YYYY-MM-DD', required:boolean}}, dropUnmapped:true}`.
  - `CFE.data.mapping.apply(profile, header, rows)` returns `{records, errors:[{row, column, message}], warnings, unmappedColumns, droppedColumns}`.
  - `CFE.data.mapping.detect(header)` returns candidate profiles ranked by required-column coverage.
  - Profiles:
    - `peoplesoft-timesheet-v1`, from the `test_Timesheet.csv` header; dates `MM/DD/YYYY`; keeps Empl Name, Empl ID, Reported Dt, Project ID, Activity and the hours columns; drops Worksite*, Country/State, Postal, Customer Name;
    - `resource-rules-v1` (`test_ResourceRules.csv` header; dates `DD/MM/YYYY`);
    - `po-details-v1`;
    - `invoices-v1`;
    - `expenses-v1`;
    - `fx-rates-v1`;
    - `ot-rules-v1`;
    - `references-crosswalk-v1` (columns `ref`, `name`, `client`, `opportunity_numbers` (`;`-separated), `po_team_identifiers` (`;`), `peoplesoft_project_ids` (`;`)).
- **Smallest safe change:** Create the mapping engine, the profiles and tests.
- **Explicit exclusions:** No UI. No XLSX reading here (the caller passes header and rows). No guessing of date formats.
- **Files expected to change:** `tests/browser-suites.js`; new `app/data/mapping.js`, `app/data/mappings/*.js` (8 files), `tests/unit/data-mapping.test.js`, `docs/schema/MAPPING_PROFILES.md`.
- **Files that must not change:** MNC-STD, `index.html`.
- **Functions, symbols or components likely affected:** New `CFE.data.mapping`, `CFE.data.mappings`.
- **Dependencies:** IMP-001, STO-001.
- **Prerequisite decisions:** DEC-018 (date formats per PeopleSoft export: timesheet `MM/DD/YYYY`, resource rules `DD/MM/YYYY`; owner to confirm with a real export header, anonymised).
- **External approvals:** None.
- **Data-boundary impact:** Dropping unneeded columns reduces personal data retained.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Positive (minimisation at parse time).
- **Automated tests:**
  - Each existing fixture maps with 0 errors.
  - `timesheet-ambiguous-dates.csv` produces dates in the profile's declared format, never swapped.
  - A missing required column gives a blocking error.

  TEST-NODE, TEST-BROWSER.
- **Manual verification:** The owner checks `MAPPING_PROFILES.md` against a real (not committed) PeopleSoft export header.
- **Acceptance criteria:** Tests pass. The owner confirms the column names (record in DECISIONS).
- **Rollback:** Delete the new files.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, owner confirmation.
- **Continuity updates:** CONT-STD.

### SHL-001: New application shell, namespaces and router; relocate legacy
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-16.** Where this note conflicts with the fields below, this note wins. **Scope reduced:** relocating the legacy app (`git mv`, legacy path edits, `server.py` `HTML_FILE`, Dockerfile, sandbox default path) moves to SHL-004. This item creates the new shell files only and replaces the placeholder root `index.html` that SHL-004 leaves. **Dependencies:** SHL-004.
- **Capability group:** HUMAN-READABLE SOURCE
- **Priority:** P1 · **Phase:** 1
- **Current classification:** Absent (single-file legacy UI)
- **Evidence:** TARGET_ARCHITECTURE §2–§4; MINIFIED_CODE_MIGRATION_STRATEGY §4 S3.
- **Exact problem:** There is no maintainable shell into which views can migrate.
- **Reason this matters:** Every Phase 2 view depends on it. The legacy app must stay reachable.
- **Target behaviour:**
  - The legacy file moves to `legacy/index.html`, with its relative paths changed to `../vendor/…` and `../app/…`.
  - `server.py` `HTML_FILE` points to `legacy/index.html`, so `http://localhost:3005/` still serves the legacy app with the same origin and the same browser data.
  - A new `index.html`:
    - is static markup only;
    - has no inline script, style or `on*` attributes;
    - contains regions `#banner`, `#nav`, `#main` and `#dialogs`;
    - loads in order `app/VERSION.js`, `app/config.js`, `app/cfe.js`, the `app/continuum-core/*`, `app/data/*`, `app/calc/*` and `app/store/*` files, `app/views/shell.js`, `app/app.js`.
  - `app/app.js` runs a hash router with routes:
    - `#/portfolio` (default), which shows "Views arrive in UI-001";
    - `#/ref/<ref>`;
    - `#/publish`;
    - `#/diagnostics`;
    - `#/about`.
  - Navigation uses `data-action` delegation.
  - `app/VERSION.js` holds `CFE.version = {app:'4.0.0-alpha.1', supportsSchema:[1,1], date:'<YYYY-MM-DD>'}`.
  - `app/config.js` holds `CFE.config = {staleAfterDays:7, enabledProviders:['none'], appKey:'finance', historyKeep:60}`.
  - The `Dockerfile` copies `legacy/`, `app/`, `vendor/`.
- **Smallest safe change:**
  - `git mv index.html legacy/index.html`, then edit only its `src`/`href` paths.
  - Edit the `server.py` `HTML_FILE` and the static allowlist (no change needed if `/app` and `/vendor` are already allowed).
  - Create the new files.
  - Update `tests/support/legacy-sandbox.js` default `htmlPath`.
- **Explicit exclusions:** No views beyond placeholders. No data loading (STO-004). No CSP yet (SEC-005). No styling beyond `app/css/tokens.css` and `app/css/app.css` basics.
- **Files expected to change:** `legacy/index.html` (moved, path edits only), `server.py`, `Dockerfile`, `tests/support/legacy-sandbox.js`; new `index.html`, `app/VERSION.js`, `app/config.js`, `app/app.js`, `app/views/shell.js`, `app/css/tokens.css`, `app/css/app.css`, `tests/unit/app-router.test.js`.
- **Files that must not change:** MNC-STD, `app/calc/**`, `app/continuum-core/**`.
- **Functions, symbols or components likely affected:** `HTML_FILE`; new `CFE.app.route`, `CFE.views.shell`.
- **Dependencies:** SRC-003, SEC-004, BAK-001.
- **Prerequisite decisions:** DEC-008 (folder name kept), ADR-002.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** **High-risk sequence:** the legacy app must keep its origin (`http://localhost:3005`) so its `localStorage` remains reachable. Before starting, the owner exports a BAK-001 backup.
- **Security and privacy impact:** None.
- **Automated tests:** Router unit tests (hash → route object; unknown → portfolio). TEST-NODE (goldens unchanged with the new path). TEST-SERVER (GET `/` returns the legacy page; `/vendor` and `/app` files load).
- **Manual verification:**
  1. `python3 server.py` → `http://localhost:3005` shows the legacy app with the existing data.
  2. Open the new `index.html` via `file://` in Edge. The shell renders, the routes switch, and the console shows no errors.
- **Acceptance criteria:** Tests and both manual checks pass. The legacy data is intact (compare the KPI table with the pre-change backup).
- **Rollback:** RB-STD (`git mv` back).
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, KPI comparison.
- **Continuity updates:** CONT-STD; **update `PROJECT_STATE.md`: "Legacy app file is now `legacy/index.html`"**.

### SHL-002: Readiness banner
- **Capability group:** UI AND ACCESSIBILITY
- **Priority:** P1 · **Phase:** 1
- **Current classification:** Absent
- **Evidence:** TARGET_ARCHITECTURE §3.4; owner OD-3 (clear status for leaders).
- **Exact problem:** Viewers cannot tell whether data is present, current or valid.
- **Reason this matters:** It is required for UI-only operation by senior leadership.
- **Target behaviour:**
  - `app/continuum-core/status.js` provides `Continuum.status.compute(input) → {level:'ready'|'attention'|'not-ready', title, details:[…]}`. The `input` is `{datasetLoaded, hashOk, schemaMigrated, newerSchema, manifest, nowUtc, staleAfterDays, errors, warnings, refState}`, and the rules follow TARGET §3.4.
  - `CFE.views.shell.renderBanner(status)` writes into `#banner` (role `status`, `aria-live="polite"`) with an icon plus text, never colour alone, and a "Details" link to `#/diagnostics`.
- **Smallest safe change:** Create the module, the banner rendering in `shell.js`, and CSS tokens for the three levels (AA contrast).
- **Explicit exclusions:** No data loading (STO-004 supplies the input). No dismiss button.
- **Files expected to change:** `app/views/shell.js`, `app/css/app.css`, `index.html` (script tag), `tests/browser-suites.js`; new `app/continuum-core/status.js`, `tests/unit/core-status.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** New `Continuum.status.compute`, `CFE.views.shell.renderBanner`.
- **Dependencies:** SHL-001.
- **Prerequisite decisions:** DEC-019 (stale threshold 7 days; owner may change).
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** The banner shows the publisher name (from the manifest) and dates only.
- **Automated tests:** A table of inputs → levels and titles (missing dataset, hash mismatch, newer schema, 8 days old, warnings, all good). TEST-NODE, TEST-BROWSER.
- **Manual verification:** Open the shell with no `published/` folder. A red banner reads "No published data found" and links to the help.
- **Acceptance criteria:** Tests and manual check pass. A contrast ratio ≥ 4.5:1 for banner text is recorded (DevTools contrast checker).
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, screenshot.
- **Continuity updates:** CONT-STD.

### SHL-003: Diagnostics view and log
- **Capability group:** DIAGNOSTICS
- **Priority:** P1 · **Phase:** 1
- **Current classification:** Absent (SEC-17: no observability)
- **Evidence:** TARGET_ARCHITECTURE §22.
- **Exact problem:** Failures are unobservable, and support cannot see versions or capabilities.
- **Reason this matters:** It provides observable failures (charter definition of production-ready).
- **Target behaviour:**
  - `app/continuum-core/log.js` provides `Continuum.log.{info, warn, error}(module, message, meta)`, a 500-entry ring buffer and `Continuum.log.entries()`. `meta` accepts only numbers, booleans and strings ≤ 80 characters, and the log never records data values by contract (documented).
  - `app/app.js` installs `window` `error` and `unhandledrejection` handlers that log and set the banner to not-ready with "Unexpected error – see Diagnostics".
  - `app/views/diagnostics.js` shows:
    - app version, core version, schema support;
    - manifest summary (if loaded);
    - user agent, `isSecureContext`, `location.protocol`;
    - feature support (`showDirectoryPicker`, `showSaveFilePicker`, `crypto.subtle`, `indexedDB`);
    - storage estimate;
    - the last 50 log entries.

    A **Copy diagnostics** button copies plain text.
- **Smallest safe change:** Create the two modules and route `#/diagnostics`.
- **Explicit exclusions:** No remote logging. No file logging.
- **Files expected to change:** `app/app.js`, `index.html` (script tags), `tests/browser-suites.js`; new `app/continuum-core/log.js`, `app/views/diagnostics.js`, `tests/unit/core-log.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** New `Continuum.log`, `CFE.views.diagnostics`.
- **Dependencies:** SHL-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None (the clipboard holds only diagnostics, initiated by the user).
- **Storage or migration impact:** None.
- **Security and privacy impact:** A test enforces that `meta` rejects objects and long strings.
- **Automated tests:** Ring-buffer limit; `meta` sanitisation; the copy text contains the version lines. TEST-NODE, TEST-BROWSER.
- **Manual verification:** `#/diagnostics` in Edge via `file://` shows a feature table consistent with the BAS-002 results.
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, copied diagnostics text.
- **Continuity updates:** CONT-STD.

### STO-003: Synthetic sample published dataset
- **Capability group:** DATA AND STORAGE
- **Priority:** P1 · **Phase:** 1
- **Current classification:** Absent
- **Evidence:** DATA_AND_STORAGE §3; ADR-017 (synthetic only in the public repo).
- **Exact problem:** The viewer cannot be developed or tested without a publication.
- **Reason this matters:** It lets view work proceed before the publisher exists. It also serves as a demo that is explicitly labelled sample.
- **Target behaviour:**
  - `samples/published/` contains `manifest.json`, `manifest.js`, `dataset.json` and `dataset.js` in schema v1. They are built from the TST-002 fixtures with refs `O-0000001` and `O-0000002`, carry `"sample": true` in the manifest, and the manifest `publisher` is `"Sample data generator"`.
  - `tests/support/make-sample-dataset.js` regenerates them deterministically.
  - `samples/README.md` explains how to copy `samples/published` to `published/` for local viewing.
  - The repo `.gitignore` adds `finance-engine-v3.5/published/` and `Finance-Drop/`.
- **Smallest safe change:** As described. The generator uses `CFE.calc.*` and `CFE.data.schema` loaded in a `vm` context.
- **Explicit exclusions:** No loader changes. No real data.
- **Files expected to change:** `/.gitignore`; new `samples/published/*` (4 files), `samples/README.md`, `tests/support/make-sample-dataset.js`, `tests/unit/sample-dataset.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/**`.
- **Functions, symbols or components likely affected:** None.
- **Dependencies:** STO-001, REF-001.
- **Prerequisite decisions:** DEC-001.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Synthetic only.
- **Automated tests:** The generated files validate against the schema. Regenerating produces byte-identical output. TEST-NODE.
- **Manual verification:** None.
- **Acceptance criteria:** Tests pass. `git check-ignore -v finance-engine-v3.5/published/x` reports the ignore rule.
- **Rollback:** Delete the new files and revert `.gitignore`.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### STO-004: Published dataset loader (script tag, JSON fallback, hash check)
- **Capability group:** DATA AND STORAGE
- **Priority:** P1 · **Phase:** 1
- **Current classification:** Absent
- **Evidence:** ADR-005; DATA_AND_STORAGE §3.1; TARGET §3.3.
- **Exact problem:** The viewer has no way to load published data under `file://`.
- **Reason this matters:** It is the core viewer capability.
- **Target behaviour:** `app/store/dataset-loader.js` provides `CFE.store.loadPublished()`, which:
  1. Inserts `<script src="published/manifest.js">`, then `published/dataset.js`, via DOM APIs with `load`/`error` listeners (no inline handlers).
  2. Reads `window.CFE_PUBLISHED_MANIFEST` and `window.CFE_PUBLISHED_DATASET`.
  3. Rejects non-plain values.
  4. Runs `migrate.toCurrent`.
  5. Validates the schema.
  6. Recomputes `sha256Hex(JSON.stringify(dataset))` and compares it with `manifest.payload_sha256`.
  7. Stores the result in `CFE.state.published`.
  8. Feeds SHL-002.

  On failure the banner turns red with the reason, and an **Open dataset.json…** button (`<input type="file" accept=".json">`) loads `dataset.json` plus `manifest.json` through the same checks.
- **Smallest safe change:** Create the loader. Add `CFE.state` (in `app/store/state.js`) with `published`, `session` and `ui`, and `CFE.actions.setPublished`. Wire the boot sequence in `app.js`.
- **Explicit exclusions:** No publishing. No views (placeholders show counts only: "Loaded: n references, n POs…").
- **Files expected to change:** `app/app.js`, `index.html` (script tags), `tests/browser-suites.js`; new `app/store/dataset-loader.js`, `app/store/state.js`, `tests/unit/store-loader.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `samples/**`.
- **Functions, symbols or components likely affected:** New `CFE.store.loadPublished`, `CFE.state`, `CFE.actions`.
- **Dependencies:** STO-003, SHL-002, IMP-002.
- **Prerequisite decisions:** ADR-005.
- **External approvals:** None.
- **Data-boundary impact:** None (local files only).
- **Storage or migration impact:** Reads schema v1. Migrates older versions in memory and never writes.
- **Security and privacy impact:** The `.js` payload is accepted only as plain data; the hash is verified.
- **Automated tests:** With the sample dataset, the hash matches. A tampered dataset gives a hash mismatch (red). A missing manifest gives "No published data". Schema 2 gives "Update the app". Functions inside the payload are rejected. TEST-NODE (loader logic with injected globals), TEST-BROWSER.
- **Manual verification:**
  1. Copy `samples/published` to `published/` and open `index.html` via `file://`: green banner, counts shown.
  2. Edit one number in `published/dataset.js`: the banner turns red.
  3. **UNVERIFIED until the owner tests:** the same from the OneDrive-synced folder on the managed laptop.
- **Acceptance criteria:** Tests and manual steps 1–2 pass. Step 3 is reported.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, screenshots.
- **Continuity updates:** CONT-STD.

### SEC-005: Content-Security-Policy and security tests for the new shell
- **Capability group:** SECURITY AND PRIVACY
- **Priority:** P0 · **Phase:** 1
- **Current classification:** Absent (SEC-13)
- **Evidence:** ADR-015; owner OD-2 (nothing communicates outside).
- **Exact problem:** Nothing technically prevents outbound requests or limits XSS impact.
- **Reason this matters:** It enforces "no external transmission" (P0).
- **Target behaviour:**
  - The new `index.html` carries `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'">`. If BAS-002 showed that `'self'` does not match `file://` scripts, use the DEC-020 variant instead.
  - Security tests in `tests/security/` scan `index.html` and `app/**` for:
    - inline `<script>` without `src`;
    - `on[a-z]+=` attributes;
    - `style=` attributes in HTML strings;
    - `.innerHTML =` not immediately fed by `Continuum.html.t(` or `Continuum.html.escape(`;
    - `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`;
    - `http://` or `https://` outside the `tests/security/allowlist.json` entries (initially empty).
- **Smallest safe change:** Add the meta tag, fix any violations found in the shell files, and add the scanner (`tests/security/static-scan.test.js`, Node only).
- **Explicit exclusions:** The legacy app is out of scope (it has inline scripts by nature).
- **Files expected to change:** `index.html`, any `app/**` file with violations (list them in the report); new `tests/security/static-scan.test.js`, `tests/security/allowlist.json`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** Shell renderers.
- **Dependencies:** SHL-001, STO-004.
- **Prerequisite decisions:** DEC-020 (CSP variant from the BAS-002 results).
- **External approvals:** None.
- **Data-boundary impact:** Enforces no network from the app.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Closes SEC-13 for the new shell.
- **Automated tests:** TEST-NODE (the scanner passes); TEST-BROWSER.
- **Manual verification:** Open the shell with sample data in Edge via `file://`. The console shows no CSP violations, and the data loads (proves `script-src` works).
- **Acceptance criteria:** The scanner passes. The manual check passes on the developer machine. The managed laptop result is reported.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Scanner output, console screenshot.
- **Continuity updates:** CONT-STD.

### IMP-004: Import workflow V1: pick or drop files, parse, map, validate, preview, draft
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-17.** Where this note conflicts with the fields below, this note wins. **Scope reduced:** persistence (the `drafts` store, Keep in draft, Discard, quota handling, `app/store/draft.js`, `tests/unit/store-draft.test.js`) moves to IMP-008. This item holds the parsed preview **in memory only**, and leaving the view discards it. **Dependencies:** IMP-002, IMP-003, SHL-001 (STO-002 moves to IMP-008).
- **Capability group:** FILE IMPORT
- **Priority:** P1 · **Phase:** 1
- **Current classification:** PARTIAL (legacy upload has no preview before retention, no provenance and single files)
- **Evidence:** CURRENT_IMPLEMENTATION_ASSESSMENT §7 (Input V1 partial); ONEDRIVE_SHAREPOINT §3 V1.
- **Exact problem:** There is no safe way to bring files into the new app.
- **Reason this matters:** It is the publisher's core workflow and the manual OneDrive/SharePoint path.
- **Target behaviour:** `#/publish` (`app/views/publish.js`) shows a drop zone and an `<input type="file" multiple accept=".csv,.xlsx,.json">`. For each file it:
  1. reads bytes and hashes them;
  2. parses (CSV via `Continuum.csv`; XLSX via SheetJS reading the first sheet, with a sheet selector when there are several sheets; JSON via `JSON.parse`);
  3. auto-detects the profile (the user can override from a dropdown);
  4. applies the mapping;
  5. shows a per-file card: rows read/used, errors (blocking), warnings (acknowledge checkbox), first 10 mapped rows (escaped), and provenance.

  Nothing is retained until **Keep in draft**. The draft (`{schema_version:1, files:[provenance], records:{entity:[…]}}`) is stored in IndexedDB store `drafts` (STO-002), with **Discard draft**. A quota failure shows an error and offers **Save draft to file**.
- **Smallest safe change:** Create `publish.js` and `app/store/draft.js`. Add the `XLSX` vendor script tag to `index.html`.
- **Explicit exclusions:** No resolution of references, no minimisation (IMP-005), no publishing (PUB-001), no folder handles (ODI-002).
- **Files expected to change:** `index.html`, `app/app.js` (route), `app/css/app.css`, `tests/browser-suites.js`; new `app/views/publish.js`, `app/store/draft.js`, `tests/unit/store-draft.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** New `CFE.views.publish`, `CFE.store.draft`.
- **Dependencies:** IMP-002, IMP-003, STO-002, SHL-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** It reads only files the user chose. The draft stays in local browser storage.
- **Storage or migration impact:** Introduces the `drafts` store (schema v1).
- **Security and privacy impact:** Previews are escaped. Raw rows are held only in the draft.
- **Automated tests:** Draft round trip; quota error path (fake IndexedDB throws); profile override. TEST-NODE, TEST-BROWSER.
- **Manual verification:**
  1. Drop `test_Timesheet.csv`, `test_ResourceRules.csv` and a PO JSON.
  2. Check the cards.
  3. Keep in draft.
  4. Reload: the draft is still there.
  5. Discard: it is gone.
- **Acceptance criteria:** Tests and manual check pass. No data is retained when the user leaves without "Keep in draft".
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, screenshots.
- **Continuity updates:** CONT-STD.

### IMP-005: Normalise, resolve Continuum References and minimise
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-17.** Where this note conflicts with the fields below, this note wins. **Dependencies:** IMP-008 and REF-001 (replaces IMP-004). The builder reads the persisted draft.
- **Capability group:** FILE IMPORT
- **Priority:** P1 · **Phase:** 1
- **Current classification:** Absent
- **Evidence:** DATA_AND_STORAGE §5 steps 7–9; ADR-016; DEC-006.
- **Exact problem:** Draft records must become a valid dataset v1, keyed by `ref` with aggregated actuals.
- **Reason this matters:** It produces what viewers and Copilot packs consume.
- **Target behaviour:** `app/store/build-dataset.js` provides `CFE.store.buildDataset(draft, {nowUtc, publisher}) → {dataset, manifestDraft, report}`, which:
  - **(a)** builds `references` from `references-crosswalk-v1` records (refs normalised by `Continuum.ref`);
  - **(b)** resolves each PO, resource rule, timesheet row, invoice and expense to a `ref` through `po_team_identifiers` and `peoplesoft_project_ids`, listing unmatched rows in the report with counts and the first 5 examples;
  - **(c)** computes timesheet cost per row with `CFE.calc.actuals.rowCost` and then aggregates to `actuals` per `ref` + person + month + hours type (hours, cost, currency, `src_rows`, `files`);
  - **(d)** builds `people` with names (DEC-006);
  - **(e)** copies FX, OT and calendars;
  - **(f)** validates the result with `CFE.data.schema`;
  - **(g)** produces a preview diff against `CFE.state.published` when present (entity counts added/removed and KPI deltas per `ref` via `CFE.calc`).

  `publish.js` shows the report and diff. Unmatched rows block nothing but appear as warnings that must be acknowledged.
- **Smallest safe change:** Create the module and add the report and diff panels to `publish.js`.
- **Explicit exclusions:** No writing of files (PUB-001). No registry reads (SPI-001 adds registry records as a second source of `references`).
- **Files expected to change:** `app/views/publish.js`, `index.html` (script tag), `tests/browser-suites.js`; new `app/store/build-dataset.js`, `tests/unit/store-build-dataset.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** New `CFE.store.buildDataset`.
- **Dependencies:** IMP-004, REF-001.
- **Prerequisite decisions:** DEC-001, DEC-006.
- **External approvals:** None.
- **Data-boundary impact:** Defines exactly what will be shared (aggregates plus names); the report states it.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Daily rows are not included in the dataset.
- **Automated tests:**
  - From the fixtures plus a crosswalk fixture, the dataset validates.
  - Total cost equals the legacy golden `aggregateActuals` total for the same inputs (tolerance 0.01).
  - Unmatched rows are counted.
  - The diff with an identical dataset reports zero changes.

  TEST-NODE, TEST-BROWSER.
- **Manual verification:** Import the fixtures plus `references.csv` (two refs) and check the report and diff panels.
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### IMP-006: Import a legacy backup into a draft
- **Capability group:** FILE IMPORT
- **Priority:** P1 · **Phase:** 1
- **Current classification:** Absent
- **Evidence:** DATA_AND_STORAGE §8 "From legacy v3.5"; R-15 (different storage origin).
- **Exact problem:** The owner's current data lives in the legacy app's browser storage at `http://localhost:3005`. The new app (`file://`) cannot read it.
- **Reason this matters:** It is the migration path without data loss.
- **Target behaviour:**
  - `#/publish` accepts a BAK-001 backup file (or an old Full Config export).
  - `CFE.store.legacyImport(json)` verifies `sha256` (new format) and maps:
    - `po_details` → PO records;
    - `resources` → resource rules;
    - `raw_actuals` → timesheet records (through `peoplesoft-timesheet-v1`);
    - `invoices`, `expenses`, `fx_rates`, `ot_params` → their records.
  - It creates provenance (`sourceSystem: "Legacy Finance Engine v3.5 backup"`) and loads the result as a draft for the normal IMP-005 flow.
  - `actuals_monthly` without `raw_actuals` is not converted. A warning reads "Monthly totals without timesheet rows cannot be attributed to people; re-import the PeopleSoft files."
  - `_sample_sections` content is excluded with a notice.
- **Smallest safe change:** Create the module and a "Legacy backup" option in `publish.js`.
- **Explicit exclusions:** No reading of legacy `localStorage`. No scenarios import (UI-004 decides).
- **Files expected to change:** `app/views/publish.js`, `index.html` (script tag), `tests/browser-suites.js`; new `app/store/legacy-import.js`, `tests/unit/store-legacy-import.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** New `CFE.store.legacyImport`.
- **Dependencies:** IMP-005, BAK-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** This is the documented migration path. The legacy data is untouched.
- **Security and privacy impact:** None.
- **Automated tests:** A backup produced by the BAK-001 test fixture converts into a draft that IMP-005 turns into a valid dataset. Sample sections are excluded. A tampered hash is refused. TEST-NODE.
- **Manual verification:** The owner exports a backup from the legacy app and imports it into the new app. The report shows the expected counts. KPIs match the legacy Overview for the same filters (record both).
- **Acceptance criteria:** Tests pass. The owner's comparison table is recorded (values only in the local report, not committed).
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, owner comparison confirmation.
- **Continuity updates:** CONT-STD.

### REL-001: MIT licence, About panel and switchable export attribution
- **Capability group:** RELEASE AND OPERATIONS
- **Priority:** P1 · **Phase:** 1
- **Current classification:** Absent (no LICENSE; the repo will become public; owner DEC-005)
- **Evidence:** Assessment MINIFIED register A-01 "No licence file"; SEC-18; ADR-017.
- **Exact problem:** The repository has no licence. Attribution is hard-wired into every export.
- **Reason this matters:** It is required before the repo goes public, and it respects the owner's credit.
- **Target behaviour:**
  - `/LICENSE` contains the MIT text with `Copyright (c) 2026 Vamsi Yedlapalli` (the owner confirms the exact holder name).
  - `app/views/about.js` (`#/about`) shows the app name, version, author attribution and GitHub link, licence, and the third-party licences from a static list matching `vendor/VENDOR.md`.
  - The preference `continuum.finance.exportAttribution` (default `true`) is toggled in About. It is consumed by ODO-001.
  - `tests/security/allowlist.json` permits `https://github.com/LoneWolfDen` in `app/views/about.js` only.
- **Smallest safe change:** As described.
- **Explicit exclusions:** No legacy changes. No README rewrite.
- **Files expected to change:** `/LICENSE` (new), `index.html` (script tag), `app/app.js` (route), `tests/security/allowlist.json`; new `app/views/about.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** New `CFE.views.about`.
- **Dependencies:** SHL-001.
- **Prerequisite decisions:** DEC-005 (MIT), copyright holder name.
- **External approvals:** None.
- **Data-boundary impact:** The GitHub link opens only on user click.
- **Storage or migration impact:** One preference key.
- **Security and privacy impact:** None.
- **Automated tests:** The security scanner passes with the allowlist. The preference round trip works. TEST-NODE.
- **Manual verification:** `#/about` renders and the toggle persists across reloads.
- **Acceptance criteria:** Tests and manual check pass. The owner approves the LICENSE text.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### REP-002: Archive v1, v2, v3 folders
- **Capability group:** REPOSITORY CLEANUP
- **Priority:** P2 · **Phase:** 1
- **Current classification:** UNUSED (U-09; REPOSITORY_CLEANUP_CANDIDATES CL-01…CL-04; owner decision 2026-10-02)
- **Evidence:** `/finance-engine-v1/`, `/finance-engine-v2/`, `/finance-engine-v3/`; the root README says "Three independent versions".
- **Exact problem:** Duplicate implementations confuse readers and models.
- **Reason this matters:** One codebase, one start-up path.
- **Target behaviour:**
  - The owner creates the tag `archive/v1-v3-2026-10` at the commit before removal.
  - The v2 PO fixture is preserved as `tests/fixtures/legacy-v2-po-details.json`.
  - The three folders are removed from the working branch.
  - The root `/README.md` describes v3.5 only and how to view the archive tag.
  - `/.gitignore` is consolidated (CL-16).
- **Smallest safe change:** `cp /finance-engine-v2/test_PO_Details.json tests/fixtures/legacy-v2-po-details.json`; `git rm -r` the three folders; edit `/README.md` and `/.gitignore`. Tag creation is an owner action, documented in the item report.
- **Explicit exclusions:** No history rewrite. No deletion of remote branches (owner decision CL-08/09). No changes inside `finance-engine-v3.5/` other than the fixture copy.
- **Files expected to change:** `/finance-engine-v1/**`, `/finance-engine-v2/**`, `/finance-engine-v3/**` (deleted), `/README.md`, `/.gitignore`, new `tests/fixtures/legacy-v2-po-details.json`.
- **Files that must not change:** Everything else under `finance-engine-v3.5/`.
- **Functions, symbols or components likely affected:** None.
- **Dependencies:** TST-003 (any test relying on the v2 fixture is updated to the copy).
- **Prerequisite decisions:** DEC-021 (archive by tag).
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** It reduces the public surface (old `server.py` copies with the same flaws).
- **Automated tests:** TEST-NODE, TEST-SERVER.
- **Manual verification:** `git show archive/v1-v3-2026-10:finance-engine-v1/README.md` works (owner).
- **Acceptance criteria:** Tests pass. The tag exists before the deletion commit.
- **Rollback:** `git revert <commit>` restores the folders.
- **Recommended commit boundary:** CB-STD (after the owner creates the tag).
- **Completion evidence:** `git tag -l 'archive/*'`, test output.
- **Continuity updates:** CONT-STD; mark CL-01…CL-04, CL-11, CL-16, CL-17 done.

---

# Phase 2: Daily use, OneDrive and SharePoint V1, grounded chatbot, Copilot package V1

### UI-001: Overview, Burndown and Variance views in the new shell
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-15.** Where this note conflicts with the fields below, this note wins. **Scope reduced:** `app/store/legacy-cfg-adapter.js` and `tests/unit/store-adapter.test.js` move to UI-007. **Dependencies:** UI-007 and SEC-005 (replaces STO-004).
- **Capability group:** UI AND ACCESSIBILITY
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Legacy only (`legacy/index.html` `rOV`, `rBD`, `rMo`, `drawCharts`)
- **Evidence:** TARGET_ARCHITECTURE §2 (`app/views/*`); MINIFIED_CODE_MIGRATION_STRATEGY §4 S3.
- **Exact problem:** The new shell shows no figures.
- **Reason this matters:** These are the views leadership uses first.
- **Target behaviour:**
  - `app/store/legacy-cfg-adapter.js` provides `CFE.store.toCalcInput(dataset, {ref, year, poTeams}) → cfg`, in the shape the `CFE.calc.*` functions expect (`po_details`, `resources`, `fx_rates`, `ot_params`, `expenses`, plus `actuals_monthly` built from the `actuals` aggregates).
  - `app/views/overview.js`, `burndown.js` and `variance.js` render cards, tables and Chart.js charts from `CFE.calc` results, with the same labels and layout intent as legacy.
  - Every chart has a "Show as table" toggle.
  - Money is formatted with `Intl.NumberFormat` using the record's currency code (not a hard-coded `£`).
  - A filter bar (Year, PO team, Reference) lives in `app/views/filters.js` with `data-action` delegation.
  - All data passes through `Continuum.html`.
- **Smallest safe change:** Create the adapter and the four view files; add the vendor Chart.js and datalabels tags; register the routes `#/portfolio` and `#/ref/<ref>` to use them.
- **Explicit exclusions:** No editing of data. No exports (ODO-*). No label corrections (FIX-004). No new metrics.
- **Files expected to change:** `index.html`, `app/app.js`, `app/css/app.css`, `tests/browser-suites.js`; new `app/store/legacy-cfg-adapter.js`, `app/views/overview.js`, `app/views/burndown.js`, `app/views/variance.js`, `app/views/filters.js`, `tests/unit/store-adapter.test.js`, `tests/unit/views-overview.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** New `CFE.store.toCalcInput`, `CFE.views.overview|burndown|variance|filters`.
- **Dependencies:** STO-004, SEC-005.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** Filter preferences are kept in `Continuum.storage.prefs('finance')`.
- **Security and privacy impact:** The security scanner must pass.
- **Automated tests:**
  - The adapter on the sample dataset yields calc results equal to the legacy goldens for the equivalent fixture (document the mapping in the test).
  - View render functions return markup containing the expected KPI strings.
  - TEST-NODE, TEST-BROWSER, static scan.
- **Manual verification:** With sample data, the three views render, filters work, and figures match the legacy app loaded with the equivalent fixture (record a comparison table).
- **Acceptance criteria:** Tests pass. The comparison table matches to the penny.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, comparison table.
- **Continuity updates:** CONT-STD.

### UI-002: PO, Invoices and Expenses views in the new shell
- **Capability group:** UI AND ACCESSIBILITY
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Legacy only (`rPO`, `rInv`, `rExp`)
- **Evidence:** `legacy/index.html` `rPO`, `rInv`, `rExp` (line numbers as of `5d453d1`: 1240, 616, 1224).
- **Exact problem:** As in UI-001, for these views.
- **Reason this matters:** Daily use.
- **Target behaviour:** `app/views/po.js`, `invoices.js` and `expenses.js`. Timelines are rendered with CSS widths and no inline styles (use CSS custom properties set via `element.style.setProperty`, which CSP allows from script). Grouped, collapsible tables use `<button aria-expanded>`.
- **Smallest safe change:** Port the rendering and use the adapter.
- **Explicit exclusions:** Expense FX conversion (FIX-002). Editing.
- **Files expected to change:** `index.html`, `app/app.js`, `app/css/app.css`, `tests/browser-suites.js`; new `app/views/po.js`, `app/views/invoices.js`, `app/views/expenses.js`, `tests/unit/views-po-inv-exp.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** New view modules.
- **Dependencies:** UI-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Static scan passes.
- **Automated tests:** Render tests. TEST-NODE, TEST-BROWSER.
- **Manual verification:** Compare with legacy on the same fixture.
- **Acceptance criteria:** Tests pass and figures match.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### UI-003: Resources and Utilisation views (read-only) in the new shell
- **Capability group:** UI AND ACCESSIBILITY
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Legacy only (`rRes` editable, `rUtil`)
- **Evidence:** `legacy/index.html` `rRes`, `rUtil`, `rTLInline`.
- **Exact problem:** As in UI-001. Viewers must not edit shared data (ADR-004).
- **Reason this matters:** Daily use.
- **Target behaviour:**
  - `app/views/resources.js` is a read-only table plus Gantt timeline.
  - `app/views/utilisation.js` shows planned hours (from rules) against recorded hours (from `actuals` aggregates).
  - Edits happen only by re-importing source files (the publisher).
- **Smallest safe change:** Port the rendering.
- **Explicit exclusions:** No `contenteditable`. No label corrections (FIX-004).
- **Files expected to change:** `index.html`, `app/app.js`, `app/css/app.css`, `tests/browser-suites.js`; new `app/views/resources.js`, `app/views/utilisation.js`, `tests/unit/views-res-util.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** New view modules.
- **Dependencies:** UI-001.
- **Prerequisite decisions:** ADR-004.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Names are shown (DEC-006). Present mode masks them (UI-006).
- **Automated tests:** Render tests. TEST-NODE, TEST-BROWSER.
- **Manual verification:** Compare with legacy.
- **Acceptance criteria:** Tests pass. Figures match, except where the legacy utilisation hack applies (document the difference; the actual-hours basis is intentional).
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### UI-004: Personal what-if scenarios stored as deltas
- **Capability group:** UI AND ACCESSIBILITY
- **Priority:** P2 · **Phase:** 2
- **Current classification:** Legacy WORKING but stores full config copies (F-10)
- **Evidence:** Legacy `rScen`, `saveScenario`, `loadScenario`, `compareScenarios`; DATA_AND_STORAGE §4.
- **Exact problem:** Scenarios duplicate the full data and overwrite the working copy.
- **Reason this matters:** Planning use without risk to shared data.
- **Target behaviour:**
  - `app/views/scenarios.js` lets a viewer create a scenario: `{schema_version:1, name, base_publication_id, created_utc, changes:[{op:'add-rule'|'remove-rule'|'set-rule-field', ruleId?, rule?, field?, value?}]}`, stored in IndexedDB store `scenarios`.
  - The forecast is computed from `toCalcInput` with the changes applied, and compared side by side with the published state.
  - Export/import of scenarios is JSON with `sha256`.
  - If `base_publication_id` differs from the current one, the scenario shows "Based on an older publication – review" (Needs confirmation).
- **Smallest safe change:** Create the view and `app/store/scenarios.js`.
- **Explicit exclusions:** No writing to published data. No legacy scenario import (stated in the UI: re-create manually).
- **Files expected to change:** `index.html`, `app/app.js`, `tests/browser-suites.js`; new `app/views/scenarios.js`, `app/store/scenarios.js`, `tests/unit/store-scenarios.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** New modules.
- **Dependencies:** UI-003, STO-002.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None (local).
- **Storage or migration impact:** New store `scenarios` (schema v1).
- **Security and privacy impact:** None.
- **Automated tests:** Applying deltas; base-mismatch flag; export/import hash. TEST-NODE, TEST-BROWSER.
- **Manual verification:** Create a scenario adding a resource. The forecast difference is shown, and the published views are unchanged.
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### UI-005: Accessibility baseline
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-19.** Where this note conflicts with the fields below, this note wins. **Scope reduced:** this item delivers `app/continuum-core/dialog.js` and its test, focus-visible and reduced-motion CSS, AA colour tokens, and `docs/operations/ACCESSIBILITY_CHECKLIST.md` (template plus shell results). Markup fixes inside view files move to UI-008. **Files expected to change:** `app/css/tokens.css`, `app/css/app.css`, `index.html`, `tests/browser-suites.js`, plus the new files above. View files are not changed.
- **Capability group:** UI AND ACCESSIBILITY
- **Priority:** P1 · **Phase:** 2
- **Current classification:** PARTIAL (assessment §10: clickable divs, no focus traps, unmeasured contrast)
- **Evidence:** TARGET_ARCHITECTURE §28.
- **Exact problem:** Keyboard and assistive-technology use is unreliable.
- **Reason this matters:** Leadership audience and corporate accessibility expectations.
- **Target behaviour:**
  - `app/continuum-core/dialog.js` provides an accessible modal: focus trap, Escape to close, return focus to the opener, `aria-modal`.
  - All interactive elements in `app/views/**` are `<button>`, `<a>` or form controls.
  - Every view's tables use `<th scope>`.
  - `:focus-visible` styles exist, and `prefers-reduced-motion` disables transitions.
  - Text stays readable at 200 % zoom.
  - Colour tokens have a contrast ratio of at least 4.5:1.
  - `docs/operations/ACCESSIBILITY_CHECKLIST.md` records the manual results.
- **Smallest safe change:** Create `dialog.js`; adjust markup in the views and the CSS; write the checklist.
- **Explicit exclusions:** No redesign. No legacy changes.
- **Files expected to change:** `app/views/*.js`, `app/css/*.css`, `index.html`, `tests/browser-suites.js`; new `app/continuum-core/dialog.js`, `tests/unit/core-dialog.test.js`, `docs/operations/ACCESSIBILITY_CHECKLIST.md`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** All view renderers (markup only).
- **Dependencies:** UI-001 (and any UI items done before it).
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** Dialog focus-trap unit test. A static scan rule forbids `<div` with `data-action`. TEST-NODE, TEST-BROWSER.
- **Manual verification:** Keyboard-only walkthrough of every route in Edge. Narrator or VoiceOver reads the banner change. The DevTools contrast check is recorded in the checklist.
- **Acceptance criteria:** Tests pass. The checklist is complete with no "fail" left unexplained.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Checklist.
- **Continuity updates:** CONT-STD.

### UI-006: Present mode with privacy masking
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-22.** Where this note conflicts with the fields below, this note wins. **Explicit files** (replaces "`app/views/*.js`"): `app/views/overview.js`, `burndown.js`, `variance.js`, `po.js`, `invoices.js`, `expenses.js`, `resources.js`, `utilisation.js`, `chat.js`, `shell.js`. **Dependencies:** UI-008 (both edit every view; run serially).
- **Capability group:** UI AND ACCESSIBILITY
- **Priority:** P2 · **Phase:** 2
- **Current classification:** Absent
- **Evidence:** TARGET_ARCHITECTURE §29; DEC-006 (real names published, masking when presenting).
- **Exact problem:** Screen-sharing shows names and rates to wider audiences.
- **Reason this matters:** Safe presentation in meetings.
- **Target behaviour:**
  - A **Present** toggle (header button and `?present=1`) switches on `app/css/present.css`: a larger type scale and a high-contrast palette.
  - Masking via `CFE.views.mask(value, kind)` replaces person names with `<Role> #n`, and hides bill rates and employee IDs in all views and the chat.
  - The banner stays visible.
  - The preference is persisted.
- **Smallest safe change:** Create the mask helper and the CSS, and call the mask in the view renderers where names, rates or IDs are printed.
- **Explicit exclusions:** Exports are unaffected (they have their own option in ODO-001).
- **Files expected to change:** `app/views/*.js`, `app/views/shell.js`, `index.html`, `tests/browser-suites.js`; new `app/css/present.css`, `app/views/mask.js`, `tests/unit/views-mask.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** View renderers.
- **Dependencies:** UI-001 (and UI-002, UI-003 if done).
- **Prerequisite decisions:** DEC-006.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** One preference.
- **Security and privacy impact:** Reduces exposure when screen-sharing.
- **Automated tests:** With masking on, rendered markup contains no sample person names or rate values. TEST-NODE, TEST-BROWSER.
- **Manual verification:** Toggle Present on Resources: names are masked.
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, screenshot.
- **Continuity updates:** CONT-STD.

### FIX-001: Time-zone-safe working-day calculation
- **Capability group:** DATA AND STORAGE
- **Priority:** P1 · **Phase:** 2
- **Current classification:** BROKEN (C-01, verified in Node)
- **Evidence:**
  - `app/calc/calendar.js` `isWorkingDay` uses `getDay()` (local) on dates created at UTC midnight.
  - Month keys use `toLocaleString('en',{month:'short'})` and `getFullYear()` in local time (`app/calc/forecast.js`, `app/calc/actuals.js`).
  - The TST-003 golden files `*.tz-America_New_York.json` record the defect.
- **Exact problem:** West of UTC, Saturdays count as working days, Mondays do not, and the first day of each month falls into the previous month.
- **Reason this matters:** Forecasts are wrong for some users (Canada is a supported location).
- **Target behaviour:** All calendar and month derivations in `app/calc/**` use UTC accessors (`getUTCDay`, `getUTCFullYear`, `getUTCMonth`, `toLocaleString('en',{month:'short', timeZone:'UTC'})`). Results are identical in every time zone and equal to the London golden.
- **Smallest safe change:** Replace the accessors in `calendar.js`, `forecast.js` and `actuals.js` only. Delete the `*.tz-*` goldens and add a test asserting the London, New York and Kolkata outputs are equal.
- **Explicit exclusions:** No other logic. Legacy view code that derives month keys outside `app/calc` is unchanged (it will be removed in REP-003).
- **Files expected to change:** `app/calc/calendar.js`, `app/calc/forecast.js`, `app/calc/actuals.js`, `tests/golden/legacy/*.tz-*.json` (deleted), `tests/characterisation/legacy-calc.test.js`, `tests/README.md`.
- **Files that must not change:** MNC-STD (except the named goldens), `legacy/**`.
- **Functions, symbols or components likely affected:** `isWorkingDay`, `computeForecast`, `computeActualsMonthly`, `aggregateActualsByProject`.
- **Dependencies:** SRC-001, SRC-002 (and SRC-003).
- **Prerequisite decisions:** DEC-009 (fix moved ahead of strategy slice S7).
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** Published actuals computed before the fix may differ for publishers west of UTC (the owner is in the UK, so no change is expected). Record this in CHANGELOG.
- **Security and privacy impact:** None.
- **Automated tests:** `node tests/run-node.js --tz=America/New_York`, `--tz=Asia/Kolkata` and default all pass against the London goldens.
- **Manual verification:** Set the OS time zone to New York, open the new shell with sample data, and compare the forecast with London.
- **Acceptance criteria:** London goldens are unchanged. All time zones are equal.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Three runner outputs.
- **Continuity updates:** CONT-STD; mark C-01 fixed.

### FIX-002: Convert expenses to PO currency before totals
- **Capability group:** DATA AND STORAGE
- **Priority:** P1 · **Phase:** 2
- **Current classification:** PARTIAL (C-05, C-06)
- **Evidence:** Legacy `buildData` sums `e.amount` across currencies; `fxRateAsOf` returns 1 when the rate is missing.
- **Exact problem:** Totals mix currencies, and a missing FX rate silently becomes 1.
- **Reason this matters:** Correct remaining-budget figures.
- **Target behaviour:**
  - New `CFE.calc.fx.convert(amount, from, to, date, fxRates) → {value, rate, missing:boolean}` uses the strict lookup, `fxRateAsOfStrict`, which returns `null` when no rate exists.
  - New `CFE.calc.kpi.expenseTotal(expenses, poCurrency, fxRates) → {total, excluded:[…]}`.
  - The new shell uses it, and lists excluded expenses as "Needs confirmation: no FX rate for INR on 2026-03-01".
  - The legacy `fxRateAsOf` stays unchanged for legacy compatibility.
- **Smallest safe change:** Add the functions and use them in `overview.js` and `expenses.js`.
- **Explicit exclusions:** Do not change legacy behaviour or the PO normalisation logic.
- **Files expected to change:** `app/calc/fx.js`, `index.html` (script tag), `app/views/overview.js`, `app/views/expenses.js`, `tests/browser-suites.js`; new `app/calc/kpi.js`, `tests/unit/calc-kpi.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** New `convert`, `fxRateAsOfStrict`, `expenseTotal`.
- **Dependencies:** SRC-003, UI-002.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** On the multicurrency fixture, the total equals hand-computed values and a missing rate is excluded and reported. TEST-NODE, TEST-BROWSER.
- **Manual verification:** The sample multicurrency dataset shows the warning.
- **Acceptance criteria:** Tests pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD; mark C-05 and C-06 fixed (new shell).

### FIX-003: Apply overtime multipliers per PO team
- **Capability group:** DATA AND STORAGE
- **Priority:** P1 · **Phase:** 2
- **Current classification:** PARTIAL (C-02: `otMultiplier` ignores `poTeam`)
- **Evidence:** `app/calc/fx.js` `otMultiplier(otParams, poTeam, otType, asOfDate)`; OT rules have no team field (`DEFAULTS.ot_params`).
- **Exact problem:** Team-specific OT rates are impossible.
- **Reason this matters:** Correct actuals costs where contracts differ.
- **Target behaviour:**
  - OT rules may carry an optional `po_team` (dataset `ot_rules.ref` or `po_team_identifier`).
  - Matching prefers team-specific rules over global ones, with the latest effective date at or before the date.
  - Without team fields, results are identical to today.
- **Smallest safe change:** Change `otMultiplier`; add the optional field to the `ot-rules-v1` profile and the schema.
- **Explicit exclusions:** No other cost logic.
- **Files expected to change:** `app/calc/fx.js`, `app/data/mappings/ot-rules-v1.js`, `app/data/schema.js`, `docs/schema/DATASET_V1.md`, `tests/unit/calc-fx.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** `otMultiplier`.
- **Dependencies:** SRC-003.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** An optional field. Schema stays v1 (additive).
- **Security and privacy impact:** None.
- **Automated tests:** Goldens unchanged. A new team-specific test passes. TEST-NODE.
- **Manual verification:** None.
- **Acceptance criteria:** Tests pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### FIX-004: Correct "Forecast Accuracy" and utilisation labels
- **Capability group:** UI AND ACCESSIBILITY
- **Priority:** P1 · **Phase:** 2
- **Current classification:** PARTIAL (F-02, F-08)
- **Evidence:** Legacy `rOV` "Forecast Accuracy" = actuals ÷ full-period forecast; legacy utilisation hack `(reg+ot)*(hm===8?8:1)`.
- **Exact problem:** The metrics do not measure what their labels say.
- **Reason this matters:** Leaders act on these labels.
- **Target behaviour:**
  - New `CFE.calc.kpi.forecastToDate(burndown, lastActualMonth)`.
  - The Overview card is renamed "Actuals vs forecast to <Mon-YY>" and computes actuals to date divided by forecast to date.
  - The Utilisation view is titled "Recorded hours vs planned hours", with a footnote defining both.
- **Smallest safe change:** Add the function and change the two views' labels.
- **Explicit exclusions:** No other metric changes.
- **Files expected to change:** `app/calc/kpi.js`, `app/views/overview.js`, `app/views/utilisation.js`, `tests/unit/calc-kpi.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** As listed.
- **Dependencies:** UI-001, UI-003.
- **Prerequisite decisions:** DEC-022 (metric definitions).
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** `forecastToDate` cases. TEST-NODE.
- **Manual verification:** Read the labels in Edge.
- **Acceptance criteria:** Tests pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### PUB-001: Publish writer V1 (snapshot first; save-dialog or download transport)
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-12.** Where this note conflicts with the fields below, this note wins. **Owner evidence 2026-10-04:** Edge "Ask where to save each file before downloading" is disabled by policy, so downloads land in the default folder.
> - **Transport order:** `saveDialog` (`showSaveFilePicker`) is primary when available (BAS-002).
> - **`download` fallback:** its on-screen checklist must say "Files were saved to your Downloads folder. Move them into …", listing each file and its destination.
> - DEC-023 leans to `saveDialog`.
> - If BAS-002 shows directory write works, FINAL_EXECUTION_SEQUENCE pulls SPO-001 into Phase 2.
- **Capability group:** SHAREPOINT OUTPUT
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Absent
- **Evidence:** DATA_AND_STORAGE §6.1; ONEDRIVE_SHAREPOINT §5 V1/V2; ADR-005.
- **Exact problem:** A built dataset cannot reach viewers.
- **Reason this matters:** It closes the publisher-to-viewer loop.
- **Target behaviour:** `app/store/publisher.js` provides `CFE.store.publish({dataset, manifestDraft, reason}, transport)`. It:
  1. serialises canonically (`JSON.stringify`, escaping U+2028/U+2029);
  2. computes the SHA-256 and fills `manifest.payload_sha256`, `publication_id` (`<UTC>-<4 hex>`), `published_utc`, `publisher`, `app_version` and `publications[]` (previous + new, max 100);
  3. produces the files in this order: `history/<stamp>/dataset.json`, `history/<stamp>/manifest.json`, then `dataset.json`, `dataset.js`, then `manifest.json`, `manifest.js` last.

  Transports:
  - `saveDialog`: `showSaveFilePicker` per file, with the suggested name, in the order above.
  - `download`: anchor downloads in the same order, with an on-screen checklist "Save each file into `Continuum/Finance/published/` (history files into `published/history/<stamp>/`)".

  After the files are written, a **Verify publication** button reloads `published/manifest.js` and `published/dataset.js` and runs the STO-004 checks, showing green or red.
- **Smallest safe change:** Create `publisher.js`, the transport adapters in `app/continuum-core/folders.js` (save-dialog and download only), and the Publish button with the data-boundary notice in `publish.js`.
- **Explicit exclusions:** No directory handles (SPO-001). No Copilot packs (COP-001). No registry writes.
- **Files expected to change:** `app/views/publish.js`, `index.html` (script tags), `tests/browser-suites.js`; new `app/store/publisher.js`, `app/continuum-core/folders.js`, `tests/unit/store-publisher.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** New `CFE.store.publish`, `Continuum.folders.saveDialog`, `Continuum.folders.download`.
- **Dependencies:** IMP-005, STO-004.
- **Prerequisite decisions:** DEC-023 (V1 transport chosen from the BAS-002 OV-4 result: if `.js` downloads are blocked or warned, use `saveDialog` only).
- **External approvals:** None.
- **Data-boundary impact:** **Changes the boundary.** Files saved into the synced library are copied to SharePoint. The notice must be shown and acknowledged before the first file is written.
- **Storage or migration impact:** Creates the published v1 files and history.
- **Security and privacy impact:** The dataset contains names and aggregates (DEC-006). The `.js` wrapper holds plain JSON only (tested).
- **Automated tests:** File order; manifest last; a hash that verifies against the dataset; U+2028 escaping; the `.js` file evaluates to an object equal to the `.json` file. TEST-NODE, TEST-BROWSER.
- **Manual verification:**
  1. Publish the sample draft using each available transport into a local test folder.
  2. Open that folder's `index.html` copy: green banner.
  3. **UNVERIFIED until the owner tests:** the same into the real synced library.
- **Acceptance criteria:** Tests pass. Manual steps 1–2 pass. Step 3 is reported.
- **Rollback:** RB-STD. Data rollback via PUB-002.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, screenshot of a green verification.
- **Continuity updates:** CONT-STD.

### PUB-002: Publication history and rollback by republish
- **Capability group:** BACKUP AND RESTORE
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Absent
- **Evidence:** DATA_AND_STORAGE §6.2; ADR-011.
- **Exact problem:** Bad publications cannot be undone in the app.
- **Reason this matters:** Recoverable storage (charter).
- **Target behaviour:**
  - In `#/publish`, **History**:
    - the user selects `published/history` via `<input webkitdirectory>` (read-only);
    - the app lists snapshots (stamp, publisher, data as-of, counts, hash OK or not).
  - **Republish this snapshot** requires a reason (at least 10 characters), then runs PUB-001 with the snapshot's dataset and a new `publication_id`, with `publications[]` recording `{type:'rollback', from:<id>, reason}`.
  - Snapshots older than `historyKeep` are listed as "eligible for manual deletion". Nothing is deleted automatically.
- **Smallest safe change:** Add a history panel to `publish.js` and `app/store/history.js`.
- **Explicit exclusions:** No deletion. No editing of snapshots.
- **Files expected to change:** `app/views/publish.js`, `index.html`, `tests/browser-suites.js`; new `app/store/history.js`, `tests/unit/store-history.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** New `CFE.store.history`.
- **Dependencies:** PUB-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** Same as PUB-001.
- **Storage or migration impact:** History entries are immutable. Older-schema snapshots are migrated in memory before republish.
- **Security and privacy impact:** None.
- **Automated tests:** Listing; hash failure flagged; rollback manifest entry. TEST-NODE.
- **Manual verification:** Publish twice, roll back to the first, verify green, and check that the publications list shows the rollback.
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### ODO-001: Export dialog with data-boundary notice, provenance footer and naming (Excel, CSV)
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-22.** Where this note conflicts with the fields below, this note wins. **Explicit files** (replaces "`app/views/*.js` (Export buttons)"): `app/views/overview.js`, `burndown.js`, `po.js`, `invoices.js`, `expenses.js`, `resources.js`. Each gets one Export button that opens the dialog.
- **Capability group:** ONEDRIVE OUTPUT
- **Priority:** P1 · **Phase:** 2
- **Current classification:** PARTIAL (legacy exports have no notice, provenance or truncation notes; they always carry attribution)
- **Evidence:** Legacy `exportExcel`; ONEDRIVE_SHAREPOINT §5 V1; REL-001 preference.
- **Exact problem:** Exports leave the app without context or boundary awareness.
- **Reason this matters:** Exports are routinely saved to OneDrive and shared.
- **Target behaviour:**
  - `app/views/export-dialog.js` offers section checkboxes, format (Excel or CSV), "Include author attribution" (default from the preference), "Mask names" (default off; on when Present mode is active), and the data-boundary notice text.
  - `app/export/xlsx.js` and `app/export/csv.js` produce files named `<ref|Portfolio>_<report>_<data-as-of>_<pubid4>.<ext>`, with a provenance sheet or header lines (data as of, publication ID, app version, filters, truncation notes).
- **Smallest safe change:** Create the dialog and the two exporters.
- **Explicit exclusions:** PDF and PPTX (ODO-002). Copilot packs (COP-001).
- **Files expected to change:** `index.html`, `app/views/*.js` (Export buttons), `tests/browser-suites.js`; new `app/views/export-dialog.js`, `app/export/xlsx.js`, `app/export/csv.js`, `tests/unit/export-xlsx-csv.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** New export modules.
- **Dependencies:** UI-002, REL-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** The notice is shown before every export.
- **Storage or migration impact:** None.
- **Security and privacy impact:** The masking option is available. CSV values starting with `=+-@` are prefixed with `'` (formula-injection protection).
- **Automated tests:** The XLSX contains a provenance sheet; the CSV escapes quotes and blocks formula injection; the file name pattern holds. TEST-NODE.
- **Manual verification:** Export both formats and open them in Excel.
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### ODO-002: PDF and PowerPoint exports with provenance
- **Capability group:** ONEDRIVE OUTPUT
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Legacy WORKING (`exportPDF`, `exportPPTX`); new shell absent
- **Evidence:** Legacy `exportPDF`, `exportPPTX`. Assessment F-14: silent truncation at 40 and 20 rows.
- **Exact problem:** Leaders need PDF and PPTX from the new shell, with honest truncation and provenance.
- **Reason this matters:** Leadership reporting.
- **Target behaviour:**
  - `app/export/pdf.js` and `app/export/pptx.js` are ported from legacy.
  - The first page or slide carries provenance.
  - Every truncated table states "Showing n of m".
  - Attribution follows the dialog option.
  - Charts come from the on-screen canvases.
  - Both formats are offered in the export dialog.
- **Smallest safe change:** Port and adapt.
- **Explicit exclusions:** No new chart types.
- **Files expected to change:** `app/views/export-dialog.js`, `index.html` (vendor tags), `tests/browser-suites.js`; new `app/export/pdf.js`, `app/export/pptx.js`, `tests/unit/export-pdf-pptx.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** New modules.
- **Dependencies:** ODO-001, BLD-003.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** As in ODO-001.
- **Storage or migration impact:** None.
- **Security and privacy impact:** As in ODO-001.
- **Automated tests:** `vm` smoke tests produce non-empty output; the truncation note is present when rows exceed the limit. TEST-NODE.
- **Manual verification:** Open the PDF in Edge and the PPTX in PowerPoint.
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### ODI-001: Synced-folder input guidance and data-boundary notice
- **Capability group:** ONEDRIVE INPUT
- **Priority:** P1 · **Phase:** 2
- **Current classification:** PARTIAL (the generic picker works; no guidance or notice)
- **Evidence:** ONEDRIVE_SHAREPOINT §2–§3 V1.
- **Exact problem:** The publisher is not guided to keep raw dumps in a personal folder, and provenance lacks a source description.
- **Reason this matters:** It keeps raw personal data out of shared locations.
- **Target behaviour:**
  - The Publish view shows a help panel: "Keep PeopleSoft downloads in your personal OneDrive folder `Finance-Drop`; never in the shared Continuum library", with the bookmarklet steps.
  - Each file card has a "Source system" select (PeopleSoft / Manual / Other) and an "As-of date" field, pre-filled from the maximum data date where derivable. Both are stored in provenance.
- **Smallest safe change:** UI additions in `publish.js`; provenance fields already exist (IMP-002).
- **Explicit exclusions:** No folder handles. No path capture.
- **Files expected to change:** `app/views/publish.js`, `app/css/app.css`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** `CFE.views.publish`.
- **Dependencies:** IMP-004.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** Documents and reinforces the private-drop rule.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Positive.
- **Automated tests:** A render test for the help panel; provenance includes the `sourceSystem` and `asOf` values. TEST-NODE.
- **Manual verification:** Read the help panel.
- **Acceptance criteria:** Tests pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### SPI-001: Read the shared Continuum Registry folder; detect conflict copies
- **Capability group:** SHAREPOINT INPUT
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Absent
- **Evidence:** ADR-007; DATA_AND_STORAGE §2.3; ONEDRIVE_SHAREPOINT §2.
- **Exact problem:** Finance cannot use references created in other Continuum apps.
- **Reason this matters:** "Create once, recognised everywhere".
- **Target behaviour:**
  - In `#/publish`, **Load Registry** picks `Continuum/Registry/` via `<input webkitdirectory>` (works everywhere, read-only).
  - `app/store/registry.js` reads the `O-*.json` files, validates each against the `continuum.reference` v1 schema, and detects OneDrive conflict copies: a file name not equal to `<ref>.json` whose content `ref` duplicates another record. These are shown as **Needs confirmation**, with both files' modified times.
  - Valid records feed `buildDataset` as the authoritative reference source. Crosswalk records are used only for refs absent from the registry; differences are reported.
- **Smallest safe change:** Create the module, the panel and the merge in `build-dataset.js`.
- **Explicit exclusions:** No writing (REF-002). No persistent folder handle (V2).
- **Files expected to change:** `app/views/publish.js`, `app/store/build-dataset.js`, `index.html`, `tests/browser-suites.js`; new `app/store/registry.js`, `tests/unit/store-registry.test.js`, `tests/fixtures/registry/*.json` (synthetic).
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** New `CFE.store.registry`; `buildDataset`.
- **Dependencies:** REF-001, IMP-004 (and IMP-005).
- **Prerequisite decisions:** DEC-001, DEC-002.
- **External approvals:** None (SharePoint permissions are set by the site owner).
- **Data-boundary impact:** Reads a shared library the user has chosen.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Records are parsed as JSON only.
- **Automated tests:** Valid, invalid and conflict fixtures; registry-over-crosswalk precedence. TEST-NODE.
- **Manual verification:** Pick `tests/fixtures/registry` and check the panel.
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### REF-002: Create-once registry record and crosswalk mapping
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-09.** Where this note conflicts with the fields below, this note wins. **Owner decision 2026-10-04:** the **first** opportunity number entered at project creation is the primary and becomes the permanent reference. Numbers added later are linked (`opportunity_numbers[1..]`).
> - Remove the "mark primary" control and the workstream field.
> - Before saving a new record, show a confirmation: "This will become the permanent reference **<ref>**. It cannot be changed later." The user must type the reference again to confirm.
> - Adding further opportunity numbers to an existing record is allowed. Changing `ref` is not; only "Supersede with…" is offered.
- **Capability group:** DATA AND STORAGE
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Absent
- **Evidence:** DATA_AND_STORAGE §2.5; DEC-001, DEC-002.
- **Exact problem:** There is no way to create a reference or to link PeopleSoft IDs and PO teams to it.
- **Reason this matters:** Without links, imported rows remain unmatched.
- **Target behaviour:**
  - In `#/publish`, **References**:
    - **New reference** form: opportunity numbers (repeatable rows; one marked primary), name, client, optional workstream (only if DEC-011 allows).
    - The input is normalised. If it resolves against the loaded registry, the existing record is shown instead of creating a duplicate.
    - Otherwise a record is built with `Continuum.ref.recordFromForm` and saved as `<ref>.json` via `saveDialog` or download (instructions say: save into `Continuum/Registry/`).
  - **Link data**: lists unmatched PO teams and PeopleSoft project IDs from the draft, with suggested refs (same name tokens); choosing one updates the record's `links` and saves it the same way.
- **Smallest safe change:** Create `app/views/references.js` (a panel within Publish) and `app/store/registry-writer.js`.
- **Explicit exclusions:** No editing of the `ref` of an existing record. Corrections use `superseded_by` (a form "Supersede with…" is included).
- **Files expected to change:** `app/views/publish.js`, `index.html`, `tests/browser-suites.js`; new `app/views/references.js`, `app/store/registry-writer.js`, `tests/unit/store-registry-writer.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/continuum-core/ref.js`.
- **Functions, symbols or components likely affected:** New modules.
- **Dependencies:** SPI-001, PUB-001 (transports).
- **Prerequisite decisions:** DEC-001, DEC-002, DEC-011.
- **External approvals:** None.
- **Data-boundary impact:** Writes to the shared Registry. The notice is shown.
- **Storage or migration impact:** Registry record schema v1. Unknown fields are preserved on update.
- **Security and privacy impact:** Records contain no finance data.
- **Automated tests:** Duplicate prevention; a superseded record; unknown fields preserved; link suggestions. TEST-NODE.
- **Manual verification:** Create `O-0000003` into a test folder, reload the registry, and confirm it is found.
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### REF-003: Deep-link routing, paste-reference and not-found states
- **Capability group:** UI AND ACCESSIBILITY
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Absent
- **Evidence:** ONEDRIVE_SHAREPOINT §4; DEC-003 (Continuum is served from `http://localhost:8002`, so it cannot open `file://` links).
- **Exact problem:** There is no reference-scoped entry point and no handoff from Continuum.
- **Reason this matters:** Seamless handoff between Continuum apps.
- **Target behaviour:**
  - `#/ref/<input>` and `?ref=<input>`: the input is normalised and resolved against `dataset.references`. Outcomes:
    - **found**: the views are scoped to that ref, with a header showing name, client, ref and opportunity numbers;
    - **superseded**: a notice, then a redirect to the new ref;
    - **not-found**: "O-… is not in the published finance data (as of <date>)";
    - **invalid**: the format message.
  - The top bar has **Paste reference**, which reads the clipboard on click, falling back to a text field.
  - Each ref page has **Copy link to this page** (`location.href`) and **Copy reference**.
- **Smallest safe change:** Router and views changes, plus `app/views/ref-header.js`.
- **Explicit exclusions:** No Continuum changes (XREP-001). No registry lookups beyond the dataset.
- **Files expected to change:** `app/app.js`, `app/views/shell.js`, `app/views/filters.js`, `index.html`, `tests/browser-suites.js`; new `app/views/ref-header.js`, `tests/unit/app-ref-routing.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/continuum-core/ref.js`.
- **Functions, symbols or components likely affected:** `CFE.app.route`.
- **Dependencies:** REF-001, UI-001.
- **Prerequisite decisions:** DEC-003.
- **External approvals:** None.
- **Data-boundary impact:** Clipboard read only on user click.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Input is validated by `ref.js` before use.
- **Automated tests:** Routing table: found, alias, superseded, not-found, invalid. TEST-NODE, TEST-BROWSER.
- **Manual verification:**
  1. Open `index.html#/ref/O-0000001` with sample data.
  2. Paste `o 0000002` via Paste reference.
  3. **UNVERIFIED until the owner tests:** a link from another `file://` page (BAS-002 OV-2).
- **Acceptance criteria:** Tests and manual steps 1–2 pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### CHT-003: `AnswerProvider` interface and `none` provider
- **Capability group:** CHAT AND RETRIEVAL
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Absent (legacy modes are hard-wired; CH-09)
- **Evidence:** COPILOT_AND_CHAT §3.
- **Exact problem:** No provider boundary exists.
- **Reason this matters:** It keeps AI optional and replaceable.
- **Target behaviour:**
  - `app/chat/provider.js` defines `CFE.chat.providers.register(p)` and `.get(id)`, and validates providers (`id`, `displayName`, `kind`, `dataBoundary`, `isAvailable`, `answer`).
  - `app/chat/providers/none.js` implements the deterministic provider. Initially it supports only the "help" and "data freshness" intents and returns **Not found** otherwise.
  - `app/views/chat.js` is the chat panel: escaped rendering, scope line, provider name and `dataBoundary` text shown.
  - Only providers listed in `CFE.config.enabledProviders` appear.
- **Smallest safe change:** Create the three modules and add a header button to open the panel.
- **Explicit exclusions:** Other intents (CHT-004). Copilot handoff (COP-002).
- **Files expected to change:** `index.html`, `app/views/shell.js`, `app/css/app.css`, `tests/browser-suites.js`; new `app/chat/provider.js`, `app/chat/providers/none.js`, `app/views/chat.js`, `tests/unit/chat-provider.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** New modules.
- **Dependencies:** UI-001.
- **Prerequisite decisions:** ADR-012.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Escaped output; static scan.
- **Automated tests:** Registry validation; disabled providers are hidden; unknown questions return Not found with "searched" text. TEST-NODE, TEST-BROWSER.
- **Manual verification:** Ask "how fresh is the data?": the answer cites the manifest as-of.
- **Acceptance criteria:** Tests pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### CHT-004: Deterministic retrieval chat with labels, scope and citations
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-18.** Where this note conflicts with the fields below, this note wins. **Scope reduced:** this item delivers the intent framework, the answer shape, citations, the side panel, and the intents remaining-budget, burn-rate, forecast-vs-po and data-freshness. The other six intents, the keyword fallback and the ambiguity listing move to CHT-005. The "how much did R1 claim" test moves to CHT-005. Unmatched questions still return Not found.
- **Capability group:** CHAT AND RETRIEVAL
- **Priority:** P0 · **Phase:** 2
- **Current classification:** PARTIAL in legacy (CH-01: no citations or labels)
- **Evidence:** COPILOT_AND_CHAT §2; charter §9.
- **Exact problem:** Answers are not grounded or labelled.
- **Reason this matters:** Prevents fabricated answers (P0).
- **Target behaviour:**
  - `app/chat/intents.js` is a closed list. Each intent has `{id, patterns (anchored, word-boundary regexes), compute(scope, dataset) → answer}` and uses `CFE.calc`/`CFE.store.toCalcInput`.
  - Intents: remaining-budget, burn-rate, forecast-vs-po, actuals-for-month, invoices-by-status, expenses, person-allocation, po-validity, unmatched-data, data-freshness.
  - `app/chat/answer.js` defines the answer shape `{label:'Fact'|'Inference'|'Recommendation'|'Not found'|'Needs confirmation', statement, values:[{name, value, currency, citation}], citations:[{entity, key, src, publication_id}], scope, as_of}`.
  - Keyword fallback searches the names, roles, PO teams and invoice numbers of records within scope. If nothing is found, the answer is **Not found**, listing the intents tried and fields searched.
  - Citations render as links that open a record side panel.
  - Ambiguous names list the candidates.
  - Stale or migrated data or unmatched rows produce **Needs confirmation**.
- **Smallest safe change:** Create the two modules; `none.js` delegates to them; add the side panel in `chat.js`.
- **Explicit exclusions:** No AI, no network, no free-text generation.
- **Files expected to change:** `app/chat/providers/none.js`, `app/views/chat.js`, `index.html`, `tests/browser-suites.js`; new `app/chat/intents.js`, `app/chat/answer.js`, `tests/unit/chat-intents.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** New modules.
- **Dependencies:** CHT-003, IMP-005.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Present mode masking applies to chat output (UI-006, if done).
- **Automated tests:**
  - Every intent on the sample dataset returns values equal to the corresponding view's figures (same calc call).
  - Every value has a citation.
  - Unrelated questions give Not found.
  - "how much did R1 claim" routes to expenses, not budget.

  TEST-NODE, TEST-BROWSER.
- **Manual verification:** Ten scripted questions in `tests/manual/chat-questions.md`; record the answers.
- **Acceptance criteria:** Tests pass. No answer lacks a label or a scope line.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, manual question log.
- **Continuity updates:** CONT-STD.

### COP-001: Copilot fact packs (V1 package)
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-18.** Where this note conflicts with the fields below, this note wins. **Dependencies:** PUB-001 and CHT-005 (replaces CHT-004).
- **Capability group:** MICROSOFT 365 COPILOT
- **Priority:** P2 · **Phase:** 2
- **Current classification:** Absent
- **Evidence:** COPILOT_AND_CHAT §4 V1.
- **Exact problem:** There is no grounded artefact for Copilot.
- **Reason this matters:** It is the only Copilot path available without an API.
- **Target behaviour:**
  - `app/export/copilot-pack.js` provides `buildPack(ref, dataset) → {factsheetMd, factsheetHtml, factsJson, packManifest}`. The content follows COPILOT_AND_CHAT §4 V1: citation codes `[F1]…`, a Limitations section, a "Data as of" header and the fixed statement text.
  - The HTML has no scripts and inline-free CSS in a `<style>` block (a static document).
  - On a ref page, **Download Copilot pack** downloads `<ref>_factsheet_<asof>.md` and `.html`.
  - A Portfolio pack is available from `#/portfolio`.
- **Smallest safe change:** Create the module and the buttons.
- **Explicit exclusions:** No automatic writing into `published/copilot/` (needs SPO-001). No Copilot calls.
- **Files expected to change:** `app/views/ref-header.js`, `app/views/overview.js`, `index.html`, `tests/browser-suites.js`; new `app/export/copilot-pack.js`, `tests/unit/export-copilot-pack.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** New module.
- **Dependencies:** PUB-001, CHT-004.
- **Prerequisite decisions:** DEC-007.
- **External approvals:** None.
- **Data-boundary impact:** A download to a user-chosen location. The notice is shown.
- **Storage or migration impact:** None.
- **Security and privacy impact:** The pack includes names (DEC-006). A masking option is offered as in ODO-001.
- **Automated tests:** Every number in the fact sheet appears in `facts.json` with a citation; the HTML contains no `<script`. TEST-NODE.
- **Manual verification:** Open the `.html` in Edge and read it.
- **Acceptance criteria:** Tests pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, a sample pack generated from the sample data (not committed).
- **Continuity updates:** CONT-STD.

### COP-002: "Ask Copilot" handoff with Work-mode warning
- **Capability group:** MICROSOFT 365 COPILOT
- **Priority:** P2 · **Phase:** 2
- **Current classification:** PLACEHOLDER in legacy (iframe)
- **Evidence:** COPILOT_AND_CHAT §4 V1; owner Q5 (Copilot is the only external path, "if someone switches to Web mode"); DEC-007.
- **Exact problem:** There is no safe, explicit path to Copilot.
- **Reason this matters:** It uses the existing licence without automation.
- **Target behaviour:**
  - `app/chat/providers/copilot-handoff.js` (kind `user-mediated`) shows a dialog with:
    - the data-boundary text "You will paste this into Microsoft 365 Copilot inside your organisation";
    - a warning "**Use Work mode. Do not use Web mode**: Web mode may send parts of your question to Bing";
    - a preview of the exact text to be copied (prompt template from `app/chat/prompt-templates.js`, plus the fact sheet Markdown for the current scope);
    - **Copy to clipboard**;
    - **Open Copilot**, which opens `CFE.config.copilotUrl` in a new tab via `window.open`, only on click.
  - Nothing is sent by the app.
- **Smallest safe change:** Create the provider, the templates and the dialog. Add `copilotUrl` to `config.js` (the owner sets the value; default empty, which hides the Open button). Add an allowlist entry for the URL pattern in `tests/security/allowlist.json`, limited to `config.js`.
- **Explicit exclusions:** No reading of replies (COP-004). No iframe. No automation.
- **Files expected to change:** `app/config.js`, `app/views/chat.js`, `index.html`, `tests/security/allowlist.json`, `tests/browser-suites.js`; new `app/chat/providers/copilot-handoff.js`, `app/chat/prompt-templates.js`, `tests/unit/chat-copilot-handoff.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** New modules.
- **Dependencies:** COP-001, CHT-003.
- **Prerequisite decisions:** DEC-007; the owner supplies `copilotUrl` (CV-3).
- **External approvals:** None (existing licence).
- **Data-boundary impact:** **Device → Microsoft 365 tenant**, user-initiated and explicit. The Web-mode risk is called out.
- **Storage or migration impact:** None.
- **Security and privacy impact:** The clipboard is written only on click.
- **Automated tests:** The copied text equals the previewed text; the provider is hidden when not enabled; no network APIs are used (static scan). TEST-NODE.
- **Manual verification:** The owner copies a pack into Copilot in Work mode and confirms it answers with citation codes (CV-3).
- **Acceptance criteria:** Tests pass. The owner's manual check is recorded.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, owner note.
- **Continuity updates:** CONT-STD.

### PWA-001: Offline and degraded states for `file://` use
- **Capability group:** PWA AND OFFLINE
- **Priority:** P1 · **Phase:** 2
- **Current classification:** BROKEN in legacy (CDN dependency) / Absent in the new shell
- **Evidence:** ADR-002; TARGET §20; `calendarCoverage` (SRC-004).
- **Exact problem:** Degraded situations have no defined, user-understandable behaviour.
- **Reason this matters:** Dependable daily use offline and on managed laptops.
- **Target behaviour:**
  - `#/help` covers set-up, opening the app, what each banner level means, OneDrive "Always keep on this device", and that publishing needs Edge or Chrome.
  - The status inputs gain:
    - calendar coverage (amber "No holiday calendar for <year>: forecasts count holidays as working days");
    - a missing vendor library (red, naming the library);
    - a browser lacking publisher features (info in Publish only).
  - The app never needs a network.
- **Smallest safe change:** Add `app/views/help.js` and the extra status inputs.
- **Explicit exclusions:** No service worker (PWA-002).
- **Files expected to change:** `app/continuum-core/status.js`, `app/app.js`, `index.html`, `tests/unit/core-status.test.js`; new `app/views/help.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** `Continuum.status.compute`.
- **Dependencies:** STO-004.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** New status cases. TEST-NODE.
- **Manual verification:** Disconnect the network and open the app from the synced folder: it works. Rename `vendor/chart.js-*` temporarily: a red banner names it.
- **Acceptance criteria:** Tests and manual checks pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### REL-002: Release packaging and stale-version detection
- **Capability group:** RELEASE AND OPERATIONS
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Absent (no releases, changelog or version consistency)
- **Evidence:** TARGET §25; DEPENDENCY_BUILD_REGISTER §5.
- **Exact problem:** There is no controlled way to ship or roll back the app, and open tabs do not notice updates.
- **Reason this matters:** Controlled releases (charter).
- **Target behaviour:**
  - `tools/release/make-release.js` (Node, built-in modules only) copies `index.html`, `app/`, `vendor/`, `/LICENSE` and `CHANGELOG.md` into `dist/finance-<version>/`, writes `SHA256SUMS.txt`, and refuses to run if TEST-NODE fails or `CFE.version.app` does not match the CHANGELOG top entry.
  - `dist/` is git-ignored.
  - `CHANGELOG.md` is created.
  - `app/VERSION.js` sets `window.CFE_VERSION_FILE`.
  - On window focus, `app/app.js` re-injects `app/VERSION.js?check=<ms>` and `published/manifest.js?check=<ms>`. A changed version or `publication_id` shows a banner action "New version / new data available – Reload".
  - `tools/release/RELEASE_CHECKLIST.md` describes copying into `Continuum/Finance/releases/` and then over `Finance/`, and rolling back.
- **Smallest safe change:** As described.
- **Explicit exclusions:** No minification or bundling.
- **Files expected to change:** `app/VERSION.js`, `app/app.js`, `/.gitignore`; new `tools/release/make-release.js`, `tools/release/RELEASE_CHECKLIST.md`, `CHANGELOG.md`, `tests/unit/app-staleness.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** Boot and focus handler.
- **Dependencies:** SHL-003.
- **Prerequisite decisions:** DEC-024 (version numbering: new shell starts at 4.0.0).
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Checksums for release integrity.
- **Automated tests:** Staleness comparison logic; `make-release.js --dry-run` lists files. TEST-NODE.
- **Manual verification:** Build a release, copy it to a test folder, open it, bump the version in the copy, and refocus: the banner offers Reload.
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Release folder listing, `SHA256SUMS.txt`.
- **Continuity updates:** CONT-STD.

### DOC-002: Set-up, publish and rollback guides
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-13, V-14.** Where this note conflicts with the fields below, this note wins. **Dependencies:** add PWA-001 (this item edits `app/views/help.js`, which PWA-001 creates). **SETUP.md content:** describe syncing the **Files folder of the Teams channel** that hosts `Continuum/` (DEC-033), and note that Edge saves downloads to the default folder without asking (policy).
- **Capability group:** DOCUMENTATION
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Absent (README covers the Python server only)
- **Evidence:** TARGET §26; owner OD-3.
- **Exact problem:** Non-technical users have no instructions.
- **Reason this matters:** Leadership must self-serve.
- **Target behaviour:** Plain-language guides, each section with numbered steps and expected results:
  - `docs/operations/SETUP.md` (viewers; Windows and macOS; sync library, keep on device, open with Edge, favourite, banner meanings, deep links, Paste reference);
  - `PUBLISH.md` (owner; PeopleSoft bookmarklet into `Finance-Drop`, import, references, preview, publish, verify);
  - `ROLLBACK.md` (data snapshot republish; app release rollback);
  - `COPILOT.md` (handoff, Work-mode rule).
- **Smallest safe change:** Write the four files. Link them from `#/help` (text summary only).
- **Explicit exclusions:** No screenshots containing real data.
- **Files expected to change:** `app/views/help.js`; new `docs/operations/SETUP.md`, `PUBLISH.md`, `ROLLBACK.md`, `COPILOT.md`.
- **Files that must not change:** MNC-STD.
- **Functions, symbols or components likely affected:** None.
- **Dependencies:** PUB-002, REL-002.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** Documents the boundaries.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** None.
- **Manual verification:** A non-developer (or the owner acting as one) follows SETUP.md on a second laptop or profile.
- **Acceptance criteria:** The walkthrough succeeds without help. Gaps found are fixed in the same item.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Walkthrough notes.
- **Continuity updates:** CONT-STD.

### SRV-001: Retire `server.py`, Dockerfile and server-based start-up
- **Capability group:** BUILD AND STARTUP
- **Priority:** P1 · **Phase:** 2
- **Current classification:** WORKING (hardened by SEC-001) but superseded (ADR-003)
- **Evidence:** `server.py`, `Dockerfile`, the root README "Run finance-engine-v3.5".
- **Exact problem:** Two runtimes coexist. The server is not usable by leadership.
- **Reason this matters:** One coherent start-up path (charter §3).
- **Target behaviour:**
  - `server.py`, `Dockerfile` and `tests/server/` are removed.
  - The root README describes opening `index.html` and links to DOC-002.
  - `legacy/index.html` stays in the repository (until REP-003) for reference, with a top-of-file comment: "Legacy app. Requires the retired server; data must be migrated via backup → IMP-006."
- **Smallest safe change:** `git rm` the files; edit the README and the comment.
- **Explicit exclusions:** Do not remove `legacy/`. Do not touch the goldens.
- **Files expected to change:** `server.py`, `Dockerfile`, `tests/server/**` (deleted), `/README.md`, `legacy/index.html` (comment only).
- **Files that must not change:** MNC-STD, `app/**`.
- **Functions, symbols or components likely affected:** None.
- **Dependencies:** IMP-006, PUB-001, UI-003, DOC-002, and the owner's confirmation that their data is migrated and a final legacy backup is stored.
- **Prerequisite decisions:** DEC-025 (owner sign-off of the migration).
- **External approvals:** None.
- **Data-boundary impact:** Removes the local server boundary entirely.
- **Storage or migration impact:** **High risk.** The legacy browser data at `http://localhost:3005` becomes unreachable without the server. A final backup is mandatory.
- **Security and privacy impact:** Closes SEC-01, SEC-02, SEC-11 and SEC-16 permanently.
- **Automated tests:** TEST-NODE, TEST-BROWSER.
- **Manual verification:** A fresh clone; follow the README; the app opens with sample data copied to `published/`.
- **Acceptance criteria:** Tests pass. The owner's sign-off is recorded in DECISIONS.
- **Rollback:** `git revert` restores the server. The data was never deleted.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Sign-off, test output.
- **Continuity updates:** CONT-STD; update `SOURCE_OF_TRUTH.md` (start-up path).

### XREP-001: Continuum (project_onion): adopt the shared reference contract
- **Capability group:** DATA AND STORAGE
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Blocked by missing source code (the code lives in the separate repository `LoneWolfDen/project_onion`)
- **Evidence:**
  - project_onion `modules/experience-pwa/static/js/core/schema.js` `genProjectReferenceID` creates `Prefix-Opp-DDMMYYHHMMSS[-nn]`, which is time-based and conflicts with DEC-001.
  - The data dictionary uses `opportunity_numbers` as a list.
  - `constants/worldOfContinuum.js` points the Finance entry to a `*.app.github.dev` URL.
  - Continuum is served from `http://localhost:8002`.
- **Exact problem:** Continuum generates incompatible IDs and links to a Codespaces URL.
- **Reason this matters:** Without it, handoff is not seamless and the "create once" rule is broken.
- **Target behaviour:** (in project_onion)
  - Continuum loads a verbatim copy of `continuum-core/ref.js` (a classic script before its ES modules; it reads `window.Continuum.ref`).
  - New projects get `Project_ReferenceID = Continuum.ref.normalise(primary opportunity number).ref`.
  - Existing timestamp IDs are kept as `aliases`.
  - Continuum writes and reads `Continuum/Registry/<ref>.json` records.
  - The Finance entry in the World of Continuum footer becomes a **Copy reference + instructions** action (Continuum runs on `http://localhost`, which cannot open `file://` links).
- **Smallest safe change:** In this repository, only produce `docs/handoff/CONTINUUM_ADOPTION.md`, a self-contained task description for a separate project_onion session. It contains the contract, the files to copy, the test cases from `core-ref.test.js` and the data migration (timestamp ID → alias).
- **Explicit exclusions:** **No edits to project_onion from this repository.** No assumptions about Continuum's minified code. That repository needs its own assessment (charter prompts 01–05).
- **Files expected to change:** new `docs/handoff/CONTINUUM_ADOPTION.md`.
- **Files that must not change:** MNC-STD, `app/**`.
- **Functions, symbols or components likely affected:** None here. In project_onion: `genProjectReferenceID`, `WORLD_OF_CONTINUUM`.
- **Dependencies:** REF-001, DOC-001.
- **Prerequisite decisions:** DEC-001, DEC-002, DEC-003, DEC-004.
- **External approvals:** None.
- **Data-boundary impact:** It flags that the Continuum footer currently links to a public Codespaces URL (outside the tenant).
- **Storage or migration impact:** Continuum's existing IDs become aliases (no loss).
- **Security and privacy impact:** As above.
- **Automated tests:** None here.
- **Manual verification:** The owner reads the handoff document.
- **Acceptance criteria:** The document is complete enough for a model with no other context.
- **Rollback:** Delete the document.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** The document.
- **Continuity updates:** CONT-STD; add "project_onion assessment" to NEXT_ACTIONS as an external item.

---

# Phase 3: Assisted folder workflows, expanded formats, OneDrive and SharePoint V2, Copilot grounding V2

### ODI-002: Connected drop folder with Refresh and changed-file preview (V2)
- **Capability group:** ONEDRIVE INPUT
- **Priority:** P2 · **Phase:** 3
- **Current classification:** Absent
- **Evidence:** ONEDRIVE_SHAREPOINT §3 V2; OV-1 (BAS-002).
- **Exact problem:** The publisher must re-pick files each time.
- **Reason this matters:** Assisted refresh: one click after the bookmarklet download.
- **Target behaviour:**
  - **Connect drop folder** calls `showDirectoryPicker({mode:'read'})` and stores the handle in IndexedDB `handles` (STO-002).
  - Each session runs `queryPermission`. If not granted, a **Reconnect** button calls `requestPermission`.
  - **Refresh** lists the folder (non-recursive by default; a "Include subfolders" checkbox is explicit). For each file with an allowed extension it shows New / Changed / Unchanged / Missing, by SHA-256 against the last publication's provenance.
  - The selected files flow into IMP-004.
  - There is no polling.
  - In unsupported or blocked browsers, a one-line explanation appears and the V1 picker is shown.
- **Smallest safe change:** Extend `Continuum.folders` with `connect`, `reconnect` and `list`. Add a panel in `publish.js`.
- **Explicit exclusions:** No writing. No background scanning. Nothing outside the chosen folder.
- **Files expected to change:** `app/continuum-core/folders.js`, `app/views/publish.js`, `tests/browser-suites.js`; new `tests/unit/core-folders-list.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** `Continuum.folders`.
- **Dependencies:** IMP-004, BAS-002 (OV-1 PASS required; otherwise mark the item Blocked).
- **Prerequisite decisions:** DEC-026 (V2 enabled only if OV-1 and OV-6 pass).
- **External approvals:** None, unless Edge policy blocks the API (an IT request).
- **Data-boundary impact:** Reads only the chosen folder.
- **Storage or migration impact:** A stored handle.
- **Security and privacy impact:** No path disclosure. Names only.
- **Automated tests:** Change classification logic with fake handles. TEST-NODE.
- **Manual verification:** On the managed laptop: connect `Finance-Drop`, download a new PeopleSoft file, Refresh: shown as New.
- **Acceptance criteria:** Tests pass. The managed-laptop check is recorded.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, owner note.
- **Continuity updates:** CONT-STD.

### SPO-001: Direct write to `published/` through a folder handle (V2)
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-12.** Where this note conflicts with the fields below, this note wins. May be executed in Phase 2 immediately after PUB-001, if BAS-002 shows directory read/write and persisted handles work on the managed laptop (FINAL_EXECUTION_SEQUENCE step F2.4).
- **Capability group:** SHAREPOINT OUTPUT
- **Priority:** P2 · **Phase:** 3
- **Current classification:** Absent
- **Evidence:** ONEDRIVE_SHAREPOINT §5 V2; DATA_AND_STORAGE §6.1.
- **Exact problem:** V1 publishing needs several manual saves.
- **Reason this matters:** One-click, verified, conflict-aware publishing.
- **Target behaviour:**
  - **Connect Finance folder** uses `showDirectoryPicker({mode:'readwrite'})` and checks that it contains `index.html` and `published/`.
  - The publish transport `directory`:
    1. re-reads `published/manifest.json`. If its `publication_id` differs from the one at draft start, it stops and shows both (conflict).
    2. writes `history/<stamp>/*` and reads it back to verify the hash.
    3. writes `dataset.*`, then `manifest.*` last, each via `createWritable`.
    4. writes the Copilot packs for every ref into `published/copilot/<ref>/`.
  - Overwriting shows a confirmation with old and new publication IDs.
- **Smallest safe change:** Add a `directory` transport to `folders.js` and `publisher.js`, and a pack loop using COP-001.
- **Explicit exclusions:** No deletion of old snapshots.
- **Files expected to change:** `app/continuum-core/folders.js`, `app/store/publisher.js`, `app/views/publish.js`; new `tests/unit/store-publisher-directory.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** `CFE.store.publish`.
- **Dependencies:** PUB-001, BAS-002 (OV-1 write PASS), COP-001.
- **Prerequisite decisions:** DEC-026.
- **External approvals:** None (SharePoint write permission for the publisher).
- **Data-boundary impact:** As in PUB-001 (the notice is still shown).
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** Conflict detection; write order; read-back verification failure aborts before the current files are touched. TEST-NODE (fake handles).
- **Manual verification:** On the managed laptop: publish to the real library, then a viewer on another laptop sees the new as-of after sync.
- **Acceptance criteria:** Tests pass. A two-laptop check is recorded.
- **Rollback:** RB-STD. The V1 transport remains available.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, owner note.
- **Continuity updates:** CONT-STD.

### IMP-007: Multi-sheet XLSX and legacy `.xls` import
- **Capability group:** FILE IMPORT
- **Priority:** P2 · **Phase:** 3
- **Current classification:** PARTIAL (first sheet only; `.xls` accepted by legacy, untested)
- **Evidence:** Legacy `handleUpload` reads `wb.SheetNames[0]`; the legacy smart parser scans header rows.
- **Exact problem:** Workbooks with several sheets, or headers not on row 1, need manual preparation.
- **Reason this matters:** Fewer manual steps for PeopleSoft and "solution" Excel files.
- **Target behaviour:** The file card offers a sheet selector (all sheets with row counts) and a "Header row" number (auto-suggested by scanning the first 50 rows for the best profile match, as in legacy `parseSolutionExcel`). `.xls` is accepted via SheetJS.
- **Smallest safe change:** Extend `publish.js` and the mapping detection.
- **Explicit exclusions:** No merged-cell heuristics beyond the header-row choice.
- **Files expected to change:** `app/views/publish.js`, `app/data/mapping.js`, `tests/fixtures/xlsx/multi-sheet.xlsx` (new, synthetic), `tests/unit/data-mapping.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** `CFE.data.mapping.detect`.
- **Dependencies:** IMP-004, BLD-002.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Patched SheetJS (BLD-002).
- **Automated tests:** Header-row detection on the fixture. TEST-NODE.
- **Manual verification:** Import a multi-sheet workbook.
- **Acceptance criteria:** Tests pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### COP-003: Agent Builder instructions and set-up guide (Copilot V2)
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-13.** Where this note conflicts with the fields below, this note wins. **Owner evidence 2026-10-04:** Agent Builder → Add content accepts **Teams channel folders**, not SharePoint links. The knowledge source is therefore the `published/copilot/` folder inside the Teams channel Files that hosts `Continuum/` (DEC-033). If `Continuum/` is not in a Teams channel, the publisher copies the packs into a channel folder (documented step). Sharing of the agent remains unverified (CV-1).
- **Capability group:** MICROSOFT 365 COPILOT
- **Priority:** P3 · **Phase:** 3
- **Current classification:** Absent
- **Evidence:** COPILOT_AND_CHAT §4 V2; owner Q3.1 (share, or users build their own); CV-1, CV-2, CV-4 unverified.
- **Exact problem:** No reproducible agent definition exists.
- **Reason this matters:** It lets leaders ask Copilot directly, grounded on published packs.
- **Target behaviour:**
  - `copilot/AGENT_INSTRUCTIONS.md`: exact instruction text per COPILOT_AND_CHAT §4 V2 (answer only from fact sheets; quote citation codes and data-as-of; "Not found in published finance data"; label assumptions; never present projections as facts; Work mode only).
  - `copilot/AGENT_SETUP.md`: click-by-click steps to create the agent with knowledge set to the `Continuum/Finance/published/copilot/` folder URL; how to share it, or how each user recreates it; 5 starter prompts; how to verify with three test questions with known answers from the sample pack.
  - `copilot/PACK_SCHEMA.md` records the pack version the instructions expect.
- **Smallest safe change:** Write the three documents. The owner runs the validation and records the CV-1, CV-2 and CV-4 results.
- **Explicit exclusions:** No code. No Copilot Studio. No connectors.
- **Files expected to change:** new `copilot/AGENT_INSTRUCTIONS.md`, `copilot/AGENT_SETUP.md`, `copilot/PACK_SCHEMA.md`.
- **Files that must not change:** MNC-STD, `app/**`.
- **Functions, symbols or components likely affected:** None.
- **Dependencies:** COP-001 (packs exist; ideally SPO-001 so the folder is populated).
- **Prerequisite decisions:** DEC-012 (shared vs per-user, from CV-1).
- **External approvals:** **Tenant must allow Agent Builder with SharePoint knowledge** (and sharing, for the shared option).
- **Data-boundary impact:** The agent reads tenant files under existing permissions. No new boundary.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Sharing an agent does not grant file access (documented).
- **Automated tests:** None.
- **Manual verification:** The owner builds the agent per the guide and asks the three verification questions. The answers cite the codes.
- **Acceptance criteria:** CV-1 and CV-2 results are recorded. The verification questions are answered correctly or the gaps are documented.
- **Rollback:** Delete the agent (Copilot UI); revert the docs.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Owner validation notes.
- **Continuity updates:** CONT-STD; record CV results in DECISIONS.

### COP-004: Store pasted Copilot replies as Draft notes
- **Capability group:** MICROSOFT 365 COPILOT
- **Priority:** P2 · **Phase:** 3
- **Current classification:** Absent
- **Evidence:** COPILOT_AND_CHAT §3 (Draft notes).
- **Exact problem:** Useful Copilot text has nowhere safe to live, and could be mistaken for fact.
- **Reason this matters:** It keeps Copilot output clearly labelled.
- **Target behaviour:**
  - On a ref page, **Add Copilot draft** opens a paste box.
  - The text is saved locally (IndexedDB `notes`) as `{ref, text, created_utc, label:'Draft (from Copilot)', publication_id}`.
  - It is rendered as plain text with a grey "Draft – not verified" badge.
  - Drafts are never used in calculations or chat facts.
  - Export and import of notes use JSON.
- **Smallest safe change:** Add `app/store/notes.js` and a panel in `ref-header.js`.
- **Explicit exclusions:** No sharing of notes via `published/` (a future decision).
- **Files expected to change:** `app/views/ref-header.js`, `index.html`, `tests/browser-suites.js`; new `app/store/notes.js`, `tests/unit/store-notes.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`.
- **Functions, symbols or components likely affected:** New module.
- **Dependencies:** COP-002.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None (local).
- **Storage or migration impact:** New store `notes` (v1).
- **Security and privacy impact:** Rendered via `textContent`.
- **Automated tests:** Labels persist; chat intents ignore notes. TEST-NODE.
- **Manual verification:** Paste text and reload: it is shown as Draft.
- **Acceptance criteria:** Tests pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### REP-003: Remove legacy app, demo defaults, PIN, Ollama and iframe
> **Amended 2026-10-04 by `BACKLOG_VALIDATION.md` V-18.** Where this note conflicts with the fields below, this note wins. **Dependencies:** add CHT-005.
- **Capability group:** REPOSITORY CLEANUP
- **Priority:** P2 · **Phase:** 3
- **Current classification:** Superseded (legacy kept for rollback)
- **Evidence:** MINIFIED_CODE_MIGRATION_STRATEGY §4 S7 and §6 done criteria.
- **Exact problem:** Two UIs remain. The legacy app contains the PIN, `DEFAULTS`, the Ollama mode and the iframe.
- **Reason this matters:** One coherent application.
- **Target behaviour:**
  - `legacy/` is deleted.
  - Characterisation tests that load the legacy sandbox are converted to run against `app/calc/**` with the same goldens (already equivalent after SRC-*), or are deleted where a module test covers the same golden.
  - `tests/support/legacy-sandbox.js` is deleted.
  - Everything under `vendor/` not used by `index.html` is removed.
  - The root README is updated.
- **Smallest safe change:** As described.
- **Explicit exclusions:** No goldens changed.
- **Files expected to change:** `legacy/**` (deleted), `tests/characterisation/**`, `tests/support/legacy-sandbox.js` (deleted), `vendor/**` (unused only), `vendor/VENDOR.md`, `/README.md`.
- **Files that must not change:** `app/**`, `tests/golden/**`.
- **Functions, symbols or components likely affected:** None in the app.
- **Dependencies:** SRV-001, UI-004, CHT-004, DOC-002, and an owner parity sign-off (all legacy tabs have equivalents or were consciously dropped; list them).
- **Prerequisite decisions:** DEC-027 (parity sign-off).
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None. The legacy data was migrated (SRV-001 prerequisite).
- **Security and privacy impact:** Removes SEC-08 (PIN), SEC-09 and SEC-10 code.
- **Automated tests:** TEST-NODE, TEST-BROWSER, static scan.
- **Manual verification:** A fresh clone; the full SETUP.md walkthrough.
- **Acceptance criteria:** Tests pass. `git grep -n "MASTER_PIN\|copilotIframe\|api/chat"` returns nothing.
- **Rollback:** `git revert`. The previous release folder still contains the legacy app.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, grep output.
- **Continuity updates:** CONT-STD; update `SOURCE_OF_TRUTH.md`.

---

# Phase 4: Approved Graph, Copilot APIs or agent path (only after governance decisions)

### PWA-002: Dormant manifest and service worker gated on HTTPS, with kill-switch
- **Capability group:** PWA AND OFFLINE
- **Priority:** P3 · **Phase:** 4
- **Current classification:** Absent (by design under `file://`; ADR-002)
- **Evidence:** TARGET §18–§19.
- **Exact problem:** If an approved HTTPS host appears, installability and offline caching are missing.
- **Reason this matters:** It is the future installable PWA.
- **Target behaviour:**
  - `manifest.webmanifest` and `app/icons/*` (the app's own icons).
  - `sw.js` precaches the app shell and vendor files under a cache named with the app version, and never caches `published/`.
  - Registration happens only when `location.protocol === 'https:'` and `CFE.config.enableServiceWorker === true`.
  - Kill-switch: when the flag is false, existing workers are unregistered and their caches deleted on load.
- **Smallest safe change:** As described, with tests of the gating logic.
- **Explicit exclusions:** No hosting work.
- **Files expected to change:** `index.html`, `app/app.js`, `app/config.js`; new `manifest.webmanifest`, `sw.js`, `app/icons/*`, `tests/unit/app-sw-gating.test.js`.
- **Files that must not change:** MNC-STD.
- **Functions, symbols or components likely affected:** Boot.
- **Dependencies:** DEC-015 (an approved HTTPS origin exists).
- **Prerequisite decisions:** DEC-015.
- **External approvals:** **IT approval for hosting.**
- **Data-boundary impact:** Hosting introduces a device ↔ host boundary. It must be recorded at that time.
- **Storage or migration impact:** Cache storage.
- **Security and privacy impact:** The service-worker scope must be limited to the app path.
- **Automated tests:** Gating and kill-switch logic. TEST-NODE.
- **Manual verification:** On the HTTPS host: install, go offline, update and kill-switch.
- **Acceptance criteria:** Tests pass. The manual sequence is recorded.
- **Rollback:** Set the kill-switch flag to false and release.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, owner notes.
- **Continuity updates:** CONT-STD.

### GRF-001: Microsoft Graph and File Picker integration decision record
- **Capability group:** MICROSOFT GRAPH
- **Priority:** P3 · **Phase:** 4
- **Current classification:** Absent (ADR-014 defers it)
- **Evidence:** ONEDRIVE_SHAREPOINT §3 V3 and §5 V3.
- **Exact problem:** No approved basis for Graph access exists.
- **Reason this matters:** It prevents premature integration.
- **Target behaviour:** `docs/architecture/GRAPH_DECISION_RECORD.md` records:
  - the HTTPS origin;
  - the Entra SPA registration (owner, ID placeholder);
  - delegated scopes requested (least privilege) and the admin-consent outcome;
  - the conditional access impact;
  - retention and audit (Purview);
  - revocation;
  - operational owner;
  - a go/no-go decision.

  No code.
- **Smallest safe change:** Write the record from the IT answers.
- **Explicit exclusions:** No MSAL vendoring. No Graph calls.
- **Files expected to change:** new `docs/architecture/GRAPH_DECISION_RECORD.md`.
- **Files that must not change:** `app/**`.
- **Functions, symbols or components likely affected:** None.
- **Dependencies:** DEC-015; admin approval.
- **Prerequisite decisions:** DEC-015, DEC-028 (pursue Graph at all).
- **External approvals:** **Entra app registration, admin consent, IT security review.**
- **Data-boundary impact:** Would add a device ↔ Graph boundary. To be recorded.
- **Storage or migration impact:** None.
- **Security and privacy impact:** To be recorded.
- **Automated tests:** None.
- **Manual verification:** IT review.
- **Acceptance criteria:** The record is complete with a go/no-go decision.
- **Rollback:** n/a.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** The record.
- **Continuity updates:** CONT-STD.

### COP-005: Copilot Studio / connector / API evaluation record
- **Capability group:** MICROSOFT 365 COPILOT
- **Priority:** P3 · **Phase:** 4
- **Current classification:** Absent
- **Evidence:** COPILOT_AND_CHAT §4 V3 (prerequisite list).
- **Exact problem:** No evidence exists for licensing, preview status or tenant policy of V3 options.
- **Reason this matters:** It prevents building on assumptions.
- **Target behaviour:** `docs/architecture/COPILOT_V3_EVALUATION.md` has one table row per option (Copilot Studio agent with actions, Graph connector, Azure AI Foundry, Microsoft 365 Copilot APIs), with: licensing, preview or GA status, app registration, permissions, admin consent, hosting, data boundary, tenant policy, operational owner, audit/retention, cost, and a recommendation.
- **Smallest safe change:** Write the document from tenant evidence gathered by the owner, with sources and dates for each fact.
- **Explicit exclusions:** No implementation.
- **Files expected to change:** new `docs/architecture/COPILOT_V3_EVALUATION.md`.
- **Files that must not change:** `app/**`.
- **Functions, symbols or components likely affected:** None.
- **Dependencies:** COP-003; tenant evidence.
- **Prerequisite decisions:** DEC-029 (whether V2 is insufficient).
- **External approvals:** **Tenant admin information.**
- **Data-boundary impact:** To be evaluated per option.
- **Storage or migration impact:** None.
- **Security and privacy impact:** To be evaluated.
- **Automated tests:** None.
- **Manual verification:** Owner and IT review.
- **Acceptance criteria:** Every cell is filled or marked "unknown – asked <who> on <date>".
- **Rollback:** n/a.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** The document.
- **Continuity updates:** CONT-STD.

---

# Items added by backlog validation (2026-10-04)

These items were split out of larger items (see `BACKLOG_VALIDATION.md`). They follow the same rules.

### BLD-004: Safe static file serving in the legacy server
- **Capability group:** BUILD AND STARTUP
- **Priority:** P0 · **Phase:** 0
- **Current classification:** Absent (`server.py:91-97` returns `index.html` for every non-API path)
- **Evidence:** `server.py` `Handler.do_GET`. Split from BLD-001 (V-01).
- **Exact problem:** The legacy server cannot serve `vendor/` or `app/` files, which blocks vendoring and module extraction for users who run the app through `server.py`.
- **Reason this matters:** It is a prerequisite for BLD-001, SEC-002 and SRC-*.
- **Target behaviour:**
  - GET paths matching `^/(vendor|app)/[A-Za-z0-9._/-]+\.(js|css|json)$`, with no `..` segment after URL-decoding, resolved with `Path.resolve()` and inside `BASE_DIR/vendor` or `BASE_DIR/app`, are served with the content type from a fixed map (`.js` → `text/javascript`, `.css` → `text/css`, `.json` → `application/json`) and `Cache-Control: no-cache`.
  - A missing or disallowed path returns 404.
  - All other non-API paths still return the HTML file.
- **Smallest safe change:** Add `Handler._serve_static` and call it from `do_GET` before the HTML fallback. Add `tests/server/test_static.py`. Add `COPY app ./app` and `COPY vendor ./vendor` to the `Dockerfile`, guarded so the build does not fail if a folder is absent: create empty `app/.keep` and `vendor/.keep` files.
- **Explicit exclusions:** No directory listing. No other extensions. No change to API routes or headers from SEC-001.
- **Files expected to change:** `server.py`, `Dockerfile`; new `tests/server/test_static.py`, `app/.keep`, `vendor/.keep`.
- **Files that must not change:** MNC-STD, `index.html`.
- **Functions, symbols or components likely affected:** `Handler.do_GET`, new `Handler._serve_static`.
- **Dependencies:** SEC-001.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None. The origin is unchanged.
- **Security and privacy impact:** Path-traversal guard. Only two folders are exposed.
- **Automated tests:** TEST-SERVER plus `test_static.py`:
  - a temporary file `vendor/_t.js` → 200 `text/javascript`;
  - `/vendor/../server.py` → 404;
  - `/vendor/%2e%2e/server.py` → 404;
  - `/app/missing.js` → 404;
  - `/vendor/x.py` → 404;
  - `/anything` → HTML.
- **Manual verification:** `python3 server.py`, then open `http://localhost:3005/vendor/.keep`: 404 (disallowed extension). The app still loads.
- **Acceptance criteria:** All tests pass. The app behaves as before.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### TST-004: Legacy sandbox for characterisation tests
- **Capability group:** TESTING
- **Priority:** P0 · **Phase:** 0
- **Current classification:** Absent
- **Evidence:** Split from TST-001 (V-03). The legacy logic is inline in `index.html` (`<script>` blocks at lines 108–2149 and 2158–2278 as of `5d453d1`).
- **Exact problem:** Legacy functions cannot be called from tests.
- **Reason this matters:** It is a prerequisite for TST-003 goldens.
- **Target behaviour:** `tests/support/legacy-sandbox.js` (Node only) exports `loadLegacy({htmlPath='index.html', now='2026-10-01T12:00:00Z', protocol='http:'})`. It:
  1. Reads the HTML.
  2. Executes, in document order, every inline `<script>` without `src`, plus every `<script src>` whose path starts with `app/` (read from disk). Other `src` scripts are skipped.
  3. Uses one `vm` context with stubs:
     - `document`: `getElementById` returns inert element objects with `innerHTML`, `value`, `classList`, `style`, `addEventListener`, `querySelector`, `insertAdjacentHTML`; `querySelectorAll` returns `[]`; `createElement` returns an inert element; `body.appendChild` is a no-op.
     - `window` = the context, and `location.protocol` = the `protocol` option.
     - `localStorage`: in-memory.
     - `fetch`: returns a rejected Promise.
     - `setTimeout`: no-op.
     - `Chart`: `{register(){}, defaults:{plugins:{}}}`; `ChartDataLabels: {}`; `XLSX`, `jspdf`, `PptxGenJS` stubs.
     - `confirm` and `prompt`: configurable.
     - `toast`: captures messages.
  4. Replaces the context `Date` with a subclass where `new Date()` and `Date.now()` return `now`, while `new Date(x)` behaves normally.

  It returns `{ctx, get(name), set(name, value), toasts}`, where `get` uses `vm.runInContext(name, ctx)` so `const` bindings such as `DEFAULTS` are readable.
- **Smallest safe change:** Create the sandbox and `tests/characterisation/legacy-smoke.test.js`.
- **Explicit exclusions:** No legacy code changes.
- **Files expected to change:** new `tests/support/legacy-sandbox.js`, `tests/characterisation/legacy-smoke.test.js`.
- **Files that must not change:** MNC-STD, `index.html`, `server.py`.
- **Functions, symbols or components likely affected:** New `loadLegacy`.
- **Dependencies:** TST-001.
- **Prerequisite decisions:** DEC-014.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** The smoke test: `typeof get("computeForecast") === "function"`; `get("DEFAULTS").po_details.length === 1`; `new Date()` inside the context equals `now`. TEST-NODE.
- **Manual verification:** None.
- **Acceptance criteria:** Tests pass. Loading the sandbox twice yields independent contexts.
- **Rollback:** Delete the new files.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### SHL-004: Relocate the legacy app to `legacy/` without changing its origin
- **Capability group:** HUMAN-READABLE SOURCE
- **Priority:** P1 · **Phase:** 1
- **Current classification:** n/a (preparatory move)
- **Evidence:** Split from SHL-001 (V-16). R-15 (legacy browser data lives per origin). V-05: the owner also opens copies via `file://`.
- **Exact problem:** The root `index.html` must become the new shell, while the legacy app stays usable with its existing data.
- **Reason this matters:** It keeps the legacy app working during migration.
- **Target behaviour:**
  - `index.html` moves to `legacy/index.html`. Its `src` paths become `../vendor/…` and `../app/…`.
  - `server.py` `HTML_FILE` = `BASE_DIR/"legacy"/"index.html"`, so `http://localhost:3005/` serves the legacy app on the same origin.
  - The root `index.html` becomes a static placeholder (no script) with the text "Finance Engine – new app under construction" and a link to `legacy/index.html`.
  - The `Dockerfile` copies `legacy/`.
  - `tests/support/legacy-sandbox.js` defaults `htmlPath` to `legacy/index.html`, and resolves `app/` paths relative to the repository app root.
- **Smallest safe change:** `git mv`, the path edits and the defaults described.
- **Explicit exclusions:** No logic changes. No new shell code (SHL-001).
- **Files expected to change:** `legacy/index.html` (moved; path edits only), `index.html` (new placeholder), `server.py`, `Dockerfile`, `tests/support/legacy-sandbox.js`.
- **Files that must not change:** MNC-STD, `app/**`.
- **Functions, symbols or components likely affected:** `HTML_FILE`; `loadLegacy`.
- **Dependencies:** SRC-003, SEC-004, BAK-001.
- **Prerequisite decisions:** DEC-008.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** **High risk (HR-3).** Before starting, the owner exports a BAK-001 backup from every origin in use (V-05). Users who open the file directly will now open `legacy/index.html`. Whether `file://` storage is shared across paths is unverified (BAS-002); the backup is the safeguard.
- **Security and privacy impact:** None.
- **Automated tests:** TEST-NODE (goldens unchanged); TEST-SERVER (GET `/` returns the legacy page; vendor and app files load).
- **Manual verification:**
  1. `http://localhost:3005` shows the existing data.
  2. Open `legacy/index.html` via `file://`: it works, and note whether the earlier `file://` data is visible.
- **Acceptance criteria:** Tests pass. Manual step 1 shows the same KPIs as the pre-move backup. Step 2 is reported.
- **Rollback:** RB-STD (`git mv` back).
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, KPI comparison.
- **Continuity updates:** CONT-STD; record "Legacy app file is now `legacy/index.html`" in `PROJECT_STATE.md`.

### IMP-008: Persist the import draft (IndexedDB) with quota handling
- **Capability group:** FILE IMPORT
- **Priority:** P1 · **Phase:** 1
- **Current classification:** Absent
- **Evidence:** Split from IMP-004 (V-17). DATA_AND_STORAGE §4.
- **Exact problem:** Previewed imports are lost on reload, and quota failures must be visible.
- **Reason this matters:** Reliable publisher workflow.
- **Target behaviour:**
  - `app/store/draft.js` provides `CFE.store.draft.{save(draft), load(), discard()}` over `Continuum.storage.db('finance', ['drafts'])`. The draft shape is `{schema_version:1, files:[provenance], records:{entity:[…]}}`.
  - `publish.js` gains **Keep in draft**, **Discard draft** and a banner "Draft from <time> restored" on load.
  - A quota failure shows an error and offers **Save draft to file** (a JSON download with `schema_version` and `sha256`) and **Load draft from file**.
- **Smallest safe change:** Create the module and add the buttons.
- **Explicit exclusions:** No dataset building (IMP-005).
- **Files expected to change:** `app/views/publish.js`, `index.html` (script tag), `tests/browser-suites.js`; new `app/store/draft.js`, `tests/unit/store-draft.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** New `CFE.store.draft`.
- **Dependencies:** IMP-004, STO-002.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** Local browser storage only. A draft file goes wherever the user saves it.
- **Storage or migration impact:** New store `drafts` (schema v1).
- **Security and privacy impact:** Drafts contain raw rows; the Discard control is prominent.
- **Automated tests:** Round trip; quota error path (fake IndexedDB throws); file export/import with a hash. TEST-NODE, TEST-BROWSER.
- **Manual verification:** Keep in draft, reload (restored), discard (gone).
- **Acceptance criteria:** Tests and manual check pass.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### UI-007: Dataset-to-calculation adapter with golden equivalence
- **Capability group:** DATA AND STORAGE
- **Priority:** P1 · **Phase:** 2
- **Current classification:** Absent
- **Evidence:** Split from UI-001 (V-15). The calc functions expect the legacy config shape (`po_details`, `resources`, `fx_rates`, `ot_params`, `expenses`, `actuals_monthly`).
- **Exact problem:** Views need calc inputs built from dataset v1. A wrong mapping silently changes leadership figures.
- **Reason this matters:** It is the single correctness bridge between publication and figures.
- **Target behaviour:** `app/store/legacy-cfg-adapter.js` provides `CFE.store.toCalcInput(dataset, {ref, year, poTeams}) → cfg`. Its field mapping is documented in a comment table (dataset field → legacy field). `actuals_monthly` is built from the `actuals` aggregates in month order.
- **Smallest safe change:** Create the adapter. Create `tests/unit/store-adapter.test.js`, which builds the sample dataset from the same fixture used by TST-003 and asserts that the `CFE.calc` outputs from `toCalcInput` equal the legacy goldens (tolerance 0.005).
- **Explicit exclusions:** No views.
- **Files expected to change:** `index.html` (script tag), `tests/browser-suites.js`; new `app/store/legacy-cfg-adapter.js`, `tests/unit/store-adapter.test.js`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** New `CFE.store.toCalcInput`.
- **Dependencies:** STO-004, SRC-003.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** As above. TEST-NODE, TEST-BROWSER.
- **Manual verification:** None.
- **Acceptance criteria:** Equivalence tests pass for every golden fixture that has a dataset equivalent. The mapping table is complete.
- **Rollback:** Delete the new files.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output.
- **Continuity updates:** CONT-STD.

### UI-008: Accessible markup in every view
- **Capability group:** UI AND ACCESSIBILITY
- **Priority:** P1 · **Phase:** 2
- **Current classification:** PARTIAL
- **Evidence:** Split from UI-005 (V-19). TARGET §28.
- **Exact problem:** View markup may use clickable non-buttons, tables without `scope`, and modals not using the accessible dialog.
- **Reason this matters:** Keyboard and screen-reader use.
- **Target behaviour:** In `app/views/overview.js`, `burndown.js`, `variance.js`, `po.js`, `invoices.js`, `expenses.js`, `resources.js`, `utilisation.js`, `chat.js`, `publish.js`, `diagnostics.js` and `about.js`:
  - every interactive element is a `<button>`, `<a href>` or form control;
  - every table header has `scope`;
  - collapsible groups use `aria-expanded`;
  - every modal uses `Continuum.dialog`.

  A static-scan rule fails on `<div` or `<span` carrying `data-action`.
- **Smallest safe change:** Edit the markup only, view by view, in one item. If the diff exceeds about 400 lines, stop after half the views and report Partial.
- **Explicit exclusions:** No visual redesign.
- **Files expected to change:** The view files listed, `tests/security/static-scan.test.js`, `docs/operations/ACCESSIBILITY_CHECKLIST.md`.
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** View renderers (markup only).
- **Dependencies:** UI-005, UI-002, UI-003.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** None.
- **Automated tests:** The static-scan rule. TEST-NODE, TEST-BROWSER.
- **Manual verification:** Keyboard-only walkthrough of every route. Record the results in the checklist.
- **Acceptance criteria:** The scan passes. The checklist has no unexplained failures.
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Checklist.
- **Continuity updates:** CONT-STD.

### CHT-005: Remaining chat intents, keyword fallback and ambiguity handling
- **Capability group:** CHAT AND RETRIEVAL
- **Priority:** P0 · **Phase:** 2
- **Current classification:** Absent
- **Evidence:** Split from CHT-004 (V-18). COPILOT_AND_CHAT §2.1.
- **Exact problem:** Only four intents exist after CHT-004.
- **Reason this matters:** Grounded answers for common questions, without fabrication.
- **Target behaviour:**
  - Add the intents actuals-for-month, invoices-by-status, expenses, person-allocation, po-validity and unmatched-data to `app/chat/intents.js`, with the same answer shape and citations.
  - Keyword fallback over the names, roles, PO teams and invoice numbers in scope.
  - When several people or references match, list the candidates (Needs confirmation) instead of choosing one.
  - Stale or migrated data or unmatched rows produce the label Needs confirmation.
- **Smallest safe change:** Extend `intents.js` and `answer.js`.
- **Explicit exclusions:** No AI. No new data sources.
- **Files expected to change:** `app/chat/intents.js`, `app/chat/answer.js`, `tests/unit/chat-intents.test.js`, `tests/manual/chat-questions.md` (new).
- **Files that must not change:** MNC-STD, `legacy/**`, `app/calc/**`.
- **Functions, symbols or components likely affected:** `CFE.chat.intents`.
- **Dependencies:** CHT-004.
- **Prerequisite decisions:** None.
- **External approvals:** None.
- **Data-boundary impact:** None.
- **Storage or migration impact:** None.
- **Security and privacy impact:** Present-mode masking applies.
- **Automated tests:**
  - Each intent's values equal the matching view figures.
  - "how much did R1 claim" routes to expenses.
  - Ambiguous names list candidates.
  - Unrelated questions give Not found.

  TEST-NODE, TEST-BROWSER.
- **Manual verification:** The ten scripted questions in `tests/manual/chat-questions.md`, with answers recorded.
- **Acceptance criteria:** Tests pass. Every answer has a label, a scope line and citations (or Not found).
- **Rollback:** RB-STD.
- **Recommended commit boundary:** CB-STD.
- **Completion evidence:** Test output, question log.
- **Continuity updates:** CONT-STD.
