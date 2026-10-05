# Published dataset: schema version 1

Version 1, 2026-10-05 (STO-001). The code is `app/data/schema.js` (`CFE.data.schema`), and the field tables below are generated from it. If you change one, change the other in the same commit. Source: DATA_AND_STORAGE_ARCHITECTURE §3, §7 and §8, with these decisions:

* **DEC-001-R1:** the project key is `ref` (replacing `crid`).
* **DEC-006:** real names are included.
* **ADR-010:** integer schema versions.
* **ADR-016:** actuals are published as aggregates.

This is the contract between the **publisher**, who imports PeopleSoft files and publishes, and the **viewers**, leaders who open the published files.

## 1. What is published

| File | Contents |
|---|---|
| `manifest.json` / `manifest.js` | Who published what, when, from which source files, and the checks that ran (§3) |
| `dataset.json` / `dataset.js` | The data itself (§2) |

The `.js` twins hold the same JSON, wrapped as `window.CFE_PUBLISHED_MANIFEST = …;` and `window.CFE_PUBLISHED_DATASET = …;`, so a page opened from `file://` can load them with a `<script>` tag.

**Rules for all values**

* Dates are `YYYY-MM-DD` and months are `YYYY-MM`. This is the stored form; people see dates as `DD-MM-YYYY` on screen and in exports (DEC-040).
* Money is a plain number with its own `currency` field (for example `GBP`), never a formatted string such as "£300,000".
* `ref` is a reference normalised by `Continuum.ref` (see `CONTINUUM_REFERENCE.md`).

**What is never published** (minimisation, ADR-016)

* Worksite city, postal code, country or state.
* Vacation or personal hours.
* Raw daily timesheet rows: actuals are summed per project, person, month and hours type.

The schema has no fields for these.

## 2. Dataset (`schema: "cfe.dataset"`, `schema_version: 1`)

Top level: `schema`, `schema_version`, `data_as_of` (date), and one list per entity below. Every entity list is required; use `[]` when empty.

The forecast is **not** stored: viewers compute it from the resource rules, so "as of today" stays honest.

Validation (`CFE.data.schema.validateDataset`) returns `{errors, warnings}`:

* **Errors** (codes `wrong-schema`, `missing-field`, `wrong-type`, `bad-value`, `duplicate-key`) block publishing and loading.
* **Warnings** (`unknown-entity`, `unknown-field`) do not: newer files may carry fields this version does not use. They are kept, not dropped.

### references

Key (must be unique): `ref`

| Field | Type | Required |
|---|---|---|
| `ref` | reference (Continuum.ref) | yes |
| `name` | text | yes |
| `client` | text | no |
| `status` | one of: active, closed, retired | yes |
| `opportunity_numbers` | list of text | no |
| `links` | object | no |
| `src` | source (see §4) | no |

### purchase_orders

Key (must be unique): `po_number` + `ref`

| Field | Type | Required |
|---|---|---|
| `po_number` | text | yes |
| `ref` | reference (Continuum.ref) | yes |
| `po_team_identifier` | text | yes |
| `value` | number (amount) | yes |
| `currency` | currency code (3 letters) | yes |
| `start` | date YYYY-MM-DD | yes |
| `validity_end` | date YYYY-MM-DD | yes |
| `rollover_allowed` | true/false | yes |
| `approval_status` | text | yes |
| `src` | source (see §4) | yes |

### resource_rules

Key (must be unique): `rule_id`

| Field | Type | Required |
|---|---|---|
| `rule_id` | text | yes |
| `ref` | reference (Continuum.ref) | yes |
| `person_key` | text | yes |
| `role` | text | no |
| `location` | text | yes |
| `start` | date YYYY-MM-DD | yes |
| `end` | date YYYY-MM-DD | yes |
| `bill_rate` | number (amount) | yes |
| `currency` | currency code (3 letters) | yes |
| `rate_unit` | one of: hour, day | yes |
| `allocation` | number 0–1 | yes |
| `po_team_identifier` | text | no |
| `src` | source (see §4) | yes |

### people

Key (must be unique): `person_key`

| Field | Type | Required |
|---|---|---|
| `person_key` | text | yes |
| `display_name` | text | yes |
| `employee_id` | text | no |
| `src` | source (see §4) | yes |

### actuals

Key (must be unique): `ref` + `person_key` + `month` + `hours_type`

| Field | Type | Required |
|---|---|---|
| `ref` | reference (Continuum.ref) | yes |
| `person_key` | text | yes |
| `month` | month YYYY-MM | yes |
| `hours_type` | one of: regular, overtime | yes |
| `hours` | number | yes |
| `cost` | number (amount) | yes |
| `currency` | currency code (3 letters) | yes |
| `src` | source (see §4) | yes |

### invoices

Key (must be unique): `invoice_id`

