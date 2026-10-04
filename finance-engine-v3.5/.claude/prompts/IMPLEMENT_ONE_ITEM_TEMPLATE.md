You are implementing exactly ONE backlog item in this repository.

Backlog item ID: <<ITEM_ID>>

Read first, in this order:
1. finance-engine-v3.5/docs/backlog/SMALL_MODEL_EXECUTION_RULES.md
2. The section "### <<ITEM_ID>>" in finance-engine-v3.5/docs/backlog/MASTER_BACKLOG.md
3. finance-engine-v3.5/docs/continuity/PROJECT_STATE.md (if it exists)
4. finance-engine-v3.5/docs/backlog/DECISION_REGISTER.md rows named by the item
5. Any architecture section the item cites

All paths in the backlog are relative to finance-engine-v3.5/ unless they start with "/".

Then follow these steps exactly and in order.

Step 1: Read the item.
State in one short paragraph the target behaviour, the exclusions and the acceptance criteria, in your own words.

Step 2: Verify prerequisites.
- For each dependency ID, confirm it is marked Done in PROJECT_STATE.md.
- For each prerequisite decision, confirm its status in DECISION_REGISTER.md. Open decisions block the item unless the item says how to proceed without them.
- Open every file under "Files expected to change". Confirm that the symbols and line ranges named in "Evidence" exist; if lines moved, locate them by symbol name.
- If anything is missing, STOP and report "Blocked" with the reason. Do not edit anything.

Step 3: List intended edits.
Before editing, list every file you will create, modify or delete, and the symbols in each. The list must be a subset of "Files expected to change". If you need a file not on that list, STOP and report.

Step 4: Add or update tests.
Write or update the tests named under "Automated tests" first, or together with the change. Do not modify golden files unless the item names them.

Step 5: Implement only this item.
Make the smallest change described under "Smallest safe change".
- Do not touch anything under "Files that must not change" or in MNC-STD.
- Do not reformat, rename or clean unrelated code.
- Do not introduce network calls, CDN URLs, minified first-party code, secrets, real data or demo values merged into data.

Step 6: Run tests.
Run every command listed under "Automated tests", plus TEST-NODE when the tests directory exists. Paste the summary lines. If any fails, fix within scope or STOP. Never weaken a test to pass.

Step 7: Inspect git diff.
Run `git status --short`, `git diff --stat` and `git diff`.
- Every changed path must be in your Step 3 list.
- Revert anything else.
- Confirm no secrets and no real data appear.

Step 8: Verify acceptance criteria.
Go through each acceptance criterion and mark it PASS or FAIL with evidence. Anything requiring a real browser, the managed laptop, a OneDrive/SharePoint folder or Copilot that you could not perform must be listed as "UNVERIFIED – owner manual check", with the exact steps from "Manual verification".

Step 9: Update project state.
Apply the item's "Continuity updates" (CONT-STD in the rules):
- docs/continuity/PROJECT_STATE.md: item status, date, files changed, test results, unverified checks.
- docs/continuity/NEXT_ACTIONS.md: remove this item; add the items it unblocked (max 15 entries).
- docs/continuity/DECISIONS.md: append any decision made, never edit existing entries.

If docs/continuity/ does not exist, create only PROJECT_STATE.md with a "## Backlog status" section.

Step 10: Stop without committing.
Do not commit, push, tag, rebase or start another item. End with the report format from SMALL_MODEL_EXECUTION_RULES.md §4 and the line:
"Not committed. Awaiting owner review."
