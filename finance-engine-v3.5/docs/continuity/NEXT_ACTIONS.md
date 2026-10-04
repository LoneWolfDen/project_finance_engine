# Next Actions

Last updated: 2026-10-04 (after SEC-001). Maximum 15 entries. Ordered. Source order: `docs/backlog/FINAL_EXECUTION_SEQUENCE.md`. Execute coding items with `.claude/prompts/IMPLEMENT_ONE_ITEM_TEMPLATE.md`.

| # | Backlog ID | Action | Who |
|---|---|---|---|
| 1 | SEC-001 | Review and commit: `SEC-001: Harden legacy server.py (loopback, origin checks, no wildcard CORS)`. Then run the app once with the real database (`python3 server.py`, open http://localhost:3005, save, reload) | Owner |
| 2 | BAS-002 | Copy `tools/probe/` into the synced Teams channel folder, open `index.html` in managed Edge, follow `tools/probe/README.md`, press **Copy results**, and paste them to the model (or into PROJECT_STATE "Probe results") | Owner |
| 3 | BAS-002 | Record the pasted results; append DEC-020/023/026 outcomes as Proposed to DECISIONS.md | Model |
| 4 | BLD-004 | Add safe static file serving for `vendor/` and `app/` in `server.py` | Model |
| 5 | BLD-001 | Vendor the six libraries locally at the current versions; switch the `<script src>` lines | Model |
| 6 | TST-001 | Test harness, Node runner, browser test page | Model |
| 7 | TST-004 | Legacy sandbox for characterisation tests | Model |
| 8 | TST-002 | Synthetic edge-case fixtures | Model |
| 9 | TST-003 | Characterisation golden tests | Model |
| 10 | BAK-001 | Complete, checksummed backup export/import (works under `file://`) | Model |
| 11 | BAK-001 | Export a backup from every place the legacy app has been used (`localhost:3005`, Downloads copy, any Codespaces URL) | Owner |
| 12 | MIG-001 | Label demo `DEFAULTS` data as SAMPLE everywhere | Model |
| 13 | DAT-001 | Confirmation and backup before Restore-from-Master and Load-scenario | Model |
| 14 | DAT-002 | Next item in F0.7 (see MASTER_BACKLOG) | Model |
| 15 | DAT-003 | Next item in F0.7 (see MASTER_BACKLOG) | Model |

Unblocked by DOC-001 but not yet listed (later in the sequence; each also needs other dependencies): REF-001 (needs TST-001), XREP-001 (needs REF-001).
