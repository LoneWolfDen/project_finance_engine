# Mapping profiles

Version 1, 2026-10-05 (IMP-003). The engine is `app/data/mapping.js` (`CFE.data.mapping`). The profiles are in `app/data/mappings/`, and the tables below are generated from them. If you change one, change the other in the same commit.

A profile says, for one kind of source file:
* which column feeds each field;
* each field's type;
* the date format;
* which fields are required.

## Rules

* **Column names** are matched ignoring upper/lower case, spaces and underscores, so `Empl ID`, `EmplID` and `empl_id` are the same column. If several columns could feed one field, the first alias wins and a warning names them.
* **A missing required column blocks the whole file.** Nothing is imported, and the error names the expected column.
* **Rows with an error are left out**, and every error gives the row number in the file (the header is row 1), the column and the value.
* **Dates are never guessed.** Each date field has one format:
  * `M/D/YYYY`: month/day/year, 1–2 digit day and month, for example `7/1/2025` is 1 July 2025;
  * `D/M/YYYY`: day/month/year, for example `1/7/2025` is 1 July 2025;
  * `YYYY-MM-DD`.
  
  Any other form is refused, including 2-digit years and impossible dates such as 30 February.

  The format here is how the **source file** writes dates. After the check, every date is stored as `YYYY-MM-DD`, whatever the source, and shown on screen and in exports as `DD-MM-YYYY` (DEC-040). So `31/12/2025` in a resource-rules file is stored as `2025-12-31` and shown as `31-12-2025`.
* **Numbers** must be plain (`300000` or `1.5`). `£300,000` is refused rather than misread.
* **Minimisation (ADR-016):** every profile drops the columns it does not list. For timesheets this removes worksite city, state, country and postal code, customer and project names, business unit, week ending, status, bill indicator, and vacation and personal hours.

## Owner confirmation (checkpoint F1.5)

The column names below are the live PeopleSoft names, as you confirmed on 2026-10-04 (DEC-018-R1). On 2026-10-05 you checked this document against the real exports: the column names match and resource-rule dates are day first (DEC-039).

Still open: where real PO details come from and how their start dates are written (DEC-041). `po-details-v1` currently expects `YYYY-MM-DD`, the form the app saves PO data in.

## peoplesoft-timesheet-v1

Timesheet rows. Dates are month/day/year (DEC-018-R1). Kept: who, when, which project, activity and the hours worked. Dropped at import (minimisation, ADR-016): worksite city/state/country/postal, customer and project names, business unit, week ending, status, bill indicator, and vacation/personal hours.

Source: PeopleSoft (timesheet query export). Entity: `timesheet_rows`. Columns not listed are dropped at import.

| Field | Source column (any of) | Type | Required |
|---|---|---|---|
| `employee_id` | `Empl ID`, `EmplID` | string | yes |
| `employee_name` | `Empl Name`, `EmplName` | string | yes |
| `reported_date` | `Reported Dt`, `Reported Date` | date (M/D/YYYY) | yes |
| `project_id` | `Project ID`, `ProjectID` | string | yes |
| `activity` | `Activity` | string | no |
| `regular_hours` | `Regular Hours` | number | yes |
| `overtime_hours` | `Overtime Hours` | number | no |
| `other_hours` | `Other` | number | no |
| `total_hours` | `Total Hours` | number | no |

## resource-rules-v1

Resource rules: who is billed at which rate, for which PO team and period. Dates are day/month/year (DEC-018-R1; confirmed by the owner, DEC-039).

Source: Resource rules (rate card export). Entity: `resource_rules`. Columns not listed are dropped at import.

| Field | Source column (any of) | Type | Required |
|---|---|---|---|
| `employee_name` | `Empl Name`, `EmplName`, `Name` | string | yes |
| `employee_id` | `EmplID`, `Empl ID` | string | yes |
| `project_id` | `ProjectID`, `Project ID` | string | no |
| `po_team_identifier` | `PO_Team_Identifier`, `PO Team` | string | yes |
| `role` | `Role` | string | no |
| `location` | `Location` | string | yes |
| `start` | `RateEffectiveDt`, `Start` | date (D/M/YYYY) | yes |
| `end` | `ContractEndDt`, `End` | date (D/M/YYYY) | yes |
| `bill_rate` | `BillRate`, `Bill Rate` | number | yes |
| `hour_multiplier` | `HourMultiplier_TimeEntry`, `Hour Multiplier` | number | no |
| `allocation` | `Allocation_Percentage`, `Allocation` | number | yes |

## po-details-v1

Purchase orders. Validity is either mm-yy text (PO_Validity) or a year (PO_Validity_Year); the importer turns it into validity_end. Start dates are YYYY-MM-DD (open: DEC-041).

