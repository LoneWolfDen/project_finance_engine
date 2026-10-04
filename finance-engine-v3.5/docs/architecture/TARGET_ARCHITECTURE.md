# Target Architecture: Continuum Finance Engine

Status: Proposed · Date: 2026-10-04 · Baseline: commit `991cacf` (assessment) on `5d453d1` (code)
Inputs: `PWA_ARCHITECTURE_CHARTER.md`, `docs/assessment/*`, owner decisions of 2026-10-02 and 2026-10-04.
Companion documents: `DATA_AND_STORAGE_ARCHITECTURE.md`, `ONEDRIVE_SHAREPOINT_ARCHITECTURE.md`, `COPILOT_AND_CHAT_ARCHITECTURE.md`, `MINIFIED_CODE_MIGRATION_STRATEGY.md`, `ADR_REGISTER.md`.

This is a design document. It contains no implementation code.

---

## 0. Owner decisions that constrain the design

| # | Decision | Consequence |
|---|---|---|
| OD-1 | Only `finance-engine-v3.5` is maintained; v1–v3 are archived | One codebase, one startup path |
| OD-2 | The app runs on the user's work laptop and must **not communicate outside** the device or tenant. Hosting choice: **open the app from a SharePoint library synced by OneDrive** (`file://`) | No web host, no server, no runtime network calls |
| OD-3 | Viewers are senior leaders who will not run Python or a terminal. Everything is click-only, with a clear readiness status | No local server; status banner is mandatory |
| OD-4 | One publisher (the owner) refreshes data from PeopleSoft CSV/XLSX dumps. Others only view | Publisher/viewer split |
| OD-5 | Corporate proxy blocks public CDNs | All libraries are vendored in the repository |
| OD-6 | AI target is the existing **Microsoft 365 Copilot (premium) licence**, with no Copilot API. Ollama is experimental only | No in-app AI provider in releases; Copilot via packages and agents |
| OD-7 | A cross-application **Continuum Reference ID** derived from the user-entered **OpportunityID** must identify a project in every Continuum application, and must be copy-pasteable code | Shared identity contract and a shared `continuum-core` folder |
| OD-8 | Agent Builder agents should be shareable, or reproducible by each user | Agent instructions are versioned in the repo |
| OD-9 | DEFAULTS and the PIN were synthetic/test data. The repo will become public; attribution stays | Licence + About panel; no real data ever committed |
| OD-10 | Users can create dedicated folders during set-up | Fixed folder layout convention |

---

## 1. Choice of model: **A. Human-readable no-build PWA**

| Evidence | Source |
|---|---|
| No build system exists (no `package.json`, lockfile, bundler or transpiler), so there is nothing "healthy" to keep | DEPENDENCY_BUILD_REGISTER §1 |
| The application is already readable, hand-written HTML/JS; there is no minified first-party code | MINIFIED_AND_GENERATED_CODE_REGISTER §1 |
| The owner is not a developer; maintenance is by humans and coding agents reading files directly | OD-9, user profile |
| Viewers cannot run tooling; the publisher should not need Node/npm to ship | OD-3 |
| Distribution is `file://` from a synced folder (OD-2). **ES modules do not load over `file://` in Chromium**, which makes a module bundler (Model B) the only way to use modules. That would add a toolchain to solve a problem plain scripts avoid | OD-2 |

**Variant chosen: A-classic.** Plain `<script src>` files (not ES modules), each registering into one global namespace in a fixed load order declared in `index.html`. No transpilation and no build step. Vendor files are committed as-is under `vendor/`.

**PWA scope under `file://`:** Service workers and installation require an HTTPS origin, so they are **unavailable** in the chosen distribution. The app is still designed to PWA principles: offline by construction, same-origin resources only, CSP, accessible, recoverable. A manifest and service worker are specified (§18–20) but stay dormant unless an approved HTTPS origin appears later. This is a recorded deviation from charter §10 (ADR-002).

