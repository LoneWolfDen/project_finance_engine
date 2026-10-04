# OneDrive and SharePoint Architecture

Status: Proposed · Date: 2026-10-04
Parent: `TARGET_ARCHITECTURE.md` · Charter §6–7

## 1. Principle

OneDrive/SharePoint is the **transport and access-control layer**; the app never talks to Microsoft 365 services directly at V1/V2. Files reach the laptop through the OneDrive sync client, which the corporate laptop already runs. Who may read or write is governed by SharePoint permissions, retention and version history. The app only reads files the user explicitly selected, or files at fixed paths below its own `index.html`.

### Data-boundary notice (shown in the app wherever relevant)

> Files in a synced OneDrive or SharePoint folder are copied to Microsoft 365 by the OneDrive client and are visible to everyone with access to that folder. Saving or publishing here changes who can see the data.

The notice appears in the Publish view (before Publish), in export dialogs (before saving), and in the Registry "New project" dialog.

## 2. Folder roles

| Folder | Location | Readers | Writers | Contents |
|---|---|---|---|---|
| `Finance-Drop/` | Publisher's **personal** OneDrive | Publisher | Publisher (bookmarklet downloads) | Raw PeopleSoft CSV/XLSX |
| `Continuum/Finance/` | Shared library | Viewers | Release owner | App release |
| `Continuum/Finance/published/` | Shared library | Viewers, Copilot agent | Publisher(s) | Dataset, manifest, Copilot packs, history |
| `Continuum/Registry/` | Shared library | All Continuum app users | Users who create projects | One JSON per Continuum Reference |

Set-up (one-off, documented in `docs/operations/SETUP.md`):
1. Site owner creates the library and folders and applies permissions.
2. Each user syncs the library and sets `Continuum/Finance` to **Always keep on this device**.
3. The publisher creates `Finance-Drop/` in their own OneDrive.

Users can create these dedicated folders themselves (OD-10). The browser still needs **one user gesture** to grant folder access (it cannot open a path typed as text). Only the publisher and "New project" creators need that; viewers need nothing.

## 3. Input levels

### V1: User-selected local or synced files (available in all browsers)

| Requirement | Design |
|---|---|
| Standard file picker | `<input type="file" multiple accept=".csv,.xlsx,.xls,.json">` |
| Drag and drop | Drop zone on the Publish view, with the same pipeline |
| Multi-file selection | Yes; each file gets its own provenance record |
| Synced folders | User navigates to the OneDrive/SharePoint folder in the OS picker |
| Folder selection fallback | `<input type="file" webkitdirectory>` (read-only enumeration) |
| Reads only chosen files | Yes; nothing else is touched |
| Preview before retention | Mandatory preview step (DATA_AND_STORAGE §5 step 9); nothing persists until "Keep in draft" |
| No Graph | Correct |

### V2: User-selected folder with user-triggered refresh (Edge/Chrome; policy permitting)

| Requirement | Design |
|---|---|
| Explicit folder selection | `showDirectoryPicker({mode:'read'})` for `Finance-Drop/`; handle stored in IndexedDB |
| Re-permission | On each session, `queryPermission`. If not granted, a **Reconnect** button (user gesture) calls `requestPermission` |
| User-triggered refresh | **Refresh** button only. No polling, no background scanning |
| No unrestricted scanning | Only the chosen folder, non-recursive by default; recursion is an explicit checkbox; only allowed extensions |
| Changed-file preview | List of files with status New / Changed (hash differs) / Unchanged / Missing since last publish, with size, modified date and row count |
| Unsupported browser or blocked by policy | Feature-detect `showDirectoryPicker` and `isSecureContext`; fall back to V1 multi-file selection with a one-line explanation |
| `file://` validation | Behaviour of the File System Access API and persisted handles on a `file://` page must be confirmed in the first slice (validation item OV-1) |

