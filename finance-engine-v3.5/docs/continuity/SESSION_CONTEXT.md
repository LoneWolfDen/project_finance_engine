# Session Context: Restart Briefing

For a model starting with no conversation history. Last updated 2026-10-05.

**Project.** Continuum Finance Engine: a project-finance dashboard (PO burn, forecast, actuals, invoices, expenses). The owner is a non-developer who built it with coding agents. Viewers are senior leaders who use it only through the UI. One publisher (the owner) refreshes the data from PeopleSoft CSV/XLSX downloads. It belongs to the owner's "World of Continuum" apps; Continuum itself is the separate repository `LoneWolfDen/project_onion`.

**Where things are.**
* Git root: `/Users/wolf/Developer/project_finance_engine`.
* App root: `finance-engine-v3.5/`. Backlog paths are relative to it.
* Branch: `assessment/pwa-readiness-2026-10`. local commits may not be pushed yet; check `git status`.

**Current state.** Phase 0 code is complete (DAT-001…006 done 2026-10-05). Open owner-side checks: probe and CDN check on the managed laptop, deferred until the owner can use it (DEC-038). The legacy app is `finance-engine-v3.5/legacy/index.html` plus `server.py` (moved by SHL-004; `http://localhost:3005/` still serves it). The root `index.html` is the new app shell (SHL-001: `app/app.js` hash router, `app/views/shell.js`, placeholders until UI-001). Tests: `node tests/run-node.js`, `python3 -m unittest discover -s tests/server`, `tests/index.html`. Run all three before every commit.

**Read these files, in this order:**
1. `finance-engine-v3.5/docs/continuity/PROJECT_STATE.md` (state, blockers, backlog status, probe results)
2. `finance-engine-v3.5/docs/continuity/NEXT_ACTIONS.md` (what to do next)
3. `finance-engine-v3.5/docs/continuity/SOURCE_OF_TRUTH.md` (which document wins)
4. `finance-engine-v3.5/docs/backlog/SMALL_MODEL_EXECUTION_RULES.md` (mandatory rules)
5. The item's section in `finance-engine-v3.5/docs/backlog/MASTER_BACKLOG.md`. Read the amendment note under its heading first.
6. `finance-engine-v3.5/docs/continuity/DECISIONS.md` (latest decisions; "-R1" rows supersede the originals)
7. Only as cited by the item: `docs/architecture/*`, `docs/assessment/*`

**Next action.** The first Model row of `NEXT_ACTIONS.md` whose owner prerequisites are done (Phase 1 F1.7: SHL-002, SHL-003, then REL-001 after the owner approves the LICENSE text). Execute a coding item with `.claude/prompts/IMPLEMENT_ONE_ITEM_TEMPLATE.md`, filling in the item ID.

**Key decisions to keep in mind.**
* Reference ID = the first opportunity number entered, trimmed, whitespace removed, upper-cased, permanent. **No regex, no suffix.** A Continuum-generated project ID is parked until integration (DEC-042).
* Dates are **shown** as DD-MM-YYYY and **stored** as YYYY-MM-DD (DEC-040). Use `toDisplayDate` / `fromDisplayDate` (`app/calc/dates.js`) in every view and export.
* Distribution is `file://` from a user-chosen synced folder. No server for viewers. **No network calls from the app.**
* Libraries are vendored locally; CDNs currently *do* load, but must not be used.
* Real names are published. Present mode masks them.
* Copilot: no API. Fact packs plus a Work-mode handoff. Shared Agent Builder agent on a Teams channel folder.
* Codespaces: test data only.
* MIT licence, "Copyright (c) 2026 Vamsi Yedlapalli". Attribution is kept.

**Do not:**
* Commit, push, tag, rebase or rewrite history (the owner commits).
* Execute more than one backlog item per session or change, or widen its scope.
* Edit `docs/assessment/**`, `docs/architecture/**` (except DOCUMENTATION items naming them) or golden files not named by the item.
* Add frameworks, npm packages, bundlers, minified first-party code or CDN URLs.
* Add any network call (fetch, XHR, WebSocket, beacon) to the new app, or any analytics.
* Put real data in the repository or Codespaces. Use only `samples/` and `tests/fixtures/` synthetic data.
* Merge demo/default values into imported or published data, or invent fallback values (dates, FX rate 1, currencies).
* Delete user data paths without a backup step. Do not touch the owner's real `published/`, drop or `Registry/` folders.
* Start Graph, MSAL, Copilot API, connectors or hosting work (Phase 4 records only).
* Modify `LoneWolfDen/project_onion` from this repository.
* Claim a browser behaviour works without running it. Report it as UNVERIFIED with manual steps instead.
