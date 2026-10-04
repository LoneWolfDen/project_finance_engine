# Execution Sequence

Date: 2026-10-04. Execute top to bottom within each phase, one item at a time (`SMALL_MODEL_EXECUTION_RULES.md`). Items on one line separated by "∥" are parallel-safe (DEPENDENCY_MAP §2). **Owner checkpoints** (☐) are actions only the owner can do.

## Phase 0: Baseline, backups, source recovery, no outbound leakage, truthful chat, tests

Goal: the current app works on the corporate laptop, cannot be reached from the network, has tests, cannot silently lose data, and chat does not mislead.

| Step | Item(s) | Notes |
|---|---|---|
| 0.1 | BAS-001 | ☐ Owner commits |
| 0.2 | DOC-001 ∥ BAS-002 ∥ SEC-001 | ☐ Owner runs the probe on the managed laptop and records results → decide DEC-020, DEC-023, DEC-026 |
| 0.3 | BLD-001 | ☐ Owner opens the app on the managed laptop: **first time it works at work** |
| 0.4 | TST-001 → TST-002 → TST-003 | Goldens committed |
| 0.5 | BAK-001 | ☐ Owner exports a full backup and keeps it safe |
| 0.6 | MIG-001 | |
| 0.7 | DAT-001 → DAT-002 → DAT-003 → DAT-004 → DAT-005 → DAT-006 | Serial (same file) |
| 0.8 | SEC-002 → CHT-001 → CHT-002 | |
| 0.9 | BLD-002 | |

**Exit criteria:**
- TEST-NODE and TEST-SERVER green.
- The legacy app works with CDNs blocked.
- The server listens on loopback only.
- Destructive actions confirm and back up first.
- Chat shows scope and sample flags.
- Probe results are recorded.

## Phase 1: Maintainable shell, reliable storage, file import, provenance

Goal: readable modules, a new shell beside the legacy app, a viewer loading a sample publication, and an import pipeline producing a valid dataset with provenance.

| Step | Item(s) | Notes |
|---|---|---|
| 1.1 | SEC-003 → SEC-004 | Legacy escaping |
| 1.2 | SRC-001 → SRC-002 → SRC-003 → SRC-004 | Goldens must stay green |
| 1.3 | BLD-003 ∥ REP-001 | Serial if merging is a concern |
| 1.4 | STO-002 ∥ IMP-001 ∥ IMP-002 ∥ REF-001 | New files only |
| 1.5 | STO-001 → IMP-003 | ☐ Owner confirms PeopleSoft headers (DEC-018) |
| 1.6 | SHL-001 | ☐ Owner exports a backup first; check legacy data intact afterwards |
| 1.7 | SHL-002 → SHL-003 → REL-001 | ☐ Owner approves LICENSE text (DEC-031) |
| 1.8 | STO-003 → STO-004 → SEC-005 | ☐ Owner verifies the sample loads from the synced folder |
| 1.9 | IMP-004 → IMP-005 → IMP-006 | ☐ Owner imports their real backup and compares KPIs (locally, not committed) |
| 1.10 | REP-002 | ☐ Owner creates the archive tag first |

**Exit criteria:**
- The new shell loads a verified sample publication via `file://` with a green banner.
- The importer builds a valid dataset from the fixtures and from the owner's backup.
- The security scanner is green.
- The legacy app is unchanged in behaviour.

## Phase 2: Daily use, OneDrive and SharePoint V1, grounded chatbot, Copilot package V1

Goal: leaders open the shared folder and use the dashboard; the owner publishes; chat is grounded; Copilot packs and handoff exist.

| Step | Item(s) | Notes |
|---|---|---|
| 2.1 | UI-001 → UI-002 → UI-003 | Figure comparison tables recorded |
| 2.2 | FIX-001 ∥ FIX-003, then FIX-002 → FIX-004 | Behaviour fixes with explicit golden updates |
| 2.3 | ODI-001 → PUB-001 → PUB-002 | ☐ Owner's first real publication into the SharePoint library; a second laptop or user verifies |
| 2.4 | SPI-001 → REF-002 → REF-003 | ☐ Owner creates the real `Continuum/Registry/` folder and first references |
| 2.5 | CHT-003 → CHT-004 | |
| 2.6 | ODO-001 → ODO-002 | |
| 2.7 | COP-001 → COP-002 | ☐ Owner supplies the Copilot URL (DEC-030) and tests in Work mode |
| 2.8 | UI-005 → UI-006 → UI-004 | |
| 2.9 | PWA-001 → REL-002 → DOC-002 | ☐ First release folder installed to `Continuum/Finance/` |
| 2.10 | XREP-001 | ☐ Owner schedules the project_onion assessment |
| 2.11 | SRV-001 | ☐ DEC-025 sign-off and final legacy backup |

**Exit criteria:**
- Leaders use the app from SharePoint with no Python.
- Publishing and rollback are proven.
- Deep links and paste-reference work.
- Chat answers carry labels and citations.
- Exports carry provenance.
- The server is retired.

## Phase 3: Assisted folder workflows, expanded formats, OneDrive and SharePoint V2, Copilot grounding V2

| Step | Item(s) | Notes |
|---|---|---|
| 3.1 | ODI-002 → SPO-001 | Only if DEC-026 enables V2; otherwise mark Not applicable |
| 3.2 | IMP-007 | |
| 3.3 | COP-004 | |
| 3.4 | COP-003 | ☐ Tenant check CV-1/CV-2; agent built and shared or replicated |
| 3.5 | REP-003 | ☐ DEC-027 parity sign-off |

**Exit criteria:**
- One-click refresh and publish (if V2 is enabled).
- An agent answers from the published packs with citations.
- The legacy app is removed.

## Phase 4: Approved Graph, Copilot APIs or agent path (only after governance decisions)

| Step | Item(s) | Precondition |
|---|---|---|
| 4.1 | COP-005 | DEC-029 says V2 is insufficient; tenant evidence collected |
| 4.2 | GRF-001 | DEC-015 (HTTPS host) and DEC-028 (pursue Graph) |
| 4.3 | PWA-002 | DEC-015 |

No implementation of Graph, Copilot APIs, connectors or hosting is in this backlog. Phase 4 produces decision records only, and any build work needs a new backlog cycle.
