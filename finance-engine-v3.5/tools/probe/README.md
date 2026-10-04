# Environment probe (BAS-002)

A small test page that shows what your work laptop's browser allows when a page is opened from a synced folder. The new Finance app depends on these answers. The probe takes about 10 minutes and needs no install, Python or terminal.

**It is safe.** The page is not allowed to use the network, so nothing leaves the laptop. It only touches files and folders you pick yourself. Its results contain no file names, folder names, paths, file contents or clipboard text, so you can paste them into the repository.

## What you need

* The work laptop, with Microsoft Edge.
* The synced **Teams channel folder** you intend to use for Continuum (or, if you don't have one yet, any synced SharePoint/Teams folder). Running it from Downloads does **not** answer the main questions.

## Steps

1. Copy the whole `probe` folder (including its `data` subfolder) into the synced Teams channel folder, e.g. `…/Continuum/probe/`. Wait until OneDrive shows it as synced (green tick).
2. In File Explorer (or Finder), double-click `probe/index.html`, or right-click it → **Open with** → **Microsoft Edge**.
3. **If you see an orange box saying "probe.js did not run"**, stop: copy the word `PROBE-JS-BLOCKED` and tell the model which browser and folder you used. That alone is an important result.
4. Under **1. Tell us where you opened this page**, choose the folder type and the OneDrive setting.
5. Under **2.**, click each button in turn:
   * **9. Pick a folder and test write/read:** choose a test folder you own, for example a new empty folder `probe-test` next to the probe. Allow "edit" when Edge asks. The probe writes `probe-write-test.txt` into it.
   * Then **reload the page (F5)** and click **9. After reload: reconnect stored folder**. Allow access if asked. Results of buttons you already clicked, and your drop-down choices, are kept across the reload.
   * **10. Choose a folder to list:** pick the same test folder. Edge may ask "Upload N files to this site?" Click **Upload**: nothing is uploaded anywhere, the page only counts the files.
   * **11. Try the save dialog:** save `probe-save-test.txt` into the test folder.
   * **12. Download probe-download.js:** watch whether Edge shows a warning in the downloads bar.
   * **13. Open second.html…:** a new tab should open showing `#/ref/O-1234567`. Close it and come back.
   * **14. Read the clipboard:** copy any harmless text first (e.g. the word `test`), then click. Allow if asked. Only the number of characters is recorded.

   If a button shows an error, that is a result too. Carry on.
6. Under **3. Record what you saw**, choose what happened for 12 and 13.
   * Optional: open `edge://policy` in a new tab and note in **Notes** whether these are set, and to what value: `DefaultFileSystemReadGuardSetting`, `DefaultFileSystemWriteGuardSetting`, `FileSystemReadBlockedForUrls`, `FileSystemWriteBlockedForUrls`, `URLBlocklist`, `DownloadRestrictions`, `ExemptDomainFileTypePairsFromFileTypeDownloadWarnings`.
7. **Shared-storage check (check 16):** copy the `probe` folder to a **second** place (for example Downloads) and open `index.html` from there too. Check 16 in that copy should say PASS. If it stays N/A, storage is not shared between folders, which is also a useful answer.
8. Go back to the copy in the Teams folder. Click **Copy results**. Paste the text into a message to the model, or into `docs/continuity/PROJECT_STATE.md` under "Probe results". Add the date and which laptop/browser it was.

Optional extra runs: Edge on your Mac, and Chrome. Paste each run separately.

## Reading the results

Every check shows **PASS**, **FAIL** or **N/A** (not run, cancelled, or not applicable), with a reason. FAIL is not a problem with the probe; it tells us which fallback the app must use.

Two red messages in the browser console (F12) are expected and deliberate: one for the blocked inline script (check 6), one for the blocked `fetch` (check 7). Check 17 reports any others.

| Check | Decides |
|---|---|
| 5 | Whether viewers can load `published/dataset.js` automatically (OV-3) |
| 6, 7, 15, 17 | The security rule (CSP) variant: DEC-020 |
| 9a–9c, 10 | Whether the publisher can connect folders and click "Refresh" (OV-1, DEC-026) |
| 11a, 11b, 12 | How publishing saves files: save dialog or downloads (DEC-023, OV-4) |
| 13 | Whether one app can link straight to another from disk (OV-2) |
| 14 | Whether "Paste reference" and the Copilot handoff can use the clipboard (CV-3) |
| 16 | Whether all Continuum apps on the laptop share browser storage (ADR-009) |

## Clean up afterwards

1. In the probe, click **Diagnostics → Clear probe data**. This removes the test values and the `continuum-probe` database from the browser.
2. Delete by hand: the `probe-test` folder (or the files `probe-write-test.txt` and `probe-save-test.txt`), `probe-download.js` in your Downloads folder, and the copied `probe` folders.

## Files

| File | Purpose |
|---|---|
| `index.html` | The probe page. Carries the strict security rule (CSP) the real app will use |
| `probe.js` | All checks (`Probe.run()`, `Probe.report()`) |
| `probe.css` | Styles |
| `second.html` | Target of the link test; shows its own `#…` part |
| `data/probe-data.js` | Stands in for `published/dataset.js` |
