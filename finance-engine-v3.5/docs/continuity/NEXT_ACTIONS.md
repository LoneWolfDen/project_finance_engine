# Next Actions

Last updated: 2026-10-04. Maximum 15 entries. Ordered. Source order: `docs/backlog/FINAL_EXECUTION_SEQUENCE.md`. Execute coding items with `.claude/prompts/IMPLEMENT_ONE_ITEM_TEMPLATE.md`.

| # | Backlog ID | Action | Who |
|---|---|---|---|
| 1 | BAS-001 | Stage and commit `finance-engine-v3.5/.claude/` and `finance-engine-v3.5/docs/` | Owner |
| 2 | DOC-001 | Apply the identity, CDN, Teams-folder and download-policy corrections to the architecture docs; also record DEC-012, DEC-030-R1, DEC-032, DEC-033 | Model |
| 3 | BAS-002 | Build the probe page `tools/probe/` | Model |
| 4 | BAS-002 | Copy `tools/probe/` into the synced Teams/SharePoint folder, open `index.html` in managed Edge, press **Copy results**, and paste them into PROJECT_STATE "Probe results" | Owner |
| 5 | SEC-001 | Harden `server.py` (loopback, `ALLOWED_HOSTS`, origin and content-type checks, body limit; README: Codespaces test data only per DEC-032) | Model |
| 6 | BLD-004 | Add safe static file serving for `vendor/` and `app/` in `server.py` | Model |
| 7 | BLD-001 | Vendor the six libraries locally at the current versions; switch the `<script src>` lines | Model |
| 8 | TST-001 | Test harness, Node runner, browser test page | Model |
| 9 | TST-004 | Legacy sandbox for characterisation tests | Model |
| 10 | TST-002 | Synthetic edge-case fixtures | Model |
| 11 | TST-003 | Characterisation golden tests | Model |
| 12 | BAK-001 | Complete, checksummed backup export/import (works under `file://`) | Model |
| 13 | BAK-001 | Export a backup from every place the legacy app has been used (`localhost:3005`, Downloads copy, any Codespaces URL) | Owner |
| 14 | MIG-001 | Label demo `DEFAULTS` data as SAMPLE everywhere | Model |
| 15 | DAT-001 | Confirmation and backup before Restore-from-Master and Load-scenario | Model |
