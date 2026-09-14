# LUNA KORPUS

**Unofficial theme + desktop for Aster. Not affiliated as a product release of EDV Hausleitner unless they say so. Not licensed WAWI. All applications belong to Aster / wieslawsoltes and their upstream authors; Luna only names and paints them.**

**Inoffizielles Theme und Tischler-Desktop für Aster. Keine autorisierte Produktveröffentlichung von EDV Hausleitner, solange EDV Hausleitner dies nicht ausdrücklich bestätigt. Keine lizenzierte WAWI. Sämtliche Programme stammen aus Aster / von wieslawsoltes und ihren jeweiligen Urhebern; Luna ändert nur Namen, Gestaltung und die Arbeitsplatz-Anordnung.**

Aster is the operating environment. Luna is not a new OS, window manager, spreadsheet, CAD program, or cabinet generator. Gridline, Formalyth, Draftline, the other catalog apps, the built-in programs and the WebGPU compositor remain their original implementations.

## Open / Öffnen

The Pages root serves the complete themed desktop directly, not a marketing page or iframe wrapper. `index.html` is byte-identical to `Luna-Korpus.html`.

Download `Luna-Korpus.html` and open it in a current desktop browser. The desktop and built-in apps are embedded in that one file. **Catalog applications are not bundled offline:** the original Aster launcher loads their real HTTPS sites only when opened. They require internet or their own app-specific offline cache. Browser permissions, WebGPU availability, local file pickers and each upstream app's capabilities still apply.

Die Pages-Startseite öffnet unmittelbar den Desktop. Alternativ `Luna-Korpus.html` herunterladen und im Browser öffnen. Integrierte Programme sind enthalten; Katalogprogramme laden ihre echten, separat gehosteten Webseiten. Keine zusätzliche Maschinenanbindung, kein Backend und kein Cloud-Konto werden eingerichtet.

## Theme and desktop / Theme und Arbeitsplatz

First Luna boot selects **Windows → Luna Korpus**, blue focused captions (`#0078C8`), navy shop-grid wallpaper (`#0B3A5B`), dark taskbar (`#1C1C1C`), EDV/Hausleitner branding and a clean desktop. All original profiles remain available: Windows, macOS 26 and Ubuntu GNOME. Subsequent user changes are preserved.

The desktop has 16 application shortcuts plus the real virtual text file `/Desktop/Tipps-Tischler.txt`. Start pins are grouped as **Büro / Werkstatt / Planung / System**. Original games, Terminal, EDA, audio tools and the remaining catalog stay available through **Start → Alle Apps → Alle Webprogramme**, or search. App Center remains the original Aster application.

All source files implementing applications, the reviewed catalog, the window manager, file services, theme engine and renderer are checked byte-for-byte against the upstream commit in `qa/source-integrity.json`. The only existing source edits are shell labels/default layout, the HTML boot/branding surface and favicon. Added `luna-theme.js` and `luna-theme.css` are a theme/layout overlay. No catalog app code is copied, rebuilt, mocked or remotely restyled.

## Import the portable theme / Theme importieren

1. Open stock Aster, then **Settings → Personalization → Themes**.
2. Choose **Import**, select `Luna-Korpus.astertheme`, inspect the preview and apply it.
3. Save it as **Luna Korpus** in the theme library when desired.

Die Datei ist ein echtes `aster-theme`-JSON, Version 1, validiert mit dem originalen Aster-Theme-Modell. Das kleine PNG-Hintergrundbild ist eingebettet; es werden keine externen Theme-Assets geladen.

**Portable-format boundary:** stock Aster imports its supported profile, colors, caption settings, metrics and wallpaper. The stock theme format intentionally cannot execute CSS or install launcher layouts. German shortcut names, Start grouping, EDV logo placement and the exact taskbar CSS paint are part of the themed desktop build, not an executable extension hidden in the `.astertheme` file.

**Grenze des Theme-Imports:** Die Standarddatei überträgt die vom Original unterstützten Theme-Einstellungen und das Hintergrundbild. Desktop-Verknüpfungen, Start-Gruppen und Logo-Anordnung werden nur mit `Luna-Korpus.html` ausgeliefert. Der Import verändert keine App-Funktionen und installiert keine Programme.

