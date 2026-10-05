# Vendored libraries

Third-party libraries used by the legacy app (`index.html`), stored here so the app makes no requests to CDN hosts (BLD-001; charter §10–11; ADR-008).

* Byte-identical to the files the app loaded from the CDN URLs before BLD-001, **except SheetJS**, upgraded by BLD-002, and **jsPDF / jsPDF-AutoTable**, upgraded by BLD-003 (below).
* `tests/server/test_static.py` checks every file's SHA-256 against the table below. If you replace a file, update its row in the same commit.
* Licence files were taken from the same package version.
* **SheetJS upgrade (BLD-002, 2026-10-04):** 0.18.5 → **0.20.3**, the latest release on `https://cdn.sheetjs.com/` (SheetJS no longer publishes fixed versions to npm). Both files were cross-checked against the official package `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (identical SHA-256).
* **Advisory check (2026-10-04, GitHub advisory database, npm package `xlsx`):** CVE-2024-22363 / GHSA-5pgg-2g8v-p4x9 (ReDoS, affects < 0.20.2) and CVE-2023-30533 / GHSA-4r6h-8v6p-xvw6 (prototype pollution, affects < 0.19.3) are both fixed in 0.20.3. Older advisories CVE-2021-32012/32013/32014 affect < 0.17.0. No advisory lists 0.20.3 as affected.
* `tests/unit/vendor-xlsx.test.js` checks that 0.20.3 reads `tests/fixtures/xlsx/timesheet-basic.xlsx` into the same rows as 0.18.5 did (`tests/golden/vendor/xlsx-basic.json`).
* **jsPDF upgrade (BLD-003, 2026-10-05):** jsPDF 2.5.1 → **4.2.1** (latest on npm) and jsPDF-AutoTable 3.8.2 → **5.0.8** (latest on npm; its `peerDependencies` allow `jspdf ^2 || ^3 || ^4`). Files from jsDelivr's npm mirror, byte-identical to the official npm tarballs `jspdf-4.2.1.tgz` and `jspdf-autotable-5.0.8.tgz`, whose SHA-512 matched the npm registry `dist.integrity`. AutoTable 5 still attaches `doc.autoTable` itself when `window.jspdf` is already loaded, so `exportPDF` is unchanged.
* **Advisory check (2026-10-05, GitHub advisory database, npm `jspdf` and `jspdf-autotable`):** 2.5.1 was affected by, among others, CVE-2025-68428 (critical, path traversal, ≤ 3.0.4), CVE-2026-31938 (critical, HTML injection, ≤ 4.2.0), CVE-2026-31898, CVE-2026-25940, CVE-2026-25755, CVE-2026-25535, CVE-2026-24737, CVE-2026-24133, CVE-2025-57810, CVE-2025-29907 (high). All are fixed in 4.2.1; no advisory lists 4.2.1 as affected. `jspdf-autotable` has no advisories.
* `tests/unit/vendor-jspdf.test.js` loads both files as the page does and makes a document with a 3-row table.
* **Chart.js note:** the npm package `chart.js@4.4.0` ships `dist/chart.umd.js` but no `chart.umd.min.js`. The file the app loaded (and that is stored here) was produced by jsDelivr's automatic minification of `chart.umd.js`. The other two jsDelivr npm files match the hashes jsDelivr publishes for the package (checked 2026-10-04).

## Library files

| Library | Version | Licence | File | Source URL | Retrieved | SHA-256 | Bytes |
|---|---|---|---|---|---|---|---|
| Chart.js | 4.4.0 | MIT | `chart.js-4.4.0/chart.umd.min.js` | https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js | 2026-10-04 | `0e2326c6868072bec1592760c6729043caeea2960a2b46cee6a2192aac6abff0` | 205222 |
| chartjs-plugin-datalabels | 2.2.0 | MIT | `chartjs-plugin-datalabels-2.2.0/chartjs-plugin-datalabels.min.js` | https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js | 2026-10-04 | `20c08f3d9c6d2ef76df6d6a6f1127c0013339fe32add24222276c398c6308c38` | 12937 |
| SheetJS (xlsx) | 0.20.3 | Apache-2.0 | `xlsx-0.20.3/xlsx.full.min.js` | https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js | 2026-10-04 | `cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41` | 951904 |
| jsPDF | 4.2.1 | MIT | `jspdf-4.2.1/jspdf.umd.min.js` | https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js | 2026-10-05 | `e6551fcdc32f09d6853b2c5126d18d01d9447e0da618a41a11ebeee0f6c20d54` | 420165 |
| jsPDF-AutoTable | 5.0.8 | MIT | `jspdf-autotable-5.0.8/jspdf.plugin.autotable.min.js` | https://cdn.jsdelivr.net/npm/jspdf-autotable@5.0.8/dist/jspdf.plugin.autotable.min.js | 2026-10-05 | `a65dff2c6a8296b16aff24e69f7683cd7dbaed4a4ec26b507d6840ee27d54649` | 32389 |
| PptxGenJS | 3.12.0 | MIT | `pptxgenjs-3.12.0/pptxgen.bundle.js` | https://cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@3.12.0/dist/pptxgen.bundle.js | 2026-10-04 | `cd078ca9e91c6f9e061ee0a3c310d6ff157c3a71b1dea7f40fd53818017266ff` | 477529 |

## Licence files

| Library | Version | Licence | File | Source URL | Retrieved | SHA-256 | Bytes |
|---|---|---|---|---|---|---|---|
| Chart.js | 4.4.0 | MIT | `chart.js-4.4.0/LICENSE.md` | https://cdn.jsdelivr.net/npm/chart.js@4.4.0/LICENSE.md | 2026-10-04 | `5a0877ad6d818529be4f33009d0942cdf7e2ed7656156f4aba7308459a546030` | 1093 |
| chartjs-plugin-datalabels | 2.2.0 | MIT | `chartjs-plugin-datalabels-2.2.0/LICENSE.md` | https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/LICENSE.md | 2026-10-04 | `075bb10eabebc9356311ffca1b18fdd470fca8e5c2ce0f6e098430c81c59a624` | 1110 |
| SheetJS (xlsx) | 0.20.3 | Apache-2.0 | `xlsx-0.20.3/LICENSE` | https://cdn.sheetjs.com/xlsx-0.20.3/package/LICENSE | 2026-10-04 | `4d2a38ac35cda06a555c84074a819d413339cd3691b822cae50f8f322fe01f64` | 11355 |
| jsPDF | 4.2.1 | MIT | `jspdf-4.2.1/LICENSE` | https://cdn.jsdelivr.net/npm/jspdf@4.2.1/LICENSE | 2026-10-05 | `dc388ec35ff463288cdde3588a36fd4ed12a45deff053243b37309acc9ef583b` | 1142 |
| jsPDF-AutoTable | 5.0.8 | MIT | `jspdf-autotable-5.0.8/LICENSE.txt` | https://cdn.jsdelivr.net/npm/jspdf-autotable@5.0.8/LICENSE.txt | 2026-10-05 | `99a374e0385cf714d2faae5f6e02ec79217c6bcecec39bdb9e102091471b960a` | 1133 |
| PptxGenJS | 3.12.0 | MIT | `pptxgenjs-3.12.0/LICENSE` | https://cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@3.12.0/LICENSE | 2026-10-04 | `7a2bfe96150786ed1908b8e63f98ebab88875c1e79e28faff6649e0f11f77e52` | 1081 |
