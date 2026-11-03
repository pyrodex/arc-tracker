"""Screen capture. Reads pixels from the desktop only; never touches the game process."""

from __future__ import annotations

import numpy as np


class ScreenCapture:
    """Grabs one monitor as a BGR array.

    mss keeps per-thread handles on Windows, so create this in the thread that uses it.
    The game must run in borderless windowed (or windowed) mode; exclusive
    fullscreen often captures as black.
    """

    def __init__(self, monitor: int = 1):
        import mss  # imported here so tests that only scan images don't need it

        self._sct = mss.mss()
        mons = self._sct.monitors
        if monitor < 1 or monitor >= len(mons):
            raise ValueError(f"monitor {monitor} not found (have 1..{len(mons) - 1})")
        self.region = mons[monitor]

    @property
    def offset(self) -> tuple[int, int]:
        """Top-left of the captured monitor in desktop coordinates."""
        return self.region["left"], self.region["top"]

    def grab(self) -> np.ndarray:
        shot = self._sct.grab(self.region)
        return np.ascontiguousarray(np.asarray(shot)[..., :3])

    def close(self):
        self._sct.close()