## Application map / Zuordnung

| Desktop label | Original source |
|---|---|
| Explorer (File Explorer) | https://github.com/wieslawsoltes/Aster |
| Dateien (TwinForge) | https://github.com/wieslawsoltes/TwinForge |
| Tabelle (Gridline) | https://github.com/wieslawsoltes/Gridline |
| Planung (MeridianPlan) | https://github.com/wieslawsoltes/MeridianPlan |
| Kalender (Calendar) | https://github.com/wieslawsoltes/Aster |
| Akte (Folio) | https://github.com/wieslawsoltes/Folio |
| PDF (FolioPro) | https://github.com/wieslawsoltes/FolioPro |
| Notizen (Notepad) | https://github.com/wieslawsoltes/Aster |
| Rechner (Calculator) | https://github.com/wieslawsoltes/Aster |
| Zeichnung (Draftline) | https://github.com/wieslawsoltes/Draftline |
| CAD (KestrelCAD) | https://github.com/wieslawsoltes/KestrelCAD |
| Korpus (Formalyth) | https://github.com/wieslawsoltes/Formalyth |
| Material (StrataForge) | https://github.com/wieslawsoltes/StrataForge |
| Aufmaß (PlanforgeReview) | https://github.com/wieslawsoltes/PlanforgeReview |
| Tafel (Orivane) | https://github.com/wieslawsoltes/Orivane |
| Einstellungen (Settings) | https://github.com/wieslawsoltes/Aster |
| Tipps (Notepad) | https://github.com/wieslawsoltes/Aster — local `/Desktop/Tipps-Tischler.txt` |

## Reproduce / Nachbauen

Upstream: https://github.com/wieslawsoltes/Aster

The exact source commit is recorded in `qa/source-integrity.json`.

```sh
git clone https://github.com/wieslawsoltes/Aster.git Aster
cd Aster
git checkout a7cca00c03837f8f94e2f6b1cccc2f82830e32fc
git apply ../Luna-Korpus/luna-overlay.patch
cp ../Luna-Korpus/theme-source/luna-theme.js src/
cp ../Luna-Korpus/theme-source/luna-theme.css src/
python3 build.py
cp Aster.html ../Luna-Korpus/Luna-Korpus.html
cp Aster.html ../Luna-Korpus/index.html
```

Build uses Python's standard library. No npm or CDN dependency is added to the desktop. The original single-file build preserves the real Win32 assets and WebGPU path; it is not a tiny screenshot reproduction.

## Data and permissions / Daten

The original Aster storage and permission model is retained. No virtual user files are erased. On first Luna setup, existing theme/layout metadata is retained under `luna-previous-theme-v1` and `luna-previous-layout-v1` before the requested new defaults are applied. Aster's IndexedDB is browser-origin scoped. Export important Aster files and separately export documents from each catalog app. Luna does not aggregate or upload them.

## QA

See [the QA report](qa/README.md) for source integrity, actual browser screenshots and test results. Local and live Pages visual checks passed after two bounded layout/branding fixes. The 32 upstream model tests passed; all 84 real catalog sites passed startup checks. Eight sandbox/service-worker errors remain explicitly logged in the catalog report. A real Gridline edit test computed `=32*5` as `160`. **Only recorded checks establish PASS; source preservation does not certify every editing feature, machine workflow or backend of every upstream application.**

## Not WAWI / Keine Warenwirtschaft

A real licensed WAWI remains responsible for articles, purchasing, stock, orders, accounting and the company's production integrations. Formalyth is the real upstream design/manufacturing workbench launched under the label **Korpus**; the label is not a claim of cabinet generation or CNC certification. Gridline remains the real upstream spreadsheet under **Tabelle**. Luna supplies the theme and desktop organization only. No Cabinet Vision, imos or HOMAG integration is implied.

## License and credit

MIT. The original Aster MIT copyright notice is preserved in `LICENSE`. Luna-specific overlay code is also MIT. All third-party rights and upstream application licenses remain with their respective authors. Credit: https://github.com/wieslawsoltes/Aster
