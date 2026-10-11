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
  - `__init__.py`: hooks, screen detection, accent and on-accent injection, settings. SvelteKit pages (deck options) are styled from `webview_did_inject_style_into_page` by URL path (`SVELTE_PAGES`).
  - `menus.py`: macOS-style Qt popup menus. `QMenu.__init__` is wrapped so every menu created from Python gets the current theme's QSS and a translucent window. Attaching it per menu avoids depending on when Anki applies its app-wide stylesheet; a `style_did_init` hook was tried and never reached the deck menu.
  - `qt/fields.qss`: one field style for every text input in Anki (QLineEdit, QComboBox, spin boxes), appended to the **app** stylesheet on profile open and on every theme change, with drawn chevrons `qt/chevron-*.svg`. An editable combo box's inner QLineEdit is kept bare.
  - `qtstyle.py` + `qt/*.qss`: Qt stylesheets for the Browse and Add / Edit windows, with `@token@` placeholders filled per theme. They are attached to the window, and also appended to the table and tree widgets' own stylesheets, because Anki gives those widgets stylesheets that outrank the window's.
  - `dev.py`: MX_DEV-only commands (below).
  - `quiet.py`: `MX_QUIET=1` launches. Anki's startup `activateWindow()` / `raise_()` calls are suppressed for 15 s so the screenshot script's relaunches don't take focus.
  - `titlebar.py`: unified title bar (Qt `ExpandedClientAreaHint`), traffic-light centring and window drag/zoom on empty toolbar space. Uses AppKit through `ctypes` `objc_msgSend`, with no PyObjC.
  - `web/macos.css`: the entire visual design, scoped to `html.mx[data-mx="<screen>"]`.
  - `web/macos.js`: DOM enhancement (icons, groups, the overview restructure, the answer-capsule morph, the whole-row deck click).
- `scripts/build.sh` builds `dist/anki-macos-native-<version>.ankiaddon`.
- `scripts/dev-link.sh` symlinks `addon/` into `~/Library/Application Support/Anki2/addons21/anki_macos_native`.
- `scripts/screenshots.mjs` regenerates `docs/screenshots/` in light and dark (see "Updating the README screenshots").
- `DESIGN.md`, `PRODUCT.md` and `.impeccable/` hold the design system and product record.

Screens are named by `data-mx`: `toolbar`, `deckbrowser`, `deckbrowser-bottom`, `overview`, `overview-bottom`, `reviewer`, `reviewer-bottom`, `bottom`, `deck-options`.

