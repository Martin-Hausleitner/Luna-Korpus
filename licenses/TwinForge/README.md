# TwinForge

**A real, independent dual-pane file manager in plain HTML, CSS, and JavaScript.**

TwinForge combines a familiar commander-style layout with a custom WebGPU file-list renderer. It is a working browser application, not an HTML mockup. There are no frontend frameworks, runtime dependencies, CDNs, analytics, remote fonts, or upload services.

## GitHub Pages

**[Launch TwinForge](https://wieslawsoltes.github.io/TwinForge/)**

The Pages workflow tests and rebuilds the standalone HTML on every push to `main`.
Local file operations remain in your browser; GitHub Pages only serves static application files.
See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment and verification details.

## Run it

### Recommended: localhost

Extract this package, open a terminal in the extracted `twinforge` directory, and run:

```sh
python3 serve.py
```

On Windows, use `python serve.py` if `python3` is not available.

Open **http://localhost:8080** in a compatible browser. The Python server serves static files only; it does not provide filesystem access or receive uploads. All actual file operations happen in your browser using handles you explicitly authorize.

For direct local-folder access, use a browser that exposes `showDirectoryPicker`, such as desktop Chrome or Edge. Press **Connect folder**, or use the folder-with-plus button in either pane. A connected local folder is real: editing, moving, and deletion affect that folder.

The browser may ask for permission again after a restart. Re-select the saved location from its pane's location selector. Permissions and WebGPU support depend on the browser, platform, and security policy. The **Help → Browser capabilities** dialog reports actual detected support.

### Single-file version

`TwinForge.html` is self-contained, including the renderer, styles, and filesystem code. It can also be served by any static host or copied to another machine. Opening it directly may work, but browser filesystem, storage, and GPU behavior can differ on `file:` URLs. Use localhost or HTTPS for the intended deployment.

`index.html` is the same compiled single-file application, ready for a static website. No build step is needed to run either file.

### Work without connecting a local folder

The app creates two usable locations, **Workspace** and **Inbox**, and seeds editable example documents, project files, images, logs, and a ZIP. It tries Origin Private File System (OPFS) storage, then IndexedDB, then an explicitly labeled nonpersistent in-memory fallback.

The Workspace and Inbox are **browser storage**, not automatically your operating system's Desktop or Downloads directories. Import or drag in files to copy them into a location. Export to download them again.

**Important:** clearing site data or deleting the browser profile can delete the browser workspace. Private browsing may discard it at session end. Export important work. A persistent-storage request is available under **Configuration → Storage information**, but the browser decides whether to grant it.

## Included features

### Navigation and interface

- Independently navigable twin panes with a draggable divider.
- Folder tabs, back/forward history, editable location paths, parent navigation, favorite folders, and pane swapping.
- Full and brief detail columns; name, extension, size, and modification-time sorting.
- Natural numeric filename sorting, hidden-file toggle, substring and wildcard quick filtering.
- Focus and independent multiselection; Ctrl/Command-click, Shift-click, Space/Insert, mark-all, invert, and wildcard marking.
- Context menus, function-key bar, searchable command palette, and extensive keyboard shortcuts.
- Light, dark, and classic commander themes; three row densities.
- Responsive desktop/tablet layout and accessible virtual row metadata.

### Real file operations

- Native local directory handles and persistent browser workspace locations.
- Create folders and text files; edit and save files; copy, move, rename, duplicate, delete, import, and export.
- Recursive folder copying and transfers between locations.
- Copy-conflict choices: replace/merge, keep both, skip, or cancel; optional apply-to-remaining policy.
- Sequential transfer queue with cooperative pause, resume, cancellation, byte counts, and error details.
- Moves and renames copy first, verify destination bytes against the source, then request source removal.
- Protection against copying a directory into itself or its descendants.
- Internal clipboard and drag-and-drop transfers between panes; file/folder import where the browser provides suitable drag handles.
- Local-folder handles can be saved in IndexedDB and reauthorized in later sessions.

### Editing, viewing, and tools

- UTF-8 text editor with native textarea editing, line numbers, find/replace, regex option, line navigation, JSON formatting, wrapping, and LF/CRLF selection.
- UTF-8 BOM preservation and byte-comparison detection of files changed outside the editor.
- Unsaved-change confirmation and export from the editor.
- Read-only text and hex viewer; image previews; browser-native audio/video controls; sandboxed PDF embedding where supported.
- Opposite-pane quick view.
- Recursive filename and literal-content search, cancellable, with navigable results.
- Multi-rename preview: name/extension templates, counters, padding, prefix/suffix via templates, literal/regex replacement, and case conversion. Collisions and rename cycles are rejected.
- Side-by-side, line-aligned text comparison, with a positional fallback explicitly labeled for larger inputs.
- Current-folder comparison by name/type/size.
- Reviewable, one-way recursive synchronization by size or by size plus SHA-256. Destination-only files are preserved; nothing is deleted by synchronization.
- File properties, directory-size calculation, and SHA-256 checksums in secure contexts.
- ZIP32 creation, extraction, and read-only archive navigation. Creation uses stored entries; extraction supports stored and deflate entries with CRC verification and path validation.
- Built-in command entry: `pwd`, `ls`/`dir`, `cd`, `mkdir`, `touch`, `open`, `edit`, `copy`, `move`, `rename`, `delete`, `find`, `refresh`, `clear`, and `help`. Quoted filenames are supported. This is **not an operating-system shell**.

## WebGPU rendering

`src/renderer.js` implements the file-list renderer. It requests a real WebGPU adapter/device and creates a WGSL pipeline, vertex/uniform buffers, sampler, and glyph-atlas texture.

Visible row backgrounds, selection/focus indicators, dividers, procedural file icons, and text glyphs are batched into **one WebGPU draw call per pane per rendered frame**. The renderer supports device-pixel-ratio scaling, invalidation-based redraw, buffer reuse, and device-loss fallback. It does not animate continuously while idle.

Controls, dialogs, text editing, and accessibility metadata use ordinary HTML. These are not drawn by WebGPU. The application transparently uses Canvas 2D for file lists when WebGPU is unavailable or initialization fails, and the status bar identifies which renderer is active. `?canvas=1` intentionally requests the fallback for comparison.

Directory entries are virtualized. Only visible rows and a small margin receive initial metadata reads; full metadata is loaded when size/date sorting requires it. Enumeration and sorting themselves still depend on the number of entries and storage speed.

**View → Rendering benchmark** creates 100 to 250,000 synthetic read-only entries without writing files. It tests list virtualization, not real disk performance. It is not a hardware-performance guarantee.

Inspect live diagnostics in the developer console:

```js
await TwinForge.diagnostics()
```

## Safety and implementation limits

This is an independent implementation of common commander-style workflows, **not a 100% replacement for desktop Total Commander**.

- There is no unrestricted drive scanning, arbitrary executable launching, OS shell integration, raw FTP/SFTP, native shell extensions, NTFS permissions editor, or native plugin compatibility.
- Deletion is permanent and bypasses the operating system's Trash/Recycle Bin. There is no undo.
- Moves, renames, extraction, and synchronization are not atomic transactions. Cancelling leaves completed changes in place. A move cancelled after copying can leave both copies. An interrupted directory copy can leave a partial destination directory.
- Byte verification before source removal detects changed input and damaged copies, but cannot eliminate every race with an external process changing the source immediately before removal. Avoid editing the same files externally during a move.
- Timestamps, platform-specific permissions, alternate data streams, and other native filesystem metadata are not preserved by copy-and-write operations.
- Local-file write permissions must be supplied by the browser. Browser/OS-reserved shortcuts may not reach the application; every action has a menu/button alternative.
- The editor is UTF-8 only, at most 8 MB per file. Binary/UTF-16 files are read-only in the viewer. Mixed line endings are normalized to the selected LF or CRLF style on save.
- Text preview is bounded to 1 MB; quick view to 256 KB; hex view to 64 KB.
- Search reads content only for text-like files up to 8 MB and stops at 5,000 results.
- Text comparison accepts up to 8 MB per file, uses a bounded line alignment, and displays at most 20,000 rows. Very large comparisons use positional alignment.
- SHA-256 uses the browser's SubtleCrypto implementation, requires a secure context, and is bounded to 256 MB per file. Synchronization flags larger equal-size files for manual review in content mode.
- ZIP processing is bounded to 512 MB input/output and 10,000 entries. ZIP64, multi-volume ZIP, encryption, unsupported compression methods, conflicting paths, and legacy non-UTF-8 non-ASCII names are rejected. No RAR/7z/TAR support is claimed.
- ZIP creation stores files without compression. No existing ZIP is edited in place. Extract, edit, and repack instead.
- Directory nesting is bounded to 96 levels. Synchronization preview is bounded to 50,000 entries per side.
- Browser image/media/PDF decoding is format- and platform-dependent. HTML and executable files are not executed as previews.
- The persistent IndexedDB fallback prioritizes portability over very-large-workspace performance; OPFS is preferred when available.

## Keyboard essentials

| Shortcut | Action |
|---|---|
| Tab | Switch panes |
| Enter / Backspace | Open item / parent folder |
| Space or Insert | Mark item |
| Ctrl/Command+A | Mark all |
| Ctrl/Command+F | Quick filter |
| Ctrl/Command+R | Refresh |
| Ctrl/Command+T / W | New / close tab |
| Ctrl/Command+C / X / V | Internal copy / cut / paste |
| F2 or Shift+F6 | Rename |
| F3 / F4 | View / edit |
| Shift+F4 | Create and edit a text file |
| F5 / F6 | Copy / move to opposite pane |
| F7 / F8 | New folder / delete |
| F9 / F10 | Queue / preferences |
| Alt+F5 / Alt+F9 | Pack / extract ZIP |
| Alt+F7 | Find files |
| Ctrl/Command+M | Multi-rename |
| Ctrl/Command+Q | Quick view |
| Ctrl/Command+U | Swap panes |
| Ctrl/Command+D | Favorites |
| Alt+Enter | Properties |
| Ctrl+Shift+P or Ctrl/Command+K | Command palette |
| F1 | In-app help |

## Source and build

```text
TwinForge.html       Portable, self-contained application
index.html          Identical application, static-host entry point
serve.py            Local-only static server (Python standard library)
build.py            Concatenates the modules into the standalone HTML
src/index.html      Source HTML shell
src/style.css       Interface themes and responsive layout
src/fs.js           Filesystem adapters, file operations, verification, queue
src/renderer.js     Real WebGPU renderer and Canvas fallback
src/zip.js          ZIP32 writer and bounded reader
src/app.js          UI, pane navigation, tools, dialogs, commands
 tests/             Automated unit and browser integration tests
```

Edit the source files, then rebuild:

```sh
python3 build.py
```

There is no npm install step. The optional `package.json` provides convenience scripts and marks the source as JavaScript modules. Source modules can also be served directly at `/src/`.

## Tests and verification status

**22 Node unit tests and 23 Chromium integration checks passed during this build.** Results and coverage are documented in `TESTING.md` and `test-results.json`.

The included browser was policy-restricted: navigation to localhost and native directory pickers were blocked. Browser integration tests therefore used an `about:blank` injection harness with the real **Canvas 2D + in-memory filesystem fallback**. The tests checked actual file contents, mutations, dialogs, ZIP deflate decoding, image previews, synchronization, keyboard actions, and virtualization of 100,000 entries.

**The native browser WebGPU execution path, OPFS persistence, native directory-picker permissions, and hardware performance were not verified end-to-end in this environment.** They are implemented and feature-detected, but should be validated on your target browser with a disposable test folder before important files are used.

Unit tests (Node 22 or later):

```sh
node --test tests/unit.test.js
```

Browser tests require Python Playwright and a Chromium executable. They are development dependencies only, not application dependencies.

```sh
python3 tests/browser.test.py --url http://localhost:8080 --browser /path/to/chromium
```

To reproduce the fallback test environment:

```sh
python3 tests/browser.test.py --browser /path/to/chromium
```

Use a fresh browser profile for tests. The automated suite mutates only its seeded workspace, but it does create, rename, and delete test items there.

## Technical references

- File System Access specification: https://wicg.github.io/file-system-access/
- Chrome's File System Access guide: https://developer.chrome.com/docs/capabilities/web-apis/file-system-access
- WebGPU specification: https://www.w3.org/TR/webgpu/
- WGSL specification: https://www.w3.org/TR/WGSL/
- Original product feature reference: https://www.ghisler.com/

## Attribution

TwinForge is an original, independent implementation. It is not affiliated with Total Commander or its authors. No original Total Commander source, binaries, artwork, or plugin code is bundled. The sample documents and geometric SVG sample images were created for this application. The TwinForge source is provided under the included MIT license; this does not grant rights to any third-party marks.

## Portable browser tests

```sh
python3 -m pip install -r requirements-test.txt
python3 -m playwright install chromium
python3 tests/browser.test.py
python3 tests/smoke.py
```

Set `TWINFORGE_BROWSER` to a browser executable to override the Playwright-managed browser. The integration suite also accepts `--browser PATH` and `--url URL`. The default opaque-origin harness intentionally exercises Canvas and the in-memory filesystem; it does not validate native folder permissions or hardware WebGPU.
