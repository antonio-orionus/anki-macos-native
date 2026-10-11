"""Development commands, enabled only with MX_DEV=1.

They open Anki's real windows off every screen, without activating them, so
they can be inspected and captured while the user keeps working:

    mx:open:browser | mx:open:add     open the window off-screen
    mx:grab:<name>:<path>            render it to a PNG
    mx:reloadqss                     re-read qt/*.qss into open windows
    mx:close:<name>                  close it and restore saved geometry
    mx:gallery:<path>                render every input type, light and dark,
                                     to <path>-light.png / <path>-dark.png
    mx:pyeval:<path>|<expression>    write repr(eval(expression)) to <path>;
                                     names: mw, windows (the open previews)

Anki saves window geometry on close; the previews would otherwise make the
user's real windows reopen off-screen, so every geometry-like profile key is
snapshotted before opening and restored after closing.
"""

from __future__ import annotations

import os
from typing import Any, Callable

from aqt import dialogs, mw
from aqt.qt import QTimer, QWidget, Qt

OFFSCREEN = (-20000, -20000)
_open: dict[str, Any] = {}
_saved_profile: dict[str, Any] = {}
_restyle: Callable[[Any], None] = lambda window: None

DIALOGS = {"browser": "Browser", "add": "AddCards", "stats": "NewDeckStats"}


def enabled() -> bool:
    return bool(os.environ.get("MX_DEV"))


def set_restyler(fn: Callable[[Any], None]) -> None:
    global _restyle
    _restyle = fn


def _geometry_keys() -> dict[str, Any]:
    profile = mw.pm.profile or {}
    return {k: v for k, v in profile.items() if any(s in k.lower() for s in ("geom", "state", "splitter"))}


_real_show = QWidget.show


def _quiet_show(self: QWidget) -> None:
    # Only top-level windows go off-screen; children keep their layout.
    if self.isWindow():
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating, True)
        self.resize(1180, 760)
        self.move(*OFFSCREEN)
    _real_show(self)


def open_window(name: str) -> None:
    if name in _open or name not in DIALOGS:
        return
    if not _saved_profile:
        _saved_profile.update(_geometry_keys())
    # Patch show/activate/raise on QWidget for the duration of construction;
    # Anki's dialogs call them from __init__ and from dialogs.open().
    # Save the raw class attributes: getattr() returns unbound functions that,
    # put back with setattr, no longer bind to instances and break show().
    originals = {attr: QWidget.__dict__[attr] for attr in ("show", "activateWindow", "raise_")}
    QWidget.show = _quiet_show  # type: ignore[method-assign]
    QWidget.activateWindow = lambda self: None  # type: ignore[method-assign]
    QWidget.raise_ = lambda self: None  # type: ignore[method-assign]
    try:
        window = dialogs.open(DIALOGS[name], mw)
    finally:
        for attr, fn in originals.items():
            setattr(QWidget, attr, fn)
    _open[name] = window


def grab(name: str, path: str) -> None:
    window = _open.get(name)
    if window is not None:
        window.grab().save(path)


def reload_qss() -> None:
    for window in _open.values():
        _restyle(window)


def close_window(name: str) -> None:
    window = _open.pop(name, None)
    if window is None:
        return
    window.close()
    if not _open and _saved_profile:
        snapshot = dict(_saved_profile)
        _saved_profile.clear()
        _restore_geometry(snapshot)
        # Add Cards saves its geometry only after an async unsaved-changes
        # check, so restore again once that has happened.
        QTimer.singleShot(2000, lambda: _restore_geometry(snapshot))


def _restore_geometry(snapshot: dict[str, Any]) -> None:
    """Undo geometry the off-screen previews saved on close."""
    profile = mw.pm.profile or {}
    for key in [k for k in profile if k in snapshot or any(s in k.lower() for s in ("geom", "state", "splitter"))]:
        if key in snapshot:
            profile[key] = snapshot[key]
        else:
            del profile[key]


_apply_fields: Callable[[bool], None] = lambda night: None


def set_field_styler(fn: Callable[[bool], None]) -> None:
    global _apply_fields
    _apply_fields = fn


def gallery(path: str) -> None:
    """Render a form with every input type under the app stylesheet."""
    from aqt.qt import (
        QColor, QComboBox, QDoubleSpinBox, QFontComboBox, QFormLayout, QLineEdit, QSpinBox,
    )
    from aqt.theme import theme_manager

    for night in (False, True):
        _apply_fields(night)
        form = QWidget()
        form.setAttribute(Qt.WidgetAttribute.WA_DontShowOnScreen, True)
        layout = QFormLayout(form)
        empty = QLineEdit()
        empty.setPlaceholderText("Text to show inside the field when it's empty")
        filled = QLineEdit("Probability")
        search = QComboBox()
        search.setEditable(True)
        search.lineEdit().setPlaceholderText("Search cards/notes (type text, then press Enter)")
        font = QFontComboBox()
        plain = QComboBox()
        plain.addItems(["Sequential (oldest cards first)", "Random"])
        spin = QSpinBox()
        spin.setValue(20)
        dspin = QDoubleSpinBox()
        dspin.setValue(2.5)
        for label, widget in (("Description", empty), ("Name", filled), ("Search", search),
                              ("Editing Font", font), ("Order", plain), ("Size", spin), ("Ease", dspin)):
            layout.addRow(label, widget)
        form.setAutoFillBackground(True)
        palette = form.palette()
        palette.setColor(palette.ColorRole.Window, QColor("#1e1e1f" if night else "#f5f5f7"))
        palette.setColor(palette.ColorRole.WindowText, QColor("#eeeeee" if night else "#111111"))
        form.setPalette(palette)
        form.resize(560, 300)
        form.show()
        form.grab().save(f"{path}-{'dark' if night else 'light'}.png")
        form.deleteLater()
    _apply_fields(theme_manager.night_mode)


def handle(kind: str, payload: str) -> bool:
    """Returns True when the message was a dev command."""
    if not enabled():
        return False
    if kind == "open":
        open_window(payload)
    elif kind == "grab":
        name, _, path = payload.partition(":")
        grab(name, path)
    elif kind == "reloadqss":
        reload_qss()
    elif kind == "close":
        close_window(payload)
    elif kind == "gallery":
        gallery(payload)
    elif kind == "pyeval":
        path, _, expression = payload.partition("|")
        try:
            result = repr(eval(expression, {"mw": mw, "windows": _open}))  # noqa: S307 (dev only)
        except Exception as err:  # report, never raise into Anki
            result = f"error: {err!r}"
        with open(path, "w", encoding="utf-8") as f:
            f.write(result)
    else:
        return False
    return True
