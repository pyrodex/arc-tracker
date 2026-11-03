"""The capture → scan → sync loop, driven by commands from hotkeys.

Runs on its own thread. The overlay only reads `Engine.state()`; nothing here
depends on a GUI, so the loop can be tested with a fake capture source.
"""

from __future__ import annotations

import queue
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime

import cv2

from . import config
from .catalog import Catalog
from .scanner import ScanSession, Scanner, SlotResult

COMMANDS = ("snapshot", "toggle_watch", "preview", "apply", "discard",
            "next_character", "save_frame", "toggle_full", "quit")


@dataclass
class State:
    watching: bool = False
    stash_visible: bool = False
    full_mode: bool = False
    character: dict | None = None
    frames: int = 0
    rows: int = 0
    rejected: int = 0
    totals: dict = field(default_factory=dict)
    unread: dict = field(default_factory=dict)
    last_results: list[SlotResult] = field(default_factory=list)
    preview: dict | None = None
    message: str = ""
    error: str = ""


class Engine:
    def __init__(self, cfg: dict, client, catalog: Catalog, capture_factory, scanner: Scanner | None = None):
        self.cfg = cfg
        self.client = client
        self.catalog = catalog
        self.scanner = scanner or Scanner(cfg, catalog)
        self._capture_factory = capture_factory
        self._capture = None
        self._cmds: queue.Queue = queue.Queue()
        self._lock = threading.Lock()
        self._state = State()
        self._session = ScanSession(cfg["stable_frames"])
        self._preview_counts: dict | None = None
        self._preview_frames = -1
        self._characters: list[dict] = []
        self._frame = None
        self._thread: threading.Thread | None = None

    # ── public ───────────────────────────────────────────────────────────────
    def send(self, cmd: str) -> None:
        if cmd not in COMMANDS:
            raise ValueError(cmd)
        self._cmds.put(cmd)

    def state(self) -> State:
        with self._lock:
            return State(**vars(self._state))

    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, name="arc-vision-engine", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._cmds.put("quit")
        if self._thread:
            self._thread.join(timeout=5)

    # ── loop ─────────────────────────────────────────────────────────────────
    def _run(self) -> None:
        self._capture = self._capture_factory()
        self._load_characters()
        next_watch = 0.0
        while True:
            timeout = max(0.0, next_watch - time.monotonic()) if self._state.watching else 0.25
            try:
                cmd = self._cmds.get(timeout=timeout)
            except queue.Empty:
                cmd = None
            if cmd == "quit":
                break
            try:
                if cmd:
                    self._handle(cmd)
                if self._state.watching and time.monotonic() >= next_watch:
                    next_watch = time.monotonic() + self.cfg["watch_interval_s"]
                    self._capture_and_scan(trusted=False)
            except Exception as e:  # keep the loop alive; show the error on the overlay
                self._set(error=f"{type(e).__name__}: {e}")
        if hasattr(self._capture, "close"):
            self._capture.close()

    def _handle(self, cmd: str) -> None:
        self._set(error="")
        if cmd == "snapshot":
            if not self._capture_and_scan(trusted=True):
                self._set(message="Stash screen not detected — open the stash and try again.")
        elif cmd == "toggle_watch":
            self._set(watching=not self._state.watching,
                      message="Watching the stash — scroll through it slowly." if not self._state.watching else "Watch paused.")
        elif cmd == "toggle_full":
            self._set(full_mode=not self._state.full_mode, preview=None)
            self._preview_counts = None
        elif cmd == "discard":
            self._reset_session("Scan discarded.")
        elif cmd == "next_character":
            self._next_character()
        elif cmd == "save_frame":
            self._save_frame()
        elif cmd == "preview":
            self._preview()
        elif cmd == "apply":
            self._apply()

    def _capture_and_scan(self, trusted: bool) -> bool:
        frame = self._capture.grab()
        self._frame = frame
        visible = self.scanner.stash_visible(frame)
        if not visible:
            self._set(stash_visible=False)
            return False
        results = self.scanner.scan(frame)
        placed = self._session.add(results, trusted=trusted)
        update = dict(stash_visible=True, last_results=results, frames=self._session.frames,
                      rows=self._session.positions(), rejected=self._session.rejected,
                      totals=self._session.totals(), unread=self._session.unread())
        if not placed and self._session.frames:
            update["message"] = ("Lost track of the scroll position, so that frame was skipped — "
                                 "scroll back a little so part of the last view is visible.")
        self._set(**update)
        return True

    def _counts_to_send(self) -> dict[str, int]:
        totals = self._session.totals()
        unread = self._session.unread()
        # An item with a stack we couldn't read would be under-counted; leave it alone.
        counts = {k: v for k, v in totals.items() if k not in unread}
        if self._state.full_mode:
            for key in self.catalog.items:
                if key not in counts and key not in unread:
                    counts[key] = 0
        return counts

    def _preview(self) -> None:
        char = self._state.character
        if not char:
            self._set(error="No character selected — add one in arc-tracker first.")
            return
        if self._session.frames == 0:
            self._set(message="Nothing scanned yet — snapshot or watch the stash first.")
            return
        counts = self._counts_to_send()
        resp = self.client.sync(char["id"], counts, apply=False)
        self._preview_counts = counts
        self._preview_frames = self._session.frames
        n = len(resp["changes"])
        self._set(preview=resp, message=f"{n} change(s) for {char['name']}. Apply to save." if n else "Tracker already matches.")

    def _apply(self) -> None:
        char = self._state.character
        if self._preview_counts is None or self._preview_frames != self._session.frames:
            self._set(message="Preview first — the scan changed since the last preview.")
            return
        resp = self.client.sync(char["id"], self._preview_counts, apply=True)
        n = len(resp["changes"])
        self._reset_session(f"Applied {n} change(s) to {char['name']}"
                            + (f" (sync #{resp['sync_id']} — revert from Vision Sync in arc-tracker)." if resp.get("sync_id") else "."))

    def _reset_session(self, message: str) -> None:
        self._session = ScanSession(self.cfg["stable_frames"])
        self._preview_counts = None
        self._preview_frames = -1
        self._set(frames=0, rows=0, rejected=0, totals={}, unread={}, preview=None, last_results=[], message=message)

    def _load_characters(self) -> None:
        try:
            self._characters = self.client.characters()
        except Exception as e:
            self._set(error=f"Can't reach arc-tracker: {e}")
            return
        want = self.cfg.get("character_id")
        char = next((c for c in self._characters if c["id"] == want), None) or (self._characters[0] if self._characters else None)
        self._set(character=char)

    def _next_character(self) -> None:
        if not self._characters:
            self._load_characters()
        if not self._characters:
            return
        cur = self._state.character
        idx = next((i for i, c in enumerate(self._characters) if cur and c["id"] == cur["id"]), -1)
        char = self._characters[(idx + 1) % len(self._characters)]
        self.cfg["character_id"] = char["id"]
        config.save(self.cfg)
        self._preview_counts = None
        self._set(character=char, preview=None, message=f"Character: {char['name']}")

    def _save_frame(self) -> None:
        frame = self._capture.grab()
        config.ensure_dirs()
        path = config.FRAMES_DIR / f"frame-{datetime.now():%Y%m%d-%H%M%S}.png"
        cv2.imwrite(str(path), frame)
        self._set(message=f"Saved {path.name} — label it later with `teach`.")

    def _set(self, **kw) -> None:
        with self._lock:
            for k, v in kw.items():
                setattr(self._state, k, v)
