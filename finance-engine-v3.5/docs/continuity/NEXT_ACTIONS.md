# Next Actions

Last updated: 2026-10-05 (F1.8 built: STO-003, STO-004, SEC-005; owner checkpoint next). Maximum 15 entries. Ordered. Source order: `docs/backlog/FINAL_EXECUTION_SEQUENCE.md`. Execute coding items with `.claude/prompts/IMPLEMENT_ONE_ITEM_TEMPLATE.md`.

| # | Backlog ID | Action | Who |
|---|---|---|---|
| 1 | DEC-040 | Optional: open the app and look at Resources, POs, Invoices and Expenses, and one Excel export: dates should read DD-MM-YYYY (checked in headless Chrome only) | Owner |
| 2 | BAS-002 | Run `tools/probe/` from the synced Teams channel folder in managed Edge; paste "Copy results" | Owner (later: DEC-038) |
| 3 | BLD-001 | On the work laptop, open the app with DevTools → Network: no CDN hosts | Owner (later: DEC-038) |
| 4 | BLD-002 | Open an Excel export from the app in Microsoft Excel: no repair prompt | Owner (can be done on the Mac if Excel is installed) |
| 5 | BAS-002 | Record the probe results; append DEC-020/023/026 outcomes as Proposed | Model |
| 6 | SHL-003 (check) | Optional: in Edge, open the new `index.html` → Diagnostics → **Copy diagnostics**, and paste the text to Claude (to compare the Features lines with the BAS-002 probe later) | Owner |
| 7 | F1.8 | Checkpoint: copy the folder `samples/published` to `published` (next to `index.html`) in your synced folder, double-click `index.html`: the banner should be green, "Ready: Sample data (not real) …", with counts on Portfolio. Then delete that `published` folder again | Owner |
| 8 | IMP-004 | Phase 1 (F1.9), after the F1.8 checkpoint | Model |
