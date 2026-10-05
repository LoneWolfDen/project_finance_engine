# Next Actions

Last updated: 2026-10-05 (owner confirmed backups, DEC-036; managed-laptop checks deferred, DEC-038). Maximum 15 entries. Ordered. Source order: `docs/backlog/FINAL_EXECUTION_SEQUENCE.md`. Execute coding items with `.claude/prompts/IMPLEMENT_ONE_ITEM_TEMPLATE.md`.

| # | Backlog ID | Action | Who |
|---|---|---|---|
| 1 | (review) | Review the 15 overnight commits (`git log --oneline 60ea319..HEAD`; one commit per item), run the legacy app once, then `git push` | Owner |
| 2 | BAS-002 | Run `tools/probe/` from the synced Teams channel folder in managed Edge; paste "Copy results" | Owner (later: DEC-038) |
| 3 | BLD-001 | On the work laptop, open the app with DevTools → Network: no CDN hosts | Owner (later: DEC-038) |
| 4 | BLD-002 | Open an Excel export from the app in Microsoft Excel: no repair prompt | Owner (can be done on the Mac if Excel is installed) |
| 5 | BAS-002 | Record the probe results; append DEC-020/023/026 outcomes as Proposed | Model |
| 6 | DAT-004 | Startup sync must not overwrite newer browser data | Model |
| 7 | DAT-005 | Make Factory Reset reset what it claims (after a backup) | Model |
| 8 | DAT-006 | De-duplicate only exact duplicate timesheet rows | Model |
| 9 | SEC-003 | Phase 1 starts (F1.1): escape the remaining renderers | Model |
| 10 | SEC-004 | Phase 1 (F1.1) | Model |
| 11 | SRC-001 | Phase 1 (F1.2) | Model |
