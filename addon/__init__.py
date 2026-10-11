"""Native macOS look for Anki.

Injects one stylesheet and one script into every main-window webview, adds
the stylesheet to supported SvelteKit pages (deck options), and on macOS
merges the top toolbar into the title bar.
"""

from __future__ import annotations

import json
import os
from urllib.parse import urlencode
import sys
from typing import Any

from aqt import gui_hooks, mw
from aqt.deckbrowser import DeckBrowser, DeckBrowserBottomBar
from aqt.editor import Editor
from aqt.overview import Overview, OverviewBottomBar
from aqt.qt import QApplication, QPalette
from aqt.reviewer import Reviewer, ReviewerBottomBar
from aqt.toolbar import BottomToolbar, TopToolbar
from aqt.webview import AnkiWebView, WebContent

from . import dev, menus, qtstyle, quiet, titlebar

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
    (Editor, "editor"),
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

    classes = ["mx"]
    if unified_titlebar_enabled():
        classes.append("mx-unified")
    if cfg.get("restyle_cards", True):
        classes.append("mx-cards")
    state = {"screen": screen, "classes": classes, "state": mw.state, "decksTitle": decks_title()}
    accent = accent_hex()
    style = accent_vars(accent) if accent else ""
    # Screen and accent also ride on the script URL for pages whose Content
    # Security Policy blocks the inline boot script below.
    query = {"screen": screen, "classes": ",".join(classes)}
    if accent:
        query.update(accent=accent, onAccent=on_accent(accent))
    web_content.js.append(f"{base}/macos.js?{urlencode(query)}")
    web_content.head += (
        f"<style id='mx-vars'>{style}</style>"
        f"<script>window.mxBoot={json.dumps(state)};"
        f"document.documentElement.dataset.mx={json.dumps(screen)};"
        f"document.documentElement.classList.add(...{json.dumps(classes)});</script>"
    )




# SvelteKit pages never pass through webview_will_set_content; they are
# matched by URL path once Anki has injected its own styles.
SVELTE_PAGES: dict[str, str] = {
    "/deck-options": "deck-options",
    "/editor": "editor",
}


def svelte_screen(webview: AnkiWebView) -> str | None:
    path = webview.page().url().path()
    for prefix, screen in SVELTE_PAGES.items():
        if path.startswith(prefix):
            return screen
    return None


def on_page_styled(webview: AnkiWebView) -> None:
    screen = svelte_screen(webview)
    if not screen:
        return
    classes = ["mx"]
    accent = accent_hex()
    js = f"""(() => {{
      const root = document.documentElement;
      root.dataset.mx = {json.dumps(screen)};
      root.classList.add(...{json.dumps(classes)});
      let vars = document.getElementById("mx-vars");
      if (!vars) {{
        vars = document.createElement("style");
        vars.id = "mx-vars";
        document.head.appendChild(vars);
      }}
      vars.textContent = {json.dumps(accent_vars(accent) if accent else "")};
      if (!document.getElementById("mx-css")) {{
        const link = document.createElement("link");
        link.id = "mx-css";
        link.rel = "stylesheet";
        link.href = "/_addons/{ADDON}/web/macos.css";
        document.head.appendChild(link);
      }}
    }})()"""
    webview.eval(js)


_previews: list[AnkiWebView] = []


def dev_preview(path: str) -> None:
    """MX_DEV only: render a SvelteKit page offscreen, inspectable over the
    remote-debugging port, without opening a window over the user's work."""
    from aqt.qt import QWidget, Qt
    from aqt.webview import AnkiWebViewKind

    kind = AnkiWebViewKind.DECK_OPTIONS if path.startswith("deck-options") else AnkiWebViewKind.DEFAULT
    view = AnkiWebView(kind=kind)
    view.setWindowFlags(Qt.WindowType.Tool | Qt.WindowType.WindowDoesNotAcceptFocus)
    view.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating, True)
    view.setGeometry(-20000, -20000, 820, 1000)  # a real window, but off every screen
    view.show()
    view.load_sveltekit_page(path)
    _previews.append(view)


