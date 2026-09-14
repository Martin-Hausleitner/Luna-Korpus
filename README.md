# LUNA KORPUS

**Unofficial, browser-only cabinetry demo in the EDV Hausleitner / Luna skin. Not licensed WAWI, not Cabinet Vision / imos / HOMAG, and not a CNC post-processor.** This edition is a real, self-contained parametric carcass workstation: model, 3D display, drawing and bill of materials share the same millimetre geometry. It is an original, bounded in-process implementation informed by the credited Aster-family projects, not an embedded launcher or a claim to include their complete CAD engines. MIT licensed.

**Inoffizielle, ausschließlich im Browser laufende Korpus-Demo im EDV-Hausleitner-/Luna-Design. Keine lizenzierte WAWI und kein CNC-Postprozessor.** Sie ändern echte Korpusparameter; Ansicht, Zeichnung und Stückliste werden daraus neu berechnet. Beschläge, Materialpreise und vereinfachte Konstruktionsregeln sind ausdrücklich Demonstrationsannahmen, keine Fertigungsfreigabe.

## Open / Öffnen

**Live:** https://martin-hausleitner.github.io/Luna-Korpus/

**Canonical application:** [`Luna-Korpus.html`](Luna-Korpus.html). Download and open that single file, or serve its folder on localhost:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/Luna-Korpus.html
```

There are no runtime packages, CDNs, frameworks, external fonts, images or iframes. The checked-in `index.html` is a byte-identical GitHub Pages hosting alias of the one canonical runtime, not a second application or a dependency. HTTPS/localhost is recommended for WebGPU and origin-specific browser storage. When GPU initialization fails, the same model remains usable in the explicitly labelled Canvas 2D replacement renderer. Direct-file storage/GPU behavior depends on the browser.

Die Daten bleiben im aktuellen Browserprofil und unter dessen Ursprung. Automatisches Speichern und **„An Stückliste übergeben“** verwenden `luna.korpus.v1`. Eine erfolgreiche Übergabe enthält echte Teile, Beschläge, Summen und Zeitstempel. Gesperrter Speicher wird gemeldet, nicht als Erfolg ausgegeben. Sichern Sie Ihre Planung zusätzlich als JSON-Datei; es gibt keine Cloud-Sicherung.

## Workstation / Arbeitsplatz

| Surface | Implemented behavior |
|---|---|
| Korpus | Base, wall, tall, open shelving and a simple open L-corner. Live width, height, depth, six panel thicknesses, plinth, reveal, overlay, shelves, doors, grain and ABS edges. |
| Viewport | Actual WebGPU meshes, procedural oak grain, orbit, Shift-drag pan, wheel zoom, fit, orientation views, solid/edges/explode, movable explosion distance, working door opening, W/H/D dimensions and part picking linked to BOM. Canvas fallback uses the same part transforms. |
| Stückliste | Panel dimensions, quantities, material, selectable/per-part edge assignments, area, edge length, hardware and demo costs. Optional 12% material waste; CSV/JSON export; validated JSON import and local handoff. |
| Zeichnung | Front and side derived from the active model. Actual SVG and millimetre DXF LINE exports. The drawing is not a CNC program. |
| Material / Tipps | Oak 19 mm, white particle board 19 mm and plywood 15 mm; material changes update panels and prices. Construction conventions, System 32, door grain, edge allowance and manufacturing limitations are explained in German. |
| Desktop / Einstellungen | Windows-inspired Start, search, app registry, taskbar, four desktop shortcuts, independent in-process windows, move/minimize/maximize/close, light/dark/contrast settings and explicit Canvas fallback selection. |

**Bedienung:** Ziehen im Modell dreht; Umschalt + Ziehen verschiebt; Mausrad zoomt. Ein Bauteilklick markiert die zugehörige Stücklistenzeile. Über die rechte Seitenleiste ändern Sie Konstruktion, Front/Kante und System 32. Der Explosionsregler trennt tatsächliche Bauteile; die Maßketten zeigen weiterhin die zusammengebaute Korpusgröße. Rückgängig/Wiederholen und JSON-Sicherung sind verfügbar.

**Demo library:** 600 × 720 × 560 base, 900 × 720 × 350 wall, 600 × 2100 × 560 tall, shelving, L-corner and **Eiche-Küchenzeile** with three base plus two wall units. The kitchen run is a five-module switcher preserving per-module edits, not a furnished room planner. Its BOM is explicitly for the active module.

## Model and cost contract / Konstruktions- und Preisannahmen

All dimensions are **finished dimensions in mm**. W/H/D describe the assembled body; H excludes the plinth, D includes the externally applied back but not door thickness. Top/bottom fit between sides; the back covers the full rear. Shelves have side clearance and a front setback. The L-corner consists of two abutting rectangular arms and deliberately has no proprietary corner mechanism.

System 32 records Ø5 mm blind-hole positions, front/rear rows at 37 mm from their respective body datums, vertical steps of 32 mm and bounded depth. Dots/discs in the renderer identify the schedule; these are not Boolean-machined bores or drill output. Hinge counts are a simple height-based demonstration rule, not Blum product selection, load analysis or an approved drilling pattern. Shelf pins follow generated shelf levels.

L1/L2 edges run along panel length; B1/B2 along panel width. Raw cut dimensions subtract the corresponding applied ABS thickness from the finished outline. Doors have their own four-edge default; the back has no edging by default. Always verify actual supplier tolerances, surface/laminate build-up, fittings and manufacturing sequence before ordering.

### Independent 600-mm reference

Default oak unit, one open door, one shelf, 120-mm plinth, 19-mm panels, ABS 1 mm and no waste:

| Part | Finished L × W × T, mm | Quantity |
|---|---:|---:|
| Left/right side | 720 × 541 × 19 | 2 |
| Top/bottom | 562 × 541 × 19 | 2 |
| Back | 720 × 600 × 19 | 1 |
| Shelf | 560 × 518 × 19 | 1 |
| Plinth front | 562 × 120 × 19 | 1 |
| Door | 716 × 596 × 19 | 1 |

**8 panels; 2.60338 m²; 6.31 m ABS; 13 hardware pieces; EUR 228.99934, displayed as € 229,00 net.** Hardware consists of two hinges, two mounting plates, four shelf pins, four feet and one handle. Prices are invented, editable-through-code demo rates: oak EUR 68/m² at 19 mm, white particle board EUR 26/m² at 19 mm, plywood EUR 42/m² at 15 mm, with proportional thickness scaling. ABS 0.4/1/2 mm uses EUR 0.95/1.45/2.10 per metre. The 12% toggle applies to panel purchase area/cost only, not edge or hardware quantities. Labour, delivery, margin, tax and quotation validity are not included.

**Nicht zur ungeprüften Fertigung verwenden:** keine Statik, kein Nesting oder Zuschnittoptimierer, keine verbindlichen Herstellerbeschläge, keine echten Maschinenpostprozessoren, keine ERP-Aufträge und keine Fertigungszertifizierung. Prüfen Sie jeden exportierten Wert gegen Ihre reale Konstruktion.

## Architecture

`Luna.theme` · `Luna.wm` · `Luna.store` · `Luna.cad` · `Luna.gpu` · `Luna.bom` · `Luna.apps`

All application code, styles, SVG symbols and WGSL shaders live in the canonical HTML. Scene geometry changes on model edits; drawing is request-driven rather than an idle animation loop. WebGPU buffers are reused and disposed on backend/device changes. Canvas startup is explicitly CPU-backed so first display does not wait for native GPU startup. No backend service or additional model is launched.

## QA / Prüfung

See [`qa/QA.md`](qa/QA.md), [`qa/results.json`](qa/results.json) and [`qa/live/results.json`](qa/live/results.json). The eight requested screenshots are in `qa/`; actual deployed-browser screenshots are in `qa/live/`. Reports record source and image SHA-256, viewport, actual renderer, observed performance, assertions and errors. Physical/native GPU testing is distinguished from software or restricted-origin testing.

The application has no dependencies. **The optional test harness** requires Python, Playwright and a browser installed separately:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 tests/verify.py --require-gpu --require-storage
# macOS with an existing Chrome installation:
python3 tests/verify.py --chromium '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' --require-gpu --require-storage
# Full deployed browser checks:
python3 tests/verify.py --url https://martin-hausleitner.github.io/Luna-Korpus/ --require-gpu --require-storage --out qa/live-recheck
```

