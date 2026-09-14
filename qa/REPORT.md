# LUNA Korpus integration QA

Local result: **PASS — 84/84**. Source: [results.json](results.json).

The actual Aster desktop and every mapped upstream app were launched in Chrome at 1920×1080. A disposable browser context used German/Austrian locale and Europe/Vienna time. No app was replaced by a test fixture. The real desktop double-click, actual reviewed-app host, original HTML bytes, App Center views, File Explorer, Calendar, theme export/switching, Aster Snap, multiwindow session and virtual-file persistence were exercised. Snap uses the original `DesktopWindow.snap` implementation. Test cleanup dismisses unsaved close prompts only in the disposable test context; product close safeguards are unchanged.

- 84 catalog records retained; 20 visible built-ins retained; 19 locally installed original apps.
- 19 on-disk original HTML checksums and 19 executed iframe HTML checksums match their upstream snapshot/output.
- Gridline ribbon, formula bar and sheet tabs are genuine, present and visible.
- Mines and Win32 remain available in the actual built-in App Store view.
- 13 requested desktop shortcuts; Luna selected; Windows profile; focused caption exactly rgb(0,120,200).
- No uncaught JavaScript exceptions and no failed network requests in this local run.

The first development run exposed a caught Folio URL error in the Blob host. The fix loads multi-file original apps at their real vendored HTTP URLs. No Folio application code was edited. The rerun passes.

## Evidence

| Screenshot | Actual view |
|---|---|
| [01-desktop.png](01-desktop.png) | Aster Windows desktop and 13 German (Original) shortcuts |
| [02-appstore.png](02-appstore.png) | Full 84-app discovery catalog |
| [02b-appstore-builtins.png](02b-appstore-builtins.png) | Aster built-ins including Mines and Win32 |
| [02c-appstore-installed.png](02c-appstore-installed.png) | All 19 installed original HTMLs |
| [03-explorer.png](03-explorer.png) | Unchanged Aster File Explorer, virtual /Apps |
| [04-tabelle.png](04-tabelle.png) | Original Gridline |
| [05-mail.png](05-mail.png) | Original Quire |
| [06-korpus.png](06-korpus.png) | Original Formalyth |
| [07-kalender.png](07-kalender.png) | Unchanged Aster Calendar |
| [08-themes.png](08-themes.png) | Real Aster theme settings with Luna selected |
| [09-multiwindow.png](09-multiwindow.png) | Three original programs arranged with native Aster Snap |

Source integrity: [SOURCE-INTEGRITY.json](../SOURCE-INTEGRITY.json). App/source mapping: [UPSTREAM-MANIFEST.json](../UPSTREAM-MANIFEST.json).

Tabelle == Gridline original HTML: **YES**.

Public Pages validation has its own [live/results.json](live/results.json); no local result is substituted for a live result. Upstream baseline results are [13 catalog tests](upstream/catalog-tests.txt) and [54 browser checks](upstream/browser-smoke.txt). These tests do not certify production WAWI, server integrations or every feature in each original program.

## Public Pages acceptance

**PAGES PASS — 84/84**, zero uncaught JavaScript exceptions, zero failed network requests. The same 19 original apps were launched and their executed HTML hashes checked on the public HTTPS URL. [Deployment receipt](live/DEPLOYMENT.json), [results](live/results.json), [visual review](live/VISION.md). The published document is 10,669,028 bytes, SHA-256 `9734116c8200490c71378da7cae613a98f80f971245514ee91d1d9eb50a9b47e`. The independently inspected live native-Snap screenshot shows Gridline, Quire and Formalyth together.

LOCAL PASS / PAGES PASS.
