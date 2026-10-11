---
name: users-collection-is-real
description: Testing must not change the user's Anki collection or desktop without consent
metadata:
  type: feedback
---

The dev Anki profile is the user's real collection.
- When testing, only navigate (`decks`, `open:`, `study`) and reveal answers (`ans`).
- Never send `ease1`–`ease4`, drag decks (a drop reparents them), mark or flag cards.
- Simulate those states in the DOM instead.

Ask the user before posting synthetic mouse or keyboard input or quitting and relaunching Anki. The user said: "you must ask me for permission, not silently continue".

**Why:** scheduling changes and moved decks can't be undone cleanly, and synthetic input takes over the user's pointer.
**How to apply:** state what will happen (for example "3 clicks in Anki's toolbar, ~2 s") and wait for a yes. A blanket "do what you want" covers that session only.
