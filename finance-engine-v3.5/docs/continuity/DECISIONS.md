# Decisions (Continuity Log)

**Append-only.** Never edit or delete a row. To change a decision, add a new row and set the old row's status to "Superseded by <ID>" by appending a row to the **Status changes** table (§4). The original row stays as written.

Sources:
* `docs/backlog/DECISION_REGISTER.md` (DEC-000…031, written 2026-10-04)
* `docs/backlog/BACKLOG_VALIDATION.md` §2 (revisions of 2026-10-04)
* `docs/architecture/ADR_REGISTER.md` (ADR-001…021)
* Owner messages of 2026-10-02 and 2026-10-04 (two sets)

Status values: **Accepted** (owner stated it), **Proposed** (recommended, awaiting the owner), **Open** (input needed), **Superseded**.

## 1. Owner decisions (OD)

| ID | Date | Decision | Reason | Impact | Status | Evidence |
|---|---|---|---|---|---|---|
| OD-1 | 2026-10-02 | Only `finance-engine-v3.5` is maintained; v1–v3 are archived | Single codebase | REP-002 | Accepted | Owner message |
| OD-2 | 2026-10-04 | The app runs from a SharePoint-synced folder (`file://`); nothing communicates outside the device or tenant | Managed laptop; no hosting | ADR-002, SEC-005 | Accepted | Owner message |
| OD-3 | 2026-10-02 | Viewers (senior leadership) use the UI only, with clear readiness status. No Python or terminal | Audience | SHL-002, SRV-001 | Accepted | Owner message |
| OD-4 | 2026-10-02 | One publisher refreshes the data from PeopleSoft dumps; others view | Removes dependency on others | ADR-004 | Accepted | Owner message |
| OD-5 | 2026-10-02 | Corporate proxy blocks CDNs | — | ADR-008, BLD-001 | **Superseded by OD-5a** | Owner message |
| OD-5a | 2026-10-04 | CDN-hosted libraries **do** load on the work laptop. The legacy app opened from Downloads worked, including charts. Vendoring remains required by charter §10–11 | Owner test | BLD-001 reclassified (V-01) | Accepted | Owner test, 2026-10-04 |
| OD-6 | 2026-10-02 | AI target is the existing M365 Copilot (premium) licence; no Copilot API; Ollama is experimental only | Licensing | ADR-012, CHT-002 | Accepted | Owner message |
| OD-7 | 2026-10-04 | A cross-application reference based on the user-entered OpportunityID, entered once and recognised by all Continuum apps | Seamless handoff | REF-001/002/003, XREP-001 | Accepted | Owner message |
| OD-8 | 2026-10-04 | Agent Builder agents are shared, or users replicate them | Copilot V2 | COP-003 | Accepted | Owner message |
| OD-9 | 2026-10-02 | DEFAULTS and the PIN are synthetic/test data; the repo will become public; attribution stays | Owner's own work | ADR-017, REL-001 | Accepted | Owner message |
| OD-10 | 2026-10-04 | Users can create dedicated folders during set-up | Avoids IT policy work | ONEDRIVE §2 | Accepted | Owner message |
| OD-11 | 2026-10-04 | Real person names are published to viewers | Everything stays internal | DEC-006 | Accepted | Owner message |
| OD-12 | 2026-10-04 | Commit `.claude/prompts` and `docs/` until development is complete | Continuity | BAS-001 | Accepted | Owner message (2026-10-02) |

## 2. Architecture decisions (ADR)

Full text in `docs/architecture/ADR_REGISTER.md`. All were written on 2026-10-04 with status **Proposed** and are subject to DEC-000.

