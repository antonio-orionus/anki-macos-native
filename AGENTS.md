# macOS Native for Anki — agent guide

An Anki add-on (Anki 26.x, PyQt6 / QtWebEngine, macOS) that restyles the main window as a native macOS 27 app. Read `.agents/memory/MEMORY.md` before starting work.

## Principles

- **Restyle Anki's markup; never replace it.** Anki's onclick handlers, ids, jQuery UI drag-and-drop and other add-ons' toolbar links depend on its DOM. Move or decorate Anki's nodes in `macos.js`, and never recreate them.
- **Hooks over private APIs.** Use `gui_hooks.*` and `webview_will_set_content`. Do not monkey-patch `DeckBrowser._renderPage` or similar, and do not wrap `AnkiWebView`. Those breaks show up silently on Anki updates.
- **Every DOM enhancement must be idempotent.** Anki re-renders parts of pages at will, and a `MutationObserver` re-runs `run()`.
- **The design system is DESIGN.md.** Tokens, components and named rules live there, mirrored in `.impeccable/design.json`. A new colour or radius goes into DESIGN.md first, or not at all.
- **Verify in the real app, not by reasoning.** See "Verifying" below. A claim about clicks, timing or rendering needs a trace or a capture.

## Layout

- `addon/` is the add-on itself; it gets packaged.
  - `__init__.py`: hooks, screen detection, accent and on-accent injection, settings.
  - `titlebar.py`: unified title bar (Qt `ExpandedClientAreaHint`), traffic-light centring and window drag/zoom on empty toolbar space. Uses AppKit through `ctypes` `objc_msgSend`, with no PyObjC.
  - `web/macos.css`: the entire visual design, scoped to `html.mx[data-mx="<screen>"]`.
  - `web/macos.js`: DOM enhancement (icons, groups, the overview restructure, the answer-capsule morph, the whole-row deck click).
- `scripts/build.sh` builds `dist/anki-macos-native-<version>.ankiaddon`.
- `scripts/dev-link.sh` symlinks `addon/` into `~/Library/Application Support/Anki2/addons21/anki_macos_native`.
- `scripts/screenshots.mjs` regenerates `docs/screenshots/` in light and dark (see README).
- `DESIGN.md`, `PRODUCT.md` and `.impeccable/` hold the design system and product record.

Screens are named by `data-mx`: `toolbar`, `deckbrowser`, `deckbrowser-bottom`, `overview`, `overview-bottom`, `reviewer`, `reviewer-bottom`, `bottom`.

## Dev loop

1. Run `./scripts/dev-link.sh` once.
2. Python changes need an Anki restart. CSS/JS changes need a page re-render, and a restart is the reliable way.
3. Launch Anki for inspection:
   ```bash
   MX_DEV=1 QTWEBENGINE_REMOTE_DEBUGGING=9229 /Applications/Anki.app/Contents/MacOS/Anki
   ```
4. List the webviews with `http://127.0.0.1:9229/json`. They are titled `top toolbar`, `main webview` and `bottom toolbar`. Drive them with CDP `Runtime.evaluate` (Node 22+ has a global `WebSocket`).
   - Navigate with `pycmd('decks')`, `pycmd('open:<deckId>')`, `pycmd('study')` and `pycmd('ans')`.
   - **Never send `ease1`–`ease4`.** Grading changes the user's scheduling.
5. `MX_DEV=1` enables `pycmd('mx:shot:<path>')`, which saves `mw.grab()` (no title bar). For real window captures, use `screencapture -l <windowID>` (`scripts/lib/window-id.swift`). Never pass `-o`: it fails on this machine.
6. When done, relaunch Anki normally so the debug port isn't left open.

## Verifying

- **Rendering:** capture light and dark for every touched screen, and a narrow window (640pt). Simulate dark by toggling `night-mode` on `<html>` and `nightMode` / `night_mode` on `<body>` in each webview. That is what Anki does itself, and it leaves the user's setting alone.
- **Clicks and timing:** trace before theorising. Add temporary logging in the page (send it via `pycmd('mx:log:…')`) and in Python with timestamps, reproduce with a *real* mouse, then read the trace. Remove the tracing before committing.
- **Synthetic input:** posting CGEvents moves the user's real pointer and needs Accessibility permission. Ask first. When a synthetic click "fails", check the helper's exit code before blaming the add-on.

## Gotchas (each one cost real time)

- **`pycmd` arrives late.** Anki injects `pycmd` via QWebChannel at *DocumentReady*, which can come after your `DOMContentLoaded` code. Look it up when you call it, and retry if it's missing. Never gate setup on `typeof pycmd` at load.
- **Tall rows look clickable.** Anki only opens a deck from the `a.deck` link. Our 40px rows promised a whole-row target, so users clicked empty row space and got nothing. `openDeckOnRowClick` fixes this. Any new large hit-area styling needs the same treatment.
- **The expanded marker is a Unicode minus.** Anki marks expanded decks with "−" (U+2212), not "-".
- **Chromium stops painting covered windows.** Captures of a background Anki come out stale and identical. Launch with `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding` and activate Anki before each capture.
- **Window flags are lost on native-window recreation.** Re-apply the title-bar hints on `profile_did_open`. AppKit re-lays out the title bar after resizes, so `_center_traffic_lights` runs on Resize, Show and WindowStateChange.
- **`isMaximized()` doesn't see macOS zoom.** Double-click calls `performZoom:` and honours `AppleActionOnDoubleClick`.
- **`startSystemMove()` swallows the click.** A press treated as "empty toolbar" never reaches the page. The toolbar reports its clickable rects (`mx:rects`), and a missing report turns buttons into drag handles.
- **Hidden labels still take up gap space.** Zero-size text keeps a flex gap. Round icon buttons need `gap: 0`.
- **Specificity of the injected accent.** The live accent is injected as `html.mx{--mx-accent}`, and the CSS default sits on `:root`. Never set `--mx-accent` on `html.mx` in the stylesheet, or the system accent stops applying.
- **Anki's own reduce-motion.** It is `body.reduce-motion`, separate from `prefers-reduced-motion`. Respect both.

## Not covered yet

The Browse window, the Add/Edit editor, deck options and stats keep Anki's look. Since Anki 26.08 the editor is a SvelteKit page, so style it via `gui_hooks.webview_did_inject_style_into_page` plus a URL check, not `isinstance(context, Editor)`. Qt widgets should get QSS through the `gui_hooks.style_did_init` filter, never `app.setStyleSheet` directly.

## Releasing

1. Bump `human_version` in `addon/manifest.json`.
2. Regenerate screenshots if the UI changed: `node scripts/screenshots.mjs`.
3. Commit and push, then run `./scripts/build.sh` and `gh release create vX.Y.Z dist/anki-macos-native-X.Y.Z.ankiaddon`.

`gh` must act as `antonio-orionus`: `GH_TOKEN="$(gh auth token --user antonio-orionus)" gh …`. Git pushes go over the `github-orionus` SSH alias.

## Commits

Author and committer are Antonio. Never add AI attribution: no `Co-Authored-By` trailers and no "Generated with" lines. Commit messages describe what changed and why.
