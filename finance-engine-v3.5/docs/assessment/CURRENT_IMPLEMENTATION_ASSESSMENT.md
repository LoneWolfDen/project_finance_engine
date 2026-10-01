# Current Implementation Assessment

Assessment date: 2026-10-01
Assessed against: `finance-engine-v3.5/docs/architecture/PWA_ARCHITECTURE_CHARTER.md`
Mode: read-only forensic analysis. No source, dependency, configuration or Git state was changed.

## 0. Scope and evidence baseline

| Item | Observed value |
|---|---|
| Git top level | `/Users/wolf/Developer/project_finance_engine` (the repository contains four application versions; the charter sits inside `finance-engine-v3.5/`) |
| Branch | `assessment/pwa-readiness-2026-10`, identical to `main` and `origin/main` at `5d453d1` |
| Tag | `pwa-assessment-baseline-2026-10-01` → `5d453d1` (HEAD) |
| Remote branches | `v3-clean` (not merged into `main`; only adds an empty `finance_engine.db`), `v3-release`, `version2`, `v3.5-release` (all merged) |
| Working tree | Clean apart from untracked `finance-engine-v3.5/.claude/` (prompt files) and `finance-engine-v3.5/docs/` (charter + this assessment) |
| Tracked files | 42 files; working tree 1.5 MB; `.git` 216 KB (single pack, 72 KiB) |
| Largest files | `finance-engine-v3.5/index.html` 173,493 B; `finance-engine-v3/index.html` 160,491 B; `finance-engine-v2/index.html` 122,531 B; `test_Timesheet.csv` 141,894 B × 4 identical copies |
| Large or binary files | None tracked. Historical `finance_engine.db` blobs (12 KB) exist in commits `db120c4`, `cac8e1f`; both extracted read-only and verified to contain an empty `config` table |

**Primary assessment target:** `finance-engine-v3.5/` (newest version, documented in the root `README.md`, and the location of the charter). `finance-engine-v1/`, `-v2/`, `-v3/` are assessed as duplicate implementations.

Commands used were read-only: `git status/log/branch/tag/ls-files/ls-tree/show/grep/merge-base`, `ls`, `du`, `find`, `grep`, `awk`, `diff`, `md5`, `sqlite3 -readonly` on blobs copied to the session scratchpad, `python3 -c ast.parse(...)`, and `node --check` on script blocks copied to the scratchpad. A timezone experiment ran in Node against a copy of the weekday logic (see §8, finding C-01).

## 1. Executive verdict

| Question | Answer | Confidence |
|---|---|---|
| Framework? | **None.** One hand-written HTML file with inline `<style>` and two inline `<script>` blocks. The UI is rendered by concatenating HTML strings into `innerHTML`, with global functions called from inline `onclick` attributes. Not React, Vue or any other framework. Not generated. | High |
| Readable source for what the browser runs? | **Yes, for application code.** The browser runs `finance-engine-v3.5/index.html` exactly as committed: it has comments, descriptive names and section banners. It is dense (about 40 lines over 300 characters, one line of 2,531 characters), but it is **not minified**. The six third-party libraries are minified and fetched from public CDNs at runtime. They are not in the repository. | High |
| Minified application code? | **None.** There are no minified first-party files, no source maps, no build output and no override/patch layers. | High |
| One coherent build model? | **No.** The de facto model is "no build", but there are four parallel copies of the application (v1, v2, v3, v3.5) with different ports and startup paths. Runtime libraries come from CDNs, and there is no vendor directory. | High |
| Is it a PWA? | **No.** There is no manifest, service worker, icons or offline shell. | High |
| Works offline / CDN blocked? | **BROKEN.** `Chart.register(...)` runs at top level (`index.html:431`). If the CDN script fails to load, it throws and the main script stops, so nothing renders. | High (code path); runtime validation advised |
| Data private and local by default? | **No.** The Python server listens on all interfaces with `Access-Control-Allow-Origin: *` and no authentication (see SECURITY_PRIVACY_ASSESSMENT). | High |
| Chatbot invents answers? | The "Smart" mode is deterministic keyword matching over loaded data. It has no citations and mislabels some inferences (§6). The "Ollama" mode is a free-form LLM with no grounding controls or Fact/Inference labelling. "Copilot" mode is an `<iframe>` for a URL the user pastes. It is not an integration. | High |
| OneDrive / SharePoint / Graph | **None implemented.** Only single-file browser pickers and browser downloads exist. | High |
| Release-ready under charter definition | **No.** | High |