On SvelteKit pages, style by Anki's stable component classes (`.deck-options-page`, `.spin-box`, `.select-container`, `.form-switch`, `.sticky-container`, `.container.light|.dark`), never by the generated `svelte-xxxx` hashes, which change with every Anki release. The `.item` and `svelte-css-wrapper` elements are `display: contents`, so they draw nothing; put borders and padding on the `.row` inside.

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
5. `MX_DEV=1` enables two dev commands:
   - `pycmd('mx:shot:<path>')` saves `mw.grab()` (no title bar).
   - `pycmd('mx:open:browser')` / `mx:open:add` open the real window **off-screen** without activating it. `mx:grab:<name>:<path>` renders it, `mx:reloadqss` re-reads `qt/*.qss` into it (no relaunch needed), and `mx:close:<name>` closes it. Always close previews before quitting Anki: Anki saves window geometry on close, and dev.py restores the user's saved geometry, including again 2 s later, because Add Cards saves only after an async check.
   - `pycmd('mx:gallery:<path>')` renders every input type under the app stylesheet, light and dark.
   - To see tags without touching the collection, set tags on the **unsaved** Add draft with pyeval (`windows["add"].editor.note.tags = […]; editor.loadNote()`), capture, then clear them.
   - `pycmd('mx:pyeval:<path>|<expr>')` writes `repr(eval(expr))` to a file, with `mw` and `windows` (open previews) in scope. Use it to inspect widgets instead of guessing.
   - `pycmd('mx:menushot:<path>')` renders a sample menu in both themes to `<path>-light.png` / `-dark.png`, and writes `<path>-check.json`, which confirms that a menu built like Anki's carries the stylesheet and translucency.
   - `pycmd('mx:preview:deck-options/<deckId>')` renders that page in a hidden, off-screen view (titled `deck options` on the CDP list), so you can inspect and screenshot it without a window popping over the user's work. Hot-reload CSS there by bumping the `?v=` on `#mx-css`. It shows the user's real settings: never press Save in it.

   Launch in the background so Anki never takes focus:
   ```bash
   open -g -a Anki --env MX_DEV=1 --env QTWEBENGINE_REMOTE_DEBUGGING=9229 \
     --env "QTWEBENGINE_CHROMIUM_FLAGS=--disable-backgrounding-occluded-windows --disable-renderer-backgrounding"
   ``` For real window captures, use `screencapture -l <windowID>` (`scripts/lib/window-id.swift`). Never pass `-o`: it fails on this machine.
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
- **Qt and Anki activate the app while launching, even under `open -g`.** `MX_QUIET` stops Anki's own calls. `scripts/lib/keep-focus.swift` hands focus back for anything left, and it guards **only during the launch** (plus 2 s). Running it longer fights the user when they click into Anki on purpose, and its activation counts then include their clicks. Do not use `Qt::AA_PluginApplication` to suppress activation, because it changes Qt's menu-bar handling.
- **Offscreen widget renders paint a square background.** `QWidget.grab()` and `render()` of an unshown translucent menu fill the corners, while the real popup is clean. The script masks the corners. Verify window chrome such as shadows and corners on the real popup, with the user.
- **The note editor is a legacy page with a CSP that blocks inline scripts.** It is `aqt.editor_legacy.Editor` (a `legacyPageData` URL), not the SvelteKit editor. The inline boot `<script>` never runs there, so `macos.js` also reads the screen and accent from its own URL query string. The editor's scripts also rewrite `<html>`'s class and `data-mx`, so `macos.js` re-applies its markers whenever they are removed.
- **A window stylesheet cascades into every dialog opened from it** (Choose Deck, Fields, Find and Replace). Attach only window-matching rules (`QDialog` / `QMainWindow`) to the window, and append the rest to the widgets that exist when it opens.
- **Open windows must re-style on theme change.** macOS can switch appearance mid-session, so `on_theme_change` re-runs `restyle_window` for every open dialog in `aqt.dialogs._dialogs`.
- **Restoring a patched Qt method:** save `QWidget.__dict__[name]`, never `getattr(QWidget, name)`. The latter returns an unbound function that, put back, stops binding and breaks every `show()`.
- **Editor focus ring:** Anki's `.field-container` has `overflow: hidden`, which clips an outer ring, and it adds a 2px focus `outline`. Make the container visible, drop the outline, and keep `.dupe` as a red ring.
- **Browse's table paints rows with `StatusDelegate`.** A transparent `gridline-color` still leaves white grid lines, so call `setShowGrid(False)`. Never add `QTableView::item` background rules, because they would hide Anki's flag, mark and suspended colours.
- **`--launch-only` / `--fresh` relaunch; plain runs reuse.** A plain screenshot run reuses an Anki that already has debugging on, so it will not load new Python. Use `--fresh` after Python changes.
- **Hidden labels still take up gap space.** Zero-size text keeps a flex gap. Round icon buttons need `gap: 0`.
- **Specificity of the injected accent.** The live accent is injected as `html.mx{--mx-accent}`, and the CSS default sits on `:root`. Never set `--mx-accent` on `html.mx` in the stylesheet, or the system accent stops applying.
- **Anki's own reduce-motion.** It is `body.reduce-motion`, separate from `prefers-reduced-motion`. Respect both.

## Not covered yet

Stats keeps Anki's look. Since Anki 26.08 the editor is a SvelteKit page: add its path to `SVELTE_PAGES`, the same way deck options works. Do not use `isinstance(context, Editor)`. Qt widgets should get QSS through the `gui_hooks.style_did_init` filter, never `app.setStyleSheet` directly.

## Updating the README screenshots

`scripts/screenshots.mjs` regenerates every image in `docs/screenshots/` from your running Anki:

1. It quits Anki and relaunches it **in the background** (`open -g`) with web-inspector debugging. Anki never takes focus.
2. It walks the deck list, overview, question and answer screens. It reveals an answer but never grades a card. Deck Options is rendered in the hidden preview.
3. It captures each screen in light and dark. Dark is simulated in the page, so your theme setting is untouched.
4. It relaunches Anki normally.

Review the result with `git diff --stat docs/`.

```bash
node scripts/screenshots.mjs --deck "My Deck" --size 999x570
```

| option | effect |
|---|---|
| `--deck "Name"` | deck to open (default: the first one) |
| `--size WxH` | window size in points (default `999x570`) |
| `--yes` | skip the "this quits Anki" confirmation |
| `--keep-debug` | leave Anki running with debugging on |
| `--fresh` | relaunch even if a debuggable Anki is running (after Python changes) |
| `--launch-only` | relaunch with debugging and stop (for development) |
| `--relaunch` | only relaunch Anki normally, guarded, with no captures |

It needs Node 22+, the Xcode command-line tools, and **Screen Recording** permission for your terminal. Resizing the window also needs **Accessibility** permission. Use a profile whose decks you're happy to show publicly.

## Releasing

1. Bump `human_version` in `addon/manifest.json`.
2. Regenerate screenshots if the UI changed: `node scripts/screenshots.mjs`.
3. Commit and push, then run `./scripts/build.sh` and `gh release create vX.Y.Z dist/anki-macos-native-X.Y.Z.ankiaddon`.

`gh` must act as `antonio-orionus`: `GH_TOKEN="$(gh auth token --user antonio-orionus)" gh …`. Git pushes go over the `github-orionus` SSH alias.

## Commits

Author and committer are Antonio. Never add AI attribution: no `Co-Authored-By` trailers and no "Generated with" lines. Commit messages describe what changed and why.