| Field | Type | Required |
|---|---|---|
| `invoice_id` | text | yes |
| `ref` | reference (Continuum.ref) | yes |
| `po_number` | text | no |
| `period_from` | date YYYY-MM-DD | yes |
| `period_to` | date YYYY-MM-DD | yes |
| `amount` | number (amount) | yes |
| `currency` | currency code (3 letters) | yes |
| `status` | one of: Draft, Submitted, Paid | yes |
| `paid_date` | date YYYY-MM-DD | no |
| `notes` | text | no |
| `src` | source (see §4) | yes |

### expenses

Key (must be unique): `expense_id`

| Field | Type | Required |
|---|---|---|
| `expense_id` | text | yes |
| `ref` | reference (Continuum.ref) | yes |
| `person_key` | text | no |
| `date` | date YYYY-MM-DD | yes |
| `amount` | number (amount) | yes |
| `currency` | currency code (3 letters) | yes |
| `converted_amount` | number (amount) | no |
| `converted_currency` | currency code (3 letters) | no |
| `fx_rate_used` | number > 0 | no |
| `description` | text | no |
| `src` | source (see §4) | yes |

### fx_rates

Key (must be unique): `currency` + `effective`

| Field | Type | Required |
|---|---|---|
| `currency` | currency code (3 letters) | yes |
| `effective` | date YYYY-MM-DD | yes |
| `rate` | number > 0 | yes |
| `src` | source (see §4) | yes |

### ot_rules

Key (must be unique): `type` + `effective` + `po_team_identifier`

| Field | Type | Required |
|---|---|---|
| `type` | text | yes |
| `effective` | date YYYY-MM-DD | yes |
| `multiplier` | number > 0 | yes |
| `po_team_identifier` | text | no |
| `src` | source (see §4) | yes |

### calendars

Key (must be unique): `location`

| Field | Type | Required |
|---|---|---|
| `location` | text | yes |
| `source` | text | yes |
| `valid_years` | list of years | yes |
| `holidays` | list of dates | yes |
| `src` | source (see §4) | no |

Notes:
* `purchase_orders.validity_end` is the last day the PO is valid. It replaces the legacy `mm-yy` text.
* `resource_rules.rate_unit` says whether `bill_rate` is per `hour` or per `day`. This replaces the ambiguous legacy `hour_mult`.
* `expenses.converted_amount` and `converted_currency` hold the amount in the reporting currency, and `fx_rate_used` holds the rate applied.
* `fx_rates.rate` is the number of units of `currency` per 1 unit of the reporting currency (`manifest.deployment.reporting_currency`), effective from `effective`.
* `calendars` follow `app/data/calendars.js`: `source` and `valid_years` say where the holidays come from and which years they cover.

## 3. Manifest (`schema: "cfe.manifest"`, `schema_version: 1`)

| Field | Type | Required |
|---|---|---|
| `schema` | one of: cfe.manifest | yes |
| `schema_version` | one of: 1 | yes |
| `publication_id` | text | yes |
| `published_utc` | UTC time | yes |
| `publisher` | text | yes |
| `app_version` | text | yes |
| `dataset_schema_version` | one of: 1 | yes |
| `data_as_of` | date YYYY-MM-DD | yes |
| `payload_sha256` | SHA-256 hex | yes |
| `sources` | list | yes |
| `counts` | object | yes |
| `validation` | object | yes |
| `minimisation` | object | yes |
| `deployment` | object | yes |
| `publications` | list | yes |
| `validation.errors` | whole number ≥ 0 | yes |
| `validation.warnings` | list | yes |
| `minimisation.policy` | text | yes |
| `minimisation.person_names` | one of: included, pseudonymised | yes |
| `deployment.display_name` | text | yes |
| `deployment.reporting_currency` | currency code (3 letters) | yes |

* `sources` lists one provenance record per imported file (`Continuum.provenance.fileRecord`, §7 of the architecture).
* `counts` maps a name to a whole number, for example `references`, `po`, `resource_rules`, `actual_rows_in` and `actual_aggregates`.
* `publications` holds the last 100 publish and rollback events at most.
* `payload_sha256` is the SHA-256 of the canonical dataset JSON (STO-004).

## 4. Sources (`src`)

Every imported record carries `src`, which says where it came from:

* **One source row:** `{ "file": "<file_id>", "sheet": "Sheet1", "row": 1022 }`, built with `Continuum.provenance.rowRef`. `row` counts from 1 and includes the header row. `sheet` is null for CSV files.
* **An aggregate** (for example an `actuals` month): `{ "files": ["<file_id>", …], "rows": 21 }`, meaning how many source rows were summed and from which files.

`file_id` matches `manifest.sources[].file_id`. `references` and `calendars` may omit `src`, because they come from the Registry and from `app/data/calendars.js`.

## 5. Versions and migration

`CFE.data.migrate.toCurrent(obj)` handles schema versions:

* It upgrades older data in memory, one version at a time, using pure functions (`migrations[n]`: version n → n+1).
* It never modifies the input and never rewrites history files.
* It refuses data newer than the app with `NewerSchemaError`, and the viewer shows "update the app".

Version 1 is the first, so no migrations exist yet.
