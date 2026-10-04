# Project State

Last updated: 2026-10-04 (after BAS-002 build)

## Repository

| Item | Value |
|---|---|
| Repository | `LoneWolfDen/project_finance_engine` (GitHub; private, to become public). Local: `/Users/wolf/Developer/project_finance_engine` |
| App root | `finance-engine-v3.5/` (all backlog paths are relative to it; DEC-008) |
| Branch | `assessment/pwa-readiness-2026-10` (tracks `origin/assessment/pwa-readiness-2026-10`) |
| Commit | `d9619fb` "DOC-001: Record identity and Continuum decisions in architecture docs", on top of `d43cb51` (BAS-001), `991cacf` (assessment) and `5d453d1` (tagged `pwa-assessment-baseline-2026-10-01`) |
| Uncommitted | BAS-002: new `finance-engine-v3.5/tools/probe/` (6 files), plus these continuity updates. Awaiting owner review and commit |
| Related repository | Continuum: `LoneWolfDen/project_onion` (public; separate; not assessed) |

## Current implementation state (unchanged since the assessment; no code has been modified)

* **Legacy app file:** `index.html` (SHL-004 not done). The legacy server is `server.py`.
* **What runs:** a single 2,279-line hand-written `index.html` (no framework, not minified) plus Python stdlib `server.py` with SQLite. Four parallel copies exist (v1, v2, v3, v3.5).
* **Works today:** dashboard, forecast, imports and exports. Confirmed on the work laptop when opened from `file://` (Downloads), with CDN libraries loading (OD-5a).
* **Not working or unsafe:**
  - server open on all interfaces with wildcard CORS (SEC-01/02, BLOCKER);
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
| SEC-01/02 legacy server exposure | Safe daily use of the legacy app | SEC-001 |
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

Everything else is **Not started**.

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

Not decided by this run (needs the managed laptop): DEC-020, DEC-023, DEC-026, OV-4 (Edge `.js` download warning), OV-6 (policies), and synced-folder behaviour (OV-3 from a OneDrive folder).

### Managed laptop, Edge, synced Teams channel folder

(not yet run)

## Next task

The owner reviews and commits BAS-002 (`tools/probe/`), then runs the probe on the work laptop from the synced Teams channel folder (`tools/probe/README.md`) and pastes the results above. Meanwhile a model can start **SEC-001** (FINAL_EXECUTION_SEQUENCE F0.2).

When the results arrive, a model records them and marks the DEPENDENCY_MAP §3 alternatives they point to as **Proposed** in `DECISIONS.md` (append-only; `docs/backlog/` stays unchanged under MNC-STD). The owner confirms them.
