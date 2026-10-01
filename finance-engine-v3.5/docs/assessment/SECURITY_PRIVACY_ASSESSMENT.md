# Security and Privacy Assessment

Assessment date: 2026-10-01 · Baseline commit `5d453d1` · Target: `finance-engine-v3.5/` (v1–v3 noted where they share the issue)
Mode: read-only. No exploit was run and the server was not started. Findings come from code reading unless stated otherwise.

Severity scale: **BLOCKER** (must be resolved before any use with real corporate data) · **HIGH** · **MEDIUM** · **LOW**.

## 1. Threat boundaries

| Boundary | Exists today? | Evidence |
|---|---|---|
| Browser tab ↔ local Python server (same machine) | Yes | `fetch('/api/...')` `index.html:166,175,182,2271` |
| **Other machines on the network ↔ local server** | **Yes (unintended)** | `HTTPServer(("", PORT), …)` binds every interface (`server.py:154`) |
| **Any website open in the browser ↔ local server** | **Yes (unintended)** | `Access-Control-Allow-Origin: *` on every API response and preflight (`server.py:74,141-143`) |
| Browser ↔ public CDNs (jsDelivr, cdnjs, GitHub via jsDelivr) | Yes, on every page load | `index.html:4-9` |
| Local server ↔ Ollama (default localhost:11434; configurable) | Yes, Ollama mode only | `server.py:23,112-117` |
| Browser ↔ arbitrary third-party URL (iframe) | Yes, Copilot mode only | `index.html:2175` |
| Device ↔ Microsoft 365 tenant | No direct path. Only indirectly, if the user saves an export into a synced folder | §6 |
| Device ↔ approved corporate API | No | — |

## 2. Data flow

```
User files (CSV/JSON/XLSX timesheets, resource rules, PO data)
   │  FileReader / XLSX.read (xlsx 0.18.5 from CDN)
   ▼
In-memory _cache ──► localStorage pf_working / pf_master / pf_scenarios (plaintext, per-origin)
   │                     └─ scenarios = full copies, incl. raw timesheets
   ├─► POST /api/config, /api/config/master ──► SQLite finance_engine.db (plaintext, app dir)
   ├─► innerHTML rendering (unescaped)
   ├─► Downloads: .xlsx .pdf .pptx .json (user-chosen location)
   └─► Ollama mode: summary + 8 resource names/teams/rates ──► server ──► OLLAMA_URL
```

**Sensitive data categories handled:** employee names and employee IDs, roles, locations, bill rates (commercially sensitive), daily timesheet hours, PO numbers and values, invoice amounts and status, and expense claims with descriptions. Treat this as **personal data plus commercially confidential data**.

## 3. Findings

