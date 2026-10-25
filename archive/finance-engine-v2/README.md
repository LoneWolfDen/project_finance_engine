# Project Finance Portfolio Engine

A web-based PO-level financial control dashboard for program managers handling multiple projects. Replaces Excel Power Pivot burndown templates with an interactive, multi-project dashboard.

## Features

- **Multi-project PO tracking** — Multiple POs per project, cumulative values, validity-month-aware (mm-yy format)
- **Resource-driven forecast** — `BillRate × Allocation% × 8hrs/day` on working days (excludes weekends + location-based bank holidays)
- **Actuals from timesheets** — Upload PeopleSoft CSV dumps, auto-matched to resource rules
- **Burndown chart** — Combo chart: monthly spend bars + burn lines + PO available (local + normalized currency)
- **Year + PO_Team filters** — Year as primary filter, PO_Team as secondary; all calculations react instantly
- **Invoice tracking** — Collapsible timeline view with horizontal scroll, showing paid/submitted/draft invoices
- **FX normalization** — Date-effective currency conversion for program-level reporting
- **Editable resources** — Per-team tables with inline editing, per-group Add Row, sortable columns
- **Multi-year PO rollover** — `rollover_allowed` flag controls whether unused budget carries forward
- **PO_Team budget status** — Per-team RAG status (green/amber/red) on Overview page
- **Export** — Excel (multi-sheet) and PDF reports respecting current filters
- **Validation** — Upload and config paste validation with detailed error messages
- **SQLite persistence** — Server-side storage survives browser clears; localStorage as fallback
- **Master/Working config** — PIN-protected master data + freely editable working copy

## Quick Start

```bash
# Python (no external dependencies — uses stdlib only: http.server, sqlite3, json)
python3 server.py
# Open http://localhost:8889
# SQLite DB auto-created as finance_engine.db

# Docker
docker build -t finance-engine .
docker run -p 8889:8889 finance-engine
# Open http://localhost:8889
```

## SQLite Persistence

The server uses Python's built-in `sqlite3` module (part of the standard library). No pip install needed.

- **GitHub Codespaces**: ✅ SQLite is available out-of-the-box. Python 3.x in Codespaces includes `sqlite3`.
- **Docker**: ✅ The Alpine/Debian Python images include SQLite.
- **Local**: ✅ Any Python 3.x installation includes `sqlite3`.

Data is stored in `finance_engine.db` in the project directory. The file is auto-created on first run.

API endpoints:
- `GET /api/config` — Load working config
- `POST /api/config` — Save working config
- `GET /api/config/master` — Load master config
- `POST /api/config/master` — Save master config

## Usage

### 1. Upload PO Details
Go to **Config** tab → PO Details → paste JSON array:
```json
[
  {
    "PO_Team_Identifier": "111111_ProjectAlpha_AWS",
    "PO_WO_value": 300000,
    "PO_Currency_Code": "GBP",
    "Normalized_Currency_Code": "USD",
    "PO_Validity_Year": 2025,
    "WO_StartDate": "2025-01-01",
    "WO_Approval_Status": "Approved",
    "PO_WO_Number": 100100100,
    "ProjectID": 111111,
    "program": "AWS Migration"
  }
]
```

### 2. Upload Resource Rules
Go to **Upload** tab → Resource Rules → select CSV with columns:
```
Empl Name, EmplID, ProjectID, PO_Team_Identifier, Role, Location,
RateEffectiveDt, BillRate, HourMultiplier_TimeEntry, ContractEndDt, Allocation_Percentage
```
- Dates: `dd/mm/yyyy` (UK format)
- `HourMultiplier_TimeEntry`: 8 = reports in days, 1 = reports in hours
- Multiple rows per person = allocation changes over time

### 3. Upload Timesheet Actuals
Go to **Upload** tab → Timesheet Actuals → select CSV with columns:
```
Empl Name, Empl ID, Reported Dt, Project ID, Regular Hours, Overtime Hours, ...
```
- Dates: `m/d/yyyy` (US format from PeopleSoft)
- Matched to resources by `Empl ID` + date range

### 4. Upload Invoices (optional)
Go to **Config** tab → Invoices → paste JSON:
```json
[
  {"po_team":"111111_ProjectAlpha_AWS","invoice_number":"INV-001",
   "period_from":"2025-07-01","period_to":"2025-07-31",
   "amount":45000,"status":"Paid","paid_date":"2025-08-15","notes":"Jul labour"}
]
```

## Business Logic

### Forecast
```
Daily Forecast = BillRate × Allocation% × 8 (standard hours)
Applied when: RateEffectiveDt ≤ date ≤ min(ContractEndDt, PO_Validity_Year end)
Excluded: weekends + bank holidays for resource's location
```

### Actuals
```
Cost = (Regular Hours × HourMultiplier × BillRate) + (OT Hours × HourMultiplier × BillRate × OT_Multiplier)
Resource matched by: Empl ID + effective date range
```

### PO Burndown
```
PO Available = sum of PO values where WO_StartDate ≤ month AND PO_Validity_Year ≥ year
Forecast Burn = PO_Available - cumulative forecast spend
Actuals Burn = PO_Available - cumulative actual spend
```

### FX Normalization
```
Normalized = Local_Value / FX_Rate(PO_Currency, date) × FX_Rate(Normalized_Currency, date)
Uses date-effective lookup (latest rate on or before transaction date)
```

## File Structure

```
├── server.py          # Minimal HTTP server (serves index.html)
├── index.html         # Complete dashboard (HTML + CSS + JS)
├── Dockerfile         # Container build
├── .devcontainer/     # GitHub Codespaces config
│   └── devcontainer.json
├── test_PO_Details.json
├── test_ResourceRules.csv
├── test_Timesheet.csv
├── test_Expenses.json
└── test_Invoices.json
```

## Configuration

All config is stored in browser `localStorage`. Two tiers:
- **Working Config** — freely editable, for what-if scenarios
- **Master Config** — PIN-protected (default: `1234`), the golden source

Reset working → master anytime without PIN. Factory reset requires PIN.

## Supported Locations (Bank Holidays)

UK, India, Germany, France, Canada, Ireland, Netherlands, Spain, Belgium, Sweden, Denmark, Switzerland

## GitHub Codespaces

This repo includes `.devcontainer/devcontainer.json` for one-click setup:
1. Fork this repo
2. Click "Code" → "Codespaces" → "Create codespace"
3. Terminal: `python3 server.py`
4. Click the port 8889 link in the Ports tab
