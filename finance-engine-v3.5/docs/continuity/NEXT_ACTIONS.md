# Next Actions

Last updated: 2026-10-04 (after the BAS-002 build). Maximum 15 entries. Ordered. Source order: `docs/backlog/FINAL_EXECUTION_SEQUENCE.md`. Execute coding items with `.claude/prompts/IMPLEMENT_ONE_ITEM_TEMPLATE.md`.

| # | Backlog ID | Action | Who |
|---|---|---|---|
| 1 | BAS-002 | Review and commit `tools/probe/`: `BAS-002: Environment probe page for managed-laptop validation` | Owner |
| 2 | BAS-002 | Copy `tools/probe/` into the synced Teams channel folder, open `index.html` in managed Edge, follow `tools/probe/README.md`, press **Copy results**, and paste them to the model (or into PROJECT_STATE "Probe results") | Owner |
| 3 | BAS-002 | Record the pasted results; append DEC-020/023/026 outcomes as Proposed to DECISIONS.md | Model |
| 4 | SEC-001 | Harden `server.py` (loopback, `ALLOWED_HOSTS`, origin and content-type checks, body limit; README: Codespaces test data only per DEC-032) | Model |
| 5 | BLD-004 | Add safe static file serving for `vendor/` and `app/` in `server.py` | Model |
| 6 | BLD-001 | Vendor the six libraries locally at the current versions; switch the `<script src>` lines | Model |
| 7 | TST-001 | Test harness, Node runner, browser test page | Model |
| 8 | TST-004 | Legacy sandbox for characterisation tests | Model |
| 9 | TST-002 | Synthetic edge-case fixtures | Model |
| 10 | TST-003 | Characterisation golden tests | Model |
| 11 | BAK-001 | Complete, checksummed backup export/import (works under `file://`) | Model |
| 12 | BAK-001 | Export a backup from every place the legacy app has been used (`localhost:3005`, Downloads copy, any Codespaces URL) | Owner |
| 13 | MIG-001 | Label demo `DEFAULTS` data as SAMPLE everywhere | Model |
| 14 | DAT-001 | Confirmation and backup before Restore-from-Master and Load-scenario | Model |
| 15 | DAT-002 | Next item in F0.7 (see MASTER_BACKLOG) | Model |

Unblocked by DOC-001 but not yet listed (later in the sequence; each also needs other dependencies): REF-001 (needs TST-001), XREP-001 (needs REF-001).
