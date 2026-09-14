# LUNA KORPUS — original Aster acceptance evidence

## Verified implementation

The source is Aster commit `a7cca00c03837f8f94e2f6b1cccc2f82830e32fc`. Its Python builder, Explorer/Notepad implementation, tools/Calendar implementation, creative-app implementation and renderer are unchanged. `PROVENANCE.json` compares all 87 upstream source files: 79 are byte-identical; eight contain the documented metadata, title, theme or HTML-host integration changes. Four new Luna source files supply metadata, original packages, the resource-only packaging adapter and chrome paint. No application or desktop shell is reimplemented.

The runtime is `Luna-Korpus.html`; Pages `index.html` is identical. There are nineteen exact upstream HTML entries under `/Apps`, thirteen portable upstream releases and six upstream modular releases with their original asset trees. The six modular releases use a generic resource transport in the existing Aster HTML host. Their files on disk and in the native virtual workspace retain the upstream hashes.

## Completed checks

| Check | Result | Evidence |
|---|---:|---|
| Pristine upstream Aster browser smoke suite | 54/54 PASS | `upstream-browser-results.json`, `upstream-browser.log` |
| Pristine upstream Aster catalog suite before changes | 13/13 PASS | Assembly baseline log |
| Luna source/artifact/theme integrity | 35/35 PASS | `integrity.json` |
| Label-aware catalog and platform-preservation suite | 16/16 PASS | `catalog-luna-tests.log`, `catalog-luna.cjs` |
| Local HTTP desktop/browser acceptance | 23/23 PASS | `local/results.json` |
| Direct single-file `file://` acceptance | 23/23 PASS | `file/results.json` |
| Mapped applications opened with network disabled after boot | 19/19 PASS | `offline-results.json` |
| Real Gridline formula commit/readback and catalog-to-local launch | 2/2 PASS | `offline-results.json` |
| Uncaught JavaScript errors in final HTTP, file and offline checks | 0 | Respective JSON reports |
| Native Store visible records | 123 | 20 built-ins + 84 catalog records + 19 installed records |
| Native catalog records preserved | 84/84 | `local/results.json` |
| Desktop shortcuts | Exactly 13 | `local/results.json` |
| Native workspace original-source SHA-256 matches | 19/19 | `local/results.json`, `integrity.json` |

The native catalog and installed copy of a mapped app are separate Store records opening the same local engine, not distinct products. Mines and Win32 remain visible in Store and absent from desktop pins. Other unmapped catalog apps retain their original on-demand upstream URLs.

The unmodified upstream catalog suite run against translated titles produces four expected display-name assertion failures. Its source and that diagnostic log are retained (`themed-catalog-tests.log`). The label-aware suite reruns the same original tests, applying those English-title expectations to the preserved `originalTitle`, and separately validates every translated display name. It does not waive URL, inventory, media-scope, immutability or embedded-catalog checks.

## Screenshots

The required nine 1920×1080 captures are available both directly under `qa/` and in `qa/local/`:

`01-desktop.png`, `02-appstore.png`, `03-explorer.png`, `04-tabelle.png`, `05-mail.png`, `06-korpus.png`, `07-kalender.png`, `08-themes.png`, `09-multiwindow.png`.

Additional Store captures demonstrate Mines, Win32 and unpinned Office; `qa/file/` contains the same tests from direct disk opening. The captures show real rendered browser output, not mockups or image-generated interfaces.

Initial visual inspection confirmed the original Windows shell, full Store, original Explorer, Gridline ribbon/formula bar/sheet tabs, original Quire document editor, original Formalyth WebGPU workbench and Aster Calendar. Final theme/multiwindow inspection and live verification are recorded separately in `VISION.md` and `live/results.json` after completion.

## Boundaries

The requested label “Mail (Quire)” does not turn Quire's original document editor into an email client. Backend, real-account collaboration and cloud features still require the original services and configuration. These checks establish original-app identity, startup, specific interactions, packaging and the requested desktop layout, not exhaustive acceptance of every upstream feature or manufacturing calculation.

Luna integration and Aster are MIT; original dependencies retain their notices. Folio and Velsign do not declare an application-wide license in the reviewed checkout, so this project does not claim to relicense those apps as MIT. This is unofficial, built on Aster, and not licensed WAWI.

**Tabelle == Gridline original HTML: YES**
