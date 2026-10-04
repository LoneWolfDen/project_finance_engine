# Architecture Decision Register

Date: 2026-10-04 · All decisions are **Proposed** until the owner accepts them. "OD-n" refers to the owner decisions in `TARGET_ARCHITECTURE.md` §0. Finding IDs refer to `docs/assessment/*`.

| ID | Decision | Status |
|---|---|---|
| ADR-001 | Model A: human-readable no-build, classic scripts | Proposed |
| ADR-002 | Distribute as `file://` app from a SharePoint-synced folder; PWA features dormant | Proposed |
| ADR-003 | Retire `server.py` and SQLite | Proposed |
| ADR-004 | Publisher/viewer split; SharePoint permissions as access control | Proposed |
| ADR-005 | Deliver data as `dataset.js` (script tag) with `dataset.json` twin | Proposed |
| ADR-006 | Continuum Reference ID (`CR-<OpportunityID>[-Wnn]`) | Proposed. **Superseded on 2026-10-04 by DEC-001-R1, DEC-002 and DEC-011-R1** (see the note under ADR-006) |
| ADR-007 | Registry as one JSON file per reference | Proposed |
| ADR-008 | Vendor all libraries locally with hashes; upgrade SheetJS and jsPDF | Proposed |
| ADR-009 | Namespaced browser storage on the shared `file://` origin | Proposed |
| ADR-010 | Integer schema versions with pure forward migrations | Proposed |
| ADR-011 | Snapshots + SharePoint version history as backup; rollback = republish | Proposed |
| ADR-012 | No in-app AI calls; deterministic chat; Copilot via handoff | Proposed |
| ADR-013 | Copilot V2 via Agent Builder: shared, or reproducible from versioned instructions | Proposed |
| ADR-014 | Graph/MSAL/Microsoft picker deferred until an HTTPS origin is approved | Proposed |
| ADR-015 | Strict CSP with `connect-src 'none'` | Proposed |
| ADR-016 | Publish minimised aggregates; raw dumps stay private | Proposed |
| ADR-017 | Keep author attribution; add LICENSE and About; footer switchable | Proposed |
| ADR-018 | Microsoft Edge is the primary supported browser | Proposed |
| ADR-019 | Browser-run test harness without npm; characterisation tests first | Proposed |
| ADR-020 | Releases are versioned folders + tag + zip | Proposed |
| ADR-021 | Shared `continuum-core/` folder copied verbatim between Continuum apps | Proposed |

---

### ADR-001: Model A, human-readable no-build with classic scripts
* **Context:** No build system exists. The app is readable. The owner is a non-developer working with coding agents. Distribution is `file://`, where ES modules do not load in Chromium.
* **Decision:** Plain `<script src>` files in a fixed order, one global namespace per layer (`Continuum.*`, `CFE.*`). No transpilation or bundling.
* **Evidence:** DEPENDENCY_BUILD_REGISTER §1; MINIFIED_AND_GENERATED_CODE_REGISTER §1; OD-2, OD-3.
* **Consequences:** No import syntax; load order must be maintained by hand (guarded by `CFE.require`). Zero tooling to ship.
* **Revisit if:** an HTTPS origin becomes the main distribution (ES modules then work without a build).

### ADR-002: `file://` distribution from a SharePoint-synced folder
* **Context:** The owner requires nothing to communicate outside (OD-2) and chose the SharePoint file-open approach. Hosting would need approvals.
* **Decision:** Viewers open `Continuum/Finance/index.html` from their synced library. Service worker and install stay dormant (specified, gated on `https:`).
* **Charter deviation:** charter §10 (service worker, installability). Justified by OD-2. Offline is inherent because the files are local.
* **Consequences:** No fetch of local files (hence ADR-005); no Entra redirect (hence ADR-014); a shared storage origin (hence ADR-009); parent-directory paths avoided.
* **Validation:** OV-1…OV-6.
* **Revisit if:** IT offers an approved internal HTTPS host.

### ADR-003: Retire `server.py` and SQLite
* **Context:** SEC-01 and SEC-02 are BLOCKERs. Viewers cannot run Python. The server duplicates browser storage and causes D-01.
* **Decision:** Remove it from the runtime. Data lives in published files.
* **Consequences:** Ollama experiments need a separate dev tool; the legacy config import is file-based.
* **Rollback:** legacy app and server remain in Git history and in `legacy/` until S7.

