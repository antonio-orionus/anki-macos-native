"""Unified title bar on macOS: the top toolbar webview extends under the
traffic lights, the window title is hidden, the traffic lights are centred
on the toolbar, and empty toolbar space drags the window like a native
toolbar does.

Everything here is best-effort. If the running Qt lacks the window hints,
nothing changes and the stylesheet falls back to the standard title bar.
"""

from __future__ import annotations

import ctypes
import ctypes.util
from typing import Any

from aqt.qt import QEvent, QObject, QPoint, QPointF, QRectF, Qt, QTimer, QWidget

# Centre line of the toolbar in points from the window top; matches the
# 52px toolbar height in macos.css.
TOOLBAR_CENTER_Y = 26.0

_rects: list[QRectF] = []
_filter: QObject | None = None


def set_control_rects(rects: list[list[float]]) -> None:
    """Clickable regions of the toolbar, in CSS pixels, sent by macos.js."""
    _rects[:] = [QRectF(*r) for r in rects if len(r) == 4]


# --- AppKit via the Objective-C runtime -------------------------------------

class _NSRect(ctypes.Structure):
    _fields_ = [("x", ctypes.c_double), ("y", ctypes.c_double), ("w", ctypes.c_double), ("h", ctypes.c_double)]


class _NSPoint(ctypes.Structure):
    _fields_ = [("x", ctypes.c_double), ("y", ctypes.c_double)]


_lib: Any = None


def _objc() -> Any:
    global _lib
    if _lib is None:
        _lib = ctypes.cdll.LoadLibrary(ctypes.util.find_library("objc"))
        _lib.sel_registerName.restype = ctypes.c_void_p
        _lib.sel_registerName.argtypes = [ctypes.c_char_p]
    return _lib


def _send(obj: int, selector: bytes, restype: Any = ctypes.c_void_p, *args: Any) -> Any:
    # objc_msgSend must be called through a prototype matching each call on arm64.
    lib = _objc()
    address = ctypes.cast(lib.objc_msgSend, ctypes.c_void_p).value
    fn = ctypes.CFUNCTYPE(restype, ctypes.c_void_p, ctypes.c_void_p, *[type(a) for a in args])(address)
    return fn(obj, lib.sel_registerName(selector), *args)


def _responds(obj: int, selector: bytes) -> bool:
    return bool(_send(obj, b"respondsToSelector:", ctypes.c_bool, ctypes.c_void_p(_objc().sel_registerName(selector))))


def _ns_window(window: Any) -> int | None:
    return _send(int(window.winId()), b"window") or None


def _hide_native_title(window: Any) -> None:
    ns_window = _ns_window(window)
    if not ns_window:
        return
    _send(ns_window, b"setTitleVisibility:", None, ctypes.c_long(1))  # NSWindowTitleHidden
    _send(ns_window, b"setTitlebarAppearsTransparent:", None, ctypes.c_bool(True))
    if _responds(ns_window, b"setTitlebarSeparatorStyle:"):
        _send(ns_window, b"setTitlebarSeparatorStyle:", None, ctypes.c_long(1))  # None


def _center_traffic_lights(window: Any) -> None:
    """Grow the title bar container so the buttons sit on the toolbar's centre line."""
    if window.isFullScreen():
        return
    ns_window = _ns_window(window)
    if not ns_window:
        return
    close = _send(ns_window, b"standardWindowButton:", ctypes.c_void_p, ctypes.c_long(0))
    if not close:
        return
    titlebar_view = _send(close, b"superview")
    container = titlebar_view and _send(titlebar_view, b"superview")
    if not container:
        return
    button = _send(close, b"frame", _NSRect)
    frame = _send(ns_window, b"frame", _NSRect)
    height = TOOLBAR_CENTER_Y + button.h / 2
    bar = _send(container, b"frame", _NSRect)
    _send(container, b"setFrame:", None, _NSRect(bar.x, frame.h - height, bar.w, height))
    for kind in (0, 1, 2):  # close, miniaturize, zoom
        btn = _send(ns_window, b"standardWindowButton:", ctypes.c_void_p, ctypes.c_long(kind))
        if btn:
            f = _send(btn, b"frame", _NSRect)
            _send(btn, b"setFrameOrigin:", None, _NSPoint(f.x, 0.0))


def _double_click_action() -> str:
    """The user's System Settings choice for double-clicking a title bar."""
    lib = _objc()
    lib.objc_getClass.restype = ctypes.c_void_p
    lib.objc_getClass.argtypes = [ctypes.c_char_p]
    defaults = _send(lib.objc_getClass(b"NSUserDefaults"), b"standardUserDefaults")
    key = _send(lib.objc_getClass(b"NSString"), b"stringWithUTF8String:", ctypes.c_void_p, ctypes.c_char_p(b"AppleActionOnDoubleClick"))
    value = _send(defaults, b"stringForKey:", ctypes.c_void_p, ctypes.c_void_p(key))
    if not value:
        return "Maximize"
    return (_send(value, b"UTF8String", ctypes.c_char_p) or b"Maximize").decode()


