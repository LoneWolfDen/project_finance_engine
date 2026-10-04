# Decision Register (Backlog)

Date: 2026-10-04. Decisions referenced by backlog items as `DEC-nnn`. This register is append-only: to change a decision, add a new row that supersedes the old one. Architecture-level decisions are in `docs/architecture/ADR_REGISTER.md`. Continuity copies go to `docs/continuity/DECISIONS.md` (prompt 05).

Status values: **Accepted** (owner stated it), **Proposed** (recommended; owner to accept), **Open** (input needed), **Superseded**.

## Owner answers captured

| Date | Question | Owner answer | Recorded as |
|---|---|---|---|
| 2026-10-02 | DEFAULTS and holiday table real? | Synthetic, for testing | DEC-017 |
| 2026-10-02 | Repo visibility, PIN | Private now, will become public; PIN was test-only | DEC-005, ADR-017 |
| 2026-10-02 | Versions maintained | Only v3.5; archive v1–v3 | DEC-021 |
| 2026-10-02 | Python and users | Python allowed for the owner; leaders need UI-only operation with clear status; one admin refreshes | OD-3, OD-4 |
| 2026-10-02 | CDN access | Blocked | ADR-008 |
| 2026-10-02 | Ollama, AI | Experimental only; use the M365 Copilot premium licence; no Copilot API | ADR-012 |
| 2026-10-02 | Attribution | Keep it | ADR-017 |
| 2026-10-02 | Commit prompts and docs | Yes, until development completes | BAS-001 |
| 2026-10-04 | Cross-app key | User-entered once, not time-based, shared across "World of Continuum" | DEC-001, DEC-002 |
| 2026-10-04 | Hosting | Open from the SharePoint-synced folder; nothing communicates outside | ADR-002 |
| 2026-10-04 | Folders | Users can create dedicated set-up folders | OD-10 |
| 2026-10-04 | Agent Builder | Share; otherwise users replicate | DEC-012 |
| 2026-10-04 | OpportunityID format | `O-XXXXXX` (digits) | DEC-001 |
| 2026-10-04 | Continuum | Separate PWA, `LoneWolfDen/project_onion` (public); needs its own clean-up | DEC-003, DEC-004, XREP-001 |
| 2026-10-04 | Licence | MIT | DEC-005 |
| 2026-10-04 | Names in published data | Real names; only Copilot is external, and only if someone uses Web mode | DEC-006, DEC-007 |

## Decisions