### ADR-004: Publisher/viewer split
* **Context:** OD-4. The PIN was false assurance (SEC-08).
* **Decision:** One publishing role writes `published/`; viewers are read-only. Rights are enforced by SharePoint folder permissions, not app code.
* **Consequences:** Viewers cannot alter shared data. Scenarios stay personal.

### ADR-005: `dataset.js` script delivery with a `dataset.json` twin
* **Context:** `fetch`/XHR of local files is blocked under `file://`; `<script src>` is not.
* **Decision:** The publisher writes the same canonical JSON twice: as `dataset.json`, and wrapped as `window.CFE_PUBLISHED_DATASET = …;` in `dataset.js`. The viewer loads the `.js` automatically; the `.json` serves as manual-picker fallback and archive. The manifest is written last, with a SHA-256 of the payload.
* **Risks:** Executable data file (mitigated by write permissions, a serialiser-only writer, shape and hash validation); `.js` download warnings (publishing uses File System Access, not downloads; OV-4).

### ADR-006: Continuum Reference ID

> **Superseded on 2026-10-04 by DEC-001-R1, DEC-002 and DEC-011-R1** (`docs/continuity/DECISIONS.md`). The original text below is kept for history.
> * **Format (DEC-001-R1):** no `CR-` prefix and **no format regex**. The reference is the first opportunity number the user enters, normalised only by trimming, removing whitespace and upper-casing (1–64 characters, no control characters). The owner's OpportunityIDs look like `O-` plus digits, so a typical reference is **`O-5030460`**. It is stored once and can never be edited; corrections only via `superseded_by`. The Registry file name is `<fileNameFor(ref)>.json` (REF-001). Deep link `#/ref/<ref>`.
> * **Several opportunity numbers (DEC-002):** a project can carry several opportunity numbers (Continuum's `opportunity_numbers` list). The **first one entered at project creation is the primary** and *is* the reference. Numbers added later are linked and act as aliases that resolve to the same record.
> * **No workstream suffix (DEC-011-R1, Proposed):** `-Wnn` is not generated or accepted as a separate form, so `O-5030460-W02` is no longer a valid example of a derived reference. A separately tracked project is created with its own first opportunity number.
> * **Open item resolved:** the "exact CRM OpportunityID format" question below is closed by the owner's choice of no regex.

* **Context:** OD-7. A user-entered, non-temporal key shared by all Continuum apps is needed. The closest current key (`PO_Team_Identifier`) is finance-specific.
* **Decision:** `CR-<normalised OpportunityID>` plus an optional `-Wnn` workstream suffix. Immutable, never reused, corrections by `superseded_by`, characters `A–Z 0–9 -`. Deep link `#/ref/<CRID>`.
* **Consequences:** `PO_Team_Identifier` and PeopleSoft Project IDs become linked attributes in the Registry crosswalk.
* **Open:** the exact CRM OpportunityID format (sets the validation pattern), and the workstream policy.

### ADR-007: Registry as one file per reference
* **Context:** Several apps and users create references. One shared file would cause OneDrive sync conflicts.
* **Decision:** `Continuum/Registry/CR-….json`, one per reference; conflict copies detected and shown as Needs confirmation.
* **Consequences:** Listing requires folder access (handle or picker) for creators/publishers. Viewers receive the needed subset embedded in each app's published dataset.

### ADR-008: Vendor all libraries locally
* **Context:** The proxy blocks CDNs (OD-5); SEC-04, SEC-06, SEC-07.
* **Decision:** `vendor/<lib>/` with `VENDOR.md` (name, version, licence, source URL, SHA-256) and licence texts; a test verifies hashes. First vendor the current versions unchanged (S0), then upgrade SheetJS and jsPDF to patched releases (S0b).
* **Consequences:** Library updates become explicit, reviewed commits.

### ADR-009: Namespaced storage on the shared `file://` origin
* **Context:** Chromium treats local files as one storage origin, so every Continuum app on a laptop shares `localStorage`/IndexedDB.
* **Decision:** Keys `continuum.<app>.*`; IndexedDB named `continuum-<app>`; only preferences, drafts, scenarios and handles are stored locally; quota errors are visible.
* **Validation:** confirm origin behaviour in managed Edge (part of OV-1).

### ADR-010: Schema versioning
* **Decision:** Integer `schema_version` on every persisted structure. Pure `vN→vN+1` migrations with tests. Older data is migrated in memory; newer data is refused. History is never rewritten.

### ADR-011: Backup and rollback
* **Decision:** Snapshot to `history/` before every publish (verified by hash read-back); SharePoint version history as a second layer; rollback is a new publish event with a reason. Local drafts and scenarios can be exported as checksummed JSON.
* **Addresses:** D-01…D-10, F-15, F-19, F-20.

### ADR-012: No in-app AI calls
* **Context:** OD-2, OD-6, charter §9.
* **Decision:** Default provider `none` (deterministic, cited, labelled). `copilot-handoff` builds a grounded package the user pastes into Copilot. Ollama is dev-only and not shipped. Remote providers are V3 slots only.
* **Consequences:** No AI cost, no API dependency; Copilot answers stay outside the app and come back only as Draft notes.

### ADR-013: Copilot V2 via Agent Builder
* **Context:** OD-8.
* **Decision:** Fact packs in `published/copilot/` serve as agent knowledge. The agent is shared if the tenant allows; otherwise users build it from `copilot/AGENT_SETUP.md` and `AGENT_INSTRUCTIONS.md`.
* **Validation:** CV-1…CV-4.

### ADR-014: Graph, MSAL and Microsoft picker deferred
* **Context:** These require an HTTPS redirect origin, an Entra registration and admin consent, none of which exist under ADR-002.
* **Decision:** No V3 code. Transport interfaces (`folders.js`, `publisher.js`) are designed so Graph can replace synced folders later without touching calc or views.

### ADR-015: Strict CSP
* **Decision:** Meta CSP `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`.
* **Validation:** how `'self'` resolves under `file://` in Edge/Chrome/Safari. If `'self'` does not match local files, fall back to `script-src file:` (test), keeping `connect-src 'none'` in all cases.
* **Consequence:** inline scripts, inline styles in markup and `on*=` handlers must be removed (slice S2). This **enforces** "no hidden external data transmission".

### ADR-016: Data minimisation
* **Decision:** Publish person-month aggregates. A name policy is chosen at publish time. Present mode masks names and rates. Raw dumps stay in the publisher's personal OneDrive. Mapping profiles drop unneeded columns.
* **Addresses:** SEC-12.

### ADR-017: Attribution and licence
* **Context:** OD-9. The owner built this in their own time and will publish the repository.
* **Decision:** Keep attribution in the About panel and an export footer (default on, user-switchable). Add a LICENSE before the repository becomes public (owner chooses; MIT suggested). Fixtures and samples are synthetic and labelled.

> **Updated on 2026-10-04 by DEC-005 and DEC-031.** The licence is **MIT** (owner decision; DEC-005, Accepted). LICENSE text: "Copyright (c) 2026 Vamsi Yedlapalli" (DEC-031, Accepted). It is added by REL-001. Real names in published data are covered by DEC-006 (DATA_AND_STORAGE §9), not by this ADR.

### ADR-018: Primary browser Edge
* **Decision:** Edge is fully supported (viewer and publisher), Chrome is equivalent, Safari and Firefox are viewer plus V1 fallbacks. Publisher features require Edge or Chrome.

### ADR-019: Testing without npm
* **Decision:** `tests/index.html` runs in the browser; the optional `node tests/run-node.js` uses only built-in Node modules. Characterisation golden tests come before any refactor. Calc tests run under several time zones.
* **Addresses:** TEST_AND_RELEASE_READINESS §6.

### ADR-020: Release packaging
* **Decision:** A release is a versioned folder with `SHA256SUMS.txt`, a Git tag `finance-vX.Y.Z` and a GitHub release zip. Install and rollback are folder copies inside `Continuum/Finance/releases/`. `VERSION.js` declares the supported schema range.

### ADR-021: Shared `continuum-core/`
* **Context:** OD-7. The owner wants to copy the same code across Continuum applications.
* **Decision:** One dependency-free folder (`ref.js`, `html.js`, `storage.js`, `folders.js`, `csv.js`, `hash.js`, `provenance.js`, `status.js`, `log.js`) with `CORE_VERSION.js`, copied verbatim into each app. Diagnostics shows the core version.
* **Consequence:** Copies can drift. Mitigation: a Continuum-level changelog for core, plus a test in each app asserting the core version it was tested with.
* **Revisit if:** more than three apps share it (consider a dedicated `continuum-core` repository with tagged releases).
