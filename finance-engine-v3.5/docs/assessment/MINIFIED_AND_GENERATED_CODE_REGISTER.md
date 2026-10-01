# Minified and Generated Code Register

Assessment date: 2026-10-01 · Baseline commit `5d453d1`
Mode: read-only. Third-party files were **not downloaded**. Their sizes, hashes and exact licence headers were therefore not measured, and must be recorded when they are vendored.

## 1. Headline findings

| Question | Answer | Evidence | Confidence |
|---|---|---|---|
| Minified files tracked in Git? | **None** | `git ls-files` (42 files): only `.html`, `.py`, `.md`, `.json`, `.csv`, `Dockerfile`, `.gitignore`, `devcontainer.json` | High |
| Minified first-party application code? | **None.** `finance-engine-v3.5/index.html` is hand-written (comments, section banners, descriptive identifiers such as `computeForecast`, `parseValidityEnd`) but uses a compact style, with ~40 lines over 300 characters | `awk` line-length scan; full read | High |
| Source maps? | **None** in the repository. CDN `.min.js` files may reference upstream maps, which are vendor maps and expose only upstream open-source code | `find`/`git ls-files` | High |
| Build output / generator? | **None.** No `package.json`, bundler, transpiler or generator script | Repository-wide | High |
| Minified code patched by override CSS/JS? | **No.** The single `<style>` block styles first-party markup only, and nothing wraps or monkey-patches vendor globals beyond normal API use (`Chart.register(ChartDataLabels)`, `Chart.defaults.plugins.datalabels=…`, `index.html:431`) | Full read | High |
| Can generated files be reproduced? | The vendor files can, from upstream at the pinned versions. The embedded data blocks (G-04, G-05) cannot, because no generator or source workbook is in the repository | — | High |
| Would unminification be misleading? | **Not applicable to application code**, which is already readable. Vendor files should never be unminified and edited. Replace them with upstream builds instead | — | High |

**Formatting recovery vs semantic source recovery.** For this repository the application's semantic source *is* the committed `index.html`, so no recovery is needed. The maintainability problem is structural: one file, global state, duplicated logic and no tests. Reformatting does not fix it. The recommended route is **reconstruct component by component** (extract modules from the readable inline script) **behind compatibility tests**. Characterisation tests come first, against the existing fixtures.

## 2. Register: application files

| ID | Path | File type | Size | Likely origin | Application / vendor | Readable source exists | Source map exists | Generator exists | Runtime usage | Licence information | Vulnerability implications | Recommended disposition |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A-01 | `finance-engine-v3.5/index.html` | HTML + inline CSS + inline JS (2,279 lines) | 173,493 B | Hand-authored (author name in UI); evolved v1 → v3.5 | Application | **Yes.** The file is the source | No (not needed) | n/a (not generated) | Served for every GET by `server.py:91-97` | **No licence file in repository** | Unescaped `innerHTML` (SEC-03/05) | **KEEP as source; reconstruct component by component behind compatibility tests** (not one of the minified dispositions; listed for completeness) |
| A-02 | `finance-engine-v3/index.html` | HTML/JS | 160,491 B | Previous version | Application (superseded) | Yes | No | n/a | Only if v3 server is started | None | Same | ARCHIVE |
| A-03 | `finance-engine-v2/index.html` | HTML/JS | 122,531 B | Previous version | Application (superseded) | Yes | No | n/a | Only if v2 server is started | None | Same | ARCHIVE |
| A-04 | `finance-engine-v1/index.html` | HTML/JS | 73,748 B | Initial version | Application (superseded) | Yes | No | n/a | Only if v1 server is started | None | Same | ARCHIVE |

## 3. Register: minified vendor files (runtime, CDN-loaded, not in repository)

All are loaded by `finance-engine-v3.5/index.html:4-9` (and by v3; v2 loads V-01, V-03, V-04, V-05; v1 loads V-01). There is no `integrity` attribute on any of them.