---

## 2. Source structure (repository)

```
finance-engine/                         (renamed from finance-engine-v3.5 at archive time; see migration)
├─ index.html                           viewer + publisher shell; script load order; CSP meta
├─ app/
│  ├─ VERSION.js                        app version, schema versions supported, build date (hand-edited at release)
│  ├─ config.js                         defaults + feature flags (no secrets)
│  ├─ css/
│  │  ├─ tokens.css                     colours, spacing, font sizes (AA contrast)
│  │  ├─ app.css
│  │  └─ present.css                    screen-sharing mode
│  ├─ continuum-core/                   SHARED across Continuum apps (copy whole folder; own VERSION)
│  │  ├─ CORE_VERSION.js
│  │  ├─ ref.js                         Continuum Reference ID contract (normalise, validate, link)
│  │  ├─ html.js                        escaping + safe template helper
│  │  ├─ storage.js                     namespaced localStorage/IndexedDB adapter
│  │  ├─ folders.js                     File System Access + fallbacks
│  │  ├─ csv.js                         RFC 4180 parser
│  │  ├─ hash.js                        SHA-256 (SubtleCrypto with fallback)
│  │  ├─ provenance.js
│  │  ├─ status.js                      readiness banner model
│  │  └─ log.js                         in-memory diagnostics log
│  ├─ data/                             schema.js, migrate.js, mappings/*.js, validate.js, normalise.js, minimise.js
│  ├─ calc/                             calendar.js, fx.js, forecast.js, actuals.js, rollover.js, kpi.js  (pure, no DOM)
│  ├─ store/                            dataset-loader.js, publisher.js, snapshots.js, registry.js, prefs.js
│  ├─ views/                            shell.js, overview.js, burndown.js, variance.js, po.js, invoices.js,
│  │                                    resources.js, utilisation.js, expenses.js, scenarios.js,
│  │                                    publish.js, diagnostics.js, about.js, project.js
│  ├─ chat/                             retrieve.js, answer.js, providers/none.js, providers/copilot-handoff.js
│  ├─ export/                           xlsx.js, pdf.js, pptx.js, copilot-pack.js
│  └─ app.js                            router (#/ref/<CRID>), boot sequence, global error handler
├─ vendor/
│  ├─ VENDOR.md                         name, version, licence, source URL, SHA-256 per file
│  ├─ chartjs/  chartjs-plugin-datalabels/  sheetjs/  jspdf/  jspdf-autotable/  pptxgenjs/
│  └─ licences/                         upstream licence texts
├─ samples/                             synthetic data only (+ README stating so)
├─ tests/
│  ├─ index.html                        open in browser → runs all tests (no npm)
│  ├─ harness.js                        tiny assert/report library (readable, ~100 lines)
│  ├─ run-node.js                       optional CLI runner for the developer (Node, no packages)
│  ├─ fixtures/                         synthetic inputs + golden outputs
│  └─ unit/ characterisation/ integration/ security/
├─ copilot/
│  ├─ AGENT_INSTRUCTIONS.md             Agent Builder instructions (versioned)
│  └─ AGENT_SETUP.md                    click-by-click set-up for users who build their own agent
├─ docs/                                architecture/, assessment/, operations/ (SETUP, PUBLISH, ROLLBACK)
├─ legacy/                              current v3.5 index.html kept runnable until parity (deleted at end of migration)
├─ LICENSE                              owner's choice (e.g. MIT) before going public
├─ CHANGELOG.md
└─ .gitignore                           excludes drop/, published/, *.db, any non-sample data
```

Rules: one responsibility per file; no file over ~400 lines; no inline `<script>` or `on*=` attributes; no generated or minified first-party code.

---

## 3. Runtime architecture

### 3.1 Deployment layout (on SharePoint, synced to each laptop)

