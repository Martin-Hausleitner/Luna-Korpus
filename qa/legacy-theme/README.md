# Luna Korpus — QA evidence

Visual verdict: **LOCAL PASS / PAGES PASS** — requested theme, desktop launcher and screenshot rubric. All required local images and the deployed desktop/CAD captures were visually inspected.

## Build identity

- Upstream Aster commit: `a7cca00c03837f8f94e2f6b1cccc2f82830e32fc`.
- Final runtime SHA-256: `557d2d02d507bf52bff7c40a2bc13b6488fb428fa0d0aa46b421abd57f463049`.
- `Luna-Korpus.html`, `index.html` and the downloaded live Pages root were byte-identical when tested.
- Pages: https://martin-hausleitner.github.io/Luna-Korpus/
- Real Chrome on macOS; new, isolated browser contexts. Required screenshots: 1600 × 1000. Additional file-protocol screenshots: 1440 × 900.
- Two bounded visual/layout repair iterations. No application implementation or catalog was rewritten.

## Required captures

| File | Observed content / check |
|---|---|
| `01-desktop.png` | Windows-profile desktop, 16 original application shortcuts plus the real tip file; German labels with original names in parentheses; EDV/Hausleitner/LUNA KORPUS. |
| `02-start.png` | Büro, Werkstatt, Planung and System; original registered app launchers and the real Notepad tip file. |
| `03-explorer.png` | Original File Explorer, native Home view, blue focused caption. Only the desktop shortcut's initial location changed; Explorer implementation is unchanged. |
| `04-tabelle.png` | Actual hosted Gridline, populated upstream sample workbook and formula bar; blue Aster window chrome. Sample revenue data belongs to Gridline's demo, not EDV Hausleitner. |
| `05-korpus.png` | Actual hosted Formalyth, its upstream bearing-housing sample model, real WebGPU viewport and feature tree. Not a Luna cabinet generator. |
| `06-zeichnung.png` | Actual hosted Draftline, upstream Meridian House DXF sample, drawing tools and layers. |
| `07-multiwindow.png` | Three real Aster windows: Explorer, Notepad and Calculator. |
| `08-themes.png` | Original Settings → Themes, Luna Korpus selected; Windows, macOS and Ubuntu presets retained. |
| `09-all-apps.png` | Start → Alle Apps and entry to all 84 categorized web apps; non-desktop applications remain available. |
| `live/01-desktop.png` | Fresh browser navigation to deployed Pages, HTTP 200, Windows / Luna Korpus / accent #0078c8. |
| `live/05-korpus.png` | Double-click on the deployed desktop launches the real https://wieslawsoltes.github.io/Formalyth/ application. |

## Additional actual checks

**Source preservation:** `source-integrity.json` compares 86 protected source files against upstream, including app implementations, the reviewed catalog, window manager, renderer and theme engine. All are byte-identical. App display titles/keywords are changed at registration metadata level by the added overlay, never by replacing a mount function.

**Upstream model tests:** `upstream-model-tests.txt`: 32 passed, 0 failed. Run from the patched upstream checkout with:

```sh
node --test tests/themes/models.cjs tests/web-apps/catalog.cjs
```

**Entire live catalog:** `live-catalog-results.json`: 84 / 84 actual remote app interfaces passed Aster's bundled `tests/web-apps/browser.py --live` startup test. This run did not use inert fixtures or substitute app documents. The registry retained 113 entries in total. App Center's original Built-in apps tab listed 20 visible built-in applications, including Mines, Terminal and Win32 Lab.

**Important scope:** the catalog run logged eight sandbox/service-worker page errors, preserved verbatim in that JSON. All 84 startup checks passed despite those errors. This is not certification of every editing operation, external service, offline cache, sign-in, peripheral permission or machine integration of every app. No security permissions were weakened to hide errors.

**Real editing:** `15-gridline-calculation.png`: using Gridline's actual cell-address and formula controls in a disposable browser context, cell L30 accepted `=32*5` and reported `160`. The default sample workbook was not replaced by a custom imitation.

**Portable theme:** `12-stock-import.png`: the generated `.astertheme` was selected through the real Import theme file picker of unmodified https://wieslawsoltes.github.io/Aster/ and applied. Observed result: title Luna Korpus, profile windows, accent #0078c8, one embedded wallpaper asset. The stock import intentionally does not install the separate Luna desktop layout, custom CSS or Start logo.

**Local file use:** `13-file-protocol.png` opens the actual single file through `file://`. `14-file-gridline.png` then launches the real Gridline website from that file. Network was available for the external catalog app; no offline catalog claim is made.

**Native services:** `10-tipps.png` shows the real virtual file in original Notepad. `11-app-center.png` shows the actual Built-in apps tab. The desktop renderer reported `WebGPU` during the App Center check.

## Evidence integrity

`release-checks.json` records screenshot dimensions and SHA-256 digests. `../SHA256SUMS` records runtime/theme digests. The source overlay is reproducible using the pinned upstream commit, `../luna-overlay.patch` and `../theme-source/`; see the root README.

Theme versus WAWI: Luna supplies appearance, defaults and launcher organization only. Licensed WAWI remains the company's business/stock/order system. Formalyth and Gridline are their original independent programs, not implementations of WAWI or proof of CNC integration.
