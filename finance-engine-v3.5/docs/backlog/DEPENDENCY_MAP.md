# Dependency Map

Date: 2026-10-04. The direct dependencies of every item are in the `MASTER_BACKLOG.md` index ("Depends on"). This file adds the structure needed to schedule work safely.

## 1. Prerequisite chains (critical paths)

```
BAS-001 ─┬─ DOC-001 ─────────────────────────────┐
         ├─ BAS-002 (probe; owner runs) ─────────┼──► decides DEC-020, DEC-023, DEC-026
         └─ SEC-001 ─ BLD-001 ─ TST-001 ─ TST-002 ─ TST-003 ─┬─ BAK-001 ─┬─ DAT-001
                                    │                         │           ├─ DAT-002 ─ DAT-006
                                    │                         │           ├─ DAT-003 ─ DAT-004
                                    │                         │           └─ DAT-005
                                    │                         ├─ MIG-001 ─┐
                                    ├─ SEC-002 ──────────────────────────┴─ CHT-001
                                    │      └─ CHT-002
                                    │                         ├─ BLD-002, BLD-003
                                    │                         ├─ SEC-003 ─ SEC-004
                                    │                         └─ SRC-001 ─ SRC-002 ─ SRC-003 ─┬─ STO-001
                                    │                                 └─ SRC-004              ├─ REP-001 (also SEC-004)
                                    │                                                         └─ SHL-001 (also SEC-004, BAK-001)
                                    ├─ STO-002, IMP-001, IMP-002, REF-001 (needs DOC-001)
                                    │
SHL-001 ─┬─ SHL-002 ─┐
         ├─ SHL-003  │
         ├─ REL-001  │
STO-001 + REF-001 ─ STO-003 ─ STO-004 (also SHL-002, IMP-002) ─ SEC-005
IMP-001 + STO-001 ─ IMP-003 ─ IMP-004 (also IMP-002, STO-002, SHL-001) ─ IMP-005 (also REF-001) ─ IMP-006 (also BAK-001)

Phase 2 spine:
STO-004 + SEC-005 ─ UI-001 ─┬─ UI-002 ─ ODO-001 (also REL-001) ─ ODO-002 (also BLD-003)
                            ├─ UI-003 ─ UI-004
                            ├─ UI-005, UI-006, CHT-003 ─ CHT-004 (also IMP-005)
                            └─ REF-003 (also REF-001)
IMP-005 + STO-004 ─ PUB-001 ─┬─ PUB-002 ─┐
                             ├─ REF-002 (also SPI-001)
                             └─ COP-001 (also CHT-004) ─ COP-002
SHL-003 ─ REL-002 ─┴─ DOC-002 ─ SRV-001 (also IMP-006, PUB-001, UI-003, DEC-025)
```

## 2. Parallel-safe items

Items in the same group touch disjoint files and may run in separate branches at the same time. Items **not** listed here edit shared files (`index.html`/`legacy/index.html`, `server.py`, `app/app.js`, `app/views/publish.js`) and must run strictly in sequence.

| Group | Items | Condition |
|---|---|---|
| P-A | DOC-001, BAS-002, SEC-001 | After BAS-001 |
| P-B | STO-002, IMP-001, IMP-002, REF-001 | After TST-001 (REF-001 also after DOC-001). All create new files only, plus one line each in `tests/browser-suites.js`; merge that line manually |
| P-C | BLD-002, BLD-003 | After TST-003. Each edits different `<script>` lines of the legacy file, so merge carefully. If in doubt, run serially |
| P-D | SHL-002, SHL-003, REL-001 | After SHL-001. Each edits `index.html` script tags and `app/app.js`, so prefer serial execution; parallel only with a manual merge |
| P-E | FIX-002, FIX-003 | After their dependencies; different calc files |
| P-F | UI-005 and UI-006 | **Not parallel**: both edit all views |
| P-G | ODI-001 and SPI-001 | **Not parallel**: both edit `publish.js` |
| P-H | XREP-001 | Parallel with anything (docs only) |
| P-I | COP-003, COP-005, GRF-001 | Parallel (docs only) |

## 3. Mutually exclusive alternatives

Choose exactly one of each. The decision is recorded in DECISION_REGISTER before the dependent item starts.

