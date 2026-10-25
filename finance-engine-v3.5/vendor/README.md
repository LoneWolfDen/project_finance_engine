# Vendored libraries

Served by `server.py` from this folder, so the app works without internet access.

| File | Library | Version |
|---|---|---|
| `chart.umd.js` | Chart.js | 4.4.0 |
| `chartjs-plugin-datalabels.min.js` | chartjs-plugin-datalabels | 2.2.0 |
| `xlsx.full.min.js` | SheetJS Community Edition | 0.18.5 |
| `jspdf.umd.min.js` | jsPDF | 2.5.1 |
| `jspdf.plugin.autotable.min.js` | jsPDF-AutoTable | 3.8.2 |
| `pptxgen.bundle.js` | PptxGenJS | 3.12.0 |

Copied from the npm packages of those versions; licences are in `licenses/`.

## Updating SheetJS

0.18.5 is the last SheetJS version on npm and has known issues when reading crafted files
(CVE-2023-30533, CVE-2024-22363; fixed in 0.20.2). The app only reads workbooks you choose, but
updating is recommended. Newer versions are published only on cdn.sheetjs.com:

```bash
curl -fL -o vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
cd tests/regression && ./run.sh   # the Excel checks cover import and export
```
