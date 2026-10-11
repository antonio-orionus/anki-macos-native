# Product

<!-- impeccable:product-schema 1 -->

## Platform

web — CSS/JS injected into the QtWebEngine views of the Anki desktop app (26.9.3) on macOS 27, plus light Qt window tweaks from Python.

## Stack

Anki add-on: Python package in `addons21/`, `gui_hooks.webview_will_set_content` to inject a stylesheet and a small script per screen, `setWebExports` to serve them. No build step, no third-party runtime dependencies.

## Product

An Anki add-on that makes Anki's main window read as a native macOS 27 app instead of a 2010s web page. It restyles the chrome Anki draws in webviews: top toolbar, deck list, deck overview, reviewer answer bar, and the bottom bars of each screen.

## Users and job

Anki users on a Mac doing spaced-repetition study: pick a deck, see what is due, review cards with the keyboard (Space, 1–4), repeat daily. Success is that every existing Anki behaviour and shortcut still works and the window feels like it belongs next to Finder, Mail and System Settings.

## Constraints

- Never break Anki behaviour: deck drag-and-drop, collapse, gear menus, shift-click selection, shortcuts, sync indicator, other add-ons' toolbar links.
- Follow Anki's own Light/Dark/System theme (`night-mode` class); follow the macOS accent colour.
- Card content: the user only has a test deck and explicitly allowed overriding note-type styling.
- Respect Anki's `reduce-motion` setting.

## Brand commitments

- Pinned by the user: look like a native macOS 27 ("Golden Gate") app — Liquid Glass controls, unified toolbar, consistent corner radius, SF system type, system colours.