| ID | Path (URL) | File type | Size | Likely origin | App / vendor | Readable source exists | Source map exists | Generator exists | Runtime usage | Licence information | Vulnerability implications | Recommended disposition |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V-01 | `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js` | Minified UMD JS | Not measured | npm `chart.js` 4.4.0 | Vendor | Yes, upstream (github.com/chartjs/Chart.js tag v4.4.0) | Upstream publishes maps (not verified for this file) | Upstream rollup build | Charts on Overview, Burndown, Variance. `Chart.register` at top level is **fatal if missing** (`index.html:431`) | MIT (upstream; not recorded in repo) | No known advisory recorded by assessor; confirm | **KEEP VENDOR**: vendor locally under `vendor/` with version, licence, source URL and SHA-384 |
| V-02 | `https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js` | Minified JS | Not measured | npm `chartjs-plugin-datalabels` 2.2.0 | Vendor | Yes, upstream | Not verified | Upstream build | "Show Data Labels" toggle; registered at `index.html:431` | MIT (upstream) | None known to assessor; confirm | **KEEP VENDOR** (localise) |
| V-03 | `https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js` | Minified JS | Not measured | npm `xlsx` 0.18.5 (SheetJS CE; last npm-registry release) | Vendor | Yes, upstream (git.sheetjs.com) | Not verified | Upstream build | Parsing every XLSX upload (`1425,1591,2008`); Excel export (`1767-1785`) | Apache-2.0 (upstream) | **Known advisories** (prototype pollution CVE-2023-30533; ReDoS CVE-2024-22363), fixed only in versions distributed from `cdn.sheetjs.com`. SEC-06 | **REPLACE**: current SheetJS CE from the vendor's own distribution, vendored locally with hash |
| V-04 | `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js` | Minified UMD JS | Not measured | npm `jspdf` 2.5.1 | Vendor | Yes, upstream | Not verified | Upstream build | PDF export (`1787-1830`) | MIT (upstream) | Later advisories in 2.x/3.0.x (SEC-07; confirm) | **REPLACE** (upgrade to a patched release), then KEEP VENDOR locally |
| V-05 | `https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js` | Minified JS | Not measured | npm `jspdf-autotable` 3.8.2 | Vendor | Yes, upstream | Not verified | Upstream build | PDF tables | MIT (upstream) | Must stay compatible with V-04 upgrade | **KEEP VENDOR** (localise; re-check compatibility when V-04 changes) |
| V-06 | `https://cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@3.12.0/dist/pptxgen.bundle.js` | Bundled JS (includes JSZip); minification not verified | Not measured | GitHub repo tag `v3.12.0` served through jsDelivr's `/gh/` endpoint | Vendor | Yes, upstream | Not verified | Upstream build | PowerPoint export (`1832-1903`) | PptxGenJS MIT; bundled JSZip is dual MIT/GPLv3 (upstream) | Served from a Git tag rather than a registry artefact | **KEEP VENDOR**: localise from the npm `pptxgenjs@3.12.0` artefact with hash |

## 4. Register: generated and derived artefacts

| ID | Path | File type | Size | Likely origin | App / vendor | Readable source exists | Source map exists | Generator exists | Runtime usage | Licence information | Vulnerability implications | Recommended disposition |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G-01 | `finance-engine-v3.5/finance_engine.db` (runtime; currently absent; `*.db` git-ignored) | SQLite | n/a | Created by `get_db()` `server.py:39-49` | Application runtime data | n/a | n/a | Yes (`server.py`) | Primary server-side persistence | n/a | Holds personal/commercial data in plaintext (SEC-12) | Not a code artefact. Keep untracked; relocate outside the source directory (decision for target architecture) |
| G-02 | Historical `finance_engine.db` blobs in commits `db120c4` (`finance-engine-v3/`) and `cac8e1f` (repo root) | SQLite | 12,288 B each | Accidental commits; removed in `e3eb85c`/`d30733a` | Runtime data | n/a | n/a | Yes | None | n/a | **Verified empty** (`config` table, 0 rows) | **ARCHIVE**: leave in history; no rewrite justified |
| G-03 | `__pycache__/`, `*.pyc` | Python bytecode | n/a | Python import cache | Generated | Yes (`server.py`) | n/a | Yes (interpreter) | None | n/a | None | Already ignored; none present. No action |
| G-04 | Embedded data block `HOLIDAYS_BY_LOC`, `finance-engine-v3.5/index.html:192` (one line, 2,531 chars) | JS object literal (data) | ~2.5 KB | Comment: "from Burndown_Template_v4.7.xlsx" | Application data | **No.** The source workbook is not in the repo | No | **No** | `isWorkingDay` for every forecast and availability calculation | Unknown. Derived from an internal template | Covers only 2025–2026 (C-07); provenance unverifiable (SEC-14) | **REBUILD**: move to a versioned data file with source, as-of date and a documented regeneration method |
| G-05 | Embedded `DEFAULTS` incl. `actuals_monthly`, `fx_rates`, `ot_params`, `resources`, `po_details`, `finance-engine-v3.5/index.html:110-131` | JS object literal (data) | ~5 KB | Hand-entered or derived from a real workbook (unknown) | Application demo data | No | No | No | Loaded whenever storage is empty, corrupt or reset; also the target of Restore-from-Master when no master exists (F-20) | Unknown | Realistic employee IDs/rates (SEC-14); fabricated actuals displayed as real (F-21) | **REPLACE** with clearly synthetic fixtures, kept separate from code and labelled as demo |
| G-06 | Client-side exports `Finance_Report_YYYY-MM-DD.{xlsx,pdf,pptx}`, `finance_config_YYYY-MM-DD.json` | Office/PDF/JSON | n/a | Generated in browser (`1783,1828,1901,1972`) | Application output | Yes (generator is `index.html`) | n/a | Yes | User downloads | n/a | Carry personal signature (SEC-18); no manifest/checksum | Not stored in repo (`*.xlsx` ignored; others are not ignored). No action |

## 5. Duplicated non-generated assets (for completeness)

`test_Expenses.json`, `test_Invoices.json`, `test_ResourceRules.csv` and `test_Timesheet.csv` are byte-identical across all four version folders (MD5 verified). `test_PO_Details.json` matches in v1, v3 and v3.5, and differs in v2. These are hand-made fixtures, not generated, and are covered in REPOSITORY_CLEANUP_CANDIDATES.md.
