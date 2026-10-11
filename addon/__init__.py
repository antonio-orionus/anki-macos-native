"""Native macOS look for Anki's main window.

Injects one stylesheet and one script into every main-window webview and,
on macOS, merges the top toolbar into the title bar.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

from aqt import gui_hooks, mw
from aqt.deckbrowser import DeckBrowser, DeckBrowserBottomBar
from aqt.overview import Overview, OverviewBottomBar
from aqt.qt import QApplication, QPalette
from aqt.reviewer import Reviewer, ReviewerBottomBar
from aqt.toolbar import BottomToolbar, TopToolbar
from aqt.webview import WebContent

from . import titlebar

ADDON = __name__.split(".")[-1]
IS_MAC = sys.platform == "darwin"

mw.addonManager.setWebExports(__name__, r"web/.*\.(css|js)")

# Order matters: the bottom bars are checked before their screens.
SCREENS: list[tuple[type, str]] = [
    (DeckBrowserBottomBar, "deckbrowser-bottom"),
    (OverviewBottomBar, "overview-bottom"),
    (ReviewerBottomBar, "reviewer-bottom"),
    (DeckBrowser, "deckbrowser"),
    (Overview, "overview"),
    (Reviewer, "reviewer"),
    (TopToolbar, "toolbar"),
    (BottomToolbar, "bottom"),
]


def config() -> dict[str, Any]:
    return mw.addonManager.getConfig(__name__) or {}


def screen_for(context: object | None) -> str | None:
    for cls, name in SCREENS:
        if isinstance(context, cls):
            return name
    return None


def accent_hex() -> str | None:
    """The macOS accent colour as Qt reports it, or the configured override."""
    override = config().get("accent")
    if isinstance(override, str) and override.startswith("#"):
        return override
    palette = QApplication.palette()
    role = getattr(QPalette.ColorRole, "Accent", QPalette.ColorRole.Highlight)
    color = palette.color(role)
    return color.name() if color.isValid() else None


def decks_title() -> str:
    try:
        from aqt.utils import tr

        return tr.actions_decks()
    except Exception:
        return "Decks"


def accent_vars(accent: str) -> str:
    """CSS for the accent and a label colour that stays readable on it."""
    return f"html.mx{{--mx-accent:{accent};--mx-on-accent:{on_accent(accent)};}}"


def on_accent(accent: str) -> str:
    def channel(c: int) -> float:
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (int(accent[i : i + 2], 16) for i in (1, 3, 5))
    lum = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    # Contrast with white vs. with black; pick whichever is higher.
    return "#ffffff" if 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.05 else "#000000"


def on_set_content(web_content: WebContent, context: object | None) -> None:
    screen = screen_for(context)
    if not screen:
        return
    cfg = config()
    base = f"/_addons/{ADDON}/web"
    web_content.css.append(f"{base}/macos.css")
    web_content.js.append(f"{base}/macos.js")

    classes = ["mx"]
    if unified_titlebar_enabled():
        classes.append("mx-unified")
    if cfg.get("restyle_cards", True):
        classes.append("mx-cards")
    state = {"screen": screen, "classes": classes, "state": mw.state, "decksTitle": decks_title()}
    accent = accent_hex()
    style = accent_vars(accent) if accent else ""
    web_content.head += (
        f"<style id='mx-vars'>{style}</style>"
        f"<script>window.mxBoot={json.dumps(state)};"
        f"document.documentElement.dataset.mx={json.dumps(screen)};"
        f"document.documentElement.classList.add(...{json.dumps(classes)});</script>"
    )




def on_js_message(handled: tuple[bool, Any], message: str, context: Any):
    if not message.startswith("mx:"):
        return handled
    kind, _, payload = message[3:].partition(":")
    if kind == "rects":
        titlebar.set_control_rects(json.loads(payload or "[]"))
    elif kind == "shot" and os.environ.get("MX_DEV"):
        mw.grab().save(payload)
    return (True, None)


def on_state_change(new_state: str, old_state: str) -> None:
    # The toolbar does not re-render on navigation; tell it where we are.
    web = getattr(mw.toolbar, "web", None)
    if web is not None:
        web.eval(f"window.mxSetState && mxSetState({json.dumps(new_state)})")


def on_theme_change() -> None:
    accent = accent_hex()
    if not accent:
        return
    js = (
        "document.getElementById('mx-vars') && "
        f"(document.getElementById('mx-vars').textContent='{accent_vars(accent)}')"
    )
    for web in (getattr(mw.toolbar, "web", None), mw.web, mw.bottomWeb):
        if web is not None:
            web.eval(js)


def unified_titlebar_enabled() -> bool:
    # Decided from settings, not install timing: pages can render first.
    return IS_MAC and bool(config().get("unified_titlebar", True)) and titlebar.supported()


def on_main_window_init() -> None:
    if unified_titlebar_enabled():
        titlebar.install(mw)


gui_hooks.webview_will_set_content.append(on_set_content)
gui_hooks.webview_did_receive_js_message.append(on_js_message)
gui_hooks.state_did_change.append(on_state_change)
gui_hooks.theme_did_change.append(on_theme_change)
gui_hooks.main_window_did_init.append(on_main_window_init)
# Qt can recreate the native window (e.g. on profile switch), dropping the hints.
gui_hooks.profile_did_open.append(on_main_window_init)