def restyle_window(window: Any) -> None:
    """Attach the Qt stylesheet for Browse or Add, by window type."""
    from aqt.theme import theme_manager

    name = {"Browser": "browser", "AddCards": "add", "EditCurrent": "add"}.get(type(window).__name__)
    if not name or not config().get("restyle_windows", True):
        return
    accent = accent_hex() or "#0a60ff"
    qss = qtstyle.render(name, theme_manager.night_mode, accent, on_accent(accent))
    window.setStyleSheet(qss)
    # Anki gives some widgets their own stylesheet, which outranks the
    # window's; append ours to theirs so ours wins where they conflict.
    from aqt.qt import QPushButton, QTableView, QTreeView

    for widget in window.findChildren(QTableView) + window.findChildren(QTreeView):
        qtstyle.append(widget, qss)
    for table in window.findChildren(QTableView):
        table.setShowGrid(False)  # Anki's row painter ignores a transparent grid colour
    add_button = getattr(window, "addButton", None)
    if isinstance(add_button, QPushButton):
        add_button.setProperty("mxPrimary", True)
        add_button.style().unpolish(add_button)
        add_button.style().polish(add_button)


def menu_qss() -> str:
    from aqt.theme import theme_manager

    accent = accent_hex() or "#0a60ff"
    return menus.qss(theme_manager.night_mode, accent, on_accent(accent))


def dev_menu_shot(path: str) -> None:
    """MX_DEV only: render a sample menu in both themes to <path>-light.png
    and <path>-dark.png without showing it."""
    from aqt.qt import QColor, QMenu, QPixmap, QPoint, QRegion, Qt, QWidget

    accent = accent_hex() or "#0a60ff"
    probe = QMenu(mw)  # built exactly like Anki builds its menus
    with open(f"{path}-check.json", "w") as f:
        json.dump({
            "stylesheet_attached": bool(probe.styleSheet()),
            "translucent": probe.testAttribute(Qt.WidgetAttribute.WA_TranslucentBackground),
        }, f)
    probe.deleteLater()
    for night in (False, True):
        menu = QMenu(mw)
        for label in ("Rename", "Options", "Export"):
            menu.addAction(label)
        menu.addSeparator()
        menu.addAction("Delete")
        if night:  # light uses the stylesheet the constructor attached
            menu.setStyleSheet(menus.qss(True, accent, on_accent(accent)))
        menu.setActiveAction(menu.actions()[1])
        menu.adjustSize()
        menu.ensurePolished()
        # Render onto a transparent canvas: grab() fills in a window background,
        # which would square off the rounded corners the real popup has.
        ratio = mw.devicePixelRatioF()
        pixmap = QPixmap(menu.size() * ratio)
        pixmap.setDevicePixelRatio(ratio)
        pixmap.fill(QColor(0, 0, 0, 0))
        menu.render(pixmap, QPoint(), QRegion(), QWidget.RenderFlag.DrawChildren)
        pixmap.save(f"{path}-{'dark' if night else 'light'}.png")
        menu.deleteLater()


def on_js_message(handled: tuple[bool, Any], message: str, context: Any):
    if not message.startswith("mx:"):
        return handled
    kind, _, payload = message[3:].partition(":")
    if dev.handle(kind, payload):
        return (True, None)
    if kind == "rects":
        titlebar.set_control_rects(json.loads(payload or "[]"))
    elif kind == "shot" and os.environ.get("MX_DEV"):
        mw.grab().save(payload)
    elif kind == "preview" and os.environ.get("MX_DEV"):
        dev_preview(payload)
    elif kind == "menushot" and os.environ.get("MX_DEV"):
        dev_menu_shot(payload)
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


if config().get("restyle_menus", True):
    menus.install(menu_qss)

quiet.install(mw)  # MX_QUIET only: dev relaunches never take focus

dev.set_restyler(restyle_window)
gui_hooks.browser_will_show.append(restyle_window)
gui_hooks.add_cards_did_init.append(restyle_window)

gui_hooks.webview_will_set_content.append(on_set_content)
gui_hooks.webview_did_inject_style_into_page.append(on_page_styled)
gui_hooks.webview_did_receive_js_message.append(on_js_message)
gui_hooks.state_did_change.append(on_state_change)
gui_hooks.theme_did_change.append(on_theme_change)
gui_hooks.main_window_did_init.append(on_main_window_init)
# Qt can recreate the native window (e.g. on profile switch), dropping the hints.
gui_hooks.profile_did_open.append(on_main_window_init)
