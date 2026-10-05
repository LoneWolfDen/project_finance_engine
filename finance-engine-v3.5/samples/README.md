# Sample data

Everything in this folder is **synthetic**: fictitious names, IDs and amounts. Real data never goes into this repository (ADR-017).

## `published/`: a sample publication

The four files are what a publisher's **Publish** step produces (schema v1, `docs/schema/DATASET_V1.md`):

| File | Contents |
|---|---|
| `manifest.json` | Who published what and when, the source file, counts and checks. Marked `"sample": true` |
| `manifest.js` | The same, wrapped as `window.CFE_PUBLISHED_MANIFEST = …;` so a page opened from a file can load it |
| `dataset.json` | The data: two projects, `O-0000001` and `O-0000002` |
| `dataset.js` | The same, wrapped as `window.CFE_PUBLISHED_DATASET = …;` |

They are built from `tests/fixtures/legacy-config-basic.json` by:

```
node tests/support/make-sample-dataset.js
```

Running it again gives byte-identical files; `tests/unit/sample-dataset.test.js` checks this. Do not edit the files by hand.

## Viewing the sample in the new app

1. Copy the folder `samples/published` to `published` in the app folder, so that `published/manifest.js` sits next to `index.html`.
2. Double-click `index.html`.

The `published/` folder is ignored by git (`.gitignore`), so a real publication placed there is never committed. To go back to "no data", delete the `published` folder.
