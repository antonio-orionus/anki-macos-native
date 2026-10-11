# macOS Native for Anki

An Anki add-on that makes Anki's main window look and behave like a native macOS 27 app. It adds a unified toolbar, Liquid Glass controls, inset grouped lists, and one clear next action on every screen.

![Deck list](docs/screenshots/decks-light.png)

| Overview | Reviewer |
|---|---|
| ![Overview, dark](docs/screenshots/overview-dark.png) | ![Reviewer, light](docs/screenshots/answer-light.png) |

## What it changes

- **Unified toolbar.** The toolbar merges into the title bar, with the traffic lights on its centre line. Dragging empty toolbar space moves the window. Double-clicking it follows *System Settings → Desktop & Dock → Double-click a window's title bar*.
- **Deck list.** Decks show as an inset grouped list with a large title and a "cards to study today" summary. Counts appear as colour-tinted badges, and subdecks have disclosure chevrons. Click anywhere on a row to open the deck.
- **Deck overview.** It shows a large title, a three-row New / Learning / To Review summary and one prominent **Study Now** button.
- **Reviewer.**
  - The card sits on the window ground in the system font.
  - A floating capsule turns from **Show Answer** into four grade segments (Again / Hard / Good / Easy). Each segment shows its interval and a keycap for its shortcut. The morph is skipped when Anki's *Reduce motion* is on.
  - Mark and flag show as small glass badges.
- **Theme.** It follows Anki's Light / Dark / System theme and your macOS accent colour. Text on the accent switches between white and black to stay readable.

It changes presentation only. Anki's own buttons, links, keyboard shortcuts, deck drag-and-drop, shift-click selection and other add-ons' toolbar items keep working.

## Install

1. Download the latest `anki-macos-native-<version>.ankiaddon` from [Releases](https://github.com/antonio-orionus/anki-macos-native/releases/latest).
2. Double-click it, or in Anki go to **Tools → Add-ons → Install from file…** and choose it.
3. Restart Anki.

To uninstall, go to **Tools → Add-ons**, select *macOS Native* and click **Delete**.

### Requirements

- Anki **25.02 or newer**. It is developed and tested on **26.9.3**.
- macOS. The unified title bar needs the Qt 6.9+ window hints that Anki 26.x ships. On older builds the add-on keeps the standard title bar and restyles everything else.
- Windows and Linux are untested. The title-bar code only runs on macOS, but the rest is plain CSS and JS.

## Settings

Go to **Tools → Add-ons → macOS Native → Config**.

| key | default | effect |
|---|---|---|
| `unified_titlebar` | `true` | Merge the toolbar into the title bar. Restart Anki after changing it. |
| `restyle_cards` | `true` | Set card text in the system font on the window background. Use `false` to show your note types' own styling unchanged. |
| `accent` | `"system"` | Follow the macOS accent colour, or set a hex colour such as `"#ff2d55"`. |

## Not covered yet

The Browse window, the Add / Edit editor, deck options and statistics are separate pages or Qt dialogs, and they keep Anki's own look.

## How it works

- `addon/__init__.py` uses `gui_hooks.webview_will_set_content` to inject one stylesheet and one script into the main window's webviews: toolbar, deck list, overview, reviewer and bottom bars. It restyles Anki's own markup in place rather than replacing it, which keeps compatibility with Anki and other add-ons.
- `addon/titlebar.py` sets Qt's `ExpandedClientAreaHint` and `NoTitleBarBackgroundHint`. It hides the window title and re-centres the traffic lights through the Objective-C runtime (`ctypes`, no PyObjC). It also turns presses on empty toolbar space into native window drags.
- The design system (tokens, components, rules) is documented in [DESIGN.md](DESIGN.md).

## Development

```bash
./scripts/dev-link.sh   # link addon/ into Anki's add-ons folder
./scripts/build.sh      # build dist/anki-macos-native-<version>.ankiaddon
```

After changing Python, restart Anki. Launch it with `QTWEBENGINE_REMOTE_DEBUGGING=9229` to inspect the webviews from Chrome at `chrome://inspect`.

## Credits

Icons are from [Lucide](https://lucide.dev) (ISC licence). The add-on itself is [MIT](LICENSE).
