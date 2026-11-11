"""Global hotkeys through Win32 RegisterHotKey.

This is the documented way for an app to own a key combination. Windows
delivers a WM_HOTKEY message when it's pressed. Unlike a low-level keyboard
hook (which the `keyboard` package installs), nothing watches every keystroke
system-wide, and it works without administrator rights.
"""

from __future__ import annotations

import sys
import threading

MOD_ALT, MOD_CONTROL, MOD_SHIFT, MOD_WIN, MOD_NOREPEAT = 0x1, 0x2, 0x4, 0x8, 0x4000
WM_HOTKEY, WM_QUIT = 0x0312, 0x0012

_MODS = {"ctrl": MOD_CONTROL, "control": MOD_CONTROL, "alt": MOD_ALT, "shift": MOD_SHIFT, "win": MOD_WIN}
_NAMED = {"space": 0x20, "tab": 0x09, "enter": 0x0D, "esc": 0x1B, "home": 0x24, "end": 0x23,
          "insert": 0x2D, "delete": 0x2E, "pageup": 0x21, "pagedown": 0x22}


def parse(combo: str) -> tuple[int, int]:
    """'ctrl+alt+s' → (modifiers, virtual-key code)."""
    mods, key = 0, None
    for part in combo.lower().replace(" ", "").split("+"):
        if part in _MODS:
            mods |= _MODS[part]
        elif len(part) == 1 and part.isalnum():
            key = ord(part.upper())
        elif part.startswith("f") and part[1:].isdigit() and 1 <= int(part[1:]) <= 24:
            key = 0x70 + int(part[1:]) - 1
        elif part in _NAMED:
            key = _NAMED[part]
        else:
            raise ValueError(f"unknown key '{part}' in hotkey '{combo}'")
    if key is None:
        raise ValueError(f"hotkey '{combo}' has no key")
    return mods | MOD_NOREPEAT, key


class Hotkeys:
    """Registers combos on a background thread and calls their callbacks."""

    def __init__(self):
        self._bindings: list[tuple[str, int, int, callable]] = []
        self._thread: threading.Thread | None = None
        self._thread_id = None
        self.failed: list[str] = []

    def add(self, combo: str, callback) -> None:
        mods, vk = parse(combo)
        self._bindings.append((combo, mods, vk, callback))

    def start(self) -> None:
        if sys.platform != "win32":
            raise RuntimeError("hotkeys need Windows")
        ready = threading.Event()
        self._thread = threading.Thread(target=self._loop, args=(ready,), name="arc-vision-hotkeys", daemon=True)
        self._thread.start()
        ready.wait(5)

    def _loop(self, ready: threading.Event) -> None:
        import ctypes
        from ctypes import wintypes

        user32, kernel32 = ctypes.windll.user32, ctypes.windll.kernel32
        self._thread_id = kernel32.GetCurrentThreadId()
        ids = {}
        for i, (combo, mods, vk, cb) in enumerate(self._bindings, start=1):
            if user32.RegisterHotKey(None, i, mods, vk):
                ids[i] = cb
            else:
                self.failed.append(combo)   # another app owns this combo
        ready.set()
        msg = wintypes.MSG()
        while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0:
            if msg.message == WM_HOTKEY and msg.wParam in ids:
                try:
                    ids[msg.wParam]()
                except Exception as e:  # noqa: BLE001 - a callback error mustn't kill the hotkeys
                    print(f"hotkey error: {e}")
        for i in ids:
            user32.UnregisterHotKey(None, i)

    def stop(self) -> None:
        if self._thread_id is not None:
            import ctypes
            ctypes.windll.user32.PostThreadMessageW(self._thread_id, WM_QUIT, 0, 0)
