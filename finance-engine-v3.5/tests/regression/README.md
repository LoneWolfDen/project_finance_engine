# Regression test

Drives the app in headless Chromium and snapshots what it renders:

- every tab's HTML and chart data, with the default data and after uploading
  `test_ResourceRules.csv`, `test_Timesheet.csv`, PO details, invoices and expenses
- the Year filter, PO_Team slicer, data labels, table sort, adding a resource row
- scenarios, the Smart Parser preview, the chat panel (Smart mode), both PIN modals
- the Excel (cell by cell), PDF, PowerPoint and Full Config exports

The clock is fixed at 2025-11-15 so dates in the output don't change between runs.
The app serves its libraries from `vendor/`; `offline-check.js` blocks every request outside localhost
and checks all tabs, charts and exports still work. `tables-check.js` covers the Settings → Edit data tables:
unchanged saves keep the config identical, edits through the inputs are saved, invalid values are blocked.

First time: `npm install && npx playwright install chromium` in this folder.

```bash
cd finance-engine-v3.5/tests/regression
./run.sh          # working tree vs HEAD
./run.sh main     # working tree vs another branch or commit
```

It also reruns the working tree in New York and Kolkata time and expects identical results.
Prints `IDENTICAL` when nothing changed, otherwise the first differences. It then runs
`startup-check.js`: with different data on the server and in the browser cache, the
charts shown after page load must match the server data.
`currency-check.js` loads POs in GBP, INR and USD and checks that every total equals the
per-team figures converted to the selected normalised currency.
`versions-check.js` saves, compares, applies and deletes resource versions and checks the
funding figures (cost from today, funded until, days covered, additional needed) against an
independent count of UK working days.
`robustness-check.js` covers bank-holiday warnings and editing, duplicate resource rules,
the server refusing writes from other websites, and save history with restore.
`excel-check.js` exports the Excel workbook (sheets, native charts, currency formats), imports it
back into a fresh app unchanged (also with the repo's test files), imports edits made in Excel,
rejects invalid data and checks the fallback without openpyxl. Needs `python3` with openpyxl.
Use it for refactors, where the output should not change at all.

`fixtures/solution.xlsx` is a small Solution Excel for the Smart Parser.
