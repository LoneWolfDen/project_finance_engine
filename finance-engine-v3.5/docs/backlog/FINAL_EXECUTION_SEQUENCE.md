# Final Execution Sequence

Date: 2026-10-04 · Supersedes `EXECUTION_SEQUENCE.md` and the ordering in `DEPENDENCY_MAP.md` §1. Covers all 88 items in `MASTER_BACKLOG.md`, including the validation amendments and new items.

Rules:
* Execute strictly top to bottom.
* Within a step, "→" means serial. "∥" means parallel-safe, but serial execution is always acceptable.
* ☐ marks an owner action that must be completed before the next step.
* Each item is executed with `.claude/prompts/IMPLEMENT_ONE_ITEM_TEMPLATE.md`.
* "Conditional" steps run only when the named decision says so. Otherwise mark the item **Not applicable** in `PROJECT_STATE.md`.

## Phase 0: Baseline, backups, no outbound leakage, truthful chat, tests

| Step | Items | Owner checkpoint |
|---|---|---|
| F0.1 | BAS-001 | ☐ Commit the planning artefacts |
| F0.2 | DOC-001 ∥ BAS-002 ∥ SEC-001 | ☐ Run the probe **from the synced Teams/SharePoint folder** in managed Edge and paste the results. ☐ Decide DEC-020, DEC-023, DEC-026, DEC-032, DEC-033 |
| F0.3 | BLD-004 → BLD-001 | ☐ Open the app on the work laptop: DevTools Network panel shows no CDN requests |
| F0.4 | TST-001 → TST-004 → TST-002 → TST-003 | — |
| F0.5 | BAK-001 | ☐ Export a backup from **every** place the legacy app has been used (`http://localhost:3005`, each `file://` copy such as Downloads, any Codespaces URL) and store them safely |
| F0.6 | MIG-001 | — |
| F0.7 | DAT-001 → DAT-002 → DAT-003 → DAT-004 → DAT-005 → DAT-006 | — |
| F0.8 | SEC-002 → CHT-001 → CHT-002 | — |
| F0.9 | BLD-002 | — |

**Exit:**
- TEST-NODE and TEST-SERVER green.
- No CDN requests.
- The server is loopback-only (or allowed hosts are set per DEC-032).
- Backups exist for all origins.
- Destructive actions confirm and back up first.
- Chat shows scope and sample flags.
- Probe results are recorded.

## Phase 1: Maintainable shell, reliable storage, file import, provenance

| Step | Items | Owner checkpoint |
|---|---|---|
| F1.1 | SEC-003 → SEC-004 | — |
| F1.2 | SRC-001 → SRC-002 → SRC-003 → SRC-004 | — |
| F1.3 | BLD-003 → REP-001 | — |
| F1.4 | STO-002 ∥ IMP-001 ∥ IMP-002 ∥ REF-001 | — |
| F1.5 | STO-001 → IMP-003 | ☐ Confirm the resource-rule date order on one live file |
| F1.6 | SHL-004 → SHL-001 | ☐ Fresh backups from all origins before SHL-004; afterwards confirm the legacy data is intact |
| F1.7 | SHL-002 → SHL-003 → REL-001 | ☐ Approve the LICENSE text |
| F1.8 | STO-003 → STO-004 → SEC-005 | ☐ Open the shell with the sample publication from the synced folder: green banner |
| F1.9 | IMP-004 → IMP-008 → IMP-005 → IMP-006 | ☐ Import your real backup; compare KPIs with the legacy app (locally, never committed) |
| F1.10 | REP-002 | ☐ Create the tag `archive/v1-v3-2026-10` first |

**Exit:**
- The new shell loads a verified sample publication via `file://` from the synced folder.
- The importer builds a valid dataset from the fixtures and from the owner's backup.
- The security scan is green.
- The legacy app is unchanged in behaviour.

## Phase 2: Daily use, OneDrive and SharePoint V1, grounded chatbot, Copilot package V1

