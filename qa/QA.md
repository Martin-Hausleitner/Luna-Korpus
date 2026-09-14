# LUNA KORPUS — QA

## Native local run

70 checks PASS, 0 FAIL, 0 BLOCKED. Source SHA-256: `d542ef15c97f719698be2705278a0ba8730e5b7a5cedab8b0b4adf1ba534f482`.

Actual Chrome navigation on macOS / Apple Metal 3 WebGPU, 1920 × 1080; additional 1440 × 900 and narrow-screen checks. Native localStorage handoff and browser reload passed. All eleven captures use WebGPU; the explicit Canvas fallback was also tested.

Observed boot 69.5 ms; first cabinet frame 69.5 ms; first WebGPU frame 552.1 ms. These are observed timings, not universal hardware guarantees.

Independent reference: 8 panels, 2.60338 m², 6.31 m ABS, 13 hardware pieces, EUR 228.99934 net. Input mutation, picking, orbit/pan/zoom, real explosion, five presets, 48 dimension combinations, module switching, exports/import, native persistence and window controls passed.

`results.json` records individual checks, source/image hashes and actual renderer. Required screenshots: 01-desktop.png, 02-korpus-solid.png, 03-explode.png, 04-bom.png, 05-32mm.png, 06-zeile.png, 07-multiwindow.png, 08-settings.png.

## Release gates

Local automated gate: PASS. Native captured-pixel review and deployed-browser gate are pending release verification; they are not claimed as complete in this initial evidence commit.