| ID | Decision (short) | Status | Note |
|---|---|---|---|
| ADR-001 | Model A no-build, classic scripts | Proposed | — |
| ADR-002 | `file://` distribution from a synced folder; PWA features dormant | Proposed | Confirmed by OD-2 |
| ADR-003 | Retire `server.py` and SQLite | Proposed | — |
| ADR-004 | Publisher/viewer split; SharePoint permissions | Proposed | — |
| ADR-005 | `dataset.js` + `dataset.json` delivery | Proposed | — |
| ADR-006 | Reference format `CR-<OpportunityID>[-Wnn]` | **Superseded by DEC-001, then DEC-001-R1** | — |
| ADR-007 | Registry: one file per reference | Proposed | File name via `fileNameFor(ref)` (V-08) |
| ADR-008 | Vendor libraries locally, with hashes | Proposed | Rationale updated by OD-5a |
| ADR-009 | Namespaced storage on the `file://` origin | Proposed | Origin sharing unverified (V-21) |
| ADR-010 | Integer schema versions; forward migrations | Proposed | — |
| ADR-011 | Snapshots + SharePoint version history | Proposed | — |
| ADR-012 | No in-app AI calls; Copilot handoff | Proposed | — |
| ADR-013 | Copilot V2 via Agent Builder | Proposed | Knowledge = Teams channel folder (DEC-033 / V-13) |
| ADR-014 | Graph deferred until HTTPS origin | Proposed | — |
| ADR-015 | Strict CSP, `connect-src 'none'` | Proposed | Variant via DEC-020 |
| ADR-016 | Publish minimised aggregates | Proposed | Names included (DEC-006) |
| ADR-017 | Attribution kept; LICENSE; About | Proposed | MIT (DEC-005) |
| ADR-018 | Edge primary browser | Proposed | — |
| ADR-019 | Browser test harness, no npm | Proposed | — |
| ADR-020 | Releases as versioned folders | Proposed | — |
| ADR-021 | Shared `continuum-core/` folder | Proposed | — |

## 3. Backlog decisions (DEC)

