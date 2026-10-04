# Data and Storage Architecture

Status: Proposed · Date: 2026-10-04
Parent: `TARGET_ARCHITECTURE.md`. Charter §5 storage tiers are referenced as T1–T5.

## 1. Storage tiers in the target

| Charter tier | Target use | Location | Source of truth? |
|---|---|---|---|
| T1 Runtime browser storage | Preferences, publisher draft, scenarios, folder handles | `localStorage` / IndexedDB, namespaced `continuum.finance.*` | No |
| T2 User-controlled backup/restore | Draft and scenario backup files; published snapshots | User-chosen file; `published/history/` | For local work only |
| T3 User-selected OneDrive/SharePoint content | Raw PeopleSoft dumps (publisher's personal OneDrive `Finance-Drop/`); published dataset (`Continuum/Finance/published/`); Registry (`Continuum/Registry/`) | Synced folders | **Yes: `published/` and `Registry/`** |
| T4 Live Graph storage | Not used (future V3) | — | — |
| T5 Enterprise storage | Not used | — | — |

The SQLite database and `server.py` are retired (ADR-003).

## 2. Identity: Continuum Reference ID (CRID)

### 2.1 Requirements (owner, OD-7)

* A user enters it **once**, when the project or opportunity is created in any Continuum application.
* It is **not** derived from creation time or any system-generated sequence.
* It is based on the **OpportunityID**, which users already have before a project exists.
* Every Continuum application recognises and uses it, and the same code can be copied between applications.

### 2.2 Format

```
CRID      = "CR-" OPPID [ "-W" NN ]
OPPID     = 1*40 ( "A"-"Z" / "0"-"9" / "-" )        ; normalised OpportunityID
NN        = 2DIGIT                                   ; 01–99 workstream (optional)
Examples:   CR-0061234567        CR-OPP-2026-00042        CR-0061234567-W02
```

| Rule | Detail | Why |
|---|---|---|
| Prefix `CR-` | Constant | Recognisable in text, links and file names; distinguishes it from PO numbers and PeopleSoft project IDs |
| Normalisation | Trim; upper-case; replace spaces and `_` with `-`; collapse repeated `-`; reject any other character | The same human input always yields the same key |
| Allowed characters | `A–Z 0–9 -` only | Safe as a Windows/macOS file name, URL fragment and CSV value |
| Workstream suffix `-Wnn` | Optional. Used only when one opportunity is delivered as separately funded or reported engagements | Avoids inventing a second key system; the opportunity stays the root |
| Immutable | Never edited after creation | Other apps rely on it |
| Corrections | A wrong ID is **superseded**: new record created; old record gets `superseded_by`; resolvers follow the chain (max depth 5) | Links already in circulation keep working |
| Never reused | A retired CRID stays in the registry with `status: "retired"` | Prevents silent re-binding |
| Case | Display and storage are upper case; resolvers accept any case | Users paste from different systems |

Open question for the owner: the exact OpportunityID format in the CRM, which determines the validation pattern. Until it is known, the generic rule above applies.

### 2.3 Registry record (`Continuum/Registry/CR-<OPPID>[-Wnn].json`)

```
{
  "schema": "continuum.reference",
  "schema_version": 1,
  "crid": "CR-0061234567",
  "opportunity_id": "0061234567",           // as entered (pre-normalisation kept for audit)
  "workstream": null,                        // or "W02"
  "name": "Project Alpha – AWS migration",
  "client": "TestCo",
  "status": "active",                        // active | closed | retired
  "superseded_by": null,
  "aliases": [],                             // other CRIDs that resolve here
  "links": {
    "peoplesoft_project_ids": ["111111"],
    "po_team_identifiers": ["111111_ProjectAlpha_AWS"],
    "other": { "<app-key>": "<that app's local id>" }
  },
  "created": { "utc": "2026-10-04T09:00:00Z", "by": "V. Y.", "app": "finance 4.0.0" },
  "updated": { "utc": "...", "by": "...", "app": "..." }
}
```

* **One file per reference.** Two people editing different projects never touch the same file, so OneDrive sync conflicts are avoided. If two apps edit the *same* record, OneDrive keeps both copies (`…-DESKTOP-ABC.json`). The registry reader detects conflict copies and shows them as **Needs confirmation**.
* The record holds links, not finance data.
* The `links` block is the **crosswalk** replacing today's implicit `PO_Team_Identifier` key. Finance rows resolve PeopleSoft Project ID → CRID or PO_Team_Identifier → CRID through it.

### 2.4 Shared code (`continuum-core/ref.js`, copied verbatim into each Continuum app)

Interface (specification only):

| Function | Behaviour |
|---|---|
| `normalise(input) → CRID or error` | Applies §2.2 rules; returns a typed error with a human message |
| `isValid(crid) → boolean` | Format check only |
| `parseFromLocation(location) → CRID or null` | Reads `#/ref/<CRID>`; also accepts `?ref=` for links pasted by other tools |
| `toLink(appIndexPath, crid) → string` | Builds `<appIndexPath>#/ref/<CRID>` |
| `resolve(crid, registryRecords) → {record, chain, status}` | Follows `superseded_by`/aliases; reports Not found / Retired / Conflict |
| `recordFromForm(fields) → record` | Builds a schema-valid registry record for "create once" in any app |

The module has no dependencies and its own `CORE_VERSION.js`. Each app's Diagnostics shows the core version, so mismatched copies are visible.

### 2.5 Create-once flow (any Continuum app)

1. The user clicks **New project** and enters the OpportunityID (required), name and client.
2. The app normalises it to a CRID and looks it up in `Registry/` (folder handle, or a picker if not connected).
3. If it **exists**, the app shows the record and links to it, without duplicating. If it is **new**, the app writes `CR-….json` (direct write in Edge/Chrome; download-and-save fallback elsewhere).
4. Finance links PeopleSoft project IDs and PO teams to the CRID in the Publish view (a mapping table with suggestions from matching names and IDs), which updates `links` in the record.

## 3. Published dataset (schema v1)

### 3.1 Files

| File | Wrapper | Purpose |
|---|---|---|
| `manifest.json` | Plain JSON | Machine-readable; for Copilot packs, tools and humans |
| `manifest.js` | `window.CFE_PUBLISHED_MANIFEST = <same JSON>;` | Loaded by `<script>` under `file://` (fetch is blocked there) |
| `dataset.json` | Plain JSON | Fallback load via file picker; archival |
| `dataset.js` | `window.CFE_PUBLISHED_DATASET = <same JSON>;` | Zero-click viewer load |

Writers serialise with `JSON.stringify` and escape U+2028/U+2029. Readers accept the `.js` globals only if they are plain data (objects, arrays, strings, numbers, booleans, null). Any other type is rejected.

### 3.2 Manifest

```
{ "schema":"cfe.manifest", "schema_version":1,
  "publication_id":"2026-10-02T09:10:00Z-7f3a", "published_utc":"…", "publisher":"V. Y.",
  "app_version":"4.0.0", "dataset_schema_version":1,
  "data_as_of":"2026-09-30",
  "payload_sha256":"…",                       // hash of canonical dataset JSON
  "sources":[ {provenance record, §7} … ],
  "counts":{ "references":12, "po":30, "resource_rules":120, "actual_rows_in":48211, "actual_aggregates":3110, … },
  "validation":{ "errors":0, "warnings":[ {code,message,count} ] },
  "minimisation":{ "policy":"aggregate-by-person-month", "person_names":"included|pseudonymised" },
  "deployment":{ "display_name":"Continuum Finance", "reporting_currency":"USD" },
  "publications":[ last 100 publish/rollback events ] }
```

### 3.3 Dataset entities

| Entity | Key | Notes |
|---|---|---|
| `references` | `crid` | Subset of the Registry used by this dataset (name, client, status, links) |
| `purchase_orders` | `po_number` + `crid` | Value, currency, start, validity end (ISO date), rollover flag, approval status, `po_team_identifier` |
| `resource_rules` | `rule_id` | `crid`, person key, role, location, start, end, bill rate, rate unit (`hour`/`day`, replacing `hour_mult` ambiguity), allocation |
| `people` | `person_key` | Employee ID (or pseudonym), display name (or role label) per minimisation policy |
| `actuals` | `crid`+`person_key`+`month`+`hours_type` | **Aggregated** hours and cost per month; raw daily rows stay in the drop folder |
| `invoices`, `expenses` | Source IDs | Expense currency kept; converted amount stored alongside with FX rate used |
| `fx_rates`, `ot_rules`, `calendars` | Effective-dated | Calendars carry `source` and `valid_years` (fixes G-04/C-07 provenance) |
| `forecast` | Not stored | Computed at view time from rules, so the forecast "as of today" stays honest |

Every record carries `src` (§7). Money is stored as numbers with an explicit currency code, never symbol-formatted.

## 4. Local browser storage

| Key / DB | Content | Size control | Failure handling |
|---|---|---|---|
| `continuum.finance.prefs` (localStorage) | Present mode, default view, export footer on/off | < 10 KB | On error: defaults + warning in log |
| `continuum-finance` IndexedDB `drafts` | Publisher draft (parsed rows, mapping, validation) | One draft at a time; discard button | Quota error: red toast, draft kept in memory, offer "save draft to file" |
| `continuum-finance` IndexedDB `scenarios` | `{name, base_publication_id, changes:[…]}`, deltas only | Count shown; warn > 50 | Same |
| `continuum-finance` IndexedDB `handles` | `FileSystemDirectoryHandle` for drop, Finance, Registry | 3 entries | Missing or denied: "Reconnect folder" button |

`file://` storage is shared by every local page in Chromium, so namespacing is mandatory. Clearing browser data affects only these local items, never published data, and the UI says so.

## 5. File import pipeline (publisher)

| Step | Behaviour | Failure visibility |
|---|---|---|
| 1 Select | V2: refresh the connected drop folder; V1: multi-file picker or drag and drop | — |
| 2 Detect | By extension and header sniffing; unsupported → listed, not dropped silently | "3 files ignored (unsupported type)" |
| 3 Hash & provenance | SHA-256 per file; identical hash to a previous publication's source → marked "unchanged" | Shown in preview |
| 4 Parse | CSV: RFC 4180 (quotes, embedded commas, CRLF, BOM). XLSX: SheetJS (patched), `cellDates`, explicit sheet choice when > 1 sheet | Parse errors with file / row / column |
| 5 Map | Declarative mapping profile per source type (`peoplesoft-timesheet-v1`, `resource-rules-v1`, `po-details-v1`, …): column aliases, types, date format (**explicit**, never guessed), required fields | Unmapped required column → blocking error |
| 6 Validate | Types, ranges, date order, duplicate keys (reported, **not** auto-removed), currency known, FX available | Errors block publish; warnings need acknowledgement |
| 7 Resolve | Rows → CRID via Registry links; unmatched rows listed with counts and examples | "418 rows (2 projects) not linked to any CR- reference" |
| 8 Minimise | Aggregate actuals to person-month-hours-type; apply name policy | Counts before/after shown |
| 9 Preview | Diff against current publication: per entity added/removed/changed counts, as-of change, KPI deltas per CRID | Must be viewed before Publish is enabled |
| 10 Publish | §6.1 | — |

## 6. Backup, restore, rollback

### 6.1 Publish procedure (ordered so it is always recoverable)

1. Compute the canonical JSON and SHA-256.
2. Write `history/<stamp>/` (dataset.json, dataset.js, manifest.json, manifest.js) and **read it back to verify the hash**.
3. Write `dataset.json` and `dataset.js` (File System Access `createWritable` writes to a temporary file and commits on close).
4. Write the manifest files **last**. Viewers treat a manifest whose `payload_sha256` does not match the dataset as "publication in progress or incomplete" and show amber, with a link to the last good snapshot.
5. Write Copilot packs.
6. Append to `publications`.

### 6.2 Restore and rollback

| Situation | Action | Who |
|---|---|---|
| Bad data published | Publish view → History → choose snapshot → **Republish** (new event, reason required) | Publisher |
| Corrupted current file | Viewers see red with "Open last good snapshot (read-only)". Publisher republishes | Both |
| Accidental deletion of `published/` | SharePoint recycle bin / version history (tenant retention) | Publisher |
| Lost local draft | Import again from drop folder (raw files are never modified) | Publisher |
| Scenario backup | Export/import `continuum-finance-scenarios-<date>.json` with `schema_version` + SHA-256 | Any user |

Retention: keep the last `config.historyKeep` (default 60) snapshots. Older ones are listed for manual deletion. Deletion is never automatic.

### 6.3 Corruption preservation

Unreadable files are never overwritten automatically. The app reports the exact file and error, and continues read-only from the last good snapshot when the user chooses it.

## 7. Provenance record

```
{ "file_id":"f3", "name":"PS_TIMESHEET_2026-09-30.xlsx", "size":48213, "last_modified":"…",
  "sha256":"…", "imported_utc":"…", "source_system":"PeopleSoft (query export)",
  "parser":"sheetjs", "parser_version":"x.y.z", "mapping_profile":"peoplesoft-timesheet-v1",
  "sheet":"Sheet1", "header_row":1, "rows_read":48211, "rows_used":48090,
  "as_of":"2026-09-30" }          // max data date, or user-entered if not derivable
```

Record-level: `src: {"file":"f3","sheet":"Sheet1","row":1022}`. Aggregates keep `src_rows` counts and the list of contributing `file` IDs.

## 8. Schema versioning and migration

| Item | Version field | Policy |
|---|---|---|
| Manifest, dataset | `schema_version` | App declares `supportsSchema:[min,max]`. Older → migrate in memory (amber "migrated"). Newer → red "update app" |
| Registry record | `schema_version` | Readers tolerate unknown fields; writers preserve unknown fields when updating |
| Draft, scenarios, backup files | `schema_version` | Migrated on load; original kept until the user saves |
| Mapping profiles | `id` with version suffix | New PeopleSoft column layout → new profile, old one kept |

Migrations are `app/data/migrate.js` functions `vN_to_vN+1(obj) → obj`, pure and individually tested with before/after fixtures. Published history is **never** rewritten.

**From legacy v3.5:** a one-time **Legacy import** reads a v3.5 "Full Config" JSON export or the old `pf_working` localStorage (same origin only when opened under `http://localhost`; otherwise via export file) and maps it into a draft, which then goes through the normal validate/preview/publish flow.

## 9. Data minimisation and privacy

* Raw dumps (all employees, daily rows, worksite details) stay in the publisher's **personal** OneDrive drop folder.
* The published dataset contains aggregates. The person-name policy is set at publish time (`included` for the leadership audience, or `pseudonymised` as role + index). Present mode masks names and rates regardless.
* No employee personal fields beyond ID, name, role and location are ever imported. Mapping profiles drop other columns at parse time.
* The repository holds only `samples/` and `tests/fixtures/`, both synthetic and labelled.
