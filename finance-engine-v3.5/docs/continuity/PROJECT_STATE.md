# Project State

Last updated: 2026-10-04 (after prompt 05)

## Repository

| Item | Value |
|---|---|
| Repository | `LoneWolfDen/project_finance_engine` (GitHub; private, to become public). Local: `/Users/wolf/Developer/project_finance_engine` |
| App root | `finance-engine-v3.5/` (all backlog paths are relative to it; DEC-008) |
| Branch | `assessment/pwa-readiness-2026-10` (tracks `origin/assessment/pwa-readiness-2026-10`) |
| Commit | `991cacf` "Add forensic repository assessment" (on top of `5d453d1`, tagged `pwa-assessment-baseline-2026-10-01`) |
| Uncommitted | `finance-engine-v3.5/.claude/` (prompts 01–05 + `IMPLEMENT_ONE_ITEM_TEMPLATE.md`), `finance-engine-v3.5/docs/architecture/` (6 documents + charter), `finance-engine-v3.5/docs/backlog/` (8 files), `finance-engine-v3.5/docs/continuity/` (these 5 files). To be committed by the owner under **BAS-001** |
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
| Planning artefacts uncommitted | All items (models need them on the branch) | Owner commits (BAS-001) |
| Probe results missing (OV-1…OV-6, CSP, storage origin, save picker) | DEC-020, DEC-023, DEC-026 → SEC-005, PUB-001, ODI-002, SPO-001 | BAS-002 built, then the owner runs it from the synced folder |
| SEC-01/02 legacy server exposure | Safe daily use of the legacy app | SEC-001 |
| No tests or goldens | All refactors (SRC-*), upgrades (BLD-002/003), DAT-006, FIX-* | TST-001 → TST-004 → TST-002 → TST-003 |

## Backlog status

All 88 items are **Not started**. Order: `docs/backlog/FINAL_EXECUTION_SEQUENCE.md`. Executed items are recorded below (newest last) using CONT-STD from `docs/backlog/SMALL_MODEL_EXECUTION_RULES.md`.

| Date | ID | Status | Files changed | Tests | Unverified checks |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## Probe results

(BAS-002 not yet built. Paste the "Copy results" output here, with the date and the folder used.)

## Next task

**BAS-001**: the owner stages and commits `finance-engine-v3.5/.claude/` and `finance-engine-v3.5/docs/`. Then DOC-001, BAS-002 and SEC-001 (FINAL_EXECUTION_SEQUENCE F0.2).