## 2. Architecture as implemented (v3.5)

```
Browser (index.html: inline CSS + ~2,040 lines inline JS)
  ├─ loads 6 libraries from cdn.jsdelivr.net / cdnjs.cloudflare.com (no SRI)
  ├─ state: in-memory _cache → localStorage (pf_working, pf_master, pf_scenarios,
  │         pf_chat_mode, pf_copilot_url)
  ├─ fire-and-forget POST /api/config, /api/config/master (errors swallowed)
  ├─ POST /api/chat (Ollama mode only)
  └─ <iframe src=user-supplied URL> (Copilot mode only)

server.py (Python stdlib http.server, single-threaded, bound to 0.0.0.0:3005)
  ├─ GET  any path       → index.html (no-cache)
  ├─ GET  /api/config[/master], /api/health, /api/test
  ├─ POST /api/config[/master] → SQLite finance_engine.db, table config(id, data, updated_at)
  └─ POST /api/chat → urllib → OLLAMA_URL (default http://localhost:11434) /api/chat
```

| ID | Component | Classification | Path / symbol | Evidence | Risk | Confidence | Runtime validation |
|---|---|---|---|---|---|---|---|
| A-01 | UI shell and tab router | WORKING | `index.html:428-482` `TABS`, `render()`, `rTab()` | 11 tabs map to `rOV…rCfg`. Every render rebuilds the full `innerHTML` and re-runs `buildData()` | Performance on large datasets; XSS via interpolation | High | Yes (performance with real data volumes) |
| A-02 | Forecast engine | PARTIAL | `index.html:253-350` `computeForecast` | Bill rate × allocation × 8 h × working days, bounded by PO validity. Timezone defect C-01; `STD_HOURS` hard-coded | Wrong forecasts for users west of UTC | High | Yes |
| A-03 | Actuals engine | PARTIAL | `index.html:392-425`, `1683-1735` | Two parallel paths (`computeActualsMonthly`, `aggregateActuals`/`computeActualsFromCache`). The cache takes precedence (`buildData` `index.html:371`) | Stale actuals after config import (D-07) | High | Yes |
| A-04 | Python server | WORKING (functionally) / insecure | `server.py:69-154` | Stdlib only. AST parse verified | See security assessment | High | Yes |
| A-05 | SQLite persistence | PARTIAL | `server.py:39-66` | Two rows (`working`, `master`) hold whole-config JSON. `INSERT OR REPLACE`; no history, schema version or backup | Silent overwrite, no rollback | High | Yes |
| A-06 | Inline vendor libraries | WORKING (when online) | `index.html:4-9` | Six CDN `<script>` tags with exact version pins, no `integrity` attribute | Availability, supply chain | High | Yes |

## 3. Feature inventory (v3.5)

