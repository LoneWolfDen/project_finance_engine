# Next Actions

Last updated: 2026-10-05 (owner answered the F1.5/F1.6 checkpoints; DEC-040 date display done). Maximum 15 entries. Ordered. Source order: `docs/backlog/FINAL_EXECUTION_SEQUENCE.md`. Execute coding items with `.claude/prompts/IMPLEMENT_ONE_ITEM_TEMPLATE.md`.

| # | Backlog ID | Action | Who |
|---|---|---|---|
| 1 | (review) | Review the unpushed commits (`git log --oneline origin/assessment/pwa-readiness-2026-10..HEAD`), run the legacy app once, then `git push` | Owner |
| 2 | DEC-040 | Optional: open the app and look at Resources, POs, Invoices and Expenses, and one Excel export: dates should read DD-MM-YYYY (checked in headless Chrome only) | Owner |
| 3 | DEC-041 | Say where real PO details come from and how their start dates look (for example `2025-01-01` or `01/01/2025`) | Owner |
| 4 | BAS-002 | Run `tools/probe/` from the synced Teams channel folder in managed Edge; paste "Copy results" | Owner (later: DEC-038) |
| 5 | BLD-001 | On the work laptop, open the app with DevTools → Network: no CDN hosts | Owner (later: DEC-038) |
| 6 | BLD-002 | Open an Excel export from the app in Microsoft Excel: no repair prompt | Owner (can be done on the Mac if Excel is installed) |
| 7 | BAS-002 | Record the probe results; append DEC-020/023/026 outcomes as Proposed | Model |
| 8 | SHL-004 | Phase 1 (F1.6): move the legacy app to legacy/ (backups done: DEC-039) | Model |
| 9 | SHL-001 | Phase 1 (F1.6) | Model |
