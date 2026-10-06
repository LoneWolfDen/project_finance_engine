# Source of Truth

Last updated: 2026-10-04. When documents disagree, the higher rank wins. A lower-ranked document is never edited to "win" an argument. Record the conflict in `DECISIONS.md` instead.

## 1. Ranking (highest first)

| Rank | Document | Authoritative for |
|---|---|---|
| 1 | Owner's explicit instructions in the current session | Anything they address |
| 2 | `docs/continuity/DECISIONS.md` (latest non-superseded rows; "-R1" rows supersede originals) | Decisions and owner facts |
| 3 | `docs/architecture/PWA_ARCHITECTURE_CHARTER.md` | Mandatory principles (deviations only via an ADR/DEC with evidence, e.g. ADR-002) |
| 4 | `docs/backlog/SMALL_MODEL_EXECUTION_RULES.md` | How any item is executed |
| 5 | `docs/backlog/FINAL_EXECUTION_SEQUENCE.md` | Order of work |
| 6 | `docs/backlog/MASTER_BACKLOG.md`: each item **including its amendment note** (the note overrides the item's fields) | Scope, files, tests and acceptance of each item |
| 7 | `docs/backlog/BACKLOG_VALIDATION.md` | Why items were amended or split |
| 8 | `docs/continuity/PROJECT_STATE.md`, `NEXT_ACTIONS.md` | Current status and immediate next steps |
| 9 | `docs/architecture/*` (TARGET, DATA_AND_STORAGE, ONEDRIVE_SHAREPOINT, COPILOT_AND_CHAT, MINIFIED_CODE_MIGRATION_STRATEGY, ADR_REGISTER) | Design intent. Where superseded by DEC rows, the DEC rows win until DOC-001 updates them |
| 10 | `docs/assessment/*` | Evidence about the 2026-10-01 baseline (`5d453d1`). Historical; never edited |
| 11 | The code itself | What actually happens. When it differs from rank 9 or 10, report it and do not assume the documents are right |
| 12 | Root `README.md` (the v1/v2 READMEs are in the archive tag only) | Not authoritative (the assessment found inaccuracies) |

## 2. Where things live

| Topic | Location |
|---|---|
| Architecture | `finance-engine-v3.5/docs/architecture/` (charter + six documents) |
| Backlog | `finance-engine-v3.5/docs/backlog/MASTER_BACKLOG.md` (88 items) |
| Execution order | `finance-engine-v3.5/docs/backlog/FINAL_EXECUTION_SEQUENCE.md` |
| Decisions | `finance-engine-v3.5/docs/continuity/DECISIONS.md` (the continuing log). Earlier snapshots: `docs/backlog/DECISION_REGISTER.md`, `docs/architecture/ADR_REGISTER.md` |
| Status | `finance-engine-v3.5/docs/continuity/PROJECT_STATE.md` |
| Next steps | `finance-engine-v3.5/docs/continuity/NEXT_ACTIONS.md` |
| Restart briefing | `finance-engine-v3.5/docs/continuity/SESSION_CONTEXT.md` |
| Risks | `finance-engine-v3.5/docs/backlog/RISK_REGISTER.md` |
| Item prompt | `finance-engine-v3.5/.claude/prompts/IMPLEMENT_ONE_ITEM_TEMPLATE.md` |
| Assessment prompts (history) | `finance-engine-v3.5/.claude/prompts/01…05-*.md` |
| Evidence baseline | `finance-engine-v3.5/docs/assessment/` + tag `pwa-assessment-baseline-2026-10-01` |

## 3. Superseded or partially superseded files

| File | Status | Replaced by |
|---|---|---|
| `docs/backlog/EXECUTION_SEQUENCE.md` | **Superseded** (ordering) | `FINAL_EXECUTION_SEQUENCE.md` |
| `docs/backlog/DEPENDENCY_MAP.md` §1 (chains) | **Superseded** for the split items (BLD-004, TST-004, SHL-004, IMP-008, UI-007, UI-008, CHT-005) | MASTER_BACKLOG index "Depends on" column + `FINAL_EXECUTION_SEQUENCE.md`. §2–§6 remain valid |
| `docs/backlog/DECISION_REGISTER.md` | **Frozen snapshot** (2026-10-04, before revisions) | `docs/continuity/DECISIONS.md` |
| `docs/architecture/ADR_REGISTER.md` ADR-006 | **Superseded** | DEC-001-R1, DEC-002, DEC-011-R1 |
| `docs/architecture/DATA_AND_STORAGE_ARCHITECTURE.md` §2.2 (CRID grammar) | **Superseded** | DEC-001-R1 / REF-001 amendment V-08 |
| `docs/architecture/TARGET_ARCHITECTURE.md` OD-5 ("proxy blocks CDNs") | **Superseded** | OD-5a |
| `docs/architecture/COPILOT_AND_CHAT_ARCHITECTURE.md` §4 V2 (SharePoint folder as knowledge) | **Partially superseded** | DEC-033 (user-chosen Teams channel folder) |
| Root `README.md` ("Three independent versions", server run instructions) | Inaccurate / to be replaced | REP-002, SRV-001, DOC-002 |
| `finance-engine-v1/`, `-v2/`, `-v3/` | Superseded code | Removed by REP-002 (2026-10-06); kept in the tag `archive/v1-v3-2026-10` |
| `docs/assessment/*` | Historical evidence (accurate for `5d453d1`), except the statement that CDNs are blocked, which was never in the assessment; it came from OD-5 | — |

The architecture documents are updated in place only by item DOC-001 (and later DOCUMENTATION items), which add "Superseded" notes rather than deleting text.