| ID | Feature (UI label) | Classification | Path / symbol | Evidence | Risk | Confidence | Runtime validation |
|---|---|---|---|---|---|---|---|
| F-01 | Overview KPI cards | WORKING | `index.html:506-572` `rOV` | Computed from `buildData()` | Currency symbol hard-coded `£` (`f()`, `index.html:483`) regardless of `PO_Currency_Code`; normalised values always `$` | High | Yes |
| F-02 | "Forecast Accuracy" card | PARTIAL | `index.html:510,528` | `tAct / fc.total` over unaligned periods. This is actuals-to-date divided by the full-period forecast, so it is not an accuracy measure | Misleading metric | High | No |
| F-03 | Burndown charts and tables | WORKING | `rBD` `index.html:573-602`, `drawCharts` `2097-2145` | Chart.js combo charts. Normalised chart uses today's FX for every historical month | Misleading normalised history | Medium | Yes |
| F-04 | Variance tab | WORKING | `rMo` `603-613` | — | — | High | No |
| F-05 | PO Details + rollover | WORKING | `rPO` `1240-1333` | Rollover only by validity end year | Logic not independently verified | Medium | Yes |
| F-06 | Invoices tab | WORKING (read-only) | `rInv` `616-681` | Invoices can only be entered by JSON in Settings or by full-config import | — | High | No |
| F-07 | Resources table (inline edit) | PARTIAL | `rRes` `684-717`, `saveResTable` `729-747` | `contenteditable` cells. The PO team is recovered from heading text (`textContent.split(' (')[0]`, `735`). Delete only toggles a CSS class until Save. Duplicates are hidden in the view (`689`) but stay in data | Edits can silently re-assign or drop rows; displayed rules ≠ stored rules | Medium | Yes |
| F-08 | Utilisation | PARTIAL | `rUtil` `750-906` | Actual hours use `(reg+ot)*(hm===8?8:1)` (`798`) and the first rule only (`796`) | Heuristic presented as measured fact | High | Yes |
| F-09 | Expenses | WORKING | `rExp` `1224-1237` | Expenses are included in "Remaining Budget" without FX conversion (`385-388`) | Mixed currencies summed | High | No |
| F-10 | Scenarios (save/load/compare) | WORKING / destructive | `rScen` and others `909-1009` | Stores a **full copy** of the config, including `raw_actuals`, per scenario in `localStorage` | Quota exhaustion; Load overwrites working copy without confirmation | High | Yes |
| F-11 | Upload: timesheet actuals | PARTIAL | `handleUpload` `1421-1445`, `processUpload` `1524-1583` | CSV parsed with `split(',')`, so quoted commas break rows. The append/replace choice uses `prompt()`, and anything other than "A" means **Replace** (`1560`) | Data corruption; accidental replacement | High | Yes |
| F-12 | Upload: resource rules | PARTIAL | `1447-1523` | Validation and replace confirmation exist. Rows with unparseable dates are dropped silently (`1488`) | Silent row loss | High | Yes |
| F-13 | Smart Resource Parser (Excel) | PARTIAL | `parseSolutionExcel` `1586-1671` | Fuzzy header matching (`'id'`, `'to'`, `'%'` substrings, `1595-1601`). Preview is shown before apply, which is good. Result is kept in `window.__parsedSolutionResources` | Mis-mapped columns | Medium | Yes |
| F-14 | Export Excel/PDF/PPTX | WORKING (online only) | `1767-1903` | Client-side generation and download. Every export carries a personal-attribution watermark "Crafted by Vamsi Yedlapalli \| github.com/LoneWolfDen" (`1770,1791,1839`). PDF/PPTX resources are capped at 40 and 20 rows without a warning in the PDF | Personal branding in corporate deliverables; silent truncation | High | Yes |
| F-15 | Export Full Config (JSON) | PARTIAL | `exportFullConfig` `1968-1974` | Omits `raw_actuals`, `actuals_by_project`, master, scenarios | **The only backup is incomplete** | High | No |
| F-16 | Import Full Config | PARTIAL | `importFullConfig` `1975-1996` | Confirmation is shown, but **no `validateData()` call**, no schema version and no preview. Leaves a stale `actuals_by_project` behind | Corrupt or stale state | High | Yes |
| F-17 | Settings JSON editors | WORKING | `rCfg` `1906-1956`, `doSave` `1957-1966` | `validateData` covers 5 of 7 sections; `ot_params` and `actuals_monthly` are unvalidated | — | High | No |
| F-18 | Save as Master (PIN) | MOCKED (security control) | `MASTER_PIN='1234'` `index.html:132`, `checkPin` `2079-2092` | Client-side constant compare. UI copy says "Protects your data… PIN: ask your team lead" (`1409`) | False assurance | High | No |
| F-19 | Factory Reset | BROKEN | `checkPin` `2091` | Clears `localStorage` only. `_cache.work` and `_cache.master` still hold data, so `render()` shows the same data. On reload, `initFromServer()` restores server copies | User believes data is gone when it is not, or the reverse | High (code reading) | **Yes** |
| F-20 | Restore from Master | WORKING / destructive | `restoreFromMaster` `177`; buttons `698,1910,1929` | No confirmation. If no master exists, `loadMaster()` returns `DEFAULTS` and **overwrites working data with demo data**, which is then POSTed to the server | Silent data loss | High | Yes |
| F-21 | Sample-data banner | PARTIAL | `index.html:514-518` | Shown only while `raw_actuals` is empty. DEFAULTS include fabricated `actuals_monthly` figures (`129`) that render as real actuals | Demo numbers mistaken for project truth | High | No |
| F-22 | Chat – Smart mode | PARTIAL | `smartAnswer` `2186-2247` | See §6 | — | High | No |
| F-23 | Chat – Ollama mode | PARTIAL | `sendChat` `2267-2276`, `server.py:102-123` | See §6 | — | High | Yes |
| F-24 | Chat – "Copilot" mode | PLACEHOLDER | `index.html:2156,2172-2183` | `<iframe>` with a user-pasted URL. No data exchange with the app | Implies integration that does not exist | High | No |
| F-25 | `/api/health` | PARTIAL | `server.py:89-90` | Returns `"version": "3.0"` for v3.5. `/api/test` says `finance-engine-v3` (`server.py:88`) | Misleading diagnostics | High | No |

