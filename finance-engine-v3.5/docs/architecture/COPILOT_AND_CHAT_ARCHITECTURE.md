# Copilot and Chat Architecture

Status: Proposed · Date: 2026-10-04
Parent: `TARGET_ARCHITECTURE.md` · Charter §8–9

## 1. Constraints

* The organisation has **Microsoft 365 Copilot (premium) licences**, **no Copilot API** access, and unknown tenant capabilities (OD-6).
* The app must not transmit data outside the device (OD-2). CSP `connect-src 'none'` makes in-app calls to any AI endpoint impossible by design.
* Ollama is experimental and excluded from releases.
* The chat must be useful with no AI at all.

So the app **never calls an AI service**. Copilot is reached through files and the user's own Copilot session.

## 2. In-app chat: deterministic retrieval

### 2.1 Pipeline

```
question ─► normalise ─► intent match (closed list) ─► scope resolve ─► retrieve records ─► compute (calc/*)
         └─► if no intent: keyword search over entity text fields (names, roles, PO teams, invoice numbers, notes)
answer = { label, statement, values[], citations[], scope, as_of, next_steps[] }
```

| Element | Design |
|---|---|
| Intents | Closed, documented list, for example: remaining budget, burn rate, forecast vs PO, actuals for month, invoices by status, expenses, person allocation, PO validity/rollover, unmatched data, data freshness. Each intent maps to one calc function, so the chat and dashboard always agree |
| Scope | Shown above every answer: "Scope: CR-0061234567 · Year 2026 · All PO teams · data as of 30 Sep 2026 (publication 2026-10-02 09:10)" |
| Labels | **Fact** (directly computed from published records), **Inference** (derived using an assumption, stated, e.g. "assuming current allocation continues"), **Recommendation** (rule-based suggestion, e.g. "rates expire before PO end; review"), **Not found** (no records match; says what was searched), **Needs confirmation** (data conflicts, unmatched rows, migrated schema, stale data) |
| Citations | Every value links to its evidence: entity + record key + `src` (file, sheet, row) + publication ID. Clicking opens the record in a side panel |
| No match | "Not found. I searched: <intents tried>, <fields searched> in scope <…>. Try: …". **No generic or demo text** |
| No demo data | There is no `DEFAULTS` dataset in production. If nothing is published, chat says "No data published yet" |
| Rendering | Answers are built with `textContent`/escaped templates; numbers formatted with the record's currency code |
| Ambiguity | Several matching people or references → list them with CRIDs; no guessing |

### 2.2 What the current Smart mode becomes

The keyword branches in `smartAnswer` (`index.html:2186-2247`) become intents backed by calc functions. CH-02…CH-05 are fixed by design: utilisation uses actual hours, filters always apply, division by zero yields "Not found", and keywords are anchored.

## 3. AI provider boundary

Interface `AnswerProvider` (specification):

| Member | Meaning |
|---|---|
| `id`, `displayName` | For example `none`, `copilot-handoff` |
| `kind` | `local-deterministic` / `user-mediated` / `remote` |
| `dataBoundary` | Text shown to the user before first use, for example "Nothing leaves this device", or "You will paste this text into Microsoft 365 Copilot (inside your organisation's tenant)" |
| `isAvailable(env)` | Checks config flags and capabilities |
| `prepare(question, scope, evidence)` | Returns what will be sent or shown |
| `answer(...)` | For `none`: the deterministic answer. For `copilot-handoff`: a package plus instructions, no answer |
| `labelPolicy` | Remote or user-mediated output is always **Draft** or **Recommendation**, never Fact |

| Provider | Release status | Notes |
|---|---|---|
| `none` (deterministic) | **Default, always on** | §2 |
| `copilot-handoff` | Enabled | §4 V1 |
| `ollama-dev` | **Not shipped**; dev branch only, behind `config.devProviders` | Needs a local HTTP endpoint, which conflicts with CSP. Kept only for experiments |
| `azure-openai` / `foundry` / `copilot-api` | Slot only (V3) | Requires the approvals listed in §4 V3 |

Pasted-back Copilot text can be stored as a **note** on a reference, labelled `Draft (from Copilot, <date>, pasted by <user>)`. It is never merged into facts or calculations.

## 4. Microsoft 365 Copilot levels

### V1: Grounded package, user-mediated (available now)

