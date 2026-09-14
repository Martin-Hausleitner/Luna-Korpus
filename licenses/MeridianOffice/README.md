# Meridian Office

**[Open the live app](https://wieslawsoltes.github.io/MeridianOffice/)** · [Repository](https://github.com/wieslawsoltes/MeridianOffice)

A dependency-free, local-first browser office suite written in plain HTML, CSS, and JavaScript. A familiar ribbon, navigation panels, properties inspectors, and a shared workspace connect **Write**, **Grid**, and **Present**. The original Meridian branding and sample content are independent of Microsoft.

**This is a working implementation, not a screenshot mockup. It is also not a feature-complete replacement for Microsoft Office.** Supported editing and import/export behavior is described below; unsupported Office features are not preserved by the converters.

![Meridian Write](docs/meridian-write.png)

## Run

Requires Node.js 20 or later for the included development server. No package installation or build is needed to run the source.

```sh
npm start
# Open http://localhost:4173
```

Or use an ordinary static server from this directory:

```sh
python3 -m http.server 4173
```

`dist/meridian-office.html` is the self-contained distribution: inline CSS, JavaScript, sample content, icons, and shaders, with no external runtime requests. It can be opened as a local file, although browser storage and GPU behavior for file URLs vary. Serve it on localhost or HTTPS for a consistent origin and access to secure-context APIs. Upload `dist/index.html` to any static HTTPS host to publish the app.

The Node server is a development convenience, not a hardened production server. It binds to all interfaces so it can also be tested on another device. Production hosting should supply its own access policy and security headers.

## What works

| Application | Implemented behavior |
| --- | --- |
| **Write** | Native rich-text input and selection; bold, italic, underline, strikeout, font and color formatting; headings; paragraph alignment; indentation and spacing; lists; editable tables; images and links; explicit document pages; heading navigation; find/replace; local comments and resolution; word counts; print stylesheet; undo/redo. |
| **Grid** | Sparse multi-sheet workbooks; viewport-virtualized rendering; range selection and keyboard navigation; native cell editing and a formula bar; arithmetic, ranges and cross-sheet formulas; dependency tracking and cycle detection; TSV clipboard; relative/absolute reference fill; cell formatting; selected-range sorting; column resizing; sheet creation/rename; selected-data column charts; undo/redo. |
| **Present** | Editable text, rectangles, rounded rectangles, ellipses, and images; pointer selection and dragging; resize handles and numeric geometry; multi-selection; layer ordering; slide thumbnails; slide creation, duplication, deletion, and reordering; editable speaker notes; background colors; presentation mode with keyboard navigation; undo/redo. |
| **Shared** | Office-style contextual ribbons; command palette; light/dark chrome; zoom and focus mode; a versioned native workspace; IndexedDB save queue; imports/exports; diagnostics and real backend status. |

The initial workspace contains a coordinated two-page strategy brief, a two-sheet revenue model, and a four-slide presentation. Comments attributed to sample people are visibly labeled **Sample comment**; they are not evidence of connected collaborators.

### Formula language

The formula engine is a lexer, Pratt parser, and bounded interpreter. It never executes formulas with `eval` or `Function`.

Supported functions:

```text
SUM AVERAGE MIN MAX COUNT COUNTA
IF IFERROR AND OR NOT
ROUND ABS SQRT POWER
LEN LEFT RIGHT UPPER LOWER CONCAT CONCATENATE
```

Supported expressions include arithmetic, powers, percentages, comparisons, string concatenation, ranges, quoted sheet names, and mixed absolute/relative references. `IF` and `IFERROR` evaluate branches lazily. Circular references produce a deterministic `#CYCLE!` error. This is a defined formula subset, not complete Excel formula semantics.

Example formulas:

```text
=SUM(B5:E5)
=IF(F12>4000000,"Above plan","Below plan")
='Revenue model'!F12
=ROUND(B5*(1+$B$2),2)
```

## Save and exchange files

Use **Export → Meridian project** regularly for a portable backup. The `.meridian` JSON project is the source of truth for all three editors, including local comments, notes, layout, formulas, and supported styles. IndexedDB is convenience storage, not a cloud backup. The header displays a warning when persistent storage is unavailable.

| Format | Import | Export | Important boundaries |
| --- | --- | --- | --- |
| `.meridian` | Yes | Yes | Versioned complete native workspace; validated and sanitized on open. |
| `.docx` | Basic supported text/table content | Real WordprocessingML ZIP package | Paragraphs, headings, simple run formatting, tables and explicit page breaks; export can include embedded pictures. Import does not reconstruct images, advanced layout, comments, sections, or tracked changes. |
| `.xlsx` | Basic sheets, values and formulas | Real SpreadsheetML ZIP package | Native cell values, formulas and supported formatting. No pivot tables, merged/frozen cells, rich chart objects, macros, external links, complete number-format semantics, or lossless arbitrary workbook conversion. |
| `.pptx` | Basic shapes and text | Real PresentationML ZIP package | Native slide text, supported geometry and export pictures. Image import, advanced themes/layouts, animation, transitions, SmartArt, and speaker-note export are not implemented. |
| CSV / TSV | Delimited data | CSV active sheet; TSV clipboard | CSV export guards potentially executable formula-like text. Use native/XLSX formats when formulas must be retained as formulas. |
| HTML / text | Document content | Document HTML and text | HTML is sanitized; unsupported markup is removed. |
| SVG | No | Current slide; chart download | Vector shapes and text, with embedded images where present. |
| Presentation HTML | No | Self-contained slide viewer | Opens separately, with keyboard navigation; it is a viewer, not another editor. |

OOXML exports contain actual package relationships and XML parts, not HTML renamed with Office extensions. The automated suite validates ZIP CRCs and XML well-formedness and reimports this build's supported content. **Actual Microsoft Word/Excel/PowerPoint opening and schema-level conformance were not verified in this environment.** Keep the native project when converting valuable documents.

## Rendering architecture

`src/gpu.js` contains a real WebGPU compositor, not a simulated WebGPU label. Shapes, text glyphs, and images use 64-byte instances, one instanced quad pipeline, a reusable growable vertex buffer, a uniform viewport, and a 2048 × 2048 atlas. WGSL implements rounded-rectangle and ellipse coverage, tinted glyph sampling, and image sampling. Atlas pixels are uploaded only when the atlas changes. Grid and slide viewports redraw on demand rather than on an idle animation loop.

The Canvas 2D backend consumes the same retained drawing items when adapter initialization fails, WebGPU is absent, or a device is lost. The status bar names the actual backend. Render preparation timing measures CPU submission work, **not GPU execution time or an invented FPS benchmark**.

Write deliberately uses native DOM text/layout instead of drawing an imitation editable page into a canvas. Cell and slide text use native input overlays while editing. This preserves browser text input and selection behavior; the canvas-based editors are not claimed to have complete screen-reader parity with native Office.

Read [the architecture and validation notes](docs/ARCHITECTURE.md) for invariants, known limitations, and extension points.

## Keyboard controls

| Context | Shortcut |
| --- | --- |
| Shared | Ctrl/Command+K: command palette; Ctrl/Command+S: save locally; Ctrl/Command+Z: undo; Ctrl/Command+Shift+Z: redo. |
| Write | Ctrl/Command+B/I/U: emphasis; Ctrl/Command+F: find. Native text selection and clipboard commands remain available. |
| Grid | Arrows: move; Shift+arrows: extend; Enter/F2: edit; Tab: next cell; Escape: cancel edit; Delete: clear; Ctrl/Command+D: fill down; Ctrl/Command+A: select used range. |
| Present | Double-click text to edit; Ctrl/Command+Enter: finish editing; Ctrl/Command+D: duplicate; Delete: delete selection; arrow keys: nudge. |
| Slide show | Left/right arrows: navigate; Escape: exit. Browser fullscreen permission may vary. |

## Source, build and tests

```sh
npm test          # dependency-free Node tests
npm run build     # regenerate the standalone HTML distribution
```

Source map:

```text
src/core.js       Transactions, bounded history, persistence, validation, sanitization
src/formula.js    Lexer/parser/interpreter, dependencies, addressing, CSV/TSV
src/gpu.js        WGSL, instancing, glyph/image atlas, Canvas 2D fallback
src/writer.js     DOM document editor, formatting, navigation, comments
src/grid.js       Virtual grid, selection, editing, formatting, charts
src/deck.js       Slide scene, transforms, thumbnails, inspector, slideshow
src/io.js         Native, HTML, SVG, DOCX, XLSX and PPTX conversions
src/zip.js        ZIP writer/reader, CRC32 and bounded decompression
src/app.js        Shared shell, ribbon, commands, import/export coordination
src/sample.js     Original sample workspace
src/icons.js      Inline SVG UI icons
```

**Verification recorded with this build:** 52/52 core tests and 34/34 browser acceptance checks passed. Reports are included in `docs/core-test-report.txt` and `docs/browser-test-report.json`.

The browser acceptance checks require Python Playwright and Chromium as test-only dependencies:

```sh
python3 -m pip install playwright
# Use an existing Chromium installation; default executable: /usr/bin/chromium.
CHROMIUM_PATH=/path/to/chromium python3 tests/browser_acceptance.py
```

The test script injects the standalone file into an `about:blank` page because managed browser policy in the build environment blocked normal navigation. It verifies **Canvas 2D fallback behavior**, genuine DOM input and pointer interactions, file bytes, ZIP/XML structure, supported-format round trips, and the portable slide viewer. It does not establish GPU performance, secure-origin IndexedDB persistence, clipboard permissions, physical printing, or native Microsoft Office compatibility. Download bytes are captured in memory to test exports despite the environment's download restrictions.

Before a release, run the app on a normal localhost/HTTPS origin, confirm `WebGPU` in the status bar, inspect validation errors, test the device-loss path, verify save/reload across sessions, open Office exports in target Office applications, and profile realistic workloads on target GPUs.

## Deliberate limits

This build does not include Outlook/email, OneNote, Access, Teams, real-time collaboration, account management, VBA, add-ins, tracked changes, complete Office file fidelity, or a full publishing engine. Write has explicit pages rather than automatic text-flow pagination. The GPU glyph atlas is bitmap-based and finite; it is not a full vector-font/shaping engine. History uses bounded full-state snapshots, and broad UI changes can reset formula caches. These are explicit implementation boundaries, not hidden simulated features.

No telemetry, CDN, account, backend service, or paid API is required by the app. External document links only navigate when the user chooses them. The source is provided under the MIT license.

## GitHub Pages deployment

The `pages.yml` workflow tests and builds the application, then deploys only `dist/` to GitHub Pages on pushes to `main`. Pull requests run validation without deployment. No runtime backend or build secrets are required. The standalone output uses relative or inline assets and works beneath the `/MeridianOffice/` project path.