| Topic | Alternative A | Alternative B | Decided by | Affects |
|---|---|---|---|---|
| CSP script source under `file://` | `script-src 'self'` | `script-src 'self' file:` (if `'self'` does not match local files) | DEC-020 via BAS-002 | SEC-005 |
| V1 publish transport | `saveDialog` (`showSaveFilePicker`) | Plain downloads | DEC-023 via BAS-002 OV-4 | PUB-001 |
| V2 folder features | Enabled (OV-1 and OV-6 pass) | Stay on V1 permanently; ODI-002 and SPO-001 marked Not applicable | DEC-026 | ODI-002, SPO-001 |
| Copilot V2 agent | Shared by the owner | Each user rebuilds from AGENT_SETUP.md | DEC-012 via CV-1 | COP-003 |
| Continuum handoff | `file://` → `file://` link (Continuum also opened from disk) | Copy/Paste reference (Continuum on `http://localhost`) | DEC-003 / XREP-001 outcome | REF-003, XREP-001 |
| Legacy server during migration | Harden (SEC-001) | Retire immediately | DEC-010 (A chosen) | SEC-001, SRV-001 |
| Distribution | `file://` from the synced folder (chosen) | HTTPS host (future) | ADR-002 / DEC-015 | PWA-002, GRF-001 |

## 4. High-risk sequences (do not reorder)

| ID | Sequence | Why |
|---|---|---|
| HR-1 | TST-003 **before** any SRC-*, BLD-002, BLD-003, DAT-006, FIX-* | Without goldens, refactors and upgrades can silently change financial figures |
| HR-2 | BAK-001 **before** DAT-001…DAT-005, SHL-001, IMP-006 | Destructive-path changes and relocation need a complete backup first |
| HR-3 | SHL-001 must keep the legacy app on origin `http://localhost:3005` | Moving it to `file://` would hide the owner's browser data (R-15) |
| HR-4 | IMP-006 + owner KPI comparison + final backup (DEC-025) **before** SRV-001 | After retirement, legacy data is unreachable without restoring the server |
| HR-5 | SEC-003/004 **before** REP-001 | Avoids wasting escape edits on code about to be removed, and keeps diffs reviewable |
| HR-6 | PUB-001 writes history first and the manifest last; viewers verify the hash | A partially written publication must never show as green |
| HR-7 | SEC-005 (CSP) only after the shell has no inline scripts or handlers | Otherwise the app breaks |
| HR-8 | REP-003 only after the parity sign-off (DEC-027) and at least one release containing the new shell has been used for 2 weeks | Rollback route |
| HR-9 | BLD-002 golden for SheetJS parse captured with 0.18.5 **before** swapping | Proves equivalence |
| HR-10 | DAT-006 changes only the dedupe golden; verify that `git diff --stat tests/golden` shows one file | Unintended figure changes |

## 5. Items blocked by admin or tenant approval

| Item | Approval needed | From |
|---|---|---|
| COP-003 | Agent Builder with SharePoint knowledge enabled; agent sharing (for the shared option) | M365 tenant admin |
| COP-005 | Licensing and tenant policy information for Copilot Studio, connectors, APIs, Foundry | M365 / Azure admin |
| GRF-001 | Entra app registration, delegated scopes, admin consent, security review | Entra / IT security |
| PWA-002 | Approved HTTPS hosting | IT |
| ODI-002, SPO-001 | Only if Edge group policy blocks the File System Access API (OV-6) | Endpoint management |
| PUB-001, REF-002 (indirect) | SharePoint site/library with write permission for the publisher and read permission for viewers | SharePoint site owner |

## 6. Items blocked by missing source code

| Item | What is missing | Handling |
|---|---|---|
| XREP-001 | Continuum source lives in the separate repository `LoneWolfDen/project_onion` (not in this repository). The owner reports it contains minified code needing clean-up | Only a handoff document is produced here. Implementation needs a separate session in that repository, after its own assessment |
| SRC-004 | The source workbook `Burndown_Template_v4.7.xlsx` for the holiday table is not in the repository | Accepted as synthetic (DEC-017). Provenance states it. No regeneration possible |
| BLD-001, BLD-002, BLD-003 | Vendor library sources are upstream, not in the repository | Download official artefacts on a developer machine with internet; record hashes |
| IMP-003 | A real PeopleSoft export header (confidential, must not be committed) | The owner confirms column names against the profile (DEC-018) |