Do not equate a Canvas-only or storage-double test with native WebGPU/persistence acceptance. Hardware/browser load affects startup measurements; recorded times are observations, not universal guarantees.

## Credits / Quellen

The following public projects by **wieslawsoltes** were reviewed as workflow/architecture specifications. This small cabinetry edition independently implements only the bounded surfaces above; it does **not** bundle the full upstream software, proprietary SDKs, EDA, games, analytic B-rep kernels or CAM post-processors.

| Project | Reference used | Repository / live reference |
|---|---|---|
| Aster | Desktop, themes, taskbar and window workflows | https://github.com/wieslawsoltes/Aster · https://wieslawsoltes.github.io/Aster/ |
| Formalyth | Typed parametric workbench and inspector | https://github.com/wieslawsoltes/Formalyth · https://wieslawsoltes.github.io/Formalyth/ |
| AvolithStudio | In-browser part/model/view separation | https://github.com/wieslawsoltes/AvolithStudio · https://wieslawsoltes.github.io/AvolithStudio/ |
| Veldra3D | 3D viewport, material and fallback workflows | https://github.com/wieslawsoltes/Veldra3D · https://wieslawsoltes.github.io/Veldra3D/ |
| KestrelCAD | Model-derived 2D technical drawing | https://github.com/wieslawsoltes/KestrelCAD · https://wieslawsoltes.github.io/KestrelCAD/ |
| Draftline | Self-contained drawing and DXF workflow | https://github.com/wieslawsoltes/Draftline · https://wieslawsoltes.github.io/Draftline/ |
| StrataForge | Procedural material workflow | https://github.com/wieslawsoltes/StrataForge · https://wieslawsoltes.github.io/StrataForge/ |
| Gridline | Live, local-first quantity grid | https://github.com/wieslawsoltes/Gridline · https://wieslawsoltes.github.io/Gridline/ |

The previous Aster-theme desktop edition is preserved in the repository history and the `archive/theme-desktop-20260914` branch. Existing theme-source files are historical assets, not runtime dependencies of this cabinet workstation. Upstream and product names remain their owners' names; no affiliation or compatibility certification is implied.

## License

MIT for the original LUNA KORPUS implementation; see [LICENSE](LICENSE).
