# Continuum Reference: contract

Version 1.0.0 (`Continuum.ref.version`), 2026-10-05 (REF-001). Decisions: DEC-001-R1, DEC-002, DEC-011-R1, DEC-033.

This document is for anyone adding the shared reference to a Continuum application. The code is `app/continuum-core/ref.js`. It is one classic script with no dependencies. Copy it **verbatim**; do not edit the copy. If the contract changes, change it here first, raise `version`, then copy the file to every app.

## 1. What a reference is

* The reference (`ref`) is the **first opportunity number** a user enters when a project is created, in any Continuum app.
* It is normalised only by:
  1. trimming;
  2. removing **all** whitespace, including spaces inside;
  3. upper-casing.
* After normalisation it must be 1–64 characters and contain no control characters. **Nothing else is checked:** there is no prefix and no format pattern.
* It is **permanent.** It is never edited and never reused. A wrong reference is corrected by creating a new record and setting `superseded_by` on the old one.
* Later opportunity numbers for the same project are **linked** in `opportunity_numbers`. They are not new references.
* There is no workstream suffix (DEC-011-R1, proposed). A separately tracked workstream is its own project with its own first opportunity number.

| Entered | `ref` |
|---|---|
| `o-5030460` | `O-5030460` |
| ` O 008891 ` | `O008891` (spaces removed by design; leading zeros kept) |
| `a/b` | `A/B` (allowed; the file name is encoded, see §3) |
| empty, or 65+ characters | refused, with a readable message |

## 2. Functions

| Function | Result |
|---|---|
| `normalise(input)` | `{ok:true, ref}` or `{ok:false, error:{code, message}}`. Codes: `not-text`, `empty`, `control-characters`, `too-long` |
| `isValid(ref)` | `true` only for an already-normalised reference |
| `fileNameFor(ref)` | The registry file name without `.json`: `encodeURIComponent(ref)`, with `*` → `%2A` and a leading `.` → `%2E` |
| `toLink(indexPath, ref)` | `<indexPath>#/ref/<encodeURIComponent(ref)>` |
| `parseFromLocation(location)` | The normalised ref from `#/ref/<ref>` (preferred) or `?ref=<ref>`; `null` if absent or invalid |
| `resolve(input, records)` | `{status, record, chain}`; see §4 |
| `recordFromForm(form, meta)` | `{ok:true, record}` or `{ok:false, error:{code, message}}`; see §5 |

Every function refuses bad input with a message suitable for showing to a user. None of them touch the page (`document`, `window`) or any app namespace (`CFE`).

## 3. Registry file

* One file per reference: `<Registry folder>/<fileNameFor(ref)>.json`, for example `O-5030460.json` or `A%2FB.json`.
* The Registry folder is chosen by the user (DEC-033), not fixed.
* Reading and writing the folder is not part of this module (REF-002, SPI-001).
* Known limitation: on Windows, a reference that is exactly a reserved device name (`CON`, `PRN`, `AUX`, `NUL`, `COM1`…`COM9`, `LPT1`…`LPT9`) cannot be a file name. Opportunity numbers are not expected to look like this; the registry writer should refuse such a reference with a clear message.

## 4. Resolving

`resolve(input, records)` normalises `input`, so any case and any spacing works. It then looks for a match in this order and stops at the first level that matches:

1. `record.ref`;
2. any entry of `record.opportunity_numbers`;
3. any entry of `record.aliases` (for example Continuum's old timestamp IDs, DEC-004).

It then follows `superseded_by` for at most 5 steps.

| `status` | Meaning |
|---|---|
| `found` | Matched directly; `record` is it |
| `superseded` | At least one `superseded_by` step was followed; `record` is the current one |
| `retired` | The final record has `status: "retired"` |
| `conflict` | More than one record matched at the same level (`candidates`), or the chain loops, exceeds 5 steps, or points to a missing or duplicated record (`reason`) |
| `not-found` | Nothing matched |

`chain` lists the references visited, starting with the matched record.

## 5. Registry record (schema `continuum.reference`, version 1)

`recordFromForm({opportunity_numbers, primary?, name, client?}, {utc, by?, app?})` builds:

```json
{
  "schema": "continuum.reference",
  "schema_version": 1,
  "ref": "O-5030460",
  "opportunity_numbers": ["O-5030460", "O-777"],
  "opportunity_number_as_entered": " o-5030460",
  "name": "Project Alpha",
  "client": "TestCo",
  "status": "active",
  "superseded_by": null,
  "aliases": [],
  "links": { "peoplesoft_project_ids": [], "po_team_identifiers": [], "other": {} },
  "created": { "utc": "2026-10-05T09:30:00Z", "by": "V. Y.", "app": "finance 4.0.0" },
  "updated": { "utc": "2026-10-05T09:30:00Z", "by": "V. Y.", "app": "finance 4.0.0" }
}
```

* `opportunity_numbers` uses Continuum's field name. The first entry is the primary and equals `ref`. Duplicates are removed.
* `primary` is optional. If given, it must equal the first number.
* A `workstream` value is refused (DEC-011-R1).
* `status` is one of `active`, `closed` or `retired`.
* Readers must tolerate unknown fields, and writers must keep them when updating (DATA_AND_STORAGE §8).
* Before creating a record, an app asks the user to **retype** the first opportunity number to confirm it, because it can never be changed (V-09).

## 6. Links between apps

* Inside one app, link with `toLink('index.html', ref)` and read the link back with `parseFromLocation(location)`.
* Continuum (`http://localhost:8002`) hands a reference to Finance (`file://`) by **Copy reference → Paste reference**, not by a link (DEC-003).