| ID | Date | Decision | Reason | Impact | Status | Evidence |
|---|---|---|---|---|---|---|
| DEC-000 | 2026-10-04 | Accept ADR-001…021 as the baseline, as amended by DOC-001 | All items assume them | Whole backlog | Proposed | ADR_REGISTER |
| DEC-001 | 2026-10-04 | Reference = primary OpportunityID normalised to `O-` + 6–8 digits, optional `-Wnn` | Owner said the format is `O-XXXXXX` | REF-001 | **Superseded by DEC-001-R1** | DECISION_REGISTER |
| DEC-001-R1 | 2026-10-04 | **No format regex.** The reference is the first opportunity number the user enters, normalised only by trimming, removing whitespace and upper-casing (1–64 characters, no control characters). It is stored once and can never be changed; corrections only via `superseded_by`. File name via `fileNameFor(ref)` | Owner: "no regex; a unique one-time reference the user cannot change later" | REF-001, REF-002, STO-001 | Accepted | Owner message; BACKLOG_VALIDATION V-08 |
| DEC-002 | 2026-10-04 | **The first opportunity number entered at project creation is primary** (= the reference); numbers added later are linked in `opportunity_numbers` | Owner rule; Continuum stores a list | REF-001, REF-002, SPI-001 | Accepted | Owner message; V-09 |
| DEC-003 | 2026-10-04 | Continuum (`http://localhost:8002`) hands off to Finance (`file://`) via Copy/Paste reference | Browsers block `http` → `file://` navigation | REF-003, XREP-001 | Proposed (owner acknowledged "got it") | project_onion README |
| DEC-004 | 2026-10-04 | Continuum stops generating timestamp IDs; existing ones become aliases; done in project_onion after its own assessment | Create-once key | XREP-001 | Proposed | project_onion `schema.js` |
| DEC-005 | 2026-10-04 | Licence: MIT | Owner | REL-001 | Accepted | Owner message |
| DEC-006 | 2026-10-04 | Real names published; Present mode masks names and rates | Owner | STO-001, IMP-005, UI-006 | Accepted | Owner message |
| DEC-007 | 2026-10-04 | The Copilot handoff instructs **Work mode** and warns about Web mode | Web mode is the only external path | COP-002 | Proposed | Owner message |
| DEC-008 | 2026-10-04 | Keep the folder name `finance-engine-v3.5/` for the whole backlog | Path stability | All | Proposed | — |
| DEC-009 | 2026-10-04 | Do the time-zone fix in Phase 2 | Correctness | FIX-001 | Proposed | C-01 |
| DEC-010 | 2026-10-04 | Harden the legacy server now | Two BLOCKERs | SEC-001 | Proposed | SEC-01/02 |
| DEC-011 | 2026-10-04 | Workstream suffix policy | — | REF-001, REF-002 | **Superseded by DEC-011-R1** | DECISION_REGISTER |
| DEC-011-R1 | 2026-10-04 | **No workstream suffix.** Each separately tracked project is created with its own first opportunity number; shared numbers are linked | Simplest rule consistent with DEC-002 | REF-001, REF-002 | Proposed (owner to confirm the situation never occurs or is acceptable) | BACKLOG_VALIDATION §2 |
| DEC-012 | 2026-10-04 | **The Copilot agent is built once by the owner and shared in the organisation** | CV-1: owner confirmed sharing works | COP-003 | Accepted | Owner message (second, 2026-10-04) |
| DEC-013 | 2026-10-04 | Models never commit or push; the owner commits | Charter §13 | All | Accepted | Charter |
| DEC-014 | 2026-10-04 | Node (no npm packages) for developer tests and tooling only | Readable tests | TST-*, REL-002 | Proposed | — |
| DEC-015 | 2026-10-04 | Approved HTTPS host | Needed for SW/Graph | PWA-002, GRF-001 | Open (none planned) | ADR-002 |
| DEC-016 | 2026-10-04 | De-duplicate exact rows only | Prevents loss | DAT-006 | Proposed | D-05/06 |
| DEC-017 | 2026-10-02 | Holiday calendar is synthetic until replaced | Owner | SRC-004 | Accepted | Owner message |
| DEC-018 | 2026-10-04 | PeopleSoft column names and date formats | — | IMP-003 | **Superseded by DEC-018-R1** | DECISION_REGISTER |
| DEC-018-R1 | 2026-10-04 | **Fixture column names are the live PeopleSoft names.** Timesheet dates are `M/D/YYYY` (1–2 digit day and month, e.g. `7/1/2025`). Resource-rule dates are **day/month/year** (`D/M/YYYY`) | Owner confirmed both | IMP-003 | Accepted | Owner messages (2026-10-04); V-11 |
| DEC-019 | 2026-10-04 | Data is stale after 7 days | Weekly cadence | SHL-002 | Proposed | — |
| DEC-020 | 2026-10-04 | CSP variant under `file://` | Unverified behaviour | SEC-005 | Open (BAS-002) | ADR-015 |
| DEC-021 | 2026-10-02 | Archive v1–v3 under tag `archive/v1-v3-2026-10` | Owner | REP-002 | Accepted (archive) / Proposed (tag name) | Owner message |
| DEC-022 | 2026-10-04 | Metric definitions: actuals vs forecast to date; recorded vs planned hours | Misleading labels | FIX-004 | Proposed | F-02, F-08 |
| DEC-023 | 2026-10-04 | V1 publish transport | Policy-dependent | PUB-001 | Open; leaning `saveDialog` because Edge "Ask where to save" is disabled | Owner evidence; V-12 |
| DEC-024 | 2026-10-04 | New shell version 4.0.0 | Distinct from legacy | SHL-001, REL-002 | Proposed | — |
| DEC-025 | 2026-10-04 | Owner sign-off before retiring the server | Data reachability | SRV-001 | Open (future) | R-15 |
| DEC-026 | 2026-10-04 | V2 folder features only if OV-1 and OV-6 pass | Policy | ODI-002, SPO-001 | Proposed (awaiting BAS-002) | — |
| DEC-027 | 2026-10-04 | Parity sign-off before deleting the legacy app | Rollback | REP-003 | Open (future) | — |
| DEC-028 | 2026-10-04 | Whether to pursue Graph | Approvals | GRF-001 | Open (future) | ADR-014 |
| DEC-029 | 2026-10-04 | Whether V2 is insufficient, which triggers V3 | Avoids premature V3 | COP-005 | Open (future) | — |
| DEC-030 | 2026-10-04 | Copilot Chat URL for "Open Copilot" | Tenant entry point | COP-002 | **Superseded by DEC-030-R1** | DECISION_REGISTER |
| DEC-030-R1 | 2026-10-04 | `CFE.config.copilotUrl` defaults to **`https://m365.cloud.microsoft/chat`**, the base of the owner-observed `https://m365.cloud.microsoft/hwav2/chat/conversations/…`. Conversation-specific URLs must never be stored. Configurable; the owner verifies that the base URL opens a new chat in Work mode during COP-002 | Owner could not copy the link; supplied its shape | COP-002 | Proposed (needs the owner's click test) | Owner message |
| DEC-031 | 2026-10-04 | LICENSE copyright: "Copyright (c) 2026 Vamsi Yedlapalli" | Owner: "add" | REL-001 | Accepted | Owner message |
| DEC-032 | 2026-10-04 | **GitHub Codespaces (or any `*.app.github.dev` URL) may only ever hold test/synthetic data, never real data.** SEC-001 keeps `ALLOWED_HOSTS` for test use; README and SETUP state the rule | Codespaces is outside the tenant | SEC-001, DOC-002, XREP-001 (Continuum footer link) | Accepted | Owner message (second, 2026-10-04) |
| DEC-033 | 2026-10-04 | **All folder locations are user-configurable; none is hard-coded:** the Continuum library and Finance folder, the drop folder, the Registry, and the agent's knowledge folder. The app works from wherever its folder is placed (relative layout). Folders are chosen through pickers. A Teams channel Files folder is *recommended* (needed for Agent Builder knowledge) but not required | Owner: "should be configurable, so users can select the desired folder" | DOC-002, COP-003, ODI-002, SPO-001, SPI-001, REF-002 | Accepted | Owner message (second, 2026-10-04); V-13 |
| DEC-034 | 2026-10-04 | **Overnight autonomous run (one-off authorisation):** the model may execute Phase 0 items one after another in a single session and **commit each item locally** on `assessment/pwa-readiness-2026-10` (`<ID>: <title>`) once its tests pass. **Never push.** Stop at the first owner gate, failing test or unmet acceptance criterion. Overrides SMALL_MODEL_EXECUTION_RULES rules 1 and 13 and DEC-013 for this run only | Owner asleep; per-item commits keep each change reviewable and revertible | FINAL_EXECUTION_SEQUENCE F0.3–F0.9 | Accepted | Owner answer, 2026-10-04 (session question) |
| DEC-035 | 2026-10-05 | **DAT-001…DAT-006 are held until the owner has backed up every origin** (F0.5 checkpoint). During the overnight run the model treated that checkpoint as an owner gate for the items that change how the legacy app restores, uploads, saves, syncs and resets data, and continued with the independent Phase 0 items (MIG-001, SEC-002, CHT-001, CHT-002, BLD-002) | The DAT items alter data paths the owner's real data goes through; FINAL_EXECUTION_SEQUENCE F0.5 asks for backups first | DAT-001…006 | Proposed (owner to confirm) | Overnight run |
| DEC-036 | 2026-10-05 | **F0.5 checkpoint met:** the owner confirms a backup was exported with Export Full Config from every origin where the legacy app was used. DAT-001…DAT-006 may proceed (releases DEC-035) | Owner answer | DAT-001…006 | Accepted | Owner answer, 2026-10-05 (session question) |
| DEC-037 | 2026-10-05 | **Session authorisation (2026-10-05):** the model may execute backlog items one after another in this session and **commit each item locally** (`<ID>: <title>`) once its tests pass, as in DEC-034. **Never push.** Stop at the first owner gate, failing test or unmet acceptance criterion | Owner asked for "the next set of backlog items" and chose per-item commits | F0.7 onward | Accepted | Owner answer, 2026-10-05 (session question) |
| DEC-038 | 2026-10-05 | **Managed-laptop checks deferred:** the owner cannot test on the managed work laptop for now, but will later. BAS-002 criterion 4, BLD-001 criterion 4 and the managed-laptop part of DEC-020/023/026 stay pending owner tasks; they do not block unrelated items | Owner answer | BAS-002, BLD-001, BLD-002 | Accepted | Owner answer, 2026-10-05 |
| DEC-039 | 2026-10-05 | **F1.5 checkpoint (DEC-018):** the owner reviewed `docs/schema/MAPPING_PROFILES.md` against the real exports: column names match, and resource-rule dates are day first (`D/M/YYYY`), timesheet dates month first (`M/D/YYYY`). Fresh backups were exported from every origin before SHL-004 (F1.6 checkpoint met) | Owner answer | IMP-003, SHL-004 | Accepted | Owner message, 2026-10-05 ("REST all matches"; Q2 "Exported") |
| DEC-040 | 2026-10-05 | **Dates are shown as DD-MM-YYYY everywhere a person reads them** (screens, PDF and PowerPoint exports, chat answers). Excel exports hold real dates formatted `dd-mm-yyyy`, so they still sort and filter. **Stored and published data keeps `YYYY-MM-DD`** (it sorts correctly, is unambiguous and is what calculations compare). Imports keep checking each source file's own fixed format (IMP-003). Dates typed into a screen are read day first (`DD-MM-YYYY` or `DD/MM/YYYY`). Exceptions, on purpose: file names (`Finance_Report_YYYY-MM-DD`) so they sort in folders, the Settings raw-data boxes and backup files (stored form). Applies to the legacy app now and to every new view | Owner request: "can we change this to show DD-MM-YYYY?" | Legacy `index.html`, `app/calc/dates.js`, all future views (SHL-*, views layer) | Accepted | Owner message, 2026-10-05 (Q1) |
| DEC-041 | 2026-10-05 | **PO details date format: open.** `po-details-v1` reads `WO_StartDate` as `YYYY-MM-DD` because the synthetic `test_PO_Details.json` and the app's own saved PO data use it. The owner is asked where real PO details come from and how their dates look; if they are typed day first, the profile changes to `D/M/YYYY` | Owner noted the difference from resource rules | IMP-003 (`po-details-v1`) | Open (owner answer) | Owner message, 2026-10-05 (Q1) |
| DEC-041-R1 | 2026-10-05 | **PO start dates are day first**, like the rest of the app: `po-details-v1` reads `WO_StartDate` as `D/M/YYYY` (separator `/` or `-`, so `31-12-2025` and `31/12/2025`) **or** `YYYY-MM-DD` (the form the app saves, so existing PO data still imports). Day-first and month-first can never be accepted together by one field; `M/D/YYYY` and `D/M/YYYY` now also accept `-` as the separator | Owner: "its just a date … updated to DD-MM-YYYY (similar to other areas)" | IMP-003 (`po-details-v1`, `mapping.js`) | Accepted | Owner message, 2026-10-05 |
| DEC-042 | 2026-10-05 | **Continuum-generated project ID parked until Continuum integration.** The owner would like an extra, Continuum-generated reference because a project can have several opportunity numbers and users may not know which to quote. For now the reference stays the first opportunity number (DEC-001-R1); any linked opportunity number already finds the project (`Continuum.ref.resolve`). The generated ID is designed when the Continuum apps are integrated; records tolerate new fields, so it can be added then without breaking data | Owner: "park this into backlog" | REF-001, REF-002, XREP-* | Parked (integration) | Owner message, 2026-10-05 (Q3) |
| DEC-043 | 2026-10-05 | **LICENSE text approved:** the standard MIT text with `Copyright (c) 2026 Vamsi Yedlapalli` (holder from DEC-031). The file sits at the **repository root** (`/LICENSE`, next to `README.md`) so it covers every folder and GitHub detects it | Owner: "go ahead with next step" after being shown the text and asked to approve it | REL-001 | Accepted | Owner message, 2026-10-05 |

## 4. Status changes

| Date | ID | New status | Reason |
|---|---|---|---|
| 2026-10-04 | ADR-006 | Superseded by DEC-001, then DEC-001-R1 | Owner reference rules |
| 2026-10-04 | OD-5 | Superseded by OD-5a | Owner test |
| 2026-10-04 | DEC-001 | Superseded by DEC-001-R1 | Owner: no regex |
| 2026-10-04 | DEC-011 | Superseded by DEC-011-R1 | Simplification |
| 2026-10-04 | DEC-018 | Superseded by DEC-018-R1 | Owner confirmation |
| 2026-10-04 | DEC-030 | Superseded by DEC-030-R1 | Owner supplied the URL shape |
| 2026-10-05 | DEC-035 | Released by DEC-036 | Owner confirmed backups |
| 2026-10-05 | DEC-041 | Superseded by DEC-041-R1 | Owner answered |
| 2026-10-05 | DEC-018 | Accepted (DEC-039) | Owner confirmed the column names and date orders against real exports |
| 2026-10-05 | DEC-016 | Accepted | Owner approved exact-row de-duplication (session question, 2026-10-05), knowing that kept split rows can raise actuals and that rows dropped earlier come back only from backups or source files |

## 5. Validation results recorded

| Check | Date | Result | Source |
|---|---|---|---|
| CV-1 Agent Builder sharing | 2026-10-04 | **PASS**: can share within the organisation | Owner |
| Agent Builder knowledge types | 2026-10-04 | Teams channel folders: yes. SharePoint links: no | Owner |
| `DefaultFileSystemReadGuardSetting` | 2026-10-04 | Not set | Owner (`edge://policy`) |
| OneDrive "Sync" and "Always keep on this device" | 2026-10-04 | Both available | Owner |
| `file://` page in managed Edge (from Downloads) | 2026-10-04 | Opens and works, including CDN libraries | Owner |
| Edge "Ask where to save each file" | 2026-10-04 | Off and disabled (policy); default folder can be changed | Owner |
| F1.6 legacy data after SHL-004 | 2026-10-05 | **PASS**: after `git push`, restarting `server.py` and refreshing, the existing data is all there | Owner |
| New shell (SHL-001…003) in Edge | 2026-10-05 | **PASS**: "UI is looking fine in Edge as well" (Diagnostics text not pasted yet) | Owner |
| OV-1…OV-6, CSP under `file://`, storage origin, save picker, from a **synced** folder | — | **Not yet run** (needs BAS-002) | — |