## 4. Storage model and data-loss risks

Classified against charter §5:

| Charter storage tier | Present? | Evidence |
|---|---|---|
| 1. Runtime browser storage | Yes: `localStorage` keys `pf_working`, `pf_master`, `pf_scenarios`, `pf_chat_mode`, `pf_copilot_url` | `index.html:155,910,2159-2160` |
| 1b. Local server storage (extra tier, not in charter) | Yes: SQLite `finance_engine.db` beside `server.py` | `server.py:28,59-66` |
| 2. User-controlled backup/restore | Partial: JSON export/import, but incomplete (F-15) and unvalidated (F-16) | |
| 3. User-selected OneDrive/SharePoint content | No (only generic file inputs; see §7) | |
| 4. Live Graph storage | No | |
| 5. Enterprise storage | No | |

Charter minimum requirements:

| Requirement | Status | Evidence |
|---|---|---|
| Visible storage failures | **Absent.** Server write errors are swallowed (`.catch(()=>{})`, `index.html:166,175`). `localStorage.setItem` is unguarded (`164`); on `QuotaExceededError` it throws *before* the server POST, so nothing persists while the in-memory cache looks saved | |
| Backup and restore | Partial (F-15, F-16) | |
| Schema versioning | **Absent** in client, server and export | |
| Corruption preservation | **Absent.** Corrupt `localStorage` JSON silently falls back to `DEFAULTS` (`160,170`) | |
| Reset confirmation | PIN modal for factory reset; reset itself broken (F-19). Restore from Master has no confirmation (F-20) | |
| Storage usage | **Absent** | |
| No silent overwriting | **Violated** (D-01…D-08) | |
| Rollback instructions | **Absent** | |

### Destructive and silent-overwrite actions