```
SharePoint site "Continuum" → document library (synced via OneDrive; folder set "Always keep on this device")
Continuum/
├─ Finance/                              ← one folder per Continuum app
│  ├─ index.html                         ← viewers open THIS file (favourite / desktop shortcut)
│  ├─ app/  vendor/                      ← current release (read-only for viewers)
│  ├─ published/                         ← written only by publisher(s)
│  │  ├─ manifest.js  manifest.json      ← as-of, sources, hashes, schema, publisher, app version
│  │  ├─ dataset.js   dataset.json       ← normalised, minimised dataset (same payload, two wrappers)
│  │  ├─ copilot/                        ← Copilot fact packs (per reference + portfolio)
│  │  └─ history/<UTC-stamp>/            ← immutable snapshots of the four files above
│  └─ releases/finance-4.0.0/ …          ← previous app versions for rollback
└─ Registry/                             ← Continuum Reference registry (shared by all Continuum apps)
   └─ CR-<OPPORTUNITYID>.json            ← one file per reference (conflict-free)

Publisher's PERSONAL OneDrive (not shared):
Finance-Drop/                            ← raw PeopleSoft dumps (full PII; never shared)
```

All paths an app reads automatically go **downward** from its `index.html` (`app/…`, `vendor/…`, `published/…`). That avoids parent-directory restrictions some browsers apply to `file://`.

### 3.2 Roles and flows

```
PUBLISHER (owner, Edge/Chrome)
  Finance-Drop/*.csv|xlsx ──pick folder──► Import → Map → Validate → Minimise → Preview diff
                                            │                                 (vs current published)
  Registry/*.json ──pick folder──► resolve CRIDs                              ▼
                                                                         [Publish]
                                     write history/<stamp>/ first, then manifest/dataset (.js+.json),
                                     then copilot packs  ──► SharePoint sync ──► every viewer laptop

VIEWER (leader, any modern browser)
  open Finance/index.html[#/ref/CR-…]
     └─ <script src="published/manifest.js"> + <script src="published/dataset.js">   (no clicks, no network)
          └─ verify schema + hash → Readiness banner → views / chat / exports
```

### 3.3 Boot sequence (`app.js`)

1. Load `VERSION.js` and `config.js`, then the core, data, calc, store, views, chat and export scripts (order fixed in `index.html`).
2. Install the global `error` and `unhandledrejection` handlers. Any failure turns the banner red and is shown to the user.
3. Read `window.CFE_PUBLISHED_MANIFEST` and `window.CFE_PUBLISHED_DATASET`. If missing, show the **"Data not found"** state with the set-up instructions link and a manual "Open dataset.json" picker.
4. Validate the schema version, migrating in memory if older (DATA_AND_STORAGE §8), and verify the payload hash.
5. Compute the readiness status (§3.4) and route to `location.hash` (`#/ref/<CRID>`, `#/portfolio`, `#/publish`, `#/diagnostics`).

### 3.4 Readiness banner (always visible)

| State | Condition | Shown text (example) |
|---|---|---|
| 🟢 Ready | Dataset loaded, hash OK, age ≤ `config.staleAfterDays` (default 7), 0 blocking errors | "Data as of 1 Oct 2026 · published 2 Oct 09:10 by V. Y. · Timesheets to 30 Sep · 2 warnings" |
| 🟠 Attention | Age > threshold, warnings present, older schema migrated, or reference partially matched | "Data is 12 days old. Ask the publisher to refresh." |
| 🔴 Not ready | Dataset missing, hash mismatch, schema newer than app, parse failure, or unknown reference in deep link | "Dataset could not be read. The previous snapshot is available: open history." |

The banner text is plain language, uses an icon plus text (never colour alone), sits in an ARIA live region, and offers **Details** (opens Diagnostics).

---

## 4. Module boundaries

