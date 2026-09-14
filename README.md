Skin + German labels for Aster.
Every application is the original HTML from Aster or a vendored wieslawsoltes repo.
Luna.html-from-scratch is rejected.
Not licensed WAWI. MIT for the Luna integration and Aster; each upstream application retains its own notices.

# LUNA KORPUS · EDV Hausleitner

**Holztechnik · Korpus · Stückliste**

[Open the desktop](https://martin-hausleitner.github.io/Luna-Korpus/) · [Single HTML](Luna-Korpus.html) · [Native theme](Luna-Korpus.astertheme) · [App provenance](app-mapping.json)

## Architecture

This is the real [Aster Desktop](https://github.com/wieslawsoltes/Aster), not a replacement shell. Its Windows profile, window manager, taskbar, Start, Snap, Alt+Tab, File Explorer, Calendar and App Center remain the original Aster implementations. The source is in `aster/`; `PROVENANCE.json` records the exact upstream commit and per-file comparisons. The upstream `aster/build.py`, Explorer/Notepad source, Calendar/tools source, creative-app source and renderer are byte-identical to the reviewed checkout.

Luna adds German launcher metadata, a first-class Windows-profile theme, thirteen desktop shortcuts and installation of the nineteen reviewed original HTML entries into the **real Aster application library and virtual `/Apps` folder**. The complete upstream catalog remains registered. The native Store has an additional **Alle Apps** view; its catalog, installed-app, favorites and built-in tabs remain. Catalog and installed records are distinct, so a locally installed catalog application has both records, not two different engines.

No app CSS is replaced. The Luna paint affects the desktop/chrome: `#0078C8` focused captions and accent, `#1C1C1C` taskbar, `#0B3A5B` desktop. Windows, macOS and Ubuntu presets are retained. Aster credit remains in About and the provenance document.

## Build and run

```sh
python3 build.py
python3 qa/verify.py
```

The root command delegates to Aster's unmodified Python builder. It emits `Luna-Korpus.html`; `index.html` is an identical copy for Pages. Runtime does not require npm, a CDN, the upstream GitHub Pages sites, or a second application server for the nineteen bundled local editions. Other, unmapped catalog applications retain Aster's normal on-demand links to their upstream sites.

Open the single HTML in a current browser with the browser APIs needed by the original applications. The tested environment is Chrome on macOS with WebGPU. App data is browser-local, not an EDV production database. The desktop uses a separate `luna-korpus-aster` storage namespace so it does not replace an existing Aster profile on the same origin. Native backup/export remains available.

## Exact original application files

All nineteen `Apps/*.html` entries are byte-for-byte copies of the official source/build output at the commit recorded in `app-mapping.json`. **Thirteen are upstream portable single files. Six upstream projects publish modular static applications instead.** For those six, the original HTML and every required original asset are retained in `Apps/<id>/`; the same assets are embedded in the themed Aster file. A resource-only loader bundles modules and resolves embedded CSS, assets, dynamic imports and workers when the native Aster HTML host opens them. No application functionality is reimplemented.

| Work name | Local original HTML | Upstream repository | Upstream packaging |
|---|---|---|---|
| Tabelle (Gridline) | [Apps/tabelle.html](Apps/tabelle.html) | [Gridline](https://github.com/wieslawsoltes/Gridline) | Portable HTML |
| Planung (MeridianPlan) | [Apps/planung.html](Apps/planung.html) | [MeridianPlan](https://github.com/wieslawsoltes/MeridianPlan) | Portable HTML |
| Office (MeridianOffice) | [Apps/office.html](Apps/office.html) | [MeridianOffice](https://github.com/wieslawsoltes/MeridianOffice) | Portable HTML |
| Dateien (TwinForge) | [Apps/dateien.html](Apps/dateien.html) | [TwinForge](https://github.com/wieslawsoltes/TwinForge) | Portable HTML |
| Akte (Folio) | [Apps/akte.html](Apps/akte.html) | [Folio](https://github.com/wieslawsoltes/Folio) | Original HTML + [Apps/akte/](Apps/akte/) |
| PDF (FolioPro) | [Apps/pdf.html](Apps/pdf.html) | [FolioPro](https://github.com/wieslawsoltes/FolioPro) | Portable HTML |
| Mail (Quire) | [Apps/mail.html](Apps/mail.html) | [Quire](https://github.com/wieslawsoltes/Quire) | Portable HTML |
| Text (NotepadXP) | [Apps/text.html](Apps/text.html) | [NotepadXP](https://github.com/wieslawsoltes/NotepadXP) | Portable HTML |
| Auswertung (LatticeAnalytics) | [Apps/auswertung.html](Apps/auswertung.html) | [LatticeAnalytics](https://github.com/wieslawsoltes/LatticeAnalytics) | Portable HTML |
| Rechenblatt (AxiomWorksheet) | [Apps/rechenblatt.html](Apps/rechenblatt.html) | [AxiomWorksheet](https://github.com/wieslawsoltes/AxiomWorksheet) | Portable HTML |
| Zeichnung (Draftline) | [Apps/zeichnung.html](Apps/zeichnung.html) | [Draftline](https://github.com/wieslawsoltes/Draftline) | Portable HTML |
| CAD (KestrelCAD) | [Apps/cad.html](Apps/cad.html) | [KestrelCAD](https://github.com/wieslawsoltes/KestrelCAD) | Portable HTML |
| Aufmaß (PlanforgeReview) | [Apps/aufmass.html](Apps/aufmass.html) | [PlanforgeReview](https://github.com/wieslawsoltes/PlanforgeReview) | Original HTML + [Apps/aufmass/](Apps/aufmass/) |
| Tafel (Orivane) | [Apps/tafel.html](Apps/tafel.html) | [Orivane](https://github.com/wieslawsoltes/Orivane) | Portable HTML |
| Gespräch (Veyra Workspace) | [Apps/gespraech.html](Apps/gespraech.html) | [VeyraWorkspace](https://github.com/wieslawsoltes/VeyraWorkspace) | Original HTML + [Apps/gespraech/](Apps/gespraech/) |
| Signatur (Velsign) | [Apps/signatur.html](Apps/signatur.html) | [Velsign](https://github.com/wieslawsoltes/Velsign) | Original HTML + [Apps/signatur/](Apps/signatur/) |
| Korpus (Formalyth) | [Apps/korpus.html](Apps/korpus.html) | [Formalyth](https://github.com/wieslawsoltes/Formalyth) | Original HTML + [Apps/korpus/](Apps/korpus/) |
| Material (StrataForge) | [Apps/material.html](Apps/material.html) | [StrataForge](https://github.com/wieslawsoltes/StrataForge) | Original HTML + [Apps/material/](Apps/material/) |
| Modell (Avolith Studio) | [Apps/modell.html](Apps/modell.html) | [AvolithStudio](https://github.com/wieslawsoltes/AvolithStudio) | Portable HTML |

## Desktop pins

Explorer (File Explorer), Dateien (TwinForge), Tabelle (Gridline), Planung (MeridianPlan), Kalender (Calendar), Mail (Quire), Akte (Folio), Zeichnung (Draftline), CAD (KestrelCAD), Korpus (Formalyth), Material (StrataForge), Aufmaß (PlanforgeReview), Einstellungen (Settings). All other applications remain in App Store. Mines and Win32 are not pinned.

## Boundaries that the labels do not change

**Quire is a document editor, not an email client.** “Mail (Quire)” is the requested launcher label; this project does not pretend to add email functionality. Formalyth retains its original design/manufacturing workbench and upstream sample, not a newly invented joinery application. Avolith Studio uses its official portable faceted edition.

Backend-dependent capabilities of the original applications still require their actual services, accounts and configuration. In particular, local editions do not establish authenticated multi-user collaboration merely by being opened in this desktop. Startup and identity checks do not certify every feature or manufacturing result. This is unofficial and not licensed WAWI.

Ordinary imported HTML keeps Aster's opaque sandbox. Only the named bundled original entries, checked against their recorded SHA-256 and source path, receive browser-storage access needed by the original code. These are explicitly trusted third-party applications, not a claim that same-origin frames are a security boundary.

## Licensing and credits

Aster: https://github.com/wieslawsoltes/Aster. Every app repository and local file are linked above. Original notices and READMEs are in `licenses/`, and dependency notices remain beside the modular app assets. The Luna integration is MIT; the original Aster MIT notice is retained in `LICENSE`.

**Folio and Velsign do not declare an application-wide license in the reviewed upstream checkouts.** Their authorship and supplied third-party notices are retained; this project does not relicense those applications as MIT. Do not interpret the Luna license as a grant for all third-party code.

## Verification

`qa/verify.py` verifies the local original-file hashes, modular asset manifests, stock builder and untouched native engine files. `qa/smoke.py` opens the real desktop in Chrome, checks the native app inventory and original frames, and captures the nine required views. `qa/offline.py` disables the network after boot and opens all nineteen mapped applications; it also tests a real Gridline formula commit/readback and the catalog-to-local launch path.

Current evidence is in `qa/local/`, `qa/live/`, `qa/offline-results.json` and `qa/REPORT.md`. The final nine numbered captures are also copied directly into `qa/`. The report separates build, browser, source-integrity and visual checks.

GitHub Actions rebuilds the same themed Aster and makes its delivery/evidence downloadable. No user model, agent farm or substitute desktop is launched.
