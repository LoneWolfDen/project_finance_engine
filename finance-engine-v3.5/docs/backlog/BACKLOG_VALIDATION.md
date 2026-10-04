# Backlog Validation

Date: 2026-10-04 · Reviewer role: critical architecture and release review (prompt 04)
Inputs: `docs/assessment/*`, `docs/architecture/*`, `docs/backlog/*` (81 items before review), owner answers of 2026-10-04.
Outputs: this file, `FINAL_EXECUTION_SEQUENCE.md`, and corrections applied to `MASTER_BACKLOG.md` (now 88 items).

## 1. Verdict

The backlog is **usable after correction**. The review found:

* **One false premise.** "CDNs are blocked on the work laptop" was contradicted by the owner's test.
* **One unverified premise.** The owner's legacy data is not necessarily on `http://localhost:3005`: the owner also runs the app from `file://`. Items that assumed a server have been corrected.
* **One change that would break existing use.** The fixed Host-header check would break the Codespaces URL the owner's Continuum app links to.
* **Seven items too large** for one contained cycle. They were split into seven new items.
* **One missing dependency** (DOC-002 → PWA-001).
* **Two designs superseded by owner decisions:** the reference-ID regex and the workstream suffix.
* **Two places with hidden interpretation.** The "`app/views/*.js`" wildcards were replaced by explicit file lists.

Automated checks after correction:

* No circular dependencies.
* No item depends on an item in a later phase.
* 88/88 items contain every required field.
* The index matches the item headings.

`MASTER_BACKLOG.md` was corrected in two ways:

1. **Amendment notes** (`> Amended 2026-10-04 by BACKLOG_VALIDATION.md V-nn`) placed directly under each challenged item's heading. Each note states that it overrides the fields below it.
2. **Seven new items**, appended in a section titled "Items added by backlog validation".

