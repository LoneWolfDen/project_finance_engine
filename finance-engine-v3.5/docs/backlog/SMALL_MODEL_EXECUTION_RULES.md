# Small-Model Execution Rules

Date: 2026-10-04. These rules apply to every backlog item in `MASTER_BACKLOG.md`. If an item conflicts with these rules, the rules win. Stop and report the conflict.

## 1. Paths and environment

* **App root:** all paths are relative to `finance-engine-v3.5/` unless they begin with `/`, which means the Git repository root (`project_finance_engine/`).
* The folder keeps the name `finance-engine-v3.5/` for the whole backlog (DEC-008).
* **ID formats:** two-digit IDs such as `SEC-01`, `C-01`, `D-01`, `F-15` are assessment findings (`docs/assessment/`). Three-digit IDs such as `SEC-001` are backlog items. `DEC-nnn` are backlog decisions, `ADR-nnn` architecture decisions, and `OV-n`/`CV-n` validation checks.
* **Legacy app file:** `index.html` until item SHL-001 has been completed, and `legacy/index.html` afterwards. Check `docs/continuity/PROJECT_STATE.md` to see which applies.
* **Developer machine:** Python 3.11+ and Node 18+ (owner has Python 3.14, Node 24). No npm packages. No `pip install`.
* **Test commands:**
  * `node tests/run-node.js` runs all Node suites. It exists after TST-001.
  * `python3 -m unittest discover -s tests/server -v` runs the legacy server tests. They exist after SEC-001.
  * Opening `tests/index.html` in Edge via `file://` runs the browser suites. It exists after TST-001.
* **Network:** only items BLD-001, BLD-002 and BLD-003 may download anything, and only the exact upstream files they name. This must happen on a developer machine with internet access, never on the corporate laptop.

## 2. The rules

1. **One backlog ID at a time.** Do not start a second ID in the same session or change.
2. **Read the item's dependencies** in `MASTER_BACKLOG.md` and confirm in `docs/continuity/PROJECT_STATE.md` that each one is marked Done. If any is not Done, stop.
3. **Inspect the current code before editing.** Open every file listed under "Files expected to change". Confirm the symbols and line ranges named in "Evidence" still match. If they moved, locate them by symbol name. If they no longer exist, stop and report.
4. **Do not widen scope.** Change only what "Smallest safe change" describes. Everything under "Explicit exclusions" is forbidden even if it looks easy.
5. **Do not clean unrelated files.** No reformatting, renaming, reordering, or comment rewording outside the change.
6. **Preserve API and UI compatibility** (endpoints, `localStorage` keys, JSON shapes, button labels, tab names, exported file layouts) unless the item explicitly changes them.
7. **Add tests before or with the change.** A refactor must keep every golden test green. A behaviour change must update only the golden files the item names and record why.
8. **Run the named tests** in "Automated tests" and paste the summary lines into your report.
9. **Inspect the diff** (`git diff --stat` and `git diff`). Every changed file must appear in "Files expected to change". Revert anything else.
10. **Never commit secrets** (tokens, passwords, URLs with credentials) and never commit real data. Only `samples/` and `tests/fixtures/` may contain data, and it must be synthetic.
11. **Never introduce synthetic values into real data:**
    * no demo defaults merged into imported or published datasets;
    * no placeholder rows;
    * no invented fallbacks such as default dates, default FX rate of 1, or default currency.
    If a value is missing, report it as missing.
12. **Update continuity documents** as the item instructs (see §4).
13. **Do not commit unless the owner explicitly instructs it.** Leave changes staged or unstaged as instructed. Never push, rebase, force or rewrite history.
14. **Stop on any acceptance-criteria failure.** Do not "fix forward" into other areas. Report what failed, with evidence.
15. **Report browser behaviours you could not verify.** Anything needing Edge, Chrome or Safari, a OneDrive-synced folder, managed-laptop policy or Copilot must be listed as "UNVERIFIED – needs owner manual check", with the exact manual steps from the item.
16. Do not open, modify or delete anything in the owner's real `published/`, `Finance-Drop/` or `Registry/` folders. Use `samples/` and `tests/fixtures/` only.
17. Do not change files under `docs/assessment/` or `docs/architecture/`, except in items of group DOCUMENTATION that name them.

## 3. Standard defaults referenced by items

| Code | Meaning |
|---|---|
| **MNC-STD** (must-not-change standard set) | `vendor/**` (except BLD items), `docs/assessment/**`, `docs/architecture/**` (except DOC items), `docs/backlog/**` (except backlog-maintenance prompts), `.claude/prompts/**`, `tests/golden/**` (except files named by the item), `samples/**` (except files named by the item), `/finance-engine-v1/**`, `/finance-engine-v2/**`, `/finance-engine-v3/**` (except REP-002) |
| **RB-STD** (rollback standard) | Before commit: `git restore --staged --worktree <files>` for the listed files and delete any new files listed. After commit: `git revert <commit>` (never `reset --hard`, never force-push). For an installed release: copy the previous `releases/finance-X.Y.Z/` folder back (REL-002). |
| **CB-STD** (commit boundary standard) | One commit containing exactly this item's files. Message: `<ID>: <title>`. Created only when the owner instructs |
| **CONT-STD** (continuity standard) | In `docs/continuity/PROJECT_STATE.md`: set the item's status (Done / Blocked / Partial), add the date, list changed files and test results, and add any UNVERIFIED browser checks. In `docs/continuity/NEXT_ACTIONS.md`: remove the item and add any follow-up IDs it unblocked (max 15 entries). In `docs/continuity/DECISIONS.md`: append (never edit) any decision made while executing. If `docs/continuity/` does not exist yet, create only `PROJECT_STATE.md` with a heading `## Backlog status` and the entry |
| **TEST-NODE** | `node tests/run-node.js` exits 0 |
| **TEST-BROWSER** | `tests/index.html` opened via `file://` in Edge shows "All suites passed" |
| **TEST-SERVER** | `python3 -m unittest discover -s tests/server -v` exits 0 |

## 4. Report format at the end of every item

```
Item: <ID> <title>
Status: Done | Blocked | Partial
Prerequisites checked: <IDs + status>
Files changed: <list>   (must match the item)
Tests run: <command> → <summary>
Acceptance criteria: <each criterion → PASS/FAIL + evidence>
UNVERIFIED (owner manual checks): <list or "none">
Continuity updated: <files>
Not committed (awaiting owner instruction).
```