| Layer | Namespace | May depend on | Must not |
|---|---|---|---|
| continuum-core | `Continuum.*` | nothing | know Finance concepts |
| data | `CFE.data` | core | touch DOM, storage |
| calc | `CFE.calc` | core, data (types only) | touch DOM, storage, time-of-day except via injected `asOf` and `timeZone` |
| store | `CFE.store` | core, data | render HTML |
| export | `CFE.export` | core, calc, vendor libs | mutate state |
| chat | `CFE.chat` | core, calc, data | call network; render raw HTML |
| views | `CFE.views` | everything above | compute business numbers (call calc) |
| app | `CFE.app` | all | contain business rules |

Each file is an IIFE that registers into its namespace and declares what it expects (`CFE.require('calc.fx')` throws a readable error if the load order is wrong). `continuum-core/` is copied verbatim into other Continuum apps; its `CORE_VERSION.js` lets each app show which core version it carries.

---

## 5. State management

One plain object, `CFE.state`, with four regions. It is changed only through `CFE.actions.*` functions, which notify subscribers and trigger re-render of the active view.

| Region | Contents | Persisted? |
|---|---|---|
| `published` | Manifest + dataset (immutable after load) | No (comes from files) |
| `session` | Route, selected reference, year, PO-team filter, chat transcript | Route in URL hash; filters in namespaced prefs |
| `draft` | Publisher's in-progress import: parsed files, mapping, validation, diff | IndexedDB (survives reload; explicit discard) |
| `ui` | Open panels, present mode, sort orders | Namespaced prefs |

Viewers have no write path to `published`. Scenarios (what-if) are kept per user in IndexedDB and **reference** a dataset version; they are never full copies of raw data.

---

## 6. Local storage

Summary (details in DATA_AND_STORAGE_ARCHITECTURE §4):

* Under `file://`, Chromium gives all local files one storage origin, so **every Continuum app on the laptop shares `localStorage`/IndexedDB.** All keys are namespaced `continuum.<app>.<key>` (finance → `continuum.finance.*`), and IndexedDB databases are named `continuum-<app>`.
* Only preferences, publisher drafts, scenarios and folder handles are stored locally. The source of truth is `published/`.
* The Diagnostics panel shows storage usage via `navigator.storage.estimate()`. Write failures (quota) are surfaced to the user, never swallowed.

## 7. Backup and restore

Three layers (details in DATA_AND_STORAGE §6):

1. **Immutable snapshots** in `published/history/<stamp>/`, written *before* the current files are replaced.
2. **SharePoint version history** on every published file (free, tenant-governed).
3. **Rollback = republish a chosen snapshot** as a new publish event, with a visible reason. History is never edited.

Local publisher drafts and scenarios can be exported and imported as a versioned JSON backup with a checksum.

## 8. Schema versioning and migration

Every manifest, dataset, registry record, draft and scenario carries an integer `schema_version`. Migrations are pure, ordered functions (`v1→v2`, `v2→v3` …) covered by tests. The app migrates **older** data in memory and never rewrites published history. It **refuses newer** data with a red banner saying "Update the app". Details: DATA_AND_STORAGE §8.

## 9. File import

Publisher only. The steps are pick folder or files → detect type → parse (RFC 4180 CSV, vendored SheetJS for XLSX) → apply a **declarative mapping profile** (for example `peoplesoft-timesheet-v1`) → validate → resolve Continuum References → minimise → preview. Nothing is retained until the publisher accepts the preview. Details: DATA_AND_STORAGE §5.

## 10. Provenance

Every source file gets a provenance record: name, size, last-modified, SHA-256, imported time (UTC), parser and version, mapping profile, sheet name, row count. Every normalised record keeps `src = {file, sheet, row}`. Chat answers and exports cite these. Details: DATA_AND_STORAGE §7.

## 11–12. OneDrive and SharePoint input/output