| Step | Items | Owner checkpoint |
|---|---|---|
| F2.1 | UI-007 → UI-001 → UI-002 → UI-003 | ☐ Spot-check the figures against the legacy app |
| F2.2 | FIX-001 ∥ FIX-003, then FIX-002 → FIX-004 | — |
| F2.3 | ODI-001 → PUB-001 → PUB-002 | ☐ First real publication into the Teams/SharePoint `Continuum/Finance/published/`; a second person confirms the green banner |
| F2.4 | SPI-001 → REF-002 → REF-003 | ☐ Create `Continuum/Registry/` and your first references |
| F2.5 | CHT-003 → CHT-004 → CHT-005 | — |
| F2.6 | ODO-001 → ODO-002 | — |
| F2.7 | COP-001 → COP-002 | ☐ Supply the Copilot URL (DEC-030); test the handoff in **Work** mode |
| F2.8 | **Conditional (DEC-026 = enabled):** SPO-001 | ☐ One-click publish verified on the managed laptop |
| F2.9 | UI-005 → UI-008 → UI-006 → UI-004 | — |
| F2.10 | PWA-001 → REL-002 → DOC-002 | ☐ Install the first release folder into `Continuum/Finance/`; follow SETUP.md as a viewer |
| F2.11 | XREP-001 | ☐ Schedule a separate project_onion assessment session |
| F2.12 | SRV-001 | ☐ DEC-025 sign-off; final legacy backups stored |

**Exit:**
- Leaders use the app from the synced folder with no Python.
- Publishing and rollback are proven.
- Deep links and Paste reference work.
- Chat answers carry labels and citations.
- Exports carry provenance.
- The server is retired.

## Phase 3: Assisted folder workflows, expanded formats, OneDrive and SharePoint V2, Copilot grounding V2

| Step | Items | Owner checkpoint |
|---|---|---|
| F3.1 | **Conditional (DEC-026 = enabled):** ODI-002; SPO-001 if not done in F2.8 | — |
| F3.2 | IMP-007 | — |
| F3.3 | COP-004 | — |
| F3.4 | COP-003 | ☐ Build the agent with the Teams channel folder as knowledge; check sharing (CV-1) |
| F3.5 | REP-003 | ☐ DEC-027 parity sign-off, after at least two weeks on the new shell |

## Phase 4: Approved Graph, Copilot APIs or agent path (governance first)

| Step | Items | Precondition |
|---|---|---|
| F4.1 | COP-005 | DEC-029 (V2 is insufficient) and tenant evidence |
| F4.2 | GRF-001 | DEC-015 (HTTPS host) and DEC-028 |
| F4.3 | PWA-002 | DEC-015 |

## Item count check

| Phase | Items |
|---|---|
| 0 | 22 (BAS-001, BAS-002, DOC-001, SEC-001, BLD-004, BLD-001, TST-001, TST-004, TST-002, TST-003, BAK-001, MIG-001, DAT-001…DAT-006, SEC-002, CHT-001, CHT-002, BLD-002) |
| 1 | 27 (SEC-003, SEC-004, SRC-001…SRC-004, BLD-003, REP-001, STO-001…STO-004, IMP-001, IMP-002, IMP-003, IMP-004, IMP-008, IMP-005, IMP-006, REF-001, SHL-004, SHL-001, SHL-002, SHL-003, SEC-005, REL-001, REP-002) |
| 2 | 30 (UI-001…UI-008, FIX-001…FIX-004, PUB-001, PUB-002, ODO-001, ODO-002, ODI-001, SPI-001, REF-002, REF-003, CHT-003, CHT-004, CHT-005, COP-001, COP-002, PWA-001, REL-002, DOC-002, SRV-001, XREP-001) |
| 3 | 6 (ODI-002, SPO-001, IMP-007, COP-003, COP-004, REP-003); SPO-001 may move to F2.8 |
| 4 | 3 (PWA-002, GRF-001, COP-005) |
| **Total** | **88** |