| ID | Severity | Area | Path / symbol | Evidence | Risk | Confidence | Runtime validation |
|---|---|---|---|---|---|---|---|
| SEC-01 | **BLOCKER** | Network exposure, authentication | `server.py:154` `HTTPServer(("", PORT), Handler)`; no auth anywhere in `Handler` | Binds 0.0.0.0. `GET /api/config` and `/api/config/master` return all data. `POST` overwrites it. `/api/chat` relays to Ollama | Anyone on the same network (office Wi-Fi, VPN segment, hotel) can read or replace all finance and employee data and use the LLM proxy. Docker `-p 3005:3005` also publishes on all host interfaces | High | Yes (confirm the host firewall does not block it) |
| SEC-02 | **BLOCKER** | CORS / CSRF / DNS rebinding | `server.py:74` `Access-Control-Allow-Origin: *`; `server.py:139-144` preflight allows any origin; no `Origin`/`Host` check; `POST` does not check `Content-Type` (`server.py:125-135`) | Any web page the user visits while the server runs can `fetch('http://localhost:3005/api/config')` and **read** the response (wildcard ACAO), and can **overwrite** it with POST. A hostile DNS-rebinding page can do the same, with no Host-header validation | Silent exfiltration and tampering of corporate data from the open web; tampering also delivers a stored-XSS payload (SEC-03) | High | Yes (proof of concept in an isolated environment) |
| SEC-03 | HIGH | XSS (stored/DOM) | Throughout `index.html`, e.g. `439,444,452` (PO team values inside `onclick` and attribute strings), `568,656,661,672,676` (team, invoice number, notes), `705` (`addResRowTo('${tid}','${team}')`), `709` (resource fields into `contenteditable`), `1185,1216` (timesheet `Empl Name`), `1233` (expense `desc`), `1663`, `1927` (config JSON inside `<textarea>`: a value containing `</textarea>` breaks out), `924,933` (scenario names; only `'` is escaped), `1473,1548` (validation messages contain raw cell values) | No HTML encoding anywhere. Every imported file field, server-stored config field and scenario name is interpolated into `innerHTML` | A crafted CSV/XLSX/JSON, or a config injected through SEC-02, runs script in the app origin. That script can read all `localStorage` and the server API | High | Yes |
| SEC-04 | HIGH | Third-party scripts / supply chain | `index.html:4-9` | Six scripts from `cdn.jsdelivr.net` and `cdnjs.cloudflare.com` with **no `integrity` (SRI)** and no `crossorigin`. `cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@3.12.0/...` serves from a GitHub tag, not an immutable npm release | A compromised or altered CDN response gets full access to the data. Every page load reveals usage to CDN operators (IP, timing, Referer) | High | No |
| SEC-05 | HIGH | Unsafe HTML from LLM and user input | `index.html:2254` (user message), `2261` (Smart answer contains data values), `2273` (`err.error` from server), `2274` (`data.content` from Ollama) | Rendered with `innerHTML +=` | Prompt injection through data fields (for example a resource name) can make the model emit HTML or script, which then executes | High | Yes |
| SEC-06 | HIGH | Vulnerable dependency | `index.html:6` `xlsx@0.18.5` | SheetJS 0.18.5 is affected by published advisories for **prototype pollution when reading crafted files (CVE-2023-30533, fixed in 0.19.3)** and **ReDoS (CVE-2024-22363, fixed in 0.20.2)**. SheetJS no longer publishes fixes to the npm registry, so the jsDelivr `npm/xlsx` path cannot be upgraded in place. *Advisory details come from assessor knowledge and must be confirmed against a live advisory database* | The app's core purpose is parsing user-supplied workbooks | Medium | Yes (advisory check) |
| SEC-07 | MEDIUM | Vulnerable dependency | `index.html:7` `jspdf@2.5.1` | Later jsPDF advisories (for example CVE-2025-29907 ReDoS and CVE-2025-57810 DoS in image handling) affect versions before 3.0.x. *To be confirmed* | Exploitability is low here because images come from the app's own canvases | Medium | Yes (advisory check) |
| SEC-08 | MEDIUM | Credential-like control | `index.html:132` `const MASTER_PIN='1234'; // Change this PIN`; `checkPin` `2079-2082` | PIN is shipped to every client and committed in all four versions and all history. UI says "Protects your data" (`1409`) | False assurance. Not a security boundary | High | No |
| SEC-09 | MEDIUM | Outbound data to AI | `server.py:23` `OLLAMA_URL` env; `index.html:2268` context | Default is localhost, but nothing shows the user where data goes. Setting `OLLAMA_URL` to a remote host silently sends resource names, teams and rates off-device. Exposure via SEC-01/02 lets third parties use the proxy | Unlabelled boundary change (charter §4) | High | Yes |
| SEC-10 | MEDIUM | Embedded third-party content | `index.html:2156,2175,2180-2181` | `<iframe>` without `sandbox`, `allow` or `referrerpolicy`; any URL scheme accepted from `prompt()` and persisted in `localStorage` `pf_copilot_url` | A pasted malicious or phishing URL appears inside the trusted app frame. With XSS, an attacker could set the URL | Medium | No |
| SEC-11 | MEDIUM | Availability / DoS | `server.py:103-104,126-127` (unbounded `Content-Length` read); `server.py:154` single-threaded `HTTPServer`; `urlopen(..., timeout=60)` | One slow Ollama call blocks all API requests for up to 60 s. Large bodies are read fully into memory | Local DoS; saves blocked during chat | High | Yes |
| SEC-12 | MEDIUM | Data at rest | `localStorage` keys (`index.html:155,950`); `finance_engine.db` (`server.py:28`) | Plaintext and unencrypted, with no retention or expiry. Scenarios duplicate full datasets. The DB sits beside the source code, so it can be copied, zipped or committed by mistake (mitigated by `*.db` in `.gitignore`) | Personal data persists indefinitely on a shared or managed laptop | High | No |
| SEC-13 | MEDIUM | CSP / security headers | No CSP meta tag. Server sends only `Content-Type`, `Cache-Control` and ACAO | No `Content-Security-Policy`, `X-Content-Type-Options`, `frame-ancestors`/`X-Frame-Options` or `Referrer-Policy`. The app relies on inline scripts and inline handlers, so a strict CSP is impossible without refactoring | Nothing limits XSS impact. The app itself can be framed (clickjacking of the PIN/reset UI) | High | No |
| SEC-14 | MEDIUM | Demo data provenance | `index.html:110-131` (`DEFAULTS`), `192` (comment "from Burndown_Template_v4.7.xlsx") | Names are anonymised (`Resource_1`…), but `empl_id` values are realistic 7-digit numbers (8468530, 8412415, 8261003, 8433231, 8217421, 7821305) alongside role/rate/date combinations and a PO number. The holiday table comes from a named internal template | If the values are real, employee identifiers and commercial rates are in Git history. **Needs confirmation by the owner** | Low (cannot verify) | n/a |
| SEC-15 | MEDIUM | Container hardening | `finance-engine-v3.5/Dockerfile` | Runs as root. Base `python:3.11-slim` is not digest-pinned. `EXPOSE 8889` while the app listens on 3005. Fixtures are copied into the image | Weak supply-chain hygiene | High | No |
| SEC-16 | LOW | Error disclosure | `server.py:122-123,131` | `str(e)` returned to client (JSON decode messages, urllib errors that may include `OLLAMA_URL`) | Minor information leak | High | No |
| SEC-17 | LOW | Logging / audit | `server.py:146-147` suppresses all access logs; `index.html:2076` logs dedup counts only | **Positive:** no content, credentials or tokens are logged. **Negative:** no audit trail of who overwrote data or when (only `updated_at` on the single row) | Unobservable failures and tampering | High | No |
| SEC-18 | LOW | Personal attribution in deliverables | `index.html:1770,1791,1839,1953`; header `105` | Every exported corporate report carries "Crafted by Vamsi Yedlapalli \| github.com/LoneWolfDen" | Personal data and branding in corporate artefacts; may conflict with corporate document policy | High | No |
| SEC-19 | LOW | Insecure HTML patterns | Inline `onclick` everywhere; `window.__parsedSolutionResources` global (`1669`) | Blocks CSP adoption; any script can tamper with state | — | High | No |
| SEC-20 | LOW | Git content | History scan (all branches) | Only secret-like value is `MASTER_PIN='1234'`. No API keys, tokens, passwords, `.env` files or certificates. Historical `finance_engine.db` blobs (`db120c4`, `cac8e1f`) **verified empty** (table `config`, 0 rows). Both `.gitignore` and `README.md` begin with a UTF-8 BOM (harmless) | Low | High | No |
| — | Not found | Path traversal | `server.py:91-97` | Every non-API GET returns `index.html`; no filesystem path built from input. **No traversal risk** | — | High | No |
| — | Not found | Source maps / debug artefacts | Repository-wide | None present | — | High | No |
| — | Not found | Analytics / telemetry | `index.html` | No analytics, beacons or third-party fonts | — | High | No |
| — | Not found | Credentials captured by automation | Repository-wide | No browser automation, no login flows | — | High | No |

