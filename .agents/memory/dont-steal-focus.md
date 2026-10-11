---
name: dont-steal-focus
description: Verify headlessly; never activate Anki or open visible windows while the user works on the same Mac
metadata:
  type: feedback
---

The user works on the same MacBook during sessions. "try to not interrupt me opening anki windows" (2026-10-11).
- Launch Anki with `open -g` (the env flags are in AGENTS.md).
- Never run `osascript … activate`.
- Inspect SvelteKit pages through the hidden `mx:preview:` view rather than opening dialogs.
- Capture background windows with Chromium occlusion throttling disabled.

**Why:** every relaunch, activation or dialog jumps over their work and steals keyboard focus.
**How to apply:** batch any unavoidable relaunch and say beforehand what will happen. Check `frontmost` before and after a run to confirm focus never moved. See [[users-collection-is-real]].
