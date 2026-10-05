# Next Actions

Last updated: 2026-10-05 (after IMP-003; F1.4 and F1.5 built; owner checkpoints next). Maximum 15 entries. Ordered. Source order: `docs/backlog/FINAL_EXECUTION_SEQUENCE.md`. Execute coding items with `.claude/prompts/IMPLEMENT_ONE_ITEM_TEMPLATE.md`.

| # | Backlog ID | Action | Who |
|---|---|---|---|
| 1 | (review) | Review the unpushed commits (`git log --oneline origin/assessment/pwa-readiness-2026-10..HEAD`; one commit per item: overnight run plus DAT-001…006), run the legacy app once, then `git push` | Owner |
| 2 | IMP-003 / F1.5 | Checkpoint: open one real resource-rules export (not committed), find a date with a day above 12 and confirm the day comes first; compare its header with `docs/schema/MAPPING_PROFILES.md` | Owner |
| 3 | SHL-004 / F1.6 | Before SHL-004: export fresh backups (Settings → Export Full Config) from every place the legacy app is used | Owner |
| 4 | STO-001, REF-001 | Read `docs/schema/DATASET_V1.md` and `docs/schema/CONTINUUM_REFERENCE.md`; confirm they match your intent | Owner |
| 5 | BAS-002 | Run `tools/probe/` from the synced Teams channel folder in managed Edge; paste "Copy results" | Owner (later: DEC-038) |
| 6 | BLD-001 | On the work laptop, open the app with DevTools → Network: no CDN hosts | Owner (later: DEC-038) |
| 7 | BLD-002 | Open an Excel export from the app in Microsoft Excel: no repair prompt | Owner (can be done on the Mac if Excel is installed) |
| 8 | BAS-002 | Record the probe results; append DEC-020/023/026 outcomes as Proposed | Model |
| 9 | SHL-004 | Phase 1 (F1.6): move the legacy app to legacy/ (after the backups) | Model |
| 10 | SHL-001 | Phase 1 (F1.6) | Model |