**PeopleSoft source (owner's question).** The app cannot call the PeopleSoft query URL itself:
* CSP `connect-src 'none'` forbids any network request (OD-2).
* Browsers block cross-site requests without PeopleSoft-side CORS.
* It would need PeopleSoft credentials handling.

The supported path stays **bookmarklet → download into `Finance-Drop/` → Refresh**. An optional *tenant-internal* automation can come later, with owner and IT approval and without app changes: a PeopleSoft scheduled query delivers the file by email, and a Power Automate flow saves the attachment into `Finance-Drop/`.

### V3: Approved Microsoft picker or Graph integration (future; blocked today)

| Prerequisite | Detail |
|---|---|
| HTTPS origin | Entra redirect URIs and the Microsoft File Picker need an HTTPS origin. **Not available under `file://` (OD-2)** |
| Entra app registration | Single-page application; authorisation code + PKCE (MSAL.js vendored) |
| Delegated access, least privilege | Picker-scoped access (`Files.Read` / `Files.ReadWrite` on user-picked items) or `Sites.Selected` for the single Continuum site (admin-granted) |
| Tenant prerequisites | Admin consent policy, conditional access compliance, retention labels, audit (Purview) |
| Data-boundary notice | Same notice, plus naming the tenant and site |
| Integration point | Replaces `continuum-core/folders.js` and `store/publisher.js` transport only. Calc, views and data schema are unchanged |

No V3 code is written until those approvals exist (charter §6 V3).

## 4. Cross-application handoff (Continuum World)

| Scenario | Mechanism | Status |
|---|---|---|
| Continuum app (also opened from the synced library as `file://`) → Finance | Relative link `../Finance/index.html#/ref/CR-…`. Same scheme and no network, so it opens directly | Supported. Validate that the browser allows `file://` → `file://` navigation (OV-2) |
| Continuum app hosted on a corporate **web** URL (`https://…`) → Finance | Browsers block web pages from opening `file://` links. Fallback: a **Copy reference** button in the web app, then **Paste reference** in Finance (top bar), which reads the clipboard on user click and routes to `#/ref/<CRID>` | Supported fallback; owner to confirm Continuum's hosting (open question) |
| Finance → other Continuum apps | Each reference page shows links built from `Registry` `links.other` and a per-deployment app map (`published/manifest.js` `deployment.apps`) | Supported |
| Unknown reference | "CR-… is not in this dataset (as of …). It exists in the Registry as '<name>' but has no finance links yet." Or: "not found in the Registry" | Never falls back to the portfolio view |

The CRID contract and `ref.js` are identical in every app (DATA_AND_STORAGE §2), so a link built by one app is understood by all.

## 5. Output levels

### V1: Download and user-save

* Exports: XLSX, PDF, PPTX, CSV, JSON backup, Copilot pack (Markdown + HTML + manifest).
* The browser save dialog lets the user choose the destination (synced or not). The data-boundary notice is shown in the app's export dialog **before** triggering the download.
* File names: `<CRID or Portfolio>_<report>_<data-as-of>_<publication-id-short>.<ext>`.
* Every export embeds a provenance footer: data as of, publication ID, app version, filters applied, row truncation notices, and the optional author attribution (on by default; switchable).

### V2: Browser-supported save workflow (Edge/Chrome)

| Requirement | Design |
|---|---|
| User chooses destination | `showSaveFilePicker` (single files) or the connected `Finance/` folder handle (publish) |
| No silent background upload | All writes are user-initiated (button press). The OneDrive client syncs afterwards, which the notice explains |
| Overwrite requires confirmation | Before replacing an existing file the dialog shows existing vs new (modified time, size, publication ID) |
| Manifest, version, checksum | Every publish writes `manifest.json` with SHA-256; Copilot packs carry `pack-manifest.json`; single-file exports include a sidecar `*.manifest.json` when the user ticks "Include manifest" (default on for Copilot packs) |
| Conflict handling | Before writing, re-read the target's `publication_id`. If it changed since the draft started (another publisher), stop and show both |
| Fallback | Download (V1) |

### V3: Direct Graph write (future)

Explicit destination picker (no hard-coded drive or site), delegated permissions, `If-Match` eTag conflict handling, version history via SharePoint, audit via Purview, revocation through the Entra consent page, and rollback via version restore. Same prerequisites as input V3.

## 6. Validation items for the first migration slice

| ID | Check | Fallback if it fails |
|---|---|---|
| OV-1 | `showDirectoryPicker` + persisted handle on `file://` in managed Edge | V1 multi-file + downloads |
| OV-2 | `file://` → `file://` link navigation in Edge (Windows and macOS) | Paste-reference flow |
| OV-3 | `<script src="published/dataset.js">` loads from a OneDrive-synced, Files-On-Demand folder | "Open dataset.json" picker |
| OV-4 | Edge download warnings for `.js` files (fallback publish path) | Publish only via File System Access (Edge/Chrome publisher requirement) |
| OV-5 | OneDrive conflict-copy naming on simultaneous registry edits | Conflict detector pattern update |
| OV-6 | Edge group policies on the managed laptop (`DefaultFileSystemReadGuardSetting`, `DefaultFileSystemWriteGuardSetting`, file-URL restrictions) | Document the IT request, or use V1 |