The index dependencies were updated to match. `DEPENDENCY_MAP.md` §1 and `EXECUTION_SEQUENCE.md` are **superseded for ordering** by `FINAL_EXECUTION_SEQUENCE.md`. `DECISION_REGISTER.md` was not edited (append-only, outside this prompt's scope). The decision changes in §2 must be transcribed by prompt 05 into `docs/continuity/DECISIONS.md`.

## 2. Owner inputs received 2026-10-04 and resulting decision changes

| Input | Effect | Decision |
|---|---|---|
| "The first opportunity number input at project creation becomes Primary; the rest are linked" | REF-002 drops the "mark primary" control; the first number is the permanent reference | DEC-002 → **Accepted** (first-entered rule) |
| "No regex; a unique one-time reference the user cannot change later" | REF-001 drops the `O-`/6–8-digit pattern. Normalisation is minimal (trim, remove spaces, upper-case, 1–64 characters). Immutability is enforced by the registry, not by format | DEC-001 → **Revised and Accepted**: format-free and immutable. Supersedes the "O-<6–8 digits>" rule and ADR-006's `CR-` format |
| "Workstream suffixes – did not get your point" | See the explanation below. Recommendation: do not use suffixes | DEC-011 → **Proposed: not used** |
| "Current column names are actually live ones" | The PeopleSoft fixture headers are authoritative. Live dates are not zero-padded (`7/1/2025`) | DEC-018 → **Accepted** (columns). The resource-rule date order is still to confirm |
| "MIT copyright – add" | LICENSE uses "Copyright (c) 2026 Vamsi Yedlapalli" | DEC-031 → **Accepted** |
| `DefaultFileSystemReadGuardSetting`: not set | No read-guard policy. Write-guard and other policies are still to be checked by the probe | Input to DEC-026 (pending BAS-002) |
| "Sync" and "Always keep on this device" exist | The synced-library distribution is feasible | Supports ADR-002 |
| The legacy `index.html` opened from Downloads; page and charts work | **CDN libraries load on the work laptop**, so the OD-5 premise "proxy blocks CDNs" is withdrawn. `file://` pages open in Edge. The owner runs the legacy app from `file://` | V-01, V-05, V-07 |
| Agent Builder: Teams channel folders can be added; SharePoint links cannot | The Copilot V2 knowledge source must be a Teams channel Files folder | New **DEC-033 Proposed**: host `Continuum/` in a Teams channel's Files (SharePoint-backed and syncable) |
| Edge "Ask where to save each file" is turned off and disabled | Downloads land in the default folder, so a download-based publish needs manual moves | DEC-023 → **leaning `saveDialog`** (confirm by probe) |
| (Derived) The Continuum footer links Finance to a `*.app.github.dev` URL | The app may be run in GitHub Codespaces, which is outside the tenant | New **DEC-032 Open**: whether Codespaces use continues for real data |

**Workstream suffix, in plain words.** Your rule covers *one project with several opportunity numbers*: the first one is the reference and the others are linked. The suffix was for the opposite case: *one opportunity number that is delivered as two or more separately tracked projects* (for example phase 1 and phase 2 with different POs). The suffix would have given those projects references such as `O-5030460-W01` and `O-5030460-W02`. With your "first-entered, never changes" rule, the simpler answer is that each separately tracked project is created with its own first opportunity number, and shared numbers are just linked. Unless you tell me this situation happens, suffixes are not used.

## 3. Challenged items

"Applied" says where the correction lives: **A** = amendment note in MASTER_BACKLOG, **N** = new item, **I** = index dependency change, **S** = FINAL_EXECUTION_SEQUENCE only.

| V-ID | Original ID | Issue | Recommended correction | Dependency change | Risk change | Applied |
|---|---|---|---|---|---|---|
| V-01 | BLD-001 | (a) The premise "BROKEN on the corporate network" is contradicted by the owner's test (CDN libraries loaded on the work laptop). (b) Too large: it combines vendoring with new server routing | Reclassify as "WORKING with runtime CDN dependency". Keep P0 for charter §10–11 (no third-party requests, supply chain). Move static serving to BLD-004. Acceptance: no CDN requests in the Network panel on the managed laptop | Depends on BLD-004 instead of SEC-001 | Urgency down (the app works today); the leakage and supply-chain risk is unchanged | A, N, I |
| V-02 | SEC-002 | It depended on BLD-001 only to get static serving of `app/` | Depend on BLD-004 | BLD-001 → BLD-004 | Lower coupling | A, I |
| V-03 | TST-001 | Too large: harness, two runners, browser page and a complex legacy sandbox in one item | Split the sandbox into TST-004 | TST-003 now depends on TST-002 + TST-004 | Smaller review units | A, N, I |
| V-04 | SEC-001 | The fixed `Host` allowlist would return 421 for the Codespaces URL the owner's Continuum links to, breaking current use without a decision. Codespaces is also an undeclared external boundary | Configurable `ALLOWED_HOSTS`; README states Codespaces is outside the tenant; DEC-032 needed | None | Prevents breakage; surfaces a hidden data boundary | A |
| V-05 | BAK-001 | It assumes data lives at `http://localhost:3005` and that `crypto.subtle` exists. The owner also runs `file://` copies, where `crypto.subtle` may be unavailable and browser data is held separately | Hash fallback (`hash_unavailable`); owner checkpoint to back up every origin used | None | **Data-loss risk reduced** (a storage migration without backup was otherwise possible) | A |
| V-06 | SHL-001 | Too large (relocation plus new shell). HR-3 assumed a single origin | Split relocation into SHL-004 with an every-origin backup precondition | SHL-001 depends on SHL-004 | Lower | A, N, I |
| V-07 | DAT-003, DAT-004, DAT-005 | Under `file://` the server never exists. DAT-003 would show a permanent warning (alarm fatigue); DAT-004 and DAT-005 would attempt pointless POSTs | Protocol-aware behaviour: neutral "browser only" status; skip server logic | None | Lower | A |
| V-08 | REF-001 | The regex design is superseded by the owner ("no regex; one-time unchangeable reference"). File-name safety was previously guaranteed by the regex | Minimal normalisation; `fileNameFor()` encoding; new test table; no suffix | None | Typos become permanent → mitigated by V-09 confirmation | A |
| V-09 | REF-002 | The "mark primary" UI conflicts with the owner rule (first entered = primary); the workstream field is unexplained | Remove both; add a type-to-confirm dialog for the permanent reference | None | Lower (prevents accidental permanent typos) | A |
| V-10 | DOC-001 | Must record the new owner facts (no regex, CDN reachable, Teams channel knowledge, download policy) or architecture stays wrong | Extended scope (two more files) | None | Lower | A |
| V-11 | IMP-003 | `MM/DD/YYYY` would reject live values like `7/1/2025`; the live column names are now confirmed | `M/D/YYYY` and `D/M/YYYY` tokens accepting 1–2 digits; tests | None | Lower (prevents mass import errors) | A |
| V-12 | PUB-001, SPO-001 | "Ask where to save" is disabled by policy, so the download transport would scatter files into Downloads. Hidden interpretation about the transport order | `saveDialog` first; explicit "move from Downloads" checklist; allow SPO-001 to be pulled into Phase 2 after COP-001 if the probe passes | SPO-001 optional earlier slot (F2.8) | Lower publication-error risk (R-20) | A, S |
| V-13 | COP-003, DOC-002 | It assumed SharePoint-folder knowledge; the owner showed Agent Builder accepts only Teams channel folders | Knowledge = Teams channel Files folder; SETUP describes Teams channel sync; DEC-033 | None | Copilot V2 now feasible on evidence (sharing still unverified) | A |
| V-14 | DOC-002 | Missing dependency: it edits `app/views/help.js`, which PWA-001 creates | Add PWA-001 | +PWA-001 | Avoids an ordering failure | A, I |
| V-15 | UI-001 | Too large; the adapter mapping is correctness-critical and was buried in a view item | Split the adapter into UI-007 with golden-equivalence tests | UI-001 depends on UI-007 | **Lower risk of silently wrong figures** | A, N, I |
| V-16 | SHL-001 | (see V-06) | — | — | — | — |
| V-17 | IMP-004, IMP-005 | Too large (intake, preview, persistence, quota handling) | Split persistence into IMP-008 | IMP-005 depends on IMP-008; STO-002 moves to IMP-008 | Lower | A, N, I |
| V-18 | CHT-004, COP-001, REP-003 | Too large (ten intents plus framework plus fallback) | Split into CHT-004 (framework + 4 intents) and CHT-005 (6 intents + fallback + ambiguity) | COP-001 and REP-003 depend on CHT-005 | Lower | A, N, I |
| V-19 | UI-005 | Too large (core dialog, CSS and every view's markup) | Split view markup into UI-008 | UI-006 depends on UI-008 | Lower | A, N, I |
| V-20 | TST-003 | The manual verification could not be tested reliably (it depends on the system clock versus the sandbox `now`) | Remove the manual spot check; automated criteria only | None | Removes an untestable criterion | A |
| V-21 | STO-002 (ADR-009) | "All `file://` pages share one storage origin" is stated as fact without evidence | Mark as unverified; record the probe result | None | Accuracy | A |
| V-22 | UI-006, ODO-001 | "`app/views/*.js`" required interpretation of which files | Explicit file lists | UI-006 → UI-008 | Lower scope creep | A, I |
| V-23 | EXECUTION_SEQUENCE 0.3 | The "first time it works at work" checkpoint is false (it already works) | Corrected in FINAL | — | — | S |
| V-24 | BAS-002 | The owner's test opened the file from Downloads, not from a synced Teams/SharePoint folder; OV-3 is still unverified | The probe must be run from the synced channel folder (FINAL F0.2) | — | — | S |
| V-25 | REP-002 | Possible "cleanup too early" | Reviewed and **kept in Phase 1**: it removes only the superseded v1–v3 folders after a tag, touches no v3.5 runtime file, and is reversible by revert | — | Unchanged | — |
| V-26 | BLD-002 | The claim "npm does not carry fixed SheetJS versions" comes from assessor knowledge, not repository evidence | Kept: the item already requires an advisory check with source and date in `VENDOR.md` | — | Unchanged | — |
| V-27 | OD-5 (architecture) | Superseded fact | Recorded through DOC-001 (V-10) | — | — | A |

## 4. Review against each challenge category

| Category | Result |
|---|---|
| Circular dependencies | None (graph check over the 88 items) |
| Tasks too large | 7 found and split: BLD-001, TST-001, SHL-001, UI-001, IMP-004, CHT-004, UI-005 |
| Hidden interpretation | View-file wildcards (V-22); transport order (V-12); reference format after the owner's change (V-08). All corrected |
| Unsafe ordering | DOC-002 before PWA-001 (V-14), fixed. SPO-001 pull-forward placed after COP-001 to respect its dependency |
| Unnecessary framework migrations | None. Model A no-build is kept; no framework is introduced |
| Premature cloud integration | None. Graph, Copilot APIs and hosting are Phase 4 decision records only |
| Premature Microsoft Graph work | None (GRF-001 is a record, blocked by approvals) |
| Minified-code migration without characterisation tests | None. All SRC-* depend on TST-003. There is no minified first-party code |
| Storage migration without backup | **One found** (V-05: backups missed `file://` and Codespaces origins), corrected. SHL-004, IMP-006 and SRV-001 require backups |
| Service-worker changes without recovery | None. PWA-002 has a kill-switch and is Phase 4 |
| Copilot assumptions without licence/tenant evidence | COP-003 updated with owner evidence (Teams folders). Sharing (CV-1) remains unverified and the item stays P3 / admin-gated. COP-002 needs the Copilot URL (DEC-030) |
| OneDrive/SharePoint assumptions without authentication evidence | V1/V2 rely on the OneDrive sync client and SharePoint permissions only; no app authentication. Probe gating remains for V2 (DEC-026) |
| Tasks silently changing data boundaries | **One found:** Codespaces use (V-04, DEC-032). PUB-001, REF-002, COP-002, ODO-001 and BAK-001 show notices |
| Missing manual browser validation | Pure-module items (IMP-001, IMP-002, REF-001, STO-001, UI-007) are covered by browser-run unit tests. Every UI item has manual steps. OV checks are centralised in BAS-002 |
| Missing rollback | None |
| Security work that could break the app | SEC-001 (V-04) corrected. SEC-005 CSP has a fallback (DEC-020) and a manual check. SEC-003/004 manual checks keep the slicer and scenario buttons working |
| Repository cleanup too early | REP-001 after characterisation and escaping; REP-002 reviewed (V-25); REP-003 gated by parity sign-off and two weeks of use (HR-8) |
| Duplicate items | None found. ODI-001 and DOC-002 overlap in guidance text; their scopes differ (in-app panel vs documents) |
| Untestable acceptance criteria | TST-003 manual check removed (V-20). The DOC-002 "walkthrough without help" check is kept, as an owner judgement |
| Statements not supported by evidence | OD-5 CDN block (V-01, V-27), storage-origin sharing (V-21), the SheetJS npm claim (V-26, already gated by an advisory check) |

## 5. Items reviewed and not challenged

BAS-001, BAS-002 (scope), TST-002, MIG-001, DAT-001, DAT-002, DAT-006, CHT-001, CHT-002, SEC-003, SEC-004, SRC-001…SRC-004, BLD-003, REP-001, STO-001, STO-003, STO-004, SEC-005, IMP-001, IMP-002, IMP-006, SHL-002, SHL-003, REL-001, REP-002, UI-002, UI-003, UI-004, FIX-001…FIX-004, PUB-002, ODO-002, ODI-001, SPI-001, REF-003, CHT-003, COP-002, PWA-001, REL-002, SRV-001, XREP-001, ODI-002, IMP-007, COP-004, PWA-002, GRF-001, COP-005.

## 6. Remaining open inputs (block specific items only)

| Input | Blocks | Owner action |
|---|---|---|
| Probe results from the **synced Teams/SharePoint folder** (OV-1…OV-6, CSP, storage origin, save picker) | DEC-020, DEC-023, DEC-026 → SEC-005, PUB-001, ODI-002, SPO-001 | Run BAS-002 when built |
| DEC-032: use Codespaces with real data? | SEC-001 README text; future boundary | Decide yes/no |
| DEC-033: host `Continuum/` in a Teams channel Files folder | DOC-002, COP-003 | Decide the team/channel |
| CV-1: can an Agent Builder agent be shared? | COP-003 option | Check the Share option on a test agent |
| DEC-030: Copilot Chat URL | COP-002 | Copy it from the browser address bar |
| Resource-rule date order on a live export (`D/M/YYYY`?) | IMP-003 acceptance | Check one live file |
| Whether one opportunity is ever delivered as several separately tracked projects | DEC-011 (suffix; currently "not used") | Confirm |
