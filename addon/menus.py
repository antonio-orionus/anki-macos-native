"""macOS-style popup menus (deck options "…", reviewer More, context menus).

Menus are Qt widgets, not web pages, so they are styled with QSS. Every QMenu
created from Python passes through a wrapped constructor that attaches the
stylesheet for the current theme and makes the window translucent (rounded
corners need it; macOS then draws the shadow from the rounded shape).
Attaching per menu at creation does not depend on when Anki applies its
app-wide stylesheet, and menus are rebuilt each time they open, so a theme
switch is picked up on the next open.
"""

from __future__ import annotations

from typing import Any, Callable

from aqt.qt import QMenu, Qt

# Corner radii follow DESIGN.md: 12px panels, 5px small items.
_LIGHT = {
    "bg": "rgba(246, 246, 248, 240)",
    "edge": "rgba(0, 0, 0, 30)",
    "fg": "rgba(0, 0, 0, 224)",
    "fg3": "rgba(0, 0, 0, 77)",
    "sep": "rgba(0, 0, 0, 23)",
}
_DARK = {
    "bg": "rgba(42, 42, 44, 240)",
    "edge": "rgba(255, 255, 255, 31)",
    "fg": "rgba(255, 255, 255, 230)",
    "fg3": "rgba(235, 235, 245, 77)",
    "sep": "rgba(255, 255, 255, 23)",
}


def qss(night: bool, accent: str, on_accent: str) -> str:
    c = _DARK if night else _LIGHT
    return f"""
QMenu {{
    background-color: {c["bg"]};
    border: 1px solid {c["edge"]};
    border-radius: 12px;
    padding: 5px;
    font-size: 13px;
}}
QMenu::item {{
    padding: 4px 24px 4px 12px;
    border-radius: 5px;
    color: {c["fg"]};
    background-color: transparent;
}}
QMenu::item:selected {{
    background-color: {accent};
    color: {on_accent};
}}
QMenu::item:disabled {{
    color: {c["fg3"]};
}}
QMenu::separator {{
    height: 1px;
    background: {c["sep"]};
    margin: 5px 10px;
}}
QMenu::icon {{
    padding-left: 8px;
}}
"""


_original_init: Any = None
_current_qss: Callable[[], str] = lambda: ""


def _styled_init(self: QMenu, *args: Any, **kwargs: Any) -> None:
    _original_init(self, *args, **kwargs)
    self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
    self.setWindowFlag(Qt.WindowType.FramelessWindowHint, True)
    try:
        self.setStyleSheet(_current_qss())
    except Exception:  # styling must never break a menu
        pass


def install(current_qss: Callable[[], str]) -> None:
    """Style every QMenu created from Python from now on."""
    global _original_init, _current_qss
    _current_qss = current_qss
    if _original_init is None:
        _original_init = QMenu.__init__
        QMenu.__init__ = _styled_init  # type: ignore[method-assign]