def _title_bar_double_click(window: Any) -> None:
    action = _double_click_action()
    if action == "Minimize":
        window.showMinimized()
    elif action != "None":
        ns_window = _ns_window(window)
        if ns_window:
            _send(ns_window, b"performZoom:", None, ctypes.c_void_p(0))


def _native(fn: Any, window: Any) -> None:
    try:
        fn(window)
    except Exception:  # AppKit access is a nicety, never a failure
        pass


def _refresh(window: Any) -> None:
    _native(_hide_native_title, window)
    _native(_center_traffic_lights, window)


# --- Window events: drag, double-click, re-layout ----------------------------

class _WindowFilter(QObject):
    """Watches the main window (re-layout) and the toolbar webview plus every
    child widget it renders through, including ones created later."""

    def __init__(self, mw: Any) -> None:
        super().__init__(mw)
        self.mw = mw
        self.drag_from: QPoint | None = None
        self.window_from: QPoint | None = None

    def watch(self, widget: QWidget) -> None:
        widget.removeEventFilter(self)
        widget.installEventFilter(self)
        for child in widget.findChildren(QWidget):
            child.removeEventFilter(self)
            child.installEventFilter(self)

    def _toolbar_web(self, obj: QObject) -> Any:
        web = getattr(self.mw.toolbar, "web", None)
        if web is None or not isinstance(obj, QWidget):
            return None
        return web if (obj is web or web.isAncestorOf(obj)) else None

    def _on_control(self, web: Any, obj: QWidget, pos: QPointF) -> bool:
        local = obj.mapTo(web, pos.toPoint()) if obj is not web else pos.toPoint()
        zoom = web.zoomFactor() or 1.0
        css = QPointF(local.x() / zoom, local.y() / zoom)
        return any(r.contains(css) for r in _rects)

    def eventFilter(self, obj: QObject, event: QEvent) -> bool:  # noqa: N802
        etype = event.type()
        if etype == QEvent.Type.ChildAdded and isinstance(event.child(), QWidget):
            self.watch(event.child())
            return False
        if obj is self.mw and etype in (QEvent.Type.Resize, QEvent.Type.WindowStateChange, QEvent.Type.Show):
            QTimer.singleShot(0, lambda: _refresh(self.mw))
            return False
        if etype == QEvent.Type.MouseMove and self.drag_from is not None:
            delta = event.globalPosition().toPoint() - self.drag_from
            self.mw.move(self.window_from + delta)
            return True
        if etype == QEvent.Type.MouseButtonRelease and self.drag_from is not None:
            self.drag_from = self.window_from = None
            return True
        if etype not in (QEvent.Type.MouseButtonPress, QEvent.Type.MouseButtonDblClick):
            return False
        web = self._toolbar_web(obj)
        if web is None or event.button() != Qt.MouseButton.LeftButton:
            return False
        if self._on_control(web, obj, event.position()):
            return False
        if etype == QEvent.Type.MouseButtonDblClick:
            _native(_title_bar_double_click, self.mw)
            return True
        handle = self.mw.windowHandle()
        if not (handle and handle.startSystemMove()):
            # Fallback: move the window ourselves until the button is released.
            self.drag_from = event.globalPosition().toPoint()
            self.window_from = self.mw.pos()
        return True


# --- Entry point ----------------------------------------------------------------

def supported() -> bool:
    return hasattr(Qt.WindowType, "ExpandedClientAreaHint")


def install(mw: Any) -> None:
    global _filter
    hint = getattr(Qt.WindowType, "ExpandedClientAreaHint", None)
    no_bg = getattr(Qt.WindowType, "NoTitleBarBackgroundHint", None)
    if hint is None:
        return
    if not (mw.windowFlags() & hint):
        visible = mw.isVisible()
        geometry = mw.geometry()
        mw.setWindowFlag(hint, True)
        if no_bg is not None:
            mw.setWindowFlag(no_bg, True)
        safe_area = getattr(Qt.WidgetAttribute, "WA_ContentsMarginsRespectsSafeArea", None)
        if safe_area is not None:
            for widget in (mw, mw.centralWidget()):
                if widget is not None:
                    widget.setAttribute(safe_area, False)
        if visible:
            mw.setGeometry(geometry)
            mw.show()
    if _filter is None:
        _filter = _WindowFilter(mw)
        mw.installEventFilter(_filter)
    web = getattr(mw.toolbar, "web", None)
    if web is not None:
        _filter.watch(web)
    _refresh(mw)
    # AppKit lays the title bar out again after the window settles.
    for delay in (0, 300, 1000):
        QTimer.singleShot(delay, lambda: _refresh(mw))