| ID | Action | Path | Behaviour | Confirmation | Recoverable? |
|---|---|---|---|---|---|
| D-01 | Startup sync | `initFromServer` `180-188` | Server copy unconditionally replaces `localStorage`. If earlier server POSTs failed silently, newer local edits are discarded on next load | None | No |
| D-02 | Restore from Master | `177` | Overwrites working copy; uses `DEFAULTS` when no master exists | None | Only via master/scenario/export |
| D-03 | Load scenario | `loadScenario` `956-964` | Overwrites working copy | None | Only if saved elsewhere |
| D-04 | Timesheet upload | `1557-1568` | `prompt()`. Any answer other than "A" replaces all rows | Ambiguous prompt | No |
| D-05 | Save as Master | `checkPin` `2083-2089` | Overwrites master and **deduplicates working actuals** (last row wins on Empl ID + date + project) | Weak PIN | No |
| D-06 | Dedup on append | `deduplicateActuals` `2066-2078` | Drops legitimate multiple rows per employee/day/project (for example split activities) | None | No |
| D-07 | Import Full Config | `1975-1996` | Overwrites sections. Stale `actuals_by_project` then overrides the imported `actuals_monthly` (`buildData` `371`) | Yes (list of sections) | No |
| D-08 | Multi-tab / multi-device | `server.py:59-66` | Last write wins across browser tabs and devices | None | No |
| D-09 | Factory reset | `2091` | Broken (F-19): incomplete and inconsistent | PIN | n/a |
| D-10 | Docker run without volume | root `README.md` Option 2 | DB is deleted with the container (`--rm`) | Documented | No |

## 5. Rendering and readable source (charter §2)

* **Framework determination:** No framework or virtual DOM. Template literals are assigned to `innerHTML` (for example `index.html:457-458`). Event handlers are inline `onclick` attribute strings that call ~90 global functions. State lives in module-less globals (`tab`, `selectedYear`, `selectedPoTeams`, `_cache`, `charts`, `showDataLabels`, `chatMode`).
* **Unminification:** Not applicable. Application code is already readable, so beautification would only reflow long lines. The real maintainability problem is structure: one 2,279-line file, duplicated logic, globals and no tests. Formatting does not fix that.
* **Safest path to maintainable source (recommendation, not a backlog):** Charter Model A (no-build PWA).
  1. Add characterisation tests around `computeForecast`, `computeActualsMonthly`/`aggregateActuals`, `parseDate`, `parseValidityEnd` and `validateData` using the existing fixtures, before any restructuring.
  2. Vendor the six libraries locally with name, version, licence, source URL and hash.
  3. Extract the inline script into readable ES modules one component at a time (pure calculation first, then storage, then views), keeping behaviour identical under the tests.

  Model B (a reproducible build) is not justified by current complexity.

## 6. Chat assistant (charter §9)

| ID | Aspect | Classification | Path | Evidence | Risk | Confidence | Runtime validation |
|---|---|---|---|---|---|---|---|
| CH-01 | Smart mode answers | PARTIAL | `smartAnswer` `2186-2247` | Regex keyword routing over in-memory data, with no network use. Answers are computed values, not invented text. **No citations, search scope or Fact/Inference labelling** | Users may treat heuristics as fact | High | No |
| CH-02 | Smart mode mislabelled inference | PARTIAL | `2202-2207` | "Utilization" answer reports allocation > 80 % rather than actual utilisation | Inference presented as fact | High | No |
| CH-03 | Smart mode filter inconsistency | BROKEN (minor) | `2225-2229` | Invoice answer ignores Year/PO_Team filters while other answers respect them | Wrong figures | High | No |
| CH-04 | Smart mode divide by zero | BROKEN (edge) | `2195` | `D.rem/D.fc.rate` with rate 0 gives "~Infinity working days left" | Nonsense answer | High | Yes |
| CH-05 | Broad keyword capture | PARTIAL | `2194` | `/budget|remaining|left|how much/` captures unrelated questions (for example "how much did X claim") and returns the budget answer | Wrong answer with confident tone | High | No |
| CH-06 | Fallback text | WORKING | `2262` | Honest "I didn't understand" message. **No hard-coded demo answers.** It does, however, answer over `DEFAULTS` demo data when the user has not loaded their own | Demo values presented as project truth | High | No |
| CH-07 | Ollama mode | PARTIAL | `2268-2274`, `server.py:102-123` | Sends summary metrics plus up to 8 resource names, PO teams and bill rates to `OLLAMA_URL`. The response is rendered as raw HTML. No grounding, citation or labelling | Hallucination; XSS; data egress if `OLLAMA_URL` is remote | High | Yes |
| CH-08 | Ollama error advice | BROKEN (doc) | `2275` vs `server.py:24` | UI tells the user to `ollama pull phi3:mini`; server defaults to `llama3.2` | Confusion | High | No |
| CH-09 | Provider abstraction | Absent | — | Modes are hard-wired branches, not an interface | Charter §9 non-compliance | High | No |
| CH-10 | "Copilot" mode | PLACEHOLDER | `2156,2172-2183` | Iframe only; no context passed; no sandbox | Misrepresents integration | High | No |

