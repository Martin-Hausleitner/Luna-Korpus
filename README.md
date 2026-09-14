Skin + German labels for Aster.  
Every application is the original HTML from Aster or a vendored wieslawsoltes repo.  
Luna.html-from-scratch is rejected.  
Not licensed WAWI. MIT for Luna integration and Aster; upstream applications and dependencies retain their own licenses.

# LUNA Korpus · EDV Hausleitner

**Holztechnik · Korpus · Stückliste**

[Open the published desktop](https://martin-hausleitner.github.io/Luna-Korpus/) · [Original-app manifest](UPSTREAM-MANIFEST.json) · [Browser QA](qa/REPORT.md) · [Screenshots](qa/)

This is the real **Aster Desktop**, with its Windows profile selected, a Luna theme, German launcher/caption labels and locally installed original applications. It is not a new desktop, cabinet engine, spreadsheet, file manager or calendar. Aster's Start, taskbar, right-hand caption controls, Snap, Alt+Tab, File Explorer, Calendar and App Center remain its original implementations.

## Run the complete delivery

Download the full repository/archive, keep the `Apps/` directory, then run:

```sh
python3 serve.py
```

Open `http://127.0.0.1:8080/`. The server binds to localhost only. No npm or frontend build is needed to run the delivery. GitHub Pages serves the same files over HTTPS.

**Important packaging distinction:** `Luna-Korpus.html` is the single-file themed Aster build. The 19 original entry HTMLs are also embedded for installation in Aster's virtual `/Apps` folder. **13 upstream projects supply true portable HTMLs. Six supply multi-file static web apps instead:** Folio, PlanforgeReview, VeyraWorkspace, Velsign, Formalyth and StrataForge. Their original entry HTMLs and complete runtime resources are vendored under `Apps/resources/<Repo>/`. These six require the delivered resource folders and HTTP/HTTPS hosting. Downloading just the shell HTML is not a fully offline 19-application distribution. No replacement single-file toy was invented to conceal this distinction.

## Exact Aster base and reproducible build

Upstream: https://github.com/wieslawsoltes/Aster  
Pinned commit: `a7cca00c03837f8f94e2f6b1cccc2f82830e32fc`  
Original builder SHA-256: `3a3915ac1dd94f631661762527f0ecf670e33d333ca93a3b15bc7af28d5d5d71`

```sh
python3 build.py
python3 tools/verify_upstream.py
```

The root wrapper invokes the **unchanged** `theme-source/build.py`, producing `Luna-Korpus.html`; `index.html` is a byte-identical copy for Pages. The fresh Aster source is in `theme-source/`. The previous build's CSS was not used.

`SOURCE-INTEGRITY.json` compares all original Aster `src/` files. 80 remain byte-identical. The seven changed source files contain launcher metadata, About text, the reviewed-local-app URL hook, the isolated IndexedDB name, caption labels and fresh-boot behavior. `index.html` includes the extension. New Luna files contain theme declarations, original HTML payloads and integration only. File Explorer (`apps-files.js`), Calendar (`apps-tools.js`), renderer, theme engine, application library and creative-app engines remain byte-identical to this upstream snapshot. `luna-overlay.patch` records only the changes against that fresh base; the four new files are separately readable.

## App Store and desktop

The complete original **84-app catalog** remains in App Store (App Center), together with **20 visible Aster built-ins**. The 19 mapped apps are additionally installed through Aster's actual HTML app library. They are not substitutes for, or deletions from, the catalog. Mines and Win32 remain in the built-in store view and are not pinned. Every visible launcher has a `German (Original)` name; unmapped catalog applications use `OriginalTitle (Repo)`.

The desktop contains exactly the requested 13 application shortcuts: Explorer, Dateien, Tabelle, Planung, Kalender, Mail, Akte, Zeichnung, CAD, Korpus, Material, Aufmaß and Einstellungen, each followed by its original name in parentheses. Other applications remain available in the store. The original app interiors retain upstream branding and behavior; only Aster chrome/launcher/caption labels are themed.

## Every local HTML and its upstream

All 19 `Apps/*.html` files are byte-identical to the copied upstream file or output of that repo's own build tool. Exact upstream commits, input paths, byte counts and SHA-256 values are in `UPSTREAM-MANIFEST.json`. Runtime resources have an additional `RESOURCE-MANIFEST.json`.

| Launcher | Local file | Official repository | Original entry/output | Packaging |
|---|---|---|---|---|
| Tabelle (Gridline) | [`Apps/tabelle.html`](Apps/tabelle.html) | [Gridline](https://github.com/wieslawsoltes/Gridline) | `dist/index.html` | Original portable HTML |
| Planung (MeridianPlan) | [`Apps/planung.html`](Apps/planung.html) | [MeridianPlan](https://github.com/wieslawsoltes/MeridianPlan) | `dist/meridian-plan.html` | Original portable HTML |
| Office (MeridianOffice) | [`Apps/office.html`](Apps/office.html) | [MeridianOffice](https://github.com/wieslawsoltes/MeridianOffice) | `dist/meridian-office.html` | Original portable HTML |
| Dateien (TwinForge) | [`Apps/dateien.html`](Apps/dateien.html) | [TwinForge](https://github.com/wieslawsoltes/TwinForge) | `TwinForge.html` | Original portable HTML |
| Akte (Folio) | [`Apps/akte.html`](Apps/akte.html) | [Folio](https://github.com/wieslawsoltes/Folio) | `pages-dist/index.html` | Original HTML + local resources |
| PDF (FolioPro) | [`Apps/pdf.html`](Apps/pdf.html) | [FolioPro](https://github.com/wieslawsoltes/FolioPro) | `dist/folio-pro.html` | Original portable HTML |
| Mail (Quire) | [`Apps/mail.html`](Apps/mail.html) | [Quire](https://github.com/wieslawsoltes/Quire) | `Quire.html` | Original portable HTML |
| Text (NotepadXP) | [`Apps/text.html`](Apps/text.html) | [NotepadXP](https://github.com/wieslawsoltes/NotepadXP) | `NotepadXP.html` | Original portable HTML |
| Auswertung (LatticeAnalytics) | [`Apps/auswertung.html`](Apps/auswertung.html) | [LatticeAnalytics](https://github.com/wieslawsoltes/LatticeAnalytics) | `dist/lattice.html` | Original portable HTML |
| Rechenblatt (AxiomWorksheet) | [`Apps/rechenblatt.html`](Apps/rechenblatt.html) | [AxiomWorksheet](https://github.com/wieslawsoltes/AxiomWorksheet) | `dist/index.html` | Original portable HTML |
| Zeichnung (Draftline) | [`Apps/zeichnung.html`](Apps/zeichnung.html) | [Draftline](https://github.com/wieslawsoltes/Draftline) | `Draftline.html` | Original portable HTML |
| CAD (KestrelCAD) | [`Apps/cad.html`](Apps/cad.html) | [KestrelCAD](https://github.com/wieslawsoltes/KestrelCAD) | `Kestrel-CAD.html` | Original portable HTML |
| Aufmaß (PlanforgeReview) | [`Apps/aufmass.html`](Apps/aufmass.html) | [PlanforgeReview](https://github.com/wieslawsoltes/PlanforgeReview) | `dist/index.html` | Original HTML + local resources |
| Tafel (Orivane) | [`Apps/tafel.html`](Apps/tafel.html) | [Orivane](https://github.com/wieslawsoltes/Orivane) | `dist/Orivane.html` | Original portable HTML |
| Gespräch (Veyra Workspace) | [`Apps/gespraech.html`](Apps/gespraech.html) | [VeyraWorkspace](https://github.com/wieslawsoltes/VeyraWorkspace) | `dist/index.html` | Original HTML + local resources |
| Signatur (Velsign) | [`Apps/signatur.html`](Apps/signatur.html) | [Velsign](https://github.com/wieslawsoltes/Velsign) | `dist-pages/index.html` | Original HTML + local resources |
| Korpus (Formalyth) | [`Apps/korpus.html`](Apps/korpus.html) | [Formalyth](https://github.com/wieslawsoltes/Formalyth) | `_site/index.html` | Original HTML + local resources |
| Material (StrataForge) | [`Apps/material.html`](Apps/material.html) | [StrataForge](https://github.com/wieslawsoltes/StrataForge) | `index.html` | Original HTML + local resources |
| Modell (Avolith Studio) | [`Apps/modell.html`](Apps/modell.html) | [AvolithStudio](https://github.com/wieslawsoltes/AvolithStudio) | `dist/Avolith-Studio.html` | Original portable HTML |

### Gridline, not a clone

`Apps/tabelle.html` is the original 233,169-byte Gridline portable HTML. SHA-256: `31aa5e1ed31ba6e428ffd86c7ed4c734b71b3589d89a8f5d909b68e037c2d6de`. The browser tests hash the HTML actually loaded by every application iframe and compare it with its original file. Gridline's ribbon, formula input and sheet tabs are checked as real visible DOM. There is no homemade 30×40 spreadsheet, no replacement calculation engine, and no added “keine XLSX” disclaimer.

**Tabelle == Gridline original HTML: YES**

## Theme and trust model

`Luna-Korpus.astertheme` is an Aster-native theme export. Luna is a first-class preset alongside the original Windows, macOS and Ubuntu presets. Luna uses Windows profile, blue `#0078C8` focused captions, `#1C1C1C` taskbar and `#0B3A5B` background. Only Aster chrome receives these rules; no styles are injected into app documents. The decorative wallpaper is an embedded PNG. No installed system font files are distributed.

Aster's normal arbitrary-HTML importer keeps its opaque-origin sandbox. Only the 19 bundled original files with matching SHA-256 are launched using Aster's existing reviewed-catalog host, so their own browser storage, workers and WebGPU are not broken by a replacement sandbox. Modified imported files fall back to the normal HTML importer. Reviewed app frames have same-origin capability; this is **not a security isolation boundary**. Use an isolated browser profile for untrusted or experimental work. The shell's IndexedDB has its own `luna-korpus-aster-desktop` namespace, without touching another Aster project's stored data.

## Functional scope: upstream means upstream

This is an unofficial Aster skin and original-app distribution, **not licensed WAWI and not a production ERP**. Original sample projects and demo data are not EDV Hausleitner customer records. The requested name **Mail (Quire)** launches real Quire: upstream Quire is a document editor, not an added IMAP/SMTP service. Formalyth remains its original design/manufacturing app, not a new joinery-specific cabinet generator. Static Veyra, Folio and Velsign editions do not acquire collaboration/signing servers from being installed in a desktop. Avolith's official portable output is its faceted offline edition. External integrations, authentication, native file access, WebGPU and production workflows retain the requirements and limitations of their upstream projects. None are represented as completed business integrations by these smoke tests.

## QA and attribution

Unmodified Aster baseline: **13/13 catalog tests and 54/54 browser smoke checks**. The baseline browser harness's occupied localhost port was changed in memory from 8766 to 18766; its test logic and application source were not changed. Logs are in `qa/upstream/`.

This delivery's local integration QA: **84/84 checks passed** at 1920×1080 in real Chromium/Chrome. `qa/results.json` includes per-app executed HTML hashes, frame titles, element counts, actual Snap geometry, storage checks and all request errors. Public Pages is tested separately; see `qa/live/results.json` once published. This is smoke/integration QA, not certification of every upstream feature.

Copyright and credit remain with Aster and each linked upstream repository. Original licenses/notices are in `LICENSE`, `theme-source/LICENSE`, `theme-source/third-party/` and `licenses/<Repo>/`; vendored dependency notices remain with their resources. Some upstream snapshots contain no top-level license; their `SOURCE-NOTICE.md` states that absence instead of inventing an MIT grant. The Luna integration is MIT. Aster reference: https://wieslawsoltes.github.io/Aster/ .
