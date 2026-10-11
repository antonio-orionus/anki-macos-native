---
name: test-harness-lies
description: Verify the test tooling itself before trusting a failing or passing result
metadata:
  type: project
---

Two harness failures in one session (2026-10-11) both looked like add-on bugs:
1. A Swift CGEvent click helper crashed intermittently (exit 133), so "Study Now fails 4/5" was really "no click sent 4/5".
2. `screencapture -l` of a covered Anki window returned 8 byte-identical stale frames, because Chromium stops painting occluded windows.

**Why:** a broken harness produces confident, wrong conclusions.
**How to apply:**
- Check helper exit codes.
- Check that capture files exist, are non-empty and differ (`md5 -q … | sort | uniq -c`).
- Open the images before drawing conclusions.
- Launch Anki with the occlusion flags (see AGENTS.md) for captures.
