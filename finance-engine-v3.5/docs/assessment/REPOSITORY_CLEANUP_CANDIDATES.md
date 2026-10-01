# Repository Cleanup Candidates

Assessment date: 2026-10-01 · Baseline commit `5d453d1`
Mode: read-only. **Nothing listed here has been deleted, moved, renamed or archived.** Each item needs explicit owner approval and its own contained change (charter §13).

| ID | Candidate | Path | Classification | Evidence | Proposed disposition | Precondition / risk | Confidence |
|---|---|---|---|---|---|---|---|
| CL-01 | Superseded application v1 | `finance-engine-v1/` (11 files) | UNUSED (superseded) | Root README documents only v3.5. v1 is a localStorage-only predecessor | ARCHIVE (for example to a tag or archive branch), then remove from `main` | Confirm no one still runs v1 (port 8889). History preserves it | High |
| CL-02 | Superseded application v2 | `finance-engine-v2/` (12 files) | UNUSED (superseded) | Same server pattern as v3; fewer features | ARCHIVE | As above | High |
| CL-03 | Superseded application v3 | `finance-engine-v3/` (9 files) | UNUSED (superseded) | v3 → v3.5 diff is 249 lines; v3 has no README | ARCHIVE | Confirm v3.5 is the only maintained line | High |
| CL-04 | Duplicate fixtures | `finance-engine-v{1,2,3}/test_*` | Duplicate | MD5-identical to v3.5 copies (except v2 `test_PO_Details.json`) | REMOVE AFTER VERIFICATION (goes with CL-01…03) | Preserve the v2 PO variant (`PO_Validity`, `rollover_allowed`, `program`) if useful. It is the only fixture that passes `validateData` | High |
| CL-05 | Fixtures at application root | `finance-engine-v3.5/test_*.{json,csv}` | Misplaced | Copied into the Docker runtime image (`Dockerfile:4`) | Move to a `fixtures/` or `tests/fixtures/` folder; stop copying into the image | Update README references | High |
| CL-06 | Dead functions | `index.html`: `rTL` (1011-1057), `rActData` (1101-1190), `rFX` (1334-1341), `rExport` (1738-1751), `addResRow` (727), `findResourceRule` (210-219) | UNUSED | Single reference each (definition only) | REMOVE AFTER VERIFICATION | Add characterisation tests first. `rActData` contains a cost formula without the OT multiplier; confirm no one relies on it | High |
| CL-07 | Unused variable | `index.html:435` `tabGroups` | UNUSED | Assigned, never read | REMOVE AFTER VERIFICATION | None | High |
| CL-08 | Stale remote branch | `origin/v3-clean` | UNUSED | Not merged; only adds an empty `finance_engine.db` on top of `a1a8c2a` | Delete remote branch | Owner confirmation | High |
| CL-09 | Merged remote branches | `origin/v3-release`, `origin/version2`, `origin/v3.5-release` | Merged | `git merge-base --is-ancestor` → merged into `main` | Delete remote branches (optional) | Owner confirmation | High |
| CL-10 | Dockerfile port mismatch | `finance-engine-v3.5/Dockerfile:5` `EXPOSE 8889` | BROKEN (metadata) | Server listens on 3005 | Correct (code change; not cleanup-only) | None | High |
| CL-11 | Devcontainers for old versions only | `finance-engine-v{1,2}/.devcontainer/devcontainer.json` | Misplaced | Forward port 8889; v3.5 has none | Remove with CL-01/02; decide whether v3.5 needs one | — | High |
| CL-12 | Inconsistent version strings | `server.py:88,90`, `index.html:105` | Drift | See DEPENDENCY_BUILD_REGISTER §5 | Single version source (code change) | — | High |
| CL-13 | Debug banners | `server.py:19-20` (`✅ RUNNING V3.5 SERVER FILE`, file path print) | Debug residue | Prints absolute file path on start | Remove or replace with structured startup log | — | High |
| CL-14 | Contradictory chat help text | `index.html:2275` (`phi3:mini`) vs `server.py:24` (`llama3.2`) | Drift | — | Align | — | High |
| CL-15 | UTF-8 BOM | `/.gitignore`, `/README.md` | Cosmetic | First bytes `EF BB BF` | Optional: strip BOM. `git check-ignore -v` confirmed the first pattern (`__pycache__/`) still matches, so this is cosmetic only | None | High |
| CL-16 | `.gitignore` drift | Root vs per-version `.gitignore` | Drift | v1/v2 lack `*.db`; root ignores `dashboard_config.json` (no code references it) | Consolidate into one root `.gitignore` | — | High |
| CL-17 | Root README inaccuracy | `README.md:3` "Three independent versions" | DOCUMENTED ONLY (wrong) | Four versions exist | Correct after CL-01…03 decision | — | High |
| CL-18 | Untracked assessment material | `finance-engine-v3.5/.claude/`, `finance-engine-v3.5/docs/` | Untracked | `git status` | Owner decides whether to commit (the charter is described as mandatory but is not under version control) | — | High |
| CL-19 | Historical empty DB blobs | commits `db120c4`, `cac8e1f` | GENERATED | Verified empty | **No action.** History rewrite is not justified | — | High |
| CL-20 | Embedded demo data with unclear provenance | `index.html:110-131,192` | GENERATED / PLACEHOLDER | See register G-04, G-05; SEC-14 | Replace with synthetic data in a separate file | Owner must confirm whether values are real | Medium |
| CL-21 | Personal attribution strings in exports and UI | `index.html:105,1770,1791,1839,1953` | Policy | SEC-18 | Owner/organisation decision | Not a technical defect | High |

## Not candidates (keep)

* `finance-engine-v3.5/index.html`, `server.py`: active source.
* `finance-engine-v3.5/test_*`: the only fixtures for the active line (relocate per CL-05, do not delete).
* Tag `pwa-assessment-baseline-2026-10-01`: assessment baseline.
