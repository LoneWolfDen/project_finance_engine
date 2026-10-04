# Vendored libraries

Third-party libraries used by the legacy app (`index.html`), stored here so the app makes no requests to CDN hosts (BLD-001; charter §10–11; ADR-008).

* Byte-identical to the files the app loaded from the CDN URLs before BLD-001, **except SheetJS**, upgraded by BLD-002 (below). jsPDF is upgraded by BLD-003.
* `tests/server/test_static.py` checks every file's SHA-256 against the table below. If you replace a file, update its row in the same commit.
* Licence files were taken from the same package version.
* **SheetJS upgrade (BLD-002, 2026-10-04):** 0.18.5 → **0.20.3**, the latest release on `https://cdn.sheetjs.com/` (SheetJS no longer publishes fixed versions to npm). Both files were cross-checked against the official package `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (identical SHA-256).
* **Advisory check (2026-10-04, GitHub advisory database, npm package `xlsx`):** CVE-2024-22363 / GHSA-5pgg-2g8v-p4x9 (ReDoS, affects < 0.20.2) and CVE-2023-30533 / GHSA-4r6h-8v6p-xvw6 (prototype pollution, affects < 0.19.3) are both fixed in 0.20.3. Older advisories CVE-2021-32012/32013/32014 affect < 0.17.0. No advisory lists 0.20.3 as affected.
* `tests/unit/vendor-xlsx.test.js` checks that 0.20.3 reads `tests/fixtures/xlsx/timesheet-basic.xlsx` into the same rows as 0.18.5 did (`tests/golden/vendor/xlsx-basic.json`).
* **Chart.js note:** the npm package `chart.js@4.4.0` ships `dist/chart.umd.js` but no `chart.umd.min.js`. The file the app loaded (and that is stored here) was produced by jsDelivr's automatic minification of `chart.umd.js`. The other two jsDelivr npm files match the hashes jsDelivr publishes for the package (checked 2026-10-04).

## Library files

| Library | Version | Licence | File | Source URL | Retrieved | SHA-256 | Bytes |
|---|---|---|---|---|---|---|---|
| Chart.js | 4.4.0 | MIT | `chart.js-4.4.0/chart.umd.min.js` | https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js | 2026-10-04 | `0e2326c6868072bec1592760c6729043caeea2960a2b46cee6a2192aac6abff0` | 205222 |
| chartjs-plugin-datalabels | 2.2.0 | MIT | `chartjs-plugin-datalabels-2.2.0/chartjs-plugin-datalabels.min.js` | https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js | 2026-10-04 | `20c08f3d9c6d2ef76df6d6a6f1127c0013339fe32add24222276c398c6308c38` | 12937 |
| SheetJS (xlsx) | 0.20.3 | Apache-2.0 | `xlsx-0.20.3/xlsx.full.min.js` | https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js | 2026-10-04 | `cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41` | 951904 |
| jsPDF | 2.5.1 | MIT | `jspdf-2.5.1/jspdf.umd.min.js` | https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js | 2026-10-04 | `98ccf17aa10c20bb1301762618fcc9b6ab3a4e7f26b6071d64d0b41154df3875` | 364463 |
| jsPDF-AutoTable | 3.8.2 | MIT | `jspdf-autotable-3.8.2/jspdf.plugin.autotable.min.js` | https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js | 2026-10-04 | `27a9c3b61843c6312b87f142d40fe77c0f0f054c9f3cdeccc4bfd5f3322859c8` | 38976 |
| PptxGenJS | 3.12.0 | MIT | `pptxgenjs-3.12.0/pptxgen.bundle.js` | https://cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@3.12.0/dist/pptxgen.bundle.js | 2026-10-04 | `cd078ca9e91c6f9e061ee0a3c310d6ff157c3a71b1dea7f40fd53818017266ff` | 477529 |

## Licence files

| Library | Version | Licence | File | Source URL | Retrieved | SHA-256 | Bytes |
|---|---|---|---|---|---|---|---|
| Chart.js | 4.4.0 | MIT | `chart.js-4.4.0/LICENSE.md` | https://cdn.jsdelivr.net/npm/chart.js@4.4.0/LICENSE.md | 2026-10-04 | `5a0877ad6d818529be4f33009d0942cdf7e2ed7656156f4aba7308459a546030` | 1093 |
| chartjs-plugin-datalabels | 2.2.0 | MIT | `chartjs-plugin-datalabels-2.2.0/LICENSE.md` | https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/LICENSE.md | 2026-10-04 | `075bb10eabebc9356311ffca1b18fdd470fca8e5c2ce0f6e098430c81c59a624` | 1110 |
| SheetJS (xlsx) | 0.20.3 | Apache-2.0 | `xlsx-0.20.3/LICENSE` | https://cdn.sheetjs.com/xlsx-0.20.3/package/LICENSE | 2026-10-04 | `4d2a38ac35cda06a555c84074a819d413339cd3691b822cae50f8f322fe01f64` | 11355 |
| jsPDF | 2.5.1 | MIT | `jspdf-2.5.1/LICENSE` | https://cdn.jsdelivr.net/npm/jspdf@2.5.1/LICENSE | 2026-10-04 | `2d26bfab8a36d2250602c7a7597237e180c5cd3517acc108126e3cb399f483c8` | 1142 |
| jsPDF-AutoTable | 3.8.2 | MIT | `jspdf-autotable-3.8.2/LICENSE.txt` | https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/LICENSE.txt | 2026-10-04 | `99a374e0385cf714d2faae5f6e02ec79217c6bcecec39bdb9e102091471b960a` | 1133 |
| PptxGenJS | 3.12.0 | MIT | `pptxgenjs-3.12.0/LICENSE` | https://cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@3.12.0/LICENSE | 2026-10-04 | `7a2bfe96150786ed1908b8e63f98ebab88875c1e79e28faff6649e0f11f77e52` | 1081 |
