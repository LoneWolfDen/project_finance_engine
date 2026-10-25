# Project Finance Portfolio Engine

Active version: `finance-engine-v3.5`. Earlier versions (v1, v2, v3) are kept, unchanged, in `archive/`. Each runs standalone.

Built by Vamsi Yedlapalli | github.com/LoneWolfDen

## finance-engine-v3.5 layout

| Path | What's in it |
|---|---|
| `index.html` | Page markup and script load order |
| `css/style.css` | All styles |
| `data/defaults.js` | Default config (POs, resources, FX rates, actuals) used when the server has no saved data |
| `data/holidays.js` | Bank holidays by location |
| `js/core/storage.js` | Load/save working and master config (server API, localStorage fallback) |
| `js/core/forecast.js` | Forecast engine: working days, FX and currency conversion, OT multipliers, resource rules |
| `js/core/model.js` | Year / PO_Team filters, `buildData()` (the model every tab renders from), `mergeMonthly()` |
| `js/core/coverage.js` | How far the budget left funds a resource plan, and the additional amount needed |
| `js/ui/shell.js` | Nav bar, filters, `render()`, `fmtMoney()`, toasts, sortable tables |
| `js/ui/html.js` | HTML helpers shared by the tabs (`tableHead`, `tableRow`, `statCard`, ...) |
| `js/ui/chart-helpers.js` | Chart.js helpers shared by the tabs (`addChart`, `kLabels`, `moneyTicks`) |
| `js/tabs/*.js` | One file per tab: `overview`, `burndown`, `variance`, `po-details`, `invoices`, `resources`, `utilization`, `expenses`, `scenarios`, `data-reports`, `settings`. A tab with charts also draws them there (`drawOverviewCharts`, ...) |
| `js/tabs/resource-versions.js` | Resource versions panel on the Resources tab (save, compare, apply, funding chart) |
| `js/exports.js` | Excel, PDF and PowerPoint exports |
| `js/main.js` | Startup (loaded last) |
| `js/chat.js` | AI assistant panel |
| `tests/regression/` | Headless-browser test: `./run.sh` compares the working tree with the last commit |
| `server.py` | Serves the page and static files, stores config in SQLite, proxies chat to Ollama |

The `js/` files are plain scripts sharing one global scope (no build step). Keep the
`<script>` order in `index.html`: CDN libraries and `data/` first (they are read at load
time), `main.js` last; the order of the files in between does not matter.

## Currencies

Each PO has a `PO_Currency_Code`; resource bill rates, timesheet costs and invoices are in their
PO_Team's currency, and each expense has its own `currency`. Rates in **Settings → FX Rates** are
units per 1 GBP, effective-dated. Pick the **Normalised** currency in the nav bar: totals and charts
are shown in the selected POs' own currency when they all share one, otherwise converted to the
normalised currency (at today's rates). A banner warns when a currency has no FX rate.

## Resource versions

On the **Resources** tab, save the current resource rules as a named version, change the rules,
and save again. Every version shows, for the PO_Teams in view, its cost from today, how many
working days the budget left (PO value − actuals − expenses) covers, the date funding runs out,
and the additional amount needed. Versions are stored in the config (server and Full Config export).

## Excel workbook

**Data & Reports → Excel (.xlsx)** downloads one workbook with:

- report sheets for the current filters (Summary, Monthly, Burndown, PO Teams, Version Funding,
  Version Budget, PO Rollover) with **native Excel charts** you can edit in Excel;
- every configuration section as its own sheet (PO Details, Resources, Invoices, Expenses,
  FX Rates, OT Params, Monthly Actuals, Timesheet, Holidays, Resource Versions, Settings).

The server builds it with `openpyxl` (`pip install -r requirements.txt`; the Docker image includes it).
Without it the app falls back to a simpler workbook without charts or configuration.

To make changes in Excel: edit the configuration sheets (keep the column headers; dates as
yyyy-mm-dd or Excel dates), then **Data & Reports → Import Excel workbook → Preview import**.
The preview shows the rows per sheet and blocks invalid data; **Apply import** replaces those
sections, and the previous config stays in **Settings → Save history**.

## Run finance-engine-v3.5

### Option 1: Run with Python

Requirements: Python 3.11 or later, and `pip install -r requirements.txt` (openpyxl, for the Excel workbook).

1. Open a terminal in the project directory:

	```bash
	cd finance-engine-v3.5
	```

2. Start the server:

	```bash
	python3 server.py
	```

	The server listens on `http://localhost:3005` by default, and only accepts connections from this computer.

3. Open [http://localhost:3005](http://localhost:3005) in a browser.

To use a different port, set `PORT` before starting the server:

```bash
PORT=8080 python3 server.py
```

The SQLite database is created automatically as `finance_engine.db` in the
`finance-engine-v3.5` directory. The server must be running for the dashboard
to load and save configuration data.

### Option 2: Run with Docker

From the repository root, build the image and start a container:

```bash
docker build -t finance-engine-v3.5 ./finance-engine-v3.5
docker run --rm -p 127.0.0.1:3005:3005 -v finance-engine-data:/data finance-engine-v3.5
```

Then open [http://localhost:3005](http://localhost:3005). Your data is kept in the Docker volume
`finance-engine-data`, so it survives restarts; `127.0.0.1:` keeps the app reachable from this computer only.

To preserve the SQLite database after the container stops, mount the version
directory and run the container from the version directory instead:

```bash
cd finance-engine-v3.5
docker build -t finance-engine-v3.5 .
docker run --rm -p 127.0.0.1:3005:3005 -v "$PWD:/app" -v finance-engine-data:/data finance-engine-v3.5
```

### Optional: Ollama chat mode

The dashboard's Smart mode works without Ollama. Ollama is only required when
using Ollama AI mode. Install Ollama, then run:

```bash
ollama serve
ollama pull llama3.2
```

Start `server.py` locally as described above, and leave Ollama running on its
default URL, `http://localhost:11434`.

### Verify the server

With the server running, use:

```bash
curl http://localhost:3005/api/health
```

A healthy server returns JSON with status `ok`.
