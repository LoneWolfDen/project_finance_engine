# Minified Code Migration Strategy

Status: Proposed · Date: 2026-10-04
Parent: `TARGET_ARCHITECTURE.md` §30 · Evidence: `docs/assessment/MINIFIED_AND_GENERATED_CODE_REGISTER.md`

## 1. Situation

| Asset | State | Implication |
|---|---|---|
| First-party application code (`finance-engine-v3.5/index.html`, `server.py`) | **Readable, not minified**: one 2,279-line file with globals, string-built HTML, duplicated logic and dead code | No source recovery needed. The work is **restructuring** a readable monolith |
| Third-party libraries (6) | Minified, **CDN-loaded at runtime, blocked by the corporate proxy (OD-5)** | Must be vendored from upstream. Never beautify or edit them |
| Embedded data (`DEFAULTS`, holiday table) | Hand-entered or derived, no generator | Replace with versioned data files with stated provenance |
| v1–v3 copies | Superseded | Archive (OD-1) |

The strategy below still follows the charter's minified-code rules, applied to what actually exists: a readable monolith plus minified vendor code.

## 2. Recover vs reconstruct

| Item | Recover (move as-is) | Reconstruct (redesign) | Method |
|---|---|---|---|
| Forecast, actuals, rollover, FX, OT, date parsing, validity parsing, validation rules | ✔ | — | Move functions verbatim into `app/calc`/`app/data`, then refactor under golden tests |
| Holiday calendars | Values ✔ | Provenance + years coverage | Move to `app/data/calendars.js` with `source`, `valid_years`; mark the source as "synthetic test data (owner, 2026-10-02)" until replaced |
| `DEFAULTS` demo data | — | ✔ | Delete from runtime. Re-create as labelled synthetic `samples/` |
| Rendering (11 tab functions) | Layout and labels ✔ | Escaping, event wiring, per-view modules | One view per slice |
| Storage (`localStorage` + server + master/PIN) | — | ✔ | Replaced by publish/load model |
| Chat Smart mode | Intent list ✔ | Retrieval, labels, citations | Re-implemented on calc functions |
| Ollama mode, Copilot iframe, PIN | — | Removed | Not shipped |
| Exports (XLSX/PDF/PPTX) | ✔ | Provenance footer, truncation notices | Move, then extend |
| Excel smart parser | Header-scan idea ✔ | Explicit mapping profiles | Becomes the mapping-profile editor's suggestion engine |
| Vendor libraries | From upstream at pinned versions ✔ (Chart.js 4.4.0, datalabels 2.2.0, autotable 3.8.2, PptxGenJS 3.12.0) | Upgrades: SheetJS → current patched CE release; jsPDF → patched release | Download official artefacts, record SHA-256 and licence in `vendor/VENDOR.md` |

Nothing requires semantic recovery from minified code. **No beautification step exists in this plan**, because none is needed.

## 3. Characterisation tests (before any change)

1. **Harness:** `tests/harness.js` plus `tests/index.html`. A loader extracts the inline `<script>` from `legacy/index.html` into a sandbox so the *unchanged* legacy functions can be called. It runs in the browser by evaluating the script with stubbed `document`/`Chart`/`localStorage`, and in Node via `vm`.
2. **Fixtures:** current synthetic `test_*` files plus new synthetic edge-case fixtures covering quoted commas, dd/mm vs mm/dd, multiple currencies, OT rows, 2027 dates, duplicate keys and empty sections.
3. **Golden outputs:** JSON snapshots from legacy `computeForecast`, `computeActualsMonthly`, `aggregateActuals` + `computeActualsFromCache`, the rollover table, KPI values (`buildData`), `parseDate`, `parseValidityEnd`, `validateData`, and `deduplicateActuals`. Run under `TZ=Europe/London` (the owner's reference), with additional runs recorded for UTC−5 and UTC+5:30 documenting the **known defect C-01**.
4. **Rule:** a refactor slice may not change any golden value. Intended behaviour fixes (C-01 timezone, C-04 CSV quoting, C-05 expense FX, C-02 per-team OT, F-02 "Forecast Accuracy") happen only in slice S7, each as its own change that updates named golden files with a written justification.

## 4. Vertical slices

Each slice is one branch, one contained change, tests before and after, and a rollback.

| Slice | Scope | Leaves working | Rollback |
|---|---|---|---|
| **S0** Safety baseline | (a) Vendor six libraries locally (exact current versions first), switch `<script src>` to `vendor/…` (the only edit to the legacy file); (b) characterisation harness and golden files; (c) archive v1–v3 to a tag/branch; (d) commit `.claude/` and `docs/` (OD); (e) LICENSE | Legacy app now **works on the corporate laptop** | Revert the commit (CDN URLs back) |
| **S0b** Vendor upgrades | SheetJS and jsPDF to patched releases | Same, with golden tests green | Swap vendor folder back |
| **S1** Calc extraction | Move pure functions to `app/calc/*`, `app/data/*`; legacy `index.html` loads them via `<script src>` instead of defining them | Identical numbers (golden) | Previous release folder |
| **S2** Safe rendering | Add `continuum-core/html.js`; convert one tab per commit to escaped templates + `data-action` delegation; security test forbids raw data in `innerHTML` for converted tabs | Same UI, XSS-safe | Per-tab revert |
| **S3** Viewer shell | New `index.html` (viewer) with readiness banner, `published/dataset.js` loader, Overview + Burndown views on calc modules; legacy moved to `legacy/index.html` and still reachable from Diagnostics | Viewers can use new shell with a published sample | Point favourite back to `legacy/index.html` |
| **S4** Publisher | Import pipeline, mapping profiles, provenance, preview diff, publish procedure, history, rollback; legacy-config import; retire `server.py` | Owner publishes real data; leaders view | Republish previous snapshot; legacy still present |
| **S5** Continuum Reference | `continuum-core/ref.js`, Registry read/write, crosswalk mapping UI, `#/ref/<CRID>` routing, paste-reference | Deep links from Continuum | Feature flag `config.enableRegistry` |
| **S6** Chat + Copilot V1 | Deterministic chat with labels and citations; fact packs; Ask Copilot handoff; agent docs (V2 pilot) | Chat useful without AI | Flag per provider |
| **S7** Behaviour fixes + cleanup | C-01, C-02, C-04, C-05, F-02, F-08 fixes with updated golden files; delete `legacy/`, `DEFAULTS`, Ollama, iframe, PIN; move remaining views | Final target | Previous release folder (still contains legacy) |

Rules:
* **Never replace the whole UI in one change.** S3 introduces the new shell beside the legacy app, and views move one at a time.
* No slice mixes refactor and behaviour change.
* Each slice updates continuity documents (prompt 05) and the CHANGELOG.

## 5. Rollback route summary

1. **Code:** every release is a folder (`Continuum/Finance/releases/finance-X.Y.Z/`), so rollback means copying the previous folder back. Until S7, `legacy/index.html` ships inside every release.
2. **Data:** published snapshots plus SharePoint version history; rollback means Republish snapshot.
3. **Repository:** each slice is a separate commit or branch, reverted with `git revert` (never history rewrite).

## 6. Done criteria

* No first-party file over ~400 lines.
* No inline scripts or handlers.
* CSP active.
* All vendor files hashed and licensed.
* Golden tests and new unit tests green in Edge and in Node.
* `legacy/` removed.
* Zero CDN or network references.
* Assessment findings SEC-01…SEC-10 closed or formally accepted.
