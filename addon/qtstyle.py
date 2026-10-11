"""Qt stylesheets for Anki's native windows (Browse, Add).

Stylesheets live in qt/<name>.qss and use @token@ placeholders, filled from
the light or dark palette and the live accent when a window opens. They are
attached to that window only, so the rest of Anki keeps its native drawing.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

QSS_DIR = Path(__file__).parent / "qt"

LIGHT = {
    "ground": "#f5f5f7",
    "group": "#ffffff",
    "sidebar": "#ececee",
    "label": "rgba(0, 0, 0, 224)",
    "label2": "rgba(0, 0, 0, 143)",
    "label3": "rgba(0, 0, 0, 77)",
    "separator": "rgba(0, 0, 0, 23)",
    "fill": "rgba(120, 120, 128, 26)",
    "fill_strong": "rgba(120, 120, 128, 46)",
    "field": "#ffffff",
    "field_edge": "rgba(0, 0, 0, 41)",
    "selection_soft": "rgba(0, 0, 0, 20)",
    "row_alt": "#f7f7f9",
    "hover": "#f2f2f4",
}
DARK = {
    "ground": "#1e1e1f",
    "group": "#2a2a2c",
    "sidebar": "#252527",
    "label": "rgba(255, 255, 255, 230)",
    "label2": "rgba(235, 235, 245, 153)",
    "label3": "rgba(235, 235, 245, 77)",
    "separator": "rgba(255, 255, 255, 23)",
    "fill": "rgba(120, 120, 128, 51)",
    "fill_strong": "rgba(120, 120, 128, 82)",
    "field": "rgba(255, 255, 255, 18)",
    "field_edge": "rgba(255, 255, 255, 31)",
    "selection_soft": "rgba(255, 255, 255, 26)",
    "row_alt": "rgba(255, 255, 255, 8)",
    "hover": "rgba(255, 255, 255, 28)",
}


def render(name: str, night: bool, accent: str, on_accent: str) -> str:
    path = QSS_DIR / f"{name}.qss"
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8")
    tokens = {
        **(DARK if night else LIGHT),
        "accent": accent,
        "on_accent": on_accent,
        "theme": "dark" if night else "light",
        "qtdir": QSS_DIR.as_posix(),
    }
    for key, value in tokens.items():
        text = text.replace(f"@{key}@", value)
    return text


MARK = "/* macos-native:fields */"


def apply_app_fields(app: Any, night: bool, accent: str, on_accent: str) -> None:
    """Append the field stylesheet to the application's, replacing any copy
    from an earlier theme. Anki rewrites the app stylesheet on theme change,
    so this runs again then."""
    base = app.styleSheet().split(MARK)[0]
    app.setStyleSheet(f"{base}\n{MARK}\n{render('fields', night, accent, on_accent)}")


def window_rules(qss: str) -> str:
    """Only the rules for the window itself (QDialog / QMainWindow), which
    child dialogs of other types do not match."""
    blocks = re.findall(r"([^{}]+)\{([^{}]*)\}", qss)
    keep = []
    for selector, body in blocks:
        names = [part.strip() for part in re.sub(r"/\*.*?\*/", "", selector, flags=re.S).split(",")]
        if names and all(n in ("QDialog", "QMainWindow", "QMainWindow > QWidget") for n in names):
            keep.append(f"{', '.join(names)} {{{body}}}")
    return "\n".join(keep)


def append(widget: Any, qss: str) -> None:
    """Append qss to a widget's own stylesheet, keeping Anki's original."""
    base = widget.property("mxBaseQss")
    if base is None:
        base = widget.styleSheet()
        widget.setProperty("mxBaseQss", base)
    widget.setStyleSheet(f"{base}\n{qss}")
