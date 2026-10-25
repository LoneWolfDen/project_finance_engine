# Regression test

Drives the app in headless Chromium and snapshots what it renders:

- every tab's HTML and chart data, with the default data and after uploading
  `test_ResourceRules.csv`, `test_Timesheet.csv`, PO details, invoices and expenses
- the Year filter, PO_Team slicer, data labels, table sort, adding a resource row
- scenarios, the Smart Parser preview, the chat panel (Smart mode), both PIN modals
- the Excel (cell by cell), PDF, PowerPoint and Full Config exports

The clock is fixed at 2025-11-15 so dates in the output don't change between runs.
CDN libraries are served from `node_modules` so it works offline.

First time: `npm install && npx playwright install chromium` in this folder.

```bash
cd finance-engine-v3.5/tests/regression
./run.sh          # working tree vs HEAD
./run.sh main     # working tree vs another branch or commit
```

Prints `IDENTICAL` when nothing changed, otherwise the first differences.
Use it for refactors, where the output should not change at all.

`fixtures/test_PO_Details.json` is the repo's `test_PO_Details.json` with
`PO_Validity` in `mm-yy` form, which the Settings import validation requires.
`fixtures/solution.xlsx` is a small Solution Excel for the Smart Parser.