V1 (now): pick files or folders from synced locations; drag and drop; preview; download/save exports.
V2 (now, Chromium): a persisted folder handle for the drop folder with **user-triggered Refresh** and a changed-file preview, plus direct write to `published/`.
V3 (future): Microsoft picker/Graph. **Blocked under `file://`** because Entra redirect URIs require an HTTPS origin.
Details: ONEDRIVE_SHAREPOINT_ARCHITECTURE.

## 13–15. Chat, AI provider boundary, Copilot

* The chat is **deterministic retrieval** over the published dataset with citations, labels (Fact / Inference / Recommendation / Not found / Needs confirmation) and a visible search scope. It needs no AI.
* AI providers sit behind the `AnswerProvider` interface. The release default is `none`; `copilot-handoff` builds a grounded package for the user to take to Copilot. Ollama is dev-only and excluded from releases.
* Copilot works in levels: V1 packages, V2 an Agent Builder agent grounded on `published/copilot/` (shared, or reproduced per user from `copilot/AGENT_SETUP.md`), and V3 approved APIs or agents.

Details: COPILOT_AND_CHAT_ARCHITECTURE.

## 16. Authentication options

| Level | Mechanism | Status |
|---|---|---|
| Now | **None in the app.** Access is controlled by the Windows/macOS sign-in, BitLocker/FileVault, and **SharePoint permissions** on `Finance/` (read for viewers) and `published/` + `Registry/` (write for publisher(s) only) | Chosen |
| Removed | Client-side PIN | Deleted (false assurance; SEC-08) |
| Future (V3) | MSAL.js, SPA authorisation-code + PKCE, delegated permissions, Entra app registration | Requires an approved HTTPS origin. Not possible from `file://` |

## 17. Microsoft Graph future path

Only after: an HTTPS origin is approved (for example Azure Static Web Apps behind Entra, or an internal web server); an Entra SPA registration exists; delegated scopes are least-privilege (`Files.Read` / `Files.ReadWrite` scoped by user-chosen items, or `Sites.Selected` granted to the specific site by an admin); and admin consent, conditional access and retention are recorded. Graph would then replace the synced-folder transport behind the `folders.js` and `publisher.js` interfaces, leaving calc and views unchanged. Details: ONEDRIVE_SHAREPOINT §V3.

## 18. Service worker

**Not used** under `file://` (unsupported by browsers). Design for a future HTTPS origin, kept dormant:
* `sw.js` is registered only when `location.protocol === 'https:'` **and** `config.enableServiceWorker === true`.
* Cache name includes the app version. Precache the app shell and vendor files; **never cache `published/` data** (network-first with a visible stale warning).
* Kill-switch: shipping `config.enableServiceWorker=false` makes the app unregister existing workers and clear their caches on next load.

## 19. Manifest and installability

`file://` pages cannot be installed. Instead, the set-up guide creates an Edge favourite and a desktop shortcut to `Finance/index.html`. `manifest.webmanifest` and icons are added to the repository (same-origin, no external references) so an HTTPS deployment can be installable without code change. The icons are the app's own and contain no third-party branding.

## 20. Cache lifecycle

* There is no service-worker cache. Files are read from the synced folder on each load, so a **release is a folder replacement** (see §25).
* Stale-tab detection: when the window regains focus, the app injects a fresh `<script src="app/VERSION.js?check=<time>">`. If the version differs from the loaded one, the banner shows "A new version is available. Reload". The same applies to `published/manifest.js` ("New data published. Reload").
* OneDrive Files-On-Demand: set-up marks `Continuum/Finance` as **Always keep on this device**, so the files are local and opening works offline.

## 21. Configuration

| Layer | File | Who edits | Contents |
|---|---|---|---|
| App defaults | `app/config.js` | Developer, per release | Staleness thresholds, enabled providers (`['none','copilot-handoff']`), feature flags, minimisation policy, standard hours/day, supported locations |
| Deployment | `published/manifest.js` (`deployment` block) | Publisher, via UI | Display name, organisation currency, reporting currency, staleness override |
| Per user | Namespaced prefs | Viewer, via UI | Present mode, default view, theme |

