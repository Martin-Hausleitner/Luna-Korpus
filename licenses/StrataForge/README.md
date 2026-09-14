# StrataForge — Material Studio

[Open StrataForge](https://wieslawsoltes.github.io/StrataForge/) · [Runtime diagnostics](https://wieslawsoltes.github.io/StrataForge/tests/gpu-smoke.html) · [Deployment workflow](https://github.com/wieslawsoltes/StrataForge/actions/workflows/pages.yml)

An original, dependency-free procedural material authoring application with a Designer-style workspace, typed image graphs, WebGPU compute, and physically based material previews.

**This is executable source, not a static interface.** Nodes generate real textures; wires define dependencies; parameter changes propagate through the graph; exports are encoded from evaluated pixel buffers.

## GitHub Pages

The `pages.yml` workflow runs the core tests and JavaScript syntax checks before uploading a static site artifact. Successful pushes to `main` deploy to GitHub Pages. The application uses relative URLs, including module-worker URLs, so it runs under the `/StrataForge/` project-site path without a bundler or URL rewrite.

Only the application, examples, license, and runtime-diagnostics page are included in the deployed artifact. Repository development scripts and test reports are not required by the hosted app. Browser support and GPU availability can be checked with the runtime-diagnostics link above.

## Run

Requires Node.js 20 or newer for the optional development server. The browser application itself has no runtime dependencies, framework, bundler, package installation, or network-loaded assets.

```sh
git clone https://github.com/wieslawsoltes/StrataForge.git
cd StrataForge
npm start
```

Open `http://localhost:8080` in a browser. Do not launch `index.html` through `file://`; ES modules and module workers should be served through HTTP.

A different port can be selected with `PORT=8765 npm start` on macOS/Linux, or `$env:PORT=8765; npm start` in PowerShell. Any static server also works:

```sh
python -m http.server 8080
```

WebGPU requires a secure context, normally HTTPS or localhost, and an available browser/GPU adapter. The app selects WebGPU automatically. When it is unavailable, material evaluation runs in a dedicated CPU worker and the preview uses a software PBR renderer. The status indicator identifies the active backend. Browser and device support should be checked with the included diagnostics rather than inferred from the browser's name.

For a fresh project without loading the autosave: `http://localhost:8080/?fresh=1`.
For the CPU reference backend: `http://localhost:8080/?backend=cpu&fresh=1`.

## Included authoring features

The workspace has an Explorer, searchable Library, Properties inspector, linked 2D and 3D views, resizable panels, and a node graph with thumbnails and typed ports. There are no external imagery or font dependencies.

### Real node operations

| Family | Implemented operations |
| --- | --- |
| Generators | Periodic fractal noise, clouds, Voronoi distance/edges/random cells, uniform grayscale, uniform color, linear/radial/angular gradients |
| Patterns | Beveled bricks, beveled tiles, checkerboard, jittered circle/square/diamond masks |
| Compositing | Multiply, add, subtract, screen, overlay, maximum, minimum, and mix blends; optional grayscale masks; three-stop gradient mapping |
| Adjustments | Levels, gamma, input/output ranges, inversion, explicit linear-luminance grayscale conversion, histogram threshold masks |
| Filters | Gaussian-weight blur, directional warp, periodic scale/rotate/translate |
| Material | Resolution-normalized height-to-normal conversion, OpenGL/DirectX Y conventions, local height-field ambient occlusion |
| Inputs | Embedded PNG/JPEG/WebP bitmaps with explicit sRGB/linear and scalar/color/normal semantics |
| Reuse | Up to four typed inputs and one output per reusable subgraph, independent exposed instance parameters, recursive inlining with recursion rejection |

The Library exposes 22 authoring node types. Reusable subgraphs and internal graph-boundary operators are additional types.

Four editable example materials are included: **Oxidized Copper, Fired Clay, Glazed Ceramic, and Volcanic Stone**. Portable copies are in `examples/`.

### Editing

Drag a node header to move it. Drag an output port to an input port to connect them; dragging from an input to an output works too. A destination input holds exactly one connection. Incompatible types and cycles are rejected atomically.

Click a node to edit its parameters. Double-click it to inspect its generated texture in the 2D view. The material preview uses the graph's channel assignments, independently of the inspected node. Assign channels with the checkboxes in a selected node's inspector or with the dropdowns in the Material inspector.

Click the diamond next to a parameter to expose it at material level. Select a connected region and choose **Subgraph** to package it. The active node becomes the single output; all external outgoing connections must originate there. External inputs become typed boundary nodes. Parameters exposed before packaging become instance parameters. Reuse the definition from **Library → Graphs**. The definition editor currently exposes validated JSON, not a nested visual editing tab.

### Preview

The WebGPU preview uses analytic sphere, cube, and plane intersections; tangent-space normal mapping; a GGX distribution; Smith masking; Schlick Fresnel; direct studio lights; procedural environment illumination; and a display tone curve. The environment contribution is an approximation, not an imported HDRI or a path tracer.

Drag to orbit, use the wheel to change distance, and double-click to reset. Preview settings expose exposure, UV repetition, and the normal-map Y convention. Match **Normal Y** to the authored normal map. The 2D view supports pan, cursor-anchored zoom, and a repeated-tile view.

The software preview evaluates the same material channels with reduced-resolution rendering and an approximate ambient term. GPU/CPU filtering and floating-point rounding are not guaranteed bit-identical.

### Persistence and export

Projects auto-save into IndexedDB. **Save** downloads a portable `.sforge` JSON project containing persistent node identities, connections, parameters, channel assignments, reusable definitions, exposed controls, and embedded bitmap data. **Open** validates the entire project before replacing the active one. If browser storage is unavailable, explicit file saves remain available.

**Export textures** evaluates the graph at the requested resolution and creates a ZIP containing:

- Base Color, Normal, Roughness, Metallic, Height, and Ambient Occlusion maps, as selected;
- an additional packed **ORM** map for PNG exports: occlusion in R, roughness in G, metallic in B;
- the editable project and a manifest with channel color spaces, resolution, filenames, and the direct normal generator's convention when identifiable.

PNG is 8-bit per channel. Base Color is sRGB encoded; normal/scalar/ORM channels are data values, with no sRGB encoding. PFM is little-endian, bottom-up RGB float32, always linear/data. **A float32 export container does not add precision to RGBA16F WebGPU intermediates.** Per-node resolution offsets are respected; a lower-resolution output is resampled to the export size. The viewport's selected texture can also be exported individually as PNG.

## Engine architecture

```text
Editable project + persistent identities
    │
    ├─ Atomic graph validation ── snapshot undo/redo journal
    │
    ├─ Reusable-instance expansion ── typed flat DAG
    │
    ├─ Requested-output dependency closure
    │      └─ Relative-resolution propagation
    │      └─ Exact semantic signature interning
    │
    ├─ Cached texture / dirty node decision
    │      ├─ WebGPU: generated WGSL → cached pipeline → compute passes
    │      └─ CPU: dedicated module worker → reference pixel kernels
    │
    └─ Pinned material channels → PBR / 2D preview → pixel readback → export
```

The drawing editor does not define connectivity by position. Edges reference persistent node IDs and destination port indices. Moving a node changes only the saved layout, not its semantic cache signature. Reconnecting a port or changing a parameter changes the affected dependency signatures.

`GraphStore` validates a cloned candidate before committing. Failed edits leave the current project and history untouched. The history retains at most 80 snapshots; adjacent parameter changes can merge into one undo step. Large bitmap-heavy projects therefore warrant explicit saves and a conservative history size. This implementation uses snapshot transactions, not a compact structural command log.

The evaluator inlines reusable definitions before planning work. Topological evaluation is restricted to requested outputs. Cache keys use interned exact descriptors containing the node operation, parameters, effective resolution, seed, bitmap revision, and compact upstream semantic tokens. They do not use lossy 32-bit content hashes or recursively duplicated signature strings. Shared immutable outputs can reuse a cache entry.

On WebGPU, each uncached node writes an `rgba16float` storage texture in an 8×8 compute workgroup. Pipelines are generated and compiled per operation type and cached. Parameters occupy a fixed 256-byte uniform block. A single queue submission contains the ordered passes for an evaluation. Readback honors WebGPU's 256-byte row alignment.

The intermediate cache has a 384 MiB target, an additional 32 MiB texture reuse pool, and a 768 MiB estimated active working-set guard. Current evaluation entries and preview-held output entries cannot be evicted. Uploaded bitmap textures are separately limited to a 128 MiB retained cache. A current pinned working set can exceed the cache target; the target is not a total device-memory guarantee. Source assets, staging buffers, pipeline resources, and browser overhead are additional allocations.

The CPU worker has a 160 MiB retained-cache target and a 768 MiB estimated active working-set guard. Interactive CPU material previews are capped at 256². Explicit exports request their actual chosen resolution and can take substantially longer. JavaScript reference kernels use float32 image buffers; WebGPU writes half-float image buffers. Integer-based hashing is shared algorithmically between the implementations, while subsequent floating-point evaluation can differ.

Evaluation requests are serialized and coalesced. Results superseded by newer UI edits are not published into the preview. Already-running GPU/CPU work is not forcibly interrupted. The graph stores a reverse dependency index for invalidation reporting; cache signatures determine actual recomputation. Bitmap imports are restricted to embedded raster data, with file-size and decoded-dimension guards.

## Source layout

```text
index.html, styles.css           Workspace and responsive styling
src/app.js                      Application orchestration and UI commands
src/core/registry.js             Port types, node schema, uniform ABI, color spaces
src/core/graph.js                Validation, identities, history, inlining, planning
src/core/cpu-kernels.js          Executable reference implementations
src/core/cpu-worker.js           Worker evaluation and intermediate caching
src/core/cpu-engine.js           Worker message transport
src/core/presets.js              Editable demonstration graphs
src/core/persistence.js          IndexedDB, project serialization, bitmap ingestion
src/core/export.js               PNG/PFM conversion, CRC-32, ZIP generation
src/gpu/shaders.js               Generated node WGSL, 2D shader, PBR shader
src/gpu/engine.js                GPU resources, pipelines, cache, dispatch, readback
src/ui/graph-editor.js           Selection, movement, wires, pan/zoom, drag/drop
src/ui/preview.js                GPU and reference preview backends
server.mjs                      Dependency-free static development server
examples/                       Portable .sforge materials
```

## Tests and verification status

```sh
npm test
```

**35 automated Node.js tests pass** in the build environment. They cover all material presets, real reference-kernel outputs, type checking, cycle rejection, atomic rollback, input replacement, output bindings, graph imports, undo/redo, gesture coalescing, dependency invalidation, semantic cache reuse, resolution changes, deletion cleanup, subgraph pixel equivalence, isolated instance parameters, recursion rejection, uniform layout, sRGB/data handling, normal conventions, deterministic generators, repeated sampling, half-float conversion, PFM layout, and ZIP CRC/directory records.

An injected local-content browser harness also passed **19 UI/export checks**, including pointer-driven node movement and port connection, numeric edits, undo/redo, disconnection, shader-source inspection, palette creation, duplication/deletion, exposed controls, reusable graphs, complete project serialization, real PNG output, ORM packing, and ZIP CRC validation. The harness runs the real UI and CPU kernels with an **inline CPU execution adapter** because this environment blocks normal browser navigation and worker loading. Its result list is in `docs/browser-harness-results.json`.

**Not verified in this build environment:** actual WebGPU shader compilation/dispatch, GPU performance, real module-worker transport, and IndexedDB persistence. Do not interpret the browser harness as GPU or worker integration coverage.

A separate, unmodified-runtime test page is provided for those checks. With the app served locally, open:

```text
http://localhost:8080/tests/gpu-smoke.html
```

Press **Run on this device**. It compiles every compute shader, evaluates all presets on the active GPU, validates finite readback and cache reuse, renders both GPU views, tests the actual CPU worker, and uses a separate temporary IndexedDB database. It does not overwrite the application's autosave.

To reproduce the restricted-environment UI harness, install Python Playwright and Pillow, set `CHROMIUM_EXECUTABLE` to a local Chromium executable as necessary, then run `python tests/browser_harness.py`. This is a development-only dependency; the delivered app does not require either package.

## Current boundaries

This is an original material-authoring implementation, not Adobe Substance Designer's full feature set or file-format ecosystem. It does not read `.sbs`/`.sbsar`, reproduce Adobe's proprietary algorithms, or include their assets.

Current limits are 2K graph/export resolution, 1,000 expanded nodes, 4,000 connections, four inputs and one output per reusable subgraph, 48 MiB imported project files, and 4096×4096 bitmap inputs. Reusable graph definitions are edited through JSON after packaging. There is no mesh import, geometric displacement, UDIM system, HDRI import, EXR/16-bit PNG export, mesh baking, arbitrary user-authored shader nodes, collaboration, or color-management system beyond explicit sRGB/linear/data handling. Height is a real generated/exported channel, but the preview does not displace geometry.

The implementation includes professional-style separation, validation, bounded resource policies and tests, but is not a claim of production certification or a substitute for device-specific profiling and integration testing.

## Keyboard workflow

| Action | Shortcut |
| --- | --- |
| Add/search nodes | Tab |
| Frame graph | F |
| Pan graph | Middle-drag or Space + drag |
| Multi-select | Shift-click or marquee |
| Connect | Drag between ports |
| Disconnect | Alt-click input or wire |
| Duplicate / delete | Ctrl/Cmd+D / Delete |
| Undo / redo | Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z |
| Save / open | Ctrl/Cmd+S / Ctrl/Cmd+O |
| Package subgraph | Ctrl/Cmd+G |

The desktop layout is the primary workspace. On narrow screens, sidebars collapse; double-tapping a node opens a properties dialog.

## References

The implementation is original. The following primary documentation informed the workspace conventions and GPU API design:

- Adobe Substance 3D Designer user guide: https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/home
- WebGPU specification: https://www.w3.org/TR/webgpu/
- WebGPU Shading Language specification: https://www.w3.org/TR/WGSL/

MIT licensed. No Adobe affiliation is implied.