**Data sent externally:** In the default configuration, no. Smart mode is local. Ollama mode goes browser → local server → `localhost:11434`. Copilot mode loads a third-party page in an iframe but passes no app data. Data **can** leave the device if `OLLAMA_URL` is set to a remote host, or through the server exposures in SECURITY_PRIVACY_ASSESSMENT (SEC-01/02).

## 7. OneDrive and SharePoint readiness (charter §6–7)

| Level | Status | Evidence |
|---|---|---|
| Input V1: file picker | PARTIAL: `<input type=file>` for single files only (`index.html:1374,1388,1395,1402,1921`) | No `multiple`, no drag and drop, preview only for the Excel parser and the post-hoc upload report. **No provenance:** no source system, content hash, import time, parser version or row identifiers retained |
| Input V2: folder refresh | Absent | No File System Access API use |
| Input V3: Graph / Microsoft file picker | Absent | No MSAL, Graph, Entra or picker code (grep for `graph.microsoft`, `msal`, `onedrive`, `sharepoint` returned nothing) |
| Output V1: download | WORKING (`XLSX.writeFile`, `doc.save`, `pptx.writeFile`, Blob download) | No warning that saving into a synced folder changes the data boundary |
| Output V2: save workflow with manifest/checksum | Absent | No manifest, version or checksum in exports |
| Output V3: Graph write | Absent | — |

Conclusion: **V1 is reachable with modest work.** Nothing above V1 exists. No code is labelled as OneDrive/SharePoint, so there are no misleading placeholders for these. Locally synced OneDrive folders work today only through the generic picker.

## 8. Correctness defects observed

| ID | Classification | Path | Evidence | Risk | Confidence | Runtime validation |
|---|---|---|---|---|---|---|
| C-01 | BROKEN | `isWorkingDay` `index.html:195-200` with loops at `295-299`, `558-559`, `772` | Dates are created at UTC midnight but `getDay()` is local time. **Verified in Node:** with `TZ=America/New_York`, Sat 2025-07-05 counted as a working day and Mon 2025-07-07 as weekend. London and Kolkata were correct | Forecast and availability wrong for any user west of UTC (Canada is a supported holiday location) | High | Browser confirmation advised |
| C-02 | PARTIAL | `otMultiplier` `222-226` | `poTeam` parameter ignored; OT multipliers are global | Wrong OT cost per team | High | No |
| C-03 | PARTIAL | `parseDate` `230-251` | Ambiguous dates default to US order; resources use `'uk'`, actuals `'us'` | Silent date swaps on mixed sources | Medium | Yes |
| C-04 | BROKEN | CSV parsing `1435-1440`, `2006` | `split(',')`, quotes stripped | Corrupt rows when fields contain commas | High | Yes |
| C-05 | PARTIAL | `buildData` `385`, `rExp` `1226` | Expense amounts summed across currencies without FX | Wrong totals | High | No |
| C-06 | PARTIAL | `fxRateAsOf` `203-207` | Missing rate silently returns 1 | Wrong normalisation without warning | High | No |
| C-07 | PARTIAL | Holiday data `192` | Only 2025–2026 holidays; later years are treated as having no holidays | Over-forecast from 2027 | High | No |
| C-08 | PARTIAL | `parseValidityEnd` `135-147` | Missing or unknown validity falls back to 2025-12-31 | Silent default | High | No |
| C-09 | PARTIAL | Fixture vs validator | `finance-engine-v3.5/test_PO_Details.json` uses `PO_Validity_Year`. `validateData` requires `PO_Validity` (`2015-2019`), so the shipped fixture fails Settings save | Fixture/validator drift | High | Yes |

