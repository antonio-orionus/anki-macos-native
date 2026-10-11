"""Quiet launch (MX_QUIET=1): start Anki without taking focus.

Used only by scripts/screenshots.mjs, which relaunches Anki while the user is
working in another app. Anki's startup code calls mw.activateWindow() and
mw.raise_(); for the first seconds after launch those calls do nothing and the
main window is shown without activating, then everything is restored, so the
session behaves normally afterwards. Qt itself may still activate the app once
as launching finishes; the script's focus watcher hands focus back for that.
"""

from __future__ import annotations

import os
from typing import Any

from aqt.qt import Qt, QTimer

QUIET_SECONDS = 15


def enabled() -> bool:
    return bool(os.environ.get("MX_QUIET"))


def install(mw: Any) -> None:
    if not enabled():
        return
    mw.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating, True)
    mw.activateWindow = lambda: None  # type: ignore[method-assign]
    mw.raise_ = lambda: None  # type: ignore[method-assign]

    def restore() -> None:
        mw.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating, False)
        for name in ("activateWindow", "raise_"):
            mw.__dict__.pop(name, None)

    QTimer.singleShot(QUIET_SECONDS * 1000, restore)
