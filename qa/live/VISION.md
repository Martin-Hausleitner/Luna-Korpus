# Public Pages visual review — PASS

The screenshots in this directory were captured from https://martin-hausleitner.github.io/Luna-Korpus/ at 1920×1080 by real Chrome, not from localhost or a mock page. The downloaded root document is byte-identical to the locally verified themed Aster build; see DEPLOYMENT.json.

The live multiwindow screenshot was visually inspected through a SHA-256-verified reduced WebP preview. It shows three actual upstream programs in native Aster Snap: Gridline occupies the left half with its own green ribbon, formula row, workbook and sheet tabs; Quire is upper-right with its own document-editor ribbon; Formalyth is lower-right with its design ribbon and 3D housing model. The focused Aster caption is blue, the taskbar is the original Aster bottom taskbar, and the three application rectangles do not overlap. The full-resolution 09-multiwindow.png is retained. This confirms the previously inspected local nine-view sheet on the public deployment, without substituting a localhost screenshot.

Live browser checks: 84 passed, zero failed. Every one of the 19 executed HTML hashes matches the original vendored source/output. No uncaught JavaScript exceptions or failed requests were observed. These are integration/smoke checks, not certification of every upstream feature or a production WAWI system.

LOCAL PASS / PAGES PASS.
Tabelle == Gridline original HTML: YES.
