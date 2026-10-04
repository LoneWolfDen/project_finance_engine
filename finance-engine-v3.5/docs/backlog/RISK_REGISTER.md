# Risk Register

Date: 2026-10-04. Likelihood (L) and Impact (I): High / Medium / Low.

| ID | Risk | L | I | Mitigation | Linked items | Trigger to re-assess |
|---|---|---|---|---|---|---|
| R-01 | `file://` behaviours (File System Access, persisted handles, script loading from synced folders, IndexedDB, CSP `'self'`) differ from assumptions on the managed laptop | Medium | High | BAS-002 probe first; documented fallbacks (DEPENDENCY_MAP §3) | BAS-002, STO-004, SEC-005, PUB-001, ODI-002, SPO-001 | Probe results |
| R-02 | Edge group policy blocks File System Access or file URLs | Medium | Medium | V1 paths need no special APIs; IT request documented | ODI-002, SPO-001 | OV-6 result |
| R-03 | Golden tests encode existing defects, so "green" is mistaken for "correct" | High | Medium | Goldens are labelled characterisation; known defects named (C-01); FIX items update named goldens with a justification | TST-003, FIX-* | Any golden update |
| R-04 | Vendor upgrades (SheetJS, jsPDF) change parsing or output | Medium | Medium | Before/after goldens (BLD-002); smoke tests and a manual PDF check (BLD-003) | BLD-002, BLD-003 | Test failure |
| R-05 | `dataset.js` is executable: a malicious or corrupted file runs in the viewer's page | Low | High | Write access to `published/` only for publishers (SharePoint permissions); plain-data check; SHA-256 verification; CSP | STO-004, PUB-001, SEC-005 | Permission change on the library |
| R-06 | OneDrive sync lag or conflicts: viewers see old data, or conflict copies appear | Medium | Medium | The banner shows as-of and published time; the manifest is written last; conflict detection in Registry; V2 conflict check before writing | SHL-002, PUB-001, SPI-001, SPO-001 | User reports |
| R-07 | Files-On-Demand placeholders are not available offline | Medium | Low | SETUP: "Always keep on this device" | DOC-002, PWA-001 | — |
| R-08 | Browser storage quota exceeded (drafts with many timesheet rows) | Medium | Medium | Visible errors; "Save draft to file"; aggregates rather than raw data in publications | DAT-003, STO-002, IMP-004 | Quota error logged |
| R-09 | Data leaves the tenant through Copilot Web mode | Medium | High | Work-mode warning (DEC-007); preview of the exact text; nothing is sent automatically | COP-002, DOC-002 | Tenant policy change |
| R-10 | Real data committed to the public repository | Medium | High | `.gitignore` for `published/` and `Finance-Drop/`; fixtures synthetic; static scan; rules §2.10 | STO-003, TST-002, SEC-005 | Before making the repo public: run `git log -p` for data patterns |
| R-11 | Small models widen scope or "fix forward" | Medium | Medium | Execution rules, diff inspection, files-allowed lists, stop on failure | All | Diff contains unexpected files |
| R-12 | Leaders act on stale or partial data | Medium | High | Readiness banner; staleness threshold; publication verification | SHL-002, PUB-001 | — |
| R-13 | Reference mismatch between Continuum (timestamp IDs) and Finance (`O-` numbers) | High (until XREP-001) | Medium | Aliases; Paste reference normalises; handoff document | REF-001, REF-003, XREP-001 | XREP-001 completion |
| R-14 | Single publisher (bus factor 1) | High | Medium | PUBLISH.md runbook; any user with write permission can publish; history allows rollback | DOC-002, PUB-002 | Owner absence |
| R-15 | Legacy browser data (origin `http://localhost:3005`) becomes unreachable when moving to `file://` or retiring the server | Medium | High | Keep the origin (HR-3); BAK-001 backups; IMP-006; DEC-025 sign-off | SHL-001, IMP-006, SRV-001 | — |
| R-16 | Vulnerable SheetJS used until BLD-002 | Medium | Medium | BLD-002 in Phase 0; import only trusted PeopleSoft exports meanwhile | BLD-002 | — |
| R-17 | Real names in a widely shared SharePoint library are visible to everyone with access | Medium | Medium | Library permissions limited to the leadership group; Present mode; minimisation (no daily rows) | DEC-006, UI-006, STO-001 | Library membership change |
| R-18 | Agent Builder unavailable or restricted in the tenant | Medium | Low | V1 handoff works regardless; COP-003 is P3 | COP-003 | CV-1 result |
| R-19 | Several copies of `continuum-core/` drift between apps | Medium | Medium | `CORE_VERSION`; Diagnostics shows the version; handoff doc for Continuum | REF-001, XREP-001 | New Continuum app |
| R-20 | V1 publishing (multiple save dialogs) is error-prone | High | Medium | Checklist plus a **Verify publication** button; pull SPO-001 forward if OV-1 passes | PUB-001, SPO-001 | Failed verification |
| R-21 | `.js` downloads blocked or warned by Edge or SmartScreen | Medium | Medium | `saveDialog` transport (DEC-023) | PUB-001 | OV-4 result |
| R-22 | Continuum repository contains minified code of unknown provenance that copies of `ref.js` must coexist with | Medium | Low | `ref.js` is a dependency-free classic script with its own global; project_onion assessed separately | XREP-001 | project_onion assessment |