## 4. External requests inventory

| Request | Trigger | Destination | Data sent | User-visible? |
|---|---|---|---|---|
| Chart.js 4.4.0 | Page load | `cdn.jsdelivr.net` | IP, UA, Referer (`http://localhost:3005/`) | No |
| chartjs-plugin-datalabels 2.2.0 | Page load | `cdn.jsdelivr.net` | same | No |
| xlsx 0.18.5 | Page load | `cdn.jsdelivr.net` | same | No |
| jsPDF 2.5.1 | Page load | `cdnjs.cloudflare.com` | same | No |
| jspdf-autotable 3.8.2 | Page load | `cdnjs.cloudflare.com` | same | No |
| PptxGenJS 3.12.0 | Page load | `cdn.jsdelivr.net/gh/...` | same | No |
| `/api/config`, `/api/config/master` | Load and every save | Local server | Full config incl. raw timesheets | No (silent) |
| `/api/chat` → Ollama | Ollama mode send | Local server → `OLLAMA_URL` | Summary + 8 resource names/teams/rates + user prompt | Partially (mode label only) |
| iframe | Copilot mode | User-supplied URL | Browser cookies for that site; no app data | Partially |
| `github.com/LoneWolfDen` link | User click | GitHub | Referer | Yes |

## 5. Storage

See CURRENT_IMPLEMENTATION_ASSESSMENT §4. Security-relevant points:

* No API keys or tokens are stored in `localStorage`, which complies with charter §4. `pf_copilot_url` is a URL, not a secret.
* `localStorage` is shared by every script in the origin, including CDN scripts and XSS payloads.
* The SQLite file has default file permissions, sits in the application directory, and in Docker exists only inside the container unless a volume is mounted.

## 6. Authentication and authorisation

None. There are no user identities, sessions, CSRF tokens or role separation between "working" and "master" (any caller may POST `/api/config/master`, which bypasses the client PIN). No Entra/MSAL code exists, so there are no tokens to mishandle.

## 7. Backups

The only user backup is Export Full Config (JSON). It is incomplete: it omits `raw_actuals`, `actuals_by_project`, master and scenarios. It is unversioned and has no checksum. Import is unvalidated. The SQLite DB has no backup or rotation. "Master" is a second mutable copy, not a backup (it is overwritten by Save as Master and bypassable via the API).

## 8. Destructive operations (security view)

Unauthenticated remote overwrite via SEC-01/02 is the most severe destructive path. Local destructive paths D-01…D-10 are listed in CURRENT_IMPLEMENTATION_ASSESSMENT §4. None are logged or reversible.

## 9. Severity summary

| Severity | Count | IDs |
|---|---|---|
| BLOCKER | 2 | SEC-01, SEC-02 |
| HIGH | 4 | SEC-03, SEC-04, SEC-05, SEC-06 |
| MEDIUM | 9 | SEC-07 … SEC-15 |
| LOW | 5 | SEC-16 … SEC-20 |

The same server pattern (bind all interfaces, wildcard CORS) exists in `finance-engine-v2/server.py` and `finance-engine-v3/server.py`. `finance-engine-v1/server.py` serves only HTML, but also binds all interfaces. The `MASTER_PIN` and `innerHTML` patterns exist in all four versions.
