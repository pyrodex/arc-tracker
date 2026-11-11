"""Getting frames of the game. Read-only: nothing is injected and no game memory or files are touched.

Two backends:

* ``window`` (default): **Windows Graphics Capture** of the ARC Raiders window.
  This is the API Windows provides for recording an app's window. Streaming
  and clip tools use it (OBS "Window Capture (Windows 10)", Discord on
  Windows 11, Medal's "Advanced Window Capture"), and so does the ARCTracker
  overlay ("Windows' own screen capture, like streaming software"). Windows
  composes the window and hands over the pixels; nothing touches the game.
  The overlay can't end up in the frame, because only the game's own window
  is captured.
* ``screen``: a plain desktop copy of one monitor through mss (GDI). It also
  doesn't touch the game, but captures whatever is on screen, overlays
  included. It's kept as a fallback and for older Windows builds.

Neither backend hooks DirectX or injects a DLL, which is how "game capture"
modes work. Embark doesn't publish a list of approved tools, so no
third-party program can promise it's safe, but reading the screen through
Windows' capture API is the method these widely used tools rely on.
"""

from __future__ import annotations

import sys
import threading
import time

import numpy as np

DEFAULT_TITLE = "ARC Raiders"


class CaptureUnavailable(RuntimeError):
    """The game window isn't there (yet), or capture couldn't start."""


# ── window lookup (Win32, via ctypes) ─────────────────────────────────────────

def find_window(title_part: str) -> tuple[int, str]:
    """(hwnd, exact title) of the first visible top-level window whose title contains title_part."""
    if sys.platform != "win32":
        raise CaptureUnavailable("window capture needs Windows")
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32
    found: list[tuple[int, str]] = []
    want = title_part.lower()

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def each(hwnd, _):
        if not user32.IsWindowVisible(hwnd):
            return True
        n = user32.GetWindowTextLengthW(hwnd)
        if n == 0:
            return True
        buf = ctypes.create_unicode_buffer(n + 1)
        user32.GetWindowTextW(hwnd, buf, n + 1)
        if want in buf.value.lower():
            found.append((hwnd, buf.value))
        return True

    user32.EnumWindows(each, 0)
    if not found:
        raise CaptureUnavailable(f"no window titled like '{title_part}' — is the game running?")
    # Prefer an exact match (e.g. "ARC Raiders" over a browser tab mentioning it).
    found.sort(key=lambda hw: (hw[1].lower() != want, len(hw[1])))
    return found[0]


def client_rect(hwnd: int) -> dict:
    """The window's client area in desktop coordinates: where captured pixel (0, 0) is."""
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32
    rect = wintypes.RECT()
    user32.GetClientRect(hwnd, ctypes.byref(rect))
    pt = wintypes.POINT(0, 0)
    user32.ClientToScreen(hwnd, ctypes.byref(pt))
    return {"left": pt.x, "top": pt.y, "width": rect.right - rect.left, "height": rect.bottom - rect.top}


# ── backends ──────────────────────────────────────────────────────────────────

class WindowCapture:
    """Windows Graphics Capture of the game window (windows-capture package).

    Frames arrive on the library's own thread whenever the window changes;
    grab() returns the newest one. The yellow capture border and the mouse
    cursor are turned off where Windows allows it. Turning the border off
    needs Windows 11; on Windows 10 the border shows but isn't in the frame.
    """

    def __init__(self, title: str = DEFAULT_TITLE, channel_order: str = "bgra"):
        try:
            from windows_capture import WindowsCapture
        except ImportError as e:
            raise CaptureUnavailable("pip install windows-capture (or set capture.method to 'screen')") from e
        self.hwnd, self.title = find_window(title)
        self._order = channel_order
        self._lock = threading.Lock()
        self._ready = threading.Event()
        self._latest: np.ndarray | None = None
        self._closed = False
        self._control = None
        last_error = None
        for border in (False, None):          # None = Windows default, for builds that refuse False
            try:
                self._session = WindowsCapture(cursor_capture=False, draw_border=border,
                                               monitor_index=None, window_name=self.title)
                break
            except Exception as e:  # noqa: BLE001 - the library raises plain Exceptions
                last_error = e
        else:
            raise CaptureUnavailable(f"couldn't start window capture: {last_error}")

        @self._session.event
        def on_frame_arrived(frame, capture_control):
            buf = np.asarray(frame.frame_buffer)
            if buf.ndim == 3 and buf.shape[2] == 4:
                bgr = buf[..., :3] if self._order == "bgra" else buf[..., 2::-1]
                with self._lock:
                    self._latest = np.ascontiguousarray(bgr)
                self._ready.set()

        @self._session.event
        def on_closed():
            self._closed = True
            self._ready.set()

        self._control = self._session.start_free_threaded()

    @property
    def region(self) -> dict:
        return client_rect(self.hwnd)

    def grab(self, timeout: float = 3.0) -> np.ndarray:
        if not self._ready.wait(timeout):
            raise CaptureUnavailable("no frames from the game window yet (is it minimised?)")
        if self._closed:
            raise CaptureUnavailable("the game window closed")
        with self._lock:
            frame = self._latest
        if frame is None:
            raise CaptureUnavailable("the game window closed")
        return frame.copy()

    def close(self):
        if self._control is not None:
            try:
                self._control.stop()
            except Exception:  # noqa: BLE001 - already stopped
                pass


class ScreenCapture:
    """Grabs one monitor as a BGR array (mss / GDI). Fallback backend.

    mss keeps per-thread handles on Windows, so create this in the thread that uses it.
    """

    def __init__(self, monitor: int = 1):
        import mss  # imported here so tests that only scan images don't need it

        self._sct = mss.mss()
        mons = self._sct.monitors
        if monitor < 1 or monitor >= len(mons):
            raise CaptureUnavailable(f"monitor {monitor} not found (have 1..{len(mons) - 1})")
        self.region = mons[monitor]

    def grab(self) -> np.ndarray:
        shot = self._sct.grab(self.region)
        return np.ascontiguousarray(np.asarray(shot)[..., :3])

    def close(self):
        self._sct.close()


def make_capture(cfg: dict):
    """The configured backend (raises CaptureUnavailable if it can't start yet)."""
    c = cfg.get("capture") or {}
    if c.get("method", "window") == "screen":
        return ScreenCapture(cfg["monitor"])
    return WindowCapture(c.get("window_title", DEFAULT_TITLE), c.get("channel_order", "bgra"))


def wait_for_capture(cfg: dict, timeout: float = 60.0):
    """make_capture, retrying while the game starts up (for one-shot commands)."""
    deadline = time.monotonic() + timeout
    while True:
        try:
            return make_capture(cfg)
        except CaptureUnavailable:
            if time.monotonic() >= deadline:
                raise
            time.sleep(2)
