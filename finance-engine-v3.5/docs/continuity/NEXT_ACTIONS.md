# Next Actions

Last updated: 2026-10-05 (Phase 1 built, REP-002 done; owner checks F1.8 and F1.9 open). Maximum 15 entries. Ordered. Source order: `docs/backlog/FINAL_EXECUTION_SEQUENCE.md`. Execute coding items with `.claude/prompts/IMPLEMENT_ONE_ITEM_TEMPLATE.md`.

| # | Backlog ID | Action | Who |
|---|---|---|---|
| 1 | DEC-040 | Optional: open the app and look at Resources, POs, Invoices and Expenses, and one Excel export: dates should read DD-MM-YYYY (checked in headless Chrome only) | Owner |
| 2 | BAS-002 | Run `tools/probe/` from the synced Teams channel folder in managed Edge; paste "Copy results" | Owner (later: DEC-038) |
| 3 | BLD-001 | On the work laptop, open the app with DevTools → Network: no CDN hosts | Owner (later: DEC-038) |
| 4 | BLD-002 | Open an Excel export from the app in Microsoft Excel: no repair prompt | Owner (can be done on the Mac if Excel is installed) |
| 5 | BAS-002 | Record the probe results; append DEC-020/023/026 outcomes as Proposed | Model |
| 6 | SHL-003 (check) | Optional: in Edge, open the new `index.html` → Diagnostics → **Copy diagnostics**, and paste the text to Claude (to compare the Features lines with the BAS-002 probe later) | Owner |
| 7 | F1.8 | Checkpoint: copy the folder `samples/published` to `published` (next to `index.html`) in your synced folder, double-click `index.html`: the banner should be green, "Ready: Sample data (not real) …", with counts on Portfolio. Then delete that `published` folder again | Owner |
| 8 | F1.9 | Checkpoint (on your computer only, never committed): (1) export a backup from the legacy app (Settings → Export Full Config); (2) make a references file `references.csv` with columns `ref,name,client,po_team_identifiers,peoplesoft_project_ids` (one row per project; several teams or IDs separated by `;`); (3) in the new app → Publish → **Import a legacy backup…**, then **Choose files…** for references.csv; (4) **Keep in draft** → **Check the dataset**; (5) compare **Totals per project** (All projects row) with the legacy Overview (no year selected): PO value, Total actuals, Expenses. Report only whether they match | Owner |
| 9 | Phase 2 | F2.1: UI-007 → UI-001 → UI-002 → UI-003 (after the F1.8 and F1.9 checks) | Model |