## 9. Duplicate, dead and unreachable code

| ID | Classification | Path | Evidence |
|---|---|---|---|
| U-01 | UNUSED | `rTL` `index.html:1011-1057` | 1 reference (its definition) |
| U-02 | UNUSED | `rActData` `1101-1190` | 1 reference |
| U-03 | UNUSED | `rFX` `1334-1341` | 1 reference; FX/OT tables are no longer shown outside Settings |
| U-04 | UNUSED | `rExport` `1738-1751` | 1 reference; export moved into `rUpload` |
| U-05 | UNUSED | `addResRow` `727` | 1 reference ("legacy fallback") |
| U-06 | UNUSED | `findResourceRule` `210-219` | 1 reference; logic re-implemented inline in four places with differing semantics |
| U-07 | UNUSED | `tabGroups` `435` | Assigned, never read |
| U-08 | Duplicate logic | `projToTeam` construction ×6, `normFilter` ×12, timeline renderers ×4 (`rTL`, `rTLInline`, `rUtil`, `rInv`), actuals cost calculation ×4 with **inconsistent OT handling** (`rActData` `1166` and `1184` omit the OT multiplier) | Divergent results between views |
| U-09 | Duplicate implementations | `finance-engine-v1/`, `-v2/`, `-v3/` | Full prior copies (`index.html` 74–160 KB each, servers, Dockerfiles, fixtures). v3 → v3.5 diff is 249 changed lines (Smart chat, Excel parser, dedup, port) |
| U-10 | Duplicate fixtures | `test_*` in all four folders | MD5-identical except `finance-engine-v2/test_PO_Details.json` |

## 10. PWA assessment (charter §10)

| Item | Status | Evidence |
|---|---|---|
| Manifest | Absent | No `manifest` link or file |
| Icons | Absent | Header uses emoji only |
| Scope / start URL | n/a | |
| Service worker, cache versioning, update prompt, kill-switch | Absent | No `serviceWorker` reference. **Stale-cache pinning risk does not exist today**, because the server sends `no-cache` for HTML (`server.py:95`) and there is no SW |
| Offline shell / degraded mode | **BROKEN**: CDN dependency is fatal (`index.html:4-9,431`). The app does fall back to `localStorage` when the API is unreachable (`186`) | |
| Storage persistence (`navigator.storage.persist`) | Absent | |
| Same-origin resources / no runtime CDN | Violated (6 CDN scripts) | |
| CSP | Absent (no meta tag, no header) | |
| Fonts | System font stack only, no external fonts | Compliant |
| Keyboard navigation | PARTIAL: tabs are `<button>`. Group headers, sortable `<th>` and timeline rows are clickable `<div>`/`<tr>` without `tabindex` or roles. Modals have no focus trap or Escape handling | Runtime validation required |
| Contrast | Not measured. Light grey text (`#888`, `#aaa`, `opacity:.35`) is likely to fail WCAG AA | Runtime validation required |
| Reduced motion | No `prefers-reduced-motion` handling. Animations are minor (toast, scale) | |
| Screen-sharing mode | Absent | |
| Browser support | ES2020 (`?.`, spread) suits current Edge/Chrome/Safari. Not runtime-tested | Runtime validation required |

## 11. Microsoft 365 Copilot feasibility (charter §8)

