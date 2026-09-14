# Folio

[Open the GitHub Pages app](https://wieslawsoltes.github.io/Folio/) · [Server-backed workspace](https://folio-workspace.wisodev.chatgpt.site)

Folio is a working collaborative workspace for documents, knowledge, and projects. Its application UI and document/rendering engines are plain HTML, CSS, and JavaScript ES modules. The Cloudflare Worker hosting adapter uses the supplied Vinext build infrastructure; React is not used by the editor or the application UI, and the root route serves the HTML shell directly.

## GitHub Pages edition

The GitHub Pages edition runs immediately without sign-in or a server. It stores documents, database records, comments, history, and uploaded files in **IndexedDB in your browser**. Changes synchronize between tabs on the same browser through BroadcastChannel. A service worker caches the app shell for offline reopening after the first successful visit.

This is device-local storage, not multi-user cloud collaboration. The Share dialog clearly explains this boundary and links to the separately hosted collaborative workspace. The full server/API implementation remains in this repository. Export backups before clearing browser site data. JSON exports contain file references; they do not bundle uploaded file bytes.

Build the static app with no package installation:

```sh
node --test tests/*.test.mjs
node scripts/build-pages.mjs
```

Serve `pages-dist/` with a static HTTP server, or deploy it to any static host. All assets use relative URLs and work under `/Folio/` as well as a domain root. The build writes a local-mode `runtime.js`; the source configuration defaults to server mode for the Worker deployment.

`.github/workflows/pages.yml` validates the code and deploys `pages-dist/` to GitHub Pages on every push to `main`. Pull requests run validation without deploying. The repository's Pages publishing source must be **GitHub Actions**. No npm packages, API keys, or secrets are needed for the Pages build.

## Use the server-backed workspace

- Open the workspace and sign in. First use creates your own persisted workspace with editable example pages and six sample projects.
- Click any page title or block to edit. Type `/` for block commands. Enter creates a block, Shift+Enter adds a line, and Markdown-style prefixes convert blocks.
- Drag a block handle to reorder it. Drag sidebar pages onto another page to nest them. Use the page menu for duplication, moving, export, fonts, width, and trash.
- Open **Projects** and switch among Table, Board, Calendar, Gallery, Timeline, Chart, and List. All views reference the same records. Drag board cards to change groups and calendar cards to change dates.
- Open a record to edit its properties and document. Add typed properties, filters, sorts, related-record links, formulas, or rollups.
- In Timeline, drag a bar to reschedule it or drag its right edge to change duration. Use date navigation, zoom, and record paging. Chart and Timeline use WebGPU when available, with Canvas2D recovery.
- Select text for bold, italic, underline, strikethrough, inline code, highlight, or a link. The corresponding keyboard commands work too.
- Open **Share** to create an expiring editor/commenter/viewer invitation link. An invite accepts a signed-in user into that workspace; it does not send an email. Recipients also need platform access to the deployed site.
- Open comments to create/reply/edit/delete threads, resolve them, and reopen them. Block comments retain their block reference.
- Page history creates checkpoints and restores saved content; an automatic checkpoint follows a 15-second text-edit idle period. The current page is preserved before restoration.
- Settings provides light/dark/system appearance, member management, workspace export, import, and synchronization status.

## Implemented application surface

| Area | Behavior |
| --- | --- |
| Documents | Nested pages, favorites, breadcrumbs, search, icons, cover colors, page duplication, move, trash/restore, proportional/serif/monospace fonts, full width |
| Blocks | Paragraph, H1/H2/H3, checkbox, bullet, ordered list, toggle detail, quote, callout, code, divider, image, file, page link, linked database entry |
| Editing | Character-level replicated text, per-character formatting, cursor/selection restoration, IME-aware redraw suppression, plaintext paste, keyboard block splitting/merging, undo/redo for principal edit actions |
| Database views | Table with row windowing, grouped board, date calendar, gallery, list, GPU timeline, GPU status chart; saved view definitions, column visibility, grouping, filtering and sorting |
| Property types | Text, number, status, select, multi-select, date, person text, checkbox, URL, formula, relation, rollup, creation timestamp |
| Collaboration | Durable operation log, server-enforced workspace roles, expiring/revocable invitation tokens, member role changes/removal, polling synchronization, active page/block presence, comment threads |
| Durability | D1 shared source of truth, atomic browser operation/outbox storage, retry-safe exact-ID acknowledgments, consistent local startup snapshot, R2 files, page history |
| Portability | Markdown import/export, CSV import/export, full workspace JSON operation backup/import with entity remapping, browser print/PDF |
| Agent integration | Feature-detected WebMCP search/read/create/append tools using the same app state |

## Architecture

`public/core.js` provides a dependency-free replica. Text is an RGA-style character graph: each inserted character has an immutable identifier, an anchor, and a deterministic sibling order. Deleted characters retain tombstones, so offline insertions anchored to deleted characters remain reachable. Field values and per-character formatting use Lamport-ordered last-writer-wins registers. Batches split long insertions/deletions into bounded operations. Operation values are cloned and frozen to prevent local mutation outside replication.

`public/sync.js` maintains a durable IndexedDB outbox and mirrored operation log. Fetched operations and their cursor commit in one transaction. Startup reads operations, outbox, and cursor in a consistent transaction. The server acknowledgment only removes exact submitted IDs and never advances the pull cursor. A device-write failure retains its retry queue and surfaces a distinct warning.

`lib/api.js` implements membership checks, operation validation, replay/pagination, invitation creation/acceptance/revocation, role updates, comments, presence, history, and attachments. All SQL values use prepared bindings. D1 is authoritative; IndexedDB holds a replica and recoverable pending edits. Files are stored in R2 and require membership to fetch. Only raster image MIME types are served inline; other files download with restrictive headers.

`public/app.js` implements the application with native DOM controls. Text-only changes patch affected editing elements rather than rebuilding the workspace. Native text controls retain browser selection and input behavior. Tables render a bounded row window for larger databases. `public/gpu.js` uses an instanced WGSL rectangle pipeline, viewport culling, reusable buffers, demand-driven frames, and a spatial hit-test index. A Canvas2D path covers unavailable or lost GPU devices.

## Source layout

- `public/workspace.html`, `public/folio.css`, `public/app.js`: standalone browser application.
- `public/core.js`, `public/sync.js`, `public/gpu.js`: replication, server transport, graphics.
- `public/local-sync.js`, `public/runtime.js`: static-hosting storage adapter and runtime selection.
- `scripts/build-pages.mjs`, `.github/workflows/pages.yml`: dependency-free static build and publication.
- `public/seed.js`, `public/validation.js`: sample content and import validation.
- `lib/api.js`: Worker-compatible application API.
- `app/route.ts`, `app/api/folio/[[...path]]/route.ts`: thin hosting adapters.
- `db/schema.ts`, `drizzle/`: D1 schema and migration history.
- `tests/`: engine, API, UI-logic and persistence regressions.
- `docs/`: capability boundaries and validation evidence.

## Development

Use Node 24 or later for the test suite's built-in SQLite adapter. The application engine itself uses modern browser ES modules.

```sh
pnpm install
pnpm test
pnpm build
```

The repository retains the Sites/Vinext tooling and lockfile. Configure logical D1 `DB` and R2 `BUCKET` bindings in `.openai/hosting.json`. Apply generated migrations before serving the API. The bundled `pnpm dev` flow and its platform instructions provide the local runtime; production is a Cloudflare Worker plus static assets.

The authenticated-user headers are trusted only behind the platform's authenticated ingress. A separate hosting deployment must provide a verified identity boundary and strip caller-supplied identity headers. Do not expose the Worker directly while trusting arbitrary browser-supplied headers.

No external AI provider, proprietary file translator, or third-party integration is required for the implemented features.

## Verification and limits

See [validation](docs/VALIDATION.md) and [capability boundaries](docs/CAPABILITIES.md). This release is a substantial functional workspace implementation, not a complete replacement for every feature of a mature enterprise workspace platform. It has not received a production security audit, physical-GPU qualification, or multi-user browser end-to-end certification.
