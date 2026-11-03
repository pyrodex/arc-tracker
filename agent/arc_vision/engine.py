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

from . import config, identity
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
    character_confirmed: bool = False   # seen on the main menu, or picked by hand
    in_game_name: str | None = None
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
        self._session_char: int | None = None   # the character the current scan belongs to

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
        next_identity = 0.0
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
                if self._identity_box() and time.monotonic() >= next_identity:
                    next_identity = time.monotonic() + self.cfg["identity"]["check_interval_s"]
                    self.check_identity(self._capture.grab())
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

    # ── who's signed in ──────────────────────────────────────────────────────
    def _identity_box(self, frame=None):
        ident = self.cfg.get("identity") or {}
        box = ident.get("name_box")
        if not box:
            return None
        if frame is None:
            return box
        sw, sh = ident.get("screen_size") or (frame.shape[1], frame.shape[0])
        fx, fy = frame.shape[1] / sw, frame.shape[0] / sh
        return (int(box[0] * fx), int(box[1] * fy), int(box[2] * fx), int(box[3] * fy))

    def check_identity(self, frame) -> None:
        """If the main menu is up, read the name there and follow it."""
        if self.scanner.stash_visible(frame) and self.scanner._anchor is not None:
            return   # the stash screen doesn't show the name
        raw = identity.read_name(frame, self._identity_box(frame))
        if not raw:
            return
        aliases = {k: int(v) for k, v in (self.cfg["identity"].get("aliases") or {}).items()}
        char = identity.resolve(raw, self._characters, aliases)
        if char is None:
            if raw != self._state.in_game_name:
                self._set(in_game_name=raw, character_confirmed=False,
                          error=f"Signed in as '{raw}', which isn't linked to a character — "
                                f"run: python -m arc_vision link \"{raw}\" <character>")
            return
        cur = self._state.character
        if cur and cur["id"] == char["id"]:
            if not self._state.character_confirmed or raw != self._state.in_game_name:
                self._set(in_game_name=raw, character_confirmed=True, error="")
            return
        msg = f"Signed in as {raw} → {char['name']}."
        if self._session.frames:
            msg += f" The scan in progress for {cur['name'] if cur else 'the previous character'} was discarded."
            self._reset_session(msg)
        self.cfg["character_id"] = char["id"]
        config.save(self.cfg)
        self._set(character=char, character_confirmed=True, in_game_name=raw, preview=None, message=msg, error="")

    def _character_ready(self) -> bool:
        if self._state.character is None:
            self._set(error="No character selected — add one in arc-tracker first.")
            return False
        need = self._identity_box() and self.cfg["identity"].get("require_confirmed", True)
        if need and not self._state.character_confirmed:
            self._set(error="I don't know which raider is signed in yet — go to the main menu once "
                            "(or pick the character with the next-character hotkey).")
            return False
        return True

    def _capture_and_scan(self, trusted: bool) -> bool:
        frame = self._capture.grab()
        self._frame = frame
        visible = self.scanner.stash_visible(frame)
        if not visible:
            self._set(stash_visible=False)
            return False
        results = self.scanner.scan(frame)
        if self._session.frames == 0:
            self._session_char = self._state.character["id"] if self._state.character else None
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
        if not self._character_ready():
            return
        char = self._state.character
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
        if not self._character_ready():
            return
        char = self._state.character
        if self._session_char != char["id"]:
            self._reset_session("The character changed during this scan, so it was discarded — scan again.")
            return
        if self._preview_counts is None or self._preview_frames != self._session.frames:
            self._set(message="Preview first — the scan changed since the last preview.")
            return
        resp = self.client.sync(char["id"], self._preview_counts, apply=True)
        n = len(resp["changes"])
        self._reset_session(f"Applied {n} change(s) to {char['name']}"
                            + (f" (sync #{resp['sync_id']} — revert from Vision Sync in arc-tracker)." if resp.get("sync_id") else "."))

    def _reset_session(self, message: str) -> None:
        self._session = ScanSession(self.cfg["stable_frames"])
        self._session_char = None
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
        msg = f"Character: {char['name']}"
        if self._session.frames:
            self._reset_session(msg + " — the scan in progress was discarded.")
        self._preview_counts = None
        self._set(character=char, character_confirmed=True, preview=None, message=msg)

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