| Requirement | Design |
|---|---|
| App creates a grounded package | On each publish, and on demand from a reference page: `published/copilot/<CRID>/` containing `factsheet.md`, `factsheet.html`, `facts.json`, `pack-manifest.json` |
| Content | Header (CRID, name, client, data as of, publication ID); key figures as a table (PO value, actuals to date, forecast, remaining, burn rate, invoice status); per-month table; risks list from Recommendation rules; **every figure has a citation code** like `[F12]` that maps to `facts.json` entries with record keys and source file/row; a "Limitations" section (unmatched rows, stale sources); and fixed text: "Figures are facts from the Finance dataset. Anything else is not." |
| Source manifest | `pack-manifest.json`: files, SHA-256, publication ID, app version, schema |
| User intentionally uses it | **Ask Copilot** button: (1) copies a prompt template + `factsheet.md` text to the clipboard, (2) opens Microsoft 365 Copilot Chat in the browser, (3) shows: "Paste into Copilot. Copilot's reply is a draft and is not checked by this app." The user can also attach `factsheet.html` from the synced folder |
| Review stays external | Yes. The app never reads Copilot's responses automatically |
| Returned text | Only as a Draft note (§3) |
| Prompt template (in `copilot/PROMPT_TEMPLATES.md`) | Instructs Copilot to use only the pasted facts, keep citation codes, mark anything else as an assumption, and answer "Not in the data" when unsupported |

Data boundary: the text the user pastes enters Copilot under the organisation's Microsoft 365 enterprise data protection. That is a device-to-tenant transfer, initiated by the user and named in the dialog.

### V2: Agent grounded on published files (target; owner wants shareable or reproducible)

| Requirement | Design |
|---|---|
| Approved exports in a user-selected location | `Continuum/Finance/published/copilot/` (SharePoint, permissioned) |
| Copilot grounds via existing permissions | An **Agent Builder** agent in Microsoft 365 Copilot with that folder (or site) as knowledge. Users only get answers from files they can already open |
| Shareable agent | If the tenant allows agent sharing, the publisher shares the agent with the viewer group |
| Reproducible alternative (OD-8) | `copilot/AGENT_SETUP.md` gives click-by-click steps (name, description, knowledge source = folder URL, starter prompts) and `copilot/AGENT_INSTRUCTIONS.md` holds the exact instruction text. Any user can create an identical personal agent. Both files are versioned with the app, and the agent instructions declare which pack schema version they expect |
| Agent instructions (content outline) | Answer only from fact sheets; quote citation codes and the "data as of" date; say "Not found in published finance data" when absent; label assumptions; never present projections as facts; mention the publication ID |
| Governance explicit | The fact-sheet folder inherits SharePoint permissions; sharing the agent does **not** grant file access; retention per site policy. These are recorded in `docs/operations/COPILOT.md` |
| File formats | Fact sheets are produced as `.md` **and** `.html` (and optionally `.pdf` via jsPDF). Which formats Agent Builder indexes best must be validated (CV-2); `.md` is kept for humans and Git diffs |
| Freshness | Each fact sheet starts with "Data as of …". The agent instructions require stating it. Indexing delay after publish is not under app control and is documented |

### V3: Approved APIs, agents or connectors (future)

| Option | What it needs | Fit |
|---|---|---|
| Copilot Studio agent with actions or SharePoint knowledge | Copilot Studio entitlement/capacity, environment (Power Platform), DLP policy, maker rights | Good next step if V2 needs structured answers |
| Microsoft 365 Copilot connector (Graph connector) for the dataset | Admin to create the connection; schema; hosting of the ingestion job | Heavier; only if many datasets |
| Azure AI Foundry / Azure OpenAI behind an approved endpoint | Azure subscription, Entra app registration, private networking, cost owner, data-retention settings, an **HTTPS-hosted** client or server (not compatible with `file://` + `connect-src 'none'`) | Only if an approved hosted variant of the app exists |
| Microsoft 365 Copilot APIs (Retrieval/Chat) | Licence and preview status per API, app registration, delegated permissions, admin consent | Re-assess when generally available to the tenant |

For each V3 option, record before any build: licensing, preview status, app registration, delegated vs application permissions, admin consent, hosting, data boundary, tenant policy, operational owner, and audit/retention. **No browser automation of Copilot** at any level.

## 5. Validation items

| ID | Check |
|---|---|
| CV-1 | Can users in the tenant create Agent Builder agents with SharePoint folder knowledge? Can they share them? |
| CV-2 | Which fact-sheet format (md/html/pdf/docx) gives the most reliable citation behaviour in the agent |
| CV-3 | Copilot Chat URL reachable from managed Edge, and clipboard paste allowed |
| CV-4 | Indexing latency after a publish (to set the "freshness" wording) |
