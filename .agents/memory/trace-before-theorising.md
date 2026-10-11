---
name: trace-before-theorising
description: Interaction bugs in Anki webviews are found by timestamped traces of real clicks, not by reasoning
metadata:
  type: project
---

"Clicking a deck needs a double click and ~10 s" (2026-10-11). Two theories were wrong:
- a MutationObserver loop (measured: zero mutations)
- the title-bar drag filter swallowing clicks (traced: every press classified correctly)

The real cause was in a page-side trace of the user's real mouse: clicks landed on `TD.decktd`, not `A.deck`. The 40px rows looked fully clickable, but only the name link was hot.

**Why:** the symptom ("slow", "double click") pointed at performance, but the cause was hit-area design.
**How to apply:** for any click or latency report, add page-side (`pycmd('mx:log:…')`) and Python timestamped tracing, have the user reproduce with a real mouse, and read the trace before changing code. See [[test-harness-lies]].