There are no secrets anywhere and no environment variables. Configuration is validated at boot, and invalid configuration means a red banner.

## 22. Logging and diagnostics

* `continuum-core/log.js` keeps an in-memory ring buffer (500 entries) with level, time, module and message. **It never records data values** (no names, rates or hours), only counts, IDs of files and error types.
* The **Diagnostics view** (`#/diagnostics`) shows app version, core version, schema versions, manifest summary, browser, `isSecureContext`, File System Access support, storage estimate, last 50 log lines and the failed checks. **Copy diagnostics** puts this text on the clipboard for support.
* The **publish log** is kept as the `publications` array inside `manifest.json` (last 100 entries): who, when, sources, row counts, warnings, reason (for rollbacks).

## 23. Security controls

| Control | Addresses |
|---|---|
| No server; retire `server.py`; no ports opened | SEC-01, SEC-02, SEC-11, SEC-16 |
| CSP meta: `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'` (behaviour of `'self'` under `file://` to be validated; fallback list in ADR-015) | No outbound transmission possible; XSS impact limited |
| No inline scripts or handlers; event delegation via `data-action` | Required for CSP |
| All dynamic text via `textContent` or the `Continuum.html` escaping template; no raw `innerHTML` of data (enforced by a test that greps for it) | SEC-03, SEC-05 |
| Vendor files local, hashed in `VENDOR.md`, verified by a test; SheetJS and jsPDF upgraded to patched releases | SEC-04, SEC-06, SEC-07 |
| Published dataset minimised (aggregates, pseudonymous option for viewers; raw dumps stay in publisher's personal OneDrive) | SEC-12 |
| `dataset.js` is a single assignment of JSON produced by the publisher's serialiser; loader validates shape and hash before use; only publishers may write `published/` (SharePoint permissions) | Script-delivery trust |
| Remove PIN, iframe "Copilot", Ollama mode from release builds | SEC-08, SEC-09, SEC-10 |
| `.gitignore` + a repository test that fails if files outside `samples/` and `tests/fixtures/` look like data dumps | Public repo hygiene |
| Personal attribution kept in About panel and an export footer that can be switched off in prefs | SEC-18 (owner decision) |

## 24. Testing

* There is no npm. `tests/index.html` is opened in Edge or Chrome and runs every suite. `node tests/run-node.js` runs the same pure suites from a terminal for the developer.
* **Characterisation tests first.** Golden outputs are captured from the *current* v3.5 functions on synthetic fixtures *before* any change (see MINIFIED_CODE_MIGRATION_STRATEGY §3).
* Suites: unit (calc, csv, ref, migrate), characterisation (forecast/actuals/burndown/rollover/KPIs vs legacy), integration (import → publish → load round trip using in-memory folder fakes), security (no `innerHTML` of data, CSP present, no `http(s)://` in app/vendor except licence text, vendor hashes), accessibility checklist (manual, recorded).
* Time zones: calc tests run under at least UTC−5, UTC, UTC+5:30 (Node `TZ`), plus one manual browser check.

## 25. Release packaging

* A release is a **folder**: `index.html`, `app/`, `vendor/`, `LICENSE`, `CHANGELOG.md`, `SHA256SUMS.txt`. A Git tag `finance-vX.Y.Z` and a GitHub release zip go with it once the repo is public.
* Install/update (publisher):
  1. Copy the new release to `Continuum/Finance/releases/finance-X.Y.Z/`.
  2. Run the tests page from there.
  3. Copy its contents over `Continuum/Finance/` (`published/` is untouched because it is not part of a release).
* Rollback: copy the previous `releases/finance-X.Y.(Z-1)/` back over `Finance/`.
* Version shown in the banner and Diagnostics. `VERSION.js` declares `supportsSchema: [min, max]`.

## 26. Startup on Windows and macOS

| Step | Windows (Edge) | macOS (Edge/Chrome; Safari viewer-only) |
|---|---|---|
| 1. Get files | SharePoint → Continuum library → **Sync** (or "Add shortcut to My files") | Same; files appear under `~/Library/CloudStorage/OneDrive-<Org>/…` |
| 2. Keep local | Right-click `Finance` → **Always keep on this device** | Finder → OneDrive → **Always Keep on This Device** |
| 3. Open | Right-click `Finance/index.html` → Open with → Microsoft Edge | Open With → Microsoft Edge |
| 4. Shortcut | Edge ☆ Add to favourites bar; optional desktop shortcut | Drag the address bar URL to Dock or desktop |
| 5. Deep links | Continuum apps link to `…/Finance/index.html#/ref/CR-…` (see ONEDRIVE_SHAREPOINT §4) | Same |
| Publisher only | Edge: Publish view → **Connect drop folder** and **Connect Finance folder** (one-time permission per session or "allow on every visit" where offered) | Same in Edge/Chrome |

The set-up guide lives at `docs/operations/SETUP.md`, written for non-technical readers with screenshots.

## 27. Browser compatibility

| Capability | Edge/Chrome (current) | Safari (current) | Firefox (current) |
|---|---|---|---|
| View dashboard from `file://` (script-tag data) | Supported | Expected; validate | Expected; validate |
| Deep link `#/ref/…` | Supported | Supported | Supported |
| Exports (download) | Supported | Supported | Supported |
| Publisher: folder read with persisted handle (V2) | Supported (validate under `file://` and policy) | Fallback: multi-file input | Fallback: multi-file input |
| Publisher: direct write to `published/` | Supported (validate) | Fallback: download, user saves | Fallback: download |
| SHA-256 (SubtleCrypto) | Validate `isSecureContext` on `file://`; fallback to bundled JS SHA-256 | Same | Same |

Primary supported browser is **Microsoft Edge** on managed laptops. Everything marked "validate" is a runtime check in the first migration slice.

## 28. Accessibility

WCAG 2.2 AA target:
* Semantic HTML (buttons, tables with `<th scope>`, headings).
* Every interactive element is keyboard reachable, with a visible focus ring.
* Dialogs trap focus and close on Escape.
* Banner and toasts use ARIA live regions.
* Contrast tokens are checked at design time; no information is conveyed by colour alone.
* Every chart has an adjacent data table ("Show as table").
* `prefers-reduced-motion` disables animation; text resizes to 200 % without loss.

## 29. Screen-sharing readability

A **Present mode** toggle (also `#/…?present=1`):
* Larger type scale (×1.25), high-contrast palette, hidden hover-only details, simplified charts with labels on.
* **Privacy masking** replaces person names with roles and hides bill rates and employee IDs.
* The banner stays visible so the audience sees the as-of date.

## 30. Migration from the current implementation

Summary (full plan in MINIFIED_CODE_MIGRATION_STRATEGY):

1. **S0 Safety baseline.** Vendor the libraries locally so the existing app works on the corporate laptop. Capture golden outputs with characterisation tests. Archive v1–v3.
2. **S1** Extract pure calc into `app/calc/` behind the golden tests, with no behaviour change.
3. **S2** Escaping plus event delegation, one tab per change.
4. **S3** Viewer loader (`published/dataset.js`) and readiness banner, in a new shell running beside `legacy/index.html`.
5. **S4** Publisher import → preview → publish → snapshots; retire `server.py` and `localStorage` as source of truth.
6. **S5** Continuum Reference + registry + deep links.
7. **S6** Deterministic chat + Copilot packs; Agent Builder pilot.
8. **S7** Behaviour fixes with new golden values (timezone, CSV quoting, FX on expenses), then delete `legacy/`.

Each slice is independently releasable and has a rollback (previous release folder, previous snapshot, `legacy/` until S7).
