# Next Actions

Last updated: 2026-10-05 (F1.7 done: SHL-002, SHL-003, REL-001; next F1.8). Maximum 15 entries. Ordered. Source order: `docs/backlog/FINAL_EXECUTION_SEQUENCE.md`. Execute coding items with `.claude/prompts/IMPLEMENT_ONE_ITEM_TEMPLATE.md`.

| # | Backlog ID | Action | Who |
|---|---|---|---|
| 1 | DEC-040 | Optional: open the app and look at Resources, POs, Invoices and Expenses, and one Excel export: dates should read DD-MM-YYYY (checked in headless Chrome only) | Owner |
| 2 | BAS-002 | Run `tools/probe/` from the synced Teams channel folder in managed Edge; paste "Copy results" | Owner (later: DEC-038) |
| 3 | BLD-001 | On the work laptop, open the app with DevTools → Network: no CDN hosts | Owner (later: DEC-038) |
| 4 | BLD-002 | Open an Excel export from the app in Microsoft Excel: no repair prompt | Owner (can be done on the Mac if Excel is installed) |
| 5 | BAS-002 | Record the probe results; append DEC-020/023/026 outcomes as Proposed | Model |
| 6 | SHL-003 (check) | Optional: in Edge, open the new `index.html` → Diagnostics → **Copy diagnostics**, and paste the text to Claude (to compare the Features lines with the BAS-002 probe later) | Owner |
| 7 | STO-004 | Phase 1 (F1.8) | Model |
| 8 | SEC-005 | Phase 1 (F1.8): the static scanner reads `tests/security/allowlist.json` (REL-001 added the GitHub entry) | Model |
| 9 | F1.8 | Checkpoint: open the shell with the sample publication from the synced folder: green banner | Owner |