Source: PO details (legacy test_PO_Details.json fields). Entity: `purchase_orders`. Columns not listed are dropped at import.

| Field | Source column (any of) | Type | Required |
|---|---|---|---|
| `po_number` | `PO_WO_Number`, `PO Number` | string | yes |
| `po_team_identifier` | `PO_Team_Identifier`, `PO Team` | string | yes |
| `project_id` | `ProjectID`, `Project ID` | string | no |
| `value` | `PO_WO_value`, `PO Value` | number | yes |
| `currency` | `PO_Currency_Code`, `Currency` | string | yes |
| `normalized_currency` | `Normalized_Currency_Code` | string | no |
| `validity` | `PO_Validity` | string | no |
| `validity_year` | `PO_Validity_Year` | int | no |
| `start` | `WO_StartDate`, `Start` | date (YYYY-MM-DD) | yes |
| `approval_status` | `WO_Approval_Status`, `Approval Status` | string | yes |
| `rollover_allowed` | `rollover_allowed`, `Rollover` | bool | no |

## invoices-v1

Invoices raised against a PO team. Dates are YYYY-MM-DD.

Source: Invoices (legacy test_Invoices.json fields). Entity: `invoices`. Columns not listed are dropped at import.

| Field | Source column (any of) | Type | Required |
|---|---|---|---|
| `invoice_number` | `invoice_number`, `Invoice Number` | string | yes |
| `po_team_identifier` | `po_team`, `PO_Team_Identifier` | string | yes |
| `period_from` | `period_from`, `Period From` | date (YYYY-MM-DD) | yes |
| `period_to` | `period_to`, `Period To` | date (YYYY-MM-DD) | yes |
| `amount` | `amount`, `Amount` | number | yes |
| `currency` | `currency`, `Currency` | string | no |
| `status` | `status`, `Status` | string | yes |
| `paid_date` | `paid_date`, `Paid Date` | date (YYYY-MM-DD) | no |
| `notes` | `notes`, `Notes` | string | no |

## expenses-v1

Expense claims. Dates are YYYY-MM-DD; the currency is kept as claimed.

Source: Expenses (legacy test_Expenses.json fields). Entity: `expenses`. Columns not listed are dropped at import.

| Field | Source column (any of) | Type | Required |
|---|---|---|---|
| `employee_name` | `name`, `Empl Name` | string | yes |
| `date` | `date`, `Date` | date (YYYY-MM-DD) | yes |
| `amount` | `amount`, `Amount` | number | yes |
| `currency` | `currency`, `Currency` | string | yes |
| `description` | `desc`, `description`, `Description` | string | no |
| `project_id` | `projectID`, `Project ID` | string | no |
| `po_team_identifier` | `po_team`, `PO_Team_Identifier` | string | no |

## fx-rates-v1

Effective-dated FX rates. Dates are YYYY-MM-DD.

Source: FX rates (legacy fx_rates fields). Entity: `fx_rates`. Columns not listed are dropped at import.

| Field | Source column (any of) | Type | Required |
|---|---|---|---|
| `currency` | `code`, `currency`, `Currency` | string | yes |
| `effective` | `effective`, `Effective Date` | date (YYYY-MM-DD) | yes |
| `rate` | `rate`, `Rate` | number | yes |

## ot-rules-v1

Effective-dated overtime multipliers by hours type. Dates are YYYY-MM-DD.

Source: Overtime rules (legacy ot_params fields). Entity: `ot_rules`. Columns not listed are dropped at import.

| Field | Source column (any of) | Type | Required |
|---|---|---|---|
| `type` | `type`, `Hours Type` | string | yes |
| `effective` | `effective`, `Effective Date` | date (YYYY-MM-DD) | yes |
| `multiplier` | `multiplier`, `Multiplier` | number | yes |
| `trc` | `trc`, `TRC` | string | no |

## references-crosswalk-v1

Links each Continuum reference to its PO teams and PeopleSoft project IDs. List cells are separated by ";".

Source: Reference crosswalk (maintained by the publisher). Entity: `references`. Columns not listed are dropped at import.

| Field | Source column (any of) | Type | Required |
|---|---|---|---|
| `ref` | `ref`, `Reference` | string | yes |
| `name` | `name`, `Name` | string | yes |
| `client` | `client`, `Client` | string | no |
| `opportunity_numbers` | `opportunity_numbers`, `Opportunity Numbers` | list (separated by `;`) | no |
| `po_team_identifiers` | `po_team_identifiers`, `PO Team Identifiers` | list (separated by `;`) | no |
| `peoplesoft_project_ids` | `peoplesoft_project_ids`, `PeopleSoft Project IDs` | list (separated by `;`) | no |
