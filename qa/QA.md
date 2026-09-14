# LUNA KORPUS — release verification

**LOCAL PASS · GITHUB PAGES PASS**

This report covers the self-contained parametric cabinet workstation, not the previous theme-only desktop. Verification date: 14 September 2026.

## Source and publication

Canonical runtime: `Luna-Korpus.html`, **139,780 bytes**. SHA-256:

`d542ef15c97f719698be2705278a0ba8730e5b7a5cedab8b0b4adf1ba534f482`

Public repository: https://github.com/Martin-Hausleitner/Luna-Korpus

Live application: https://martin-hausleitner.github.io/Luna-Korpus/

The root serves a byte-identical `index.html` hosting alias of the canonical file. HTTPS returned status 200 and the exact runtime SHA-256. [Deployment receipt](deployment.json). Application source was published in commit `e41de7c2e28fdf0c1043509f5a561c8b4e642025`; local and live evidence was published in `958c2d2c8f3435e0fc19d04d11aad8709484b269`. Subsequent release documentation does not change runtime bytes.

## Native browser acceptance

| Gate | Localhost | Live Pages |
|---|---:|---:|
| Browser assertions | 70 PASS / 0 FAIL / 0 BLOCKED | 70 PASS / 0 FAIL / 0 BLOCKED |
| Actual renderer | WebGPU, Apple Metal 3 | WebGPU, Apple Metal 3 |
| Native localStorage handoff and reload | PASS | PASS |
| JavaScript / application errors | 0 / 0 | 0 / 0 |
| Main screenshot resolution | 1920 × 1080 | 1920 × 1080 |
| Additional viewport checks | 1440 × 900 and narrow layout | 1440 × 900 and narrow layout |
| Observed application bootstrap | 69.5 ms | 46.0 ms |
| Observed first cabinet frame | 69.5 ms | 46.0 ms |
| Observed first WebGPU frame | 552.1 ms | 518.9 ms |

These are actual Chrome runs on macOS with native Apple WebGPU and browser-origin storage, not a mocked storage/GPU result. The first cabinet frame uses the CPU Canvas replacement while WebGPU initializes; the native WebGPU frame also arrived within one second in both recorded runs. Timings measure application startup, not total network download time, and are observations on this machine rather than guarantees for every browser or GPU. An explicit forced Canvas path also passed without losing the model.

Machine-readable checks, launch flags, adapter observations, source hashes and screenshot hashes: [local results](results.json) · [live results](live/results.json). **140 passing assertions across the two full suites.**

## Required screenshot review

Visual inspection was performed on actual browser captures, not generated mock-ups. All screenshots below are 1920 × 1080 and use WebGPU.

| Required local capture | Visual result | Observed evidence |
|---|---|---|
| [01-desktop.png](01-desktop.png) | PASS | Windows-inspired desktop, four shortcuts, Start, search and taskbar. |
| [02-korpus-solid.png](02-korpus-solid.png) | PASS | Recognizable oak cabinet; 600 / 720 / 560 mm dimensions; blue caption and disclaimer. |
| [03-explode.png](03-explode.png) | PASS | Actual separated panels and 65% distance slider; parts and dimensions remain consistent. |
| [04-bom.png](04-bom.png) | PASS | Eight real panel rows with finished dimensions, edge/area values and EUR 229.00 total. |
| [05-32mm.png](05-32mm.png) | PASS | Visible hole positions; 32-mm pitch, 37-mm front datum and 80-hole schedule. |
| [06-zeile.png](06-zeile.png) | PASS | Three base plus two wall module switcher; active wall unit and corresponding BOM. |
| [07-multiwindow.png](07-multiwindow.png) | PASS | Independently positioned Material and Korpus windows with blue focus treatment. |
| [08-settings.png](08-settings.png) | PASS | Actual WebGPU diagnostics, shared theme controls and local-storage settings. |

The required deployed captures were separately reviewed: [live 01 — desktop](live/01-desktop.png) **PASS**; [live 03 — explosion](live/03-explode.png) **PASS**. The [1440 × 900 workstation](10-korpus-1440.png) also fits within the usable desktop with dimensions, inspector, BOM and disclaimer visible.

[Visual review record and reviewed-image hashes](vision.json). The rubric is evaluated across applicable workstation views: the minimized desktop capture intentionally shows Start rather than the open model window.

## Vision rubric

- **PASS** — Windows 11-inspired chrome, not a landing page.
- **PASS** — Blue focused title bars and readable EDV / Hausleitner / LUNA KORPUS.
- **PASS** — German UI and millimetre labels.
- **PASS** — Cabinet-shaped 3D geometry.
- **PASS** — Explosion visibly separates actual parts.
- **PASS** — BOM matches displayed model, independently checked numerically.
- **PASS** — Required disclaimer visible in workstation.
- **PASS** — No Aster branding or empty canvas in reviewed product views.

## Numerical and functional evidence

The independently calculated 600 × 720 × 560 mm default oak unit has **8 panels, 2.60338 m² finished panel area, 6.31 m of ABS edging and 13 hardware pieces**. The unrounded demo total is **EUR 228.99934**, displayed as **€ 229,00 net**. Panel geometry and BOM volume agree; thickness changes, doors, selected-part edge allowances and the 12% material-waste toggle update the derived data.

Tested workflows include all five cabinet types, 48 dimension combinations, per-module kitchen edits, orbit/pan/zoom, actual 3D picking, door rotation, explosion distance, undo/redo, material presets, System 32, CSV/JSON downloads, validated JSON re-import, model-derived SVG/DXF drawings, local handoff/reload, Start search, and window drag/minimize/maximize/close/restore. The default side panel moves 169 mm in the tested explosion state while its BOM dimensions remain unchanged.

Example outputs: [CSV](export.csv), [JSON](export.json), [SVG](drawing.svg), [DXF](drawing.dxf). [Reproducible test harness](../tests/verify.py). All 22 captured local/live images have verified SHA-256 values in the corresponding browser reports.

## Limits and historical evidence

This is an unofficial functional browser demo, not licensed WAWI, a certified cabinet-engineering system or a CNC post-processor. Geometry, BOM calculations, exports, window controls and local persistence are real. Material rates are invented demo assumptions; hinge counts, hole displays and L-corner construction are deliberately simplified. There is no manufacturer-certified fitting selection, structural/load check, nesting optimization, machine output, ERP order processing or cloud backup. Review every exported value against the real cabinet before production.

Historical screenshots from the earlier Aster-theme edition remain in the repository under `qa/legacy-theme/` and are not evidence for this release. The old edition is preserved on `archive/theme-desktop-20260914`. The downloadable release excludes these historical assets and contains only one runtime HTML file.