| ID | Decision | Reason | Impact | Status | Evidence / items |
|---|---|---|---|---|---|
| DEC-000 | Accept ADR-001…ADR-021 as the architecture baseline, as amended by DOC-001 | Every backlog item assumes them | Whole backlog | Proposed | `docs/architecture/ADR_REGISTER.md` |
| DEC-001 | The Continuum Reference ID is the **primary OpportunityID, normalised**: `O-` followed by 6–8 digits, leading zeros kept, optional `-Wnn` workstream suffix. **Supersedes the `CR-` prefix** in ADR-006 | The owner's IDs are already unique, user-entered and recognisable. A prefix adds nothing | REF-001, STO-001, all ref handling | Accepted (format) / Proposed (6–8 digit range, inferred from `O-008891` and `O-5030460` in project_onion docs) | Owner 2026-10-04; project_onion `docs/DATA_DICTIONARY.md` |
| DEC-002 | A project may hold several opportunity numbers. One is **primary** (= `ref`); the others are listed in `opportunity_numbers` and resolve to the same record | Continuum already stores `opportunity_numbers` as a list | REF-001, REF-002, SPI-001 | Proposed | project_onion data dictionary |
| DEC-003 | Continuum (served from `http://localhost:8002`) hands off to Finance (`file://`) with **Copy reference → Paste reference**. Direct links are used only between `file://` apps | Browsers block navigation from `http(s)` pages to `file://` URLs | REF-003, XREP-001 | Proposed | project_onion README; browser behaviour (file → file to be confirmed by OV-2) |
| DEC-004 | Continuum stops generating timestamp-based `Project_ReferenceID`s. Existing ones become aliases. The work happens in the project_onion repository after its own assessment | The owner requires a non-temporal, create-once key | XREP-001 | Proposed | project_onion `schema.js` `genProjectReferenceID` |
| DEC-005 | Licence: MIT | Owner | REL-001 | Accepted | Owner 2026-10-04 |
| DEC-006 | The published dataset includes real person names. Present mode masks names and rates when presenting | Owner: everything stays internal | STO-001, IMP-005, UI-006 | Accepted | Owner 2026-10-04 |
| DEC-007 | The Copilot handoff tells users to use **Work mode** and warns that Web mode may send content to web search | The owner identified Web mode as the only external path | COP-002, DOC-001, DOC-002 | Proposed | Owner 2026-10-04 |
| DEC-008 | Keep the app folder name `finance-engine-v3.5/` for the whole backlog | Avoids path churn in every item | All | Proposed | — |
| DEC-009 | Do the time-zone fix (FIX-001) in Phase 2, earlier than migration slice S7 | It is a correctness defect affecting forecasts. Goldens make it safe once calc is extracted | FIX-001 | Proposed | C-01 verified |
| DEC-010 | Harden the legacy server now (SEC-001), rather than wait for retirement | The owner uses it daily until migration. Two BLOCKERs | SEC-001 | Proposed | SEC-01, SEC-02 |
| DEC-011 | Workstream suffix `-Wnn` policy: when to use it and who assigns it | Unknown whether one opportunity maps to several finance engagements | REF-001, REF-002 | Open | — |
| DEC-012 | Agent: shared by the owner, or rebuilt per user | Depends on the tenant's sharing setting (CV-1) | COP-003 | Open | Owner Q3.1 |
| DEC-013 | Models never commit or push. The owner commits | Charter §13 | All | Accepted | Charter; rules §2.13 |
| DEC-014 | Node (no npm packages) is allowed on the developer machine for tests and tooling only. Never required by viewers | Readable tests without a build | TST-001, REL-002 | Proposed | — |
| DEC-015 | An approved HTTPS host for the app | Needed for service worker, install and Graph | PWA-002, GRF-001 | Open (none planned; `file://` chosen) | ADR-002, ADR-014 |
| DEC-016 | Timesheet de-duplication removes only exact duplicate rows | Prevents loss of legitimate split rows | DAT-006 | Proposed | D-05, D-06 |
| DEC-017 | The holiday calendar is synthetic test data until a real source is supplied | Owner statement | SRC-004 | Accepted | Owner 2026-10-02 |
| DEC-018 | PeopleSoft export column names and date formats (timesheet `MM/DD/YYYY`, resource rules `DD/MM/YYYY`) | Mapping profiles must not guess | IMP-003 | Open (confirm against an anonymised real header) | Fixtures |
| DEC-019 | Data is "stale" after 7 days | Weekly refresh cadence assumed | SHL-002 | Proposed | — |
| DEC-020 | CSP `script-src` variant under `file://` (`'self'` or a fallback) | Browser behaviour unverified | SEC-005 | Open (BAS-002) | ADR-015 |
| DEC-021 | Archive v1–v3 with the tag `archive/v1-v3-2026-10`, then remove them from the branch | Owner decision to archive. History is kept | REP-002 | Accepted (archive) / Proposed (tag name) | Owner 2026-10-02 |
| DEC-022 | Metric definitions: "Actuals vs forecast to date" and "Recorded hours vs planned hours" | The current labels are misleading | FIX-004 | Proposed | F-02, F-08 |
| DEC-023 | V1 publish transport: save dialog, or downloads | Edge may warn on or block `.js` downloads | PUB-001 | Open (BAS-002 OV-4) | — |
| DEC-024 | The new shell starts at version 4.0.0 (`4.0.0-alpha.n` during migration) | Distinguishes it from legacy 3.5 | SHL-001, REL-002 | Proposed | — |
| DEC-025 | Owner sign-off that legacy data is migrated and a final backup is stored, before server retirement | Legacy browser data becomes unreachable | SRV-001 | Open (future) | R-15 |
| DEC-026 | Enable V2 folder features only if BAS-002 OV-1 and OV-6 pass on the managed laptop | Policy-dependent API | ODI-002, SPO-001 | Proposed | — |
| DEC-027 | Owner parity sign-off before deleting the legacy app | Rollback safety | REP-003 | Open (future) | — |
| DEC-028 | Whether to pursue Graph at all | Requires hosting, registration and consent | GRF-001 | Open (future) | ADR-014 |
| DEC-029 | Whether Copilot V2 (agent) is insufficient, which would trigger the V3 evaluation | Avoids premature V3 | COP-005 | Open (future) | — |
| DEC-030 | Copilot Chat URL used by the "Open Copilot" button | Tenant-specific entry point | COP-002 | Open (owner supplies; CV-3) | — |
| DEC-031 | Copyright holder name in LICENSE | Legal text | REL-001 | Open (owner confirms "Vamsi Yedlapalli") | — |