| Pattern | Current state | Feasibility |
|---|---|---|
| A: manual package | Exports (XLSX/PDF/PPTX/JSON) exist but carry no provenance, manifest or "Draft/Recommendation" labelling | **Feasible now** with export provenance added. Needs no licence or tenant change beyond the user's existing Copilot access |
| B: Microsoft-native grounding | Not implemented. Depends on the user saving exports into OneDrive/SharePoint | Feasible as a workflow, with no code dependency. Governed by tenant permissions |
| C: agent/API | Only an iframe embed of a Copilot Studio URL (PLACEHOLDER). No auth, no context passing, no Entra registration | **Not assessable** until licensing, Entra app registration, delegated permissions, admin consent, hosting and data-boundary decisions are known. Embedding Copilot Studio in an iframe may also be blocked by the agent's channel/authentication settings. It does not make dashboard data available to Copilot |

No unsupported Copilot browser automation exists. That is compliant.

## 12. Architecture claims that do not match implementation

| Claim | Source | Reality |
|---|---|---|
| "Three independent versions" | root `README.md:3` | Four (v1, v2, v3, v3.5) |
| "The server must be running for the dashboard to load and save configuration data" | root `README.md` | The browser falls back to `localStorage` (`index.html:186`). What is actually mandatory is CDN reachability |
| Docker "listens on 3005" | root `README.md` | Works, but `Dockerfile` still says `EXPOSE 8889` |
| "Save as Master — Protects your data… PIN: ask your team lead" | `index.html:1409` | Client-side constant `'1234'` |
| "Factory Reset … resets BOTH master and working config to defaults" | `index.html:2063` | Clears `localStorage` only; cache and server remain (F-19) |
| "Mode: … Copilot" | `index.html:2153,2170` | Iframe placeholder |
| "Import Full Config … replaces all sections" | `index.html:1372` | Leaves `raw_actuals`/`actuals_by_project` in place, which then override imported monthly actuals |
| "Export Full Config" as backup | `index.html:1381` ("Save as Master to protect your data") | Export omits raw timesheets and the actuals cache |
| `/api/health` version | `server.py:90` | Reports 3.0 for v3.5 |
| Charter: "default state is private and local" | charter §4 | Server listens on all interfaces with wildcard CORS |
| Charter: "development and demo data must be synthetic" | charter §4 | Fixtures appear synthetic (`R1_Lead`, `TestCo`). `DEFAULTS` holds 7-digit employee IDs, specific bill rates and a holiday table cited from `Burndown_Template_v4.7.xlsx`. **Needs confirmation** |

## 13. Features that look real but are mocked or placeholder

1. **PIN protection** (F-18): a security theatre control.
2. **Copilot mode** (F-24, CH-10): iframe only.
3. **Sample `actuals_monthly`** (F-21): fabricated actuals rendered in the same charts and cards as real data.
4. **Factory Reset** (F-19): appears to work, but does not.
5. **"Forecast Accuracy"** (F-02) and **utilisation** (F-08): formulas do not measure what the labels say.
6. **Export Full Config as a backup** (F-15): incomplete.

## 14. Charter compliance summary

| Charter section | Status |
|---|---|
| §2 Human-readable source | Mostly compliant: readable, but monolithic; vendor files not recorded |
| §3 One coherent build model | Non-compliant (4 copies, CDN runtime, competing startup paths) |
| §4 Data boundaries | Non-compliant (SEC-01/02, unlabelled Ollama egress option) |
| §5 Storage model | Non-compliant (§4 above) |
| §6–7 OneDrive/SharePoint | V1 partial, no provenance |
| §8 Copilot | Placeholder only; Pattern A feasible |
| §9 Chat | Non-compliant (no citations, labelling or provider interface) |
| §10 PWA | Not a PWA |
| §11 Security | See SECURITY_PRIVACY_ASSESSMENT (2 BLOCKER) |
| §12 Testing | No tests (see TEST_AND_RELEASE_READINESS) |
