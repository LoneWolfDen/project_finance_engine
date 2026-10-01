# Dependency and Build Register

Assessment date: 2026-10-01 · Baseline commit `5d453d1`
Mode: read-only. No packages were installed, resolved or downloaded.

## 1. Build model verdict

| Question | Finding | Classification | Confidence |
|---|---|---|---|
| Is there a build step? | No. There is no `package.json`, lockfile, bundler, transpiler, `requirements.txt`, `pyproject.toml` or `Makefile` | — | High |
| De facto model | Charter **Model A (no-build)**, partly: readable HTML/JS served as-is | PARTIAL | High |
| Charter violations | (1) runtime libraries from public CDNs, not a local vendor directory; (2) no vendor record (name/version/licence/source/hash); (3) **four parallel application copies** with different ports and startup paths; (4) inconsistent version identifiers | — | High |
| Coherent? | **No** | — | High |

## 2. Runtime JavaScript dependencies (browser)

Declared only as `<script>` tags in `finance-engine-v3.5/index.html:4-9`. There is no manifest or lockfile. Versions are exact-pinned in URLs, with no SRI.

| Library | Version | URL | Licence (upstream) | Used by | Load failure impact | Advisory status (to confirm) |
|---|---|---|---|---|---|---|
| Chart.js | 4.4.0 | `cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js` | MIT | Charts | **Fatal**: `Chart.register` at top level (`index.html:431`) aborts the main script | None known |
| chartjs-plugin-datalabels | 2.2.0 | `cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/…` | MIT | Data labels | **Fatal** (`ChartDataLabels` referenced at `431`) | None known |
| xlsx (SheetJS CE) | 0.18.5 | `cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js` | Apache-2.0 | XLSX import/export | Upload/export throw at use; app loads | **Affected** (CVE-2023-30533, CVE-2024-22363). Fixed builds are distributed from `cdn.sheetjs.com`, not npm |
| jsPDF | 2.5.1 | `cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js` | MIT | PDF export | PDF export throws | Later advisories for <3.0.x (confirm) |
| jspdf-autotable | 3.8.2 | `cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/…` | MIT | PDF tables | PDF export throws | None known |
| PptxGenJS | 3.12.0 | `cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@3.12.0/dist/pptxgen.bundle.js` | MIT (bundles JSZip MIT/GPLv3) | PPTX export | PPTX export throws | None known; Git-tag source is less immutable than a registry artefact |

Per-version CDN usage: v1 loads Chart.js only; v2 loads Chart.js, xlsx, jsPDF and autotable; v3 and v3.5 load all six.

## 3. Server-side dependencies

| Component | Version / constraint | Evidence | Notes |
|---|---|---|---|
| Python | "3.11 or later" (root `README.md`); Docker `python:3.11-slim`; devcontainer `mcr.microsoft.com/devcontainers/python:3.11` (v1, v2 only) | `Dockerfile:1`, `.devcontainer/devcontainer.json` | Assessor host has Python 3.14.7; `server.py` parses (AST) without error. Not executed |
| Python modules | Standard library only: `json`, `sqlite3`, `os`, `http.server`, `pathlib`, `urllib.request`, `urllib.error` | `server.py:11-17` | No third-party Python packages |
| SQLite | Bundled with Python | `server.py:12,39-66` | Schema created at runtime; no migrations |
| Ollama (optional) | Model `llama3.2` default via `OLLAMA_MODEL`; URL via `OLLAMA_URL` | `server.py:23-24` | UI error text recommends `phi3:mini` (`index.html:2275`), which conflicts. Ollama is installed on the assessor host (`/opt/homebrew/bin/ollama`); not exercised |
| Docker base image | `python:3.11-slim` (floating tag, not digest-pinned) | `Dockerfile:1` | Runs as root |

## 4. Startup paths

| Path | Version | Port | Command | Documented in | Issues |
|---|---|---|---|---|---|
| S-1 | v3.5 | 3005 (`PORT` env) | `python3 server.py` from `finance-engine-v3.5/` | Root `README.md` | Binds all interfaces; prints debug banners (`server.py:19-20`) |
| S-2 | v3.5 | 3005 | `docker build -t finance-engine-v3.5 ./finance-engine-v3.5 && docker run --rm -p 3005:3005 …` | Root `README.md` | `EXPOSE 8889` mismatch; data lost on container exit unless `-v "$PWD:/app"` is used, and that bind mount also overrides the image's code with the working tree |
| S-3 | v3 | 8889 | `python3 server.py` | **None** (no v3 README) | Same server pattern as v3.5 |
| S-4 | v2 | 8889 | `python3 server.py` / Docker / Codespaces | `finance-engine-v2/README.md` | — |
| S-5 | v1 | 8889 (hard-coded) | `python3 server.py` / Docker / Codespaces | `finance-engine-v1/README.md` | HTML only; `localStorage` only |
| S-6 | v1, v2 | 8889 | Devcontainer `postStartCommand: python3 server.py &` | `.devcontainer/devcontainer.json` | Background process, no supervision |
| S-7 | any | — | Opening `index.html` via `file://` | Not documented | API calls fail and fall back to `localStorage` (`index.html:186`); still requires CDN |

There are seven ways to start an application, across four codebases, and nothing records which one is authoritative beyond the root README's focus on v3.5.

## 5. Version identifiers (inconsistent)

| Location | Value |
|---|---|
| UI header `index.html:105` | `v3.5` |
| `server.py` docstring / banner | 3.5 |
| `/api/health` `server.py:90` | `"3.0"` |
| `/api/test` `server.py:88` | `finance-engine-v3` |
| Git tags | `pwa-assessment-baseline-2026-10-01` only. No release tags |
| Changelog | None |

## 6. Environment and configuration

| Variable | Default | Evidence | Example file? |
|---|---|---|---|
| `PORT` | 3005 | `server.py:22` | No `.env.example` |
| `OLLAMA_URL` | `http://localhost:11434` | `server.py:23` | No |
| `OLLAMA_MODEL` | `llama3.2` | `server.py:24` | No |
| Client `MASTER_PIN` | `'1234'` (hard-coded constant) | `index.html:132` | n/a |
| Client `pf_copilot_url` | empty; set by `prompt()` | `index.html:2160,2181` | n/a |

## 7. CI/CD and deployment

| Item | Status |
|---|---|
| CI workflows (`.github/workflows`, Azure Pipelines, etc.) | **None** |
| Dependency scanning (Dependabot, Renovate, `npm audit`) | **None.** Impossible without a manifest |
| Release pipeline / artefacts | **None** |
| Deployment guidance | Local Python and local Docker only (root `README.md`). No hosting, TLS, reverse-proxy or managed-laptop guidance |
| Architecture diagrams | None in the repository (the charter is prose) |

## 8. Reproducibility

| Artefact | Reproducible? | Reason |
|---|---|---|
| Application (`index.html`, `server.py`) | Yes | It is the source |
| Vendor scripts | Conditionally | Exact versions are pinned in URLs, but there are no hashes, so byte-identity with what was previously served cannot be proven |
| Docker image | No | Floating base tag; no digest |
| Embedded holiday/default data | No | No generator or source workbook (see register G-04, G-05) |
