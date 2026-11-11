"""Settings and calibration, stored as JSON under ~/.arc_vision (or $ARC_VISION_HOME)."""

from __future__ import annotations

import copy
import json
import os
from pathlib import Path

APP_DIR = Path(os.environ.get("ARC_VISION_HOME", Path.home() / ".arc_vision"))
CONFIG_FILE = APP_DIR / "config.json"
CACHE_DIR = APP_DIR / "cache"          # catalog + icons pulled from arc-tracker
TAUGHT_DIR = APP_DIR / "taught"        # in-game crops you labelled with `teach`
FRAMES_DIR = APP_DIR / "frames"        # screenshots saved with the snapshot-to-file hotkey

DEFAULTS: dict = {
    # arc-tracker base URL (the same address you open in the browser)
    "server_url": "http://localhost:3333",
    "character_id": None,
    # How frames are captured (see capture.py). "window": Windows Graphics
    # Capture of the game window, the method streaming/clip tools use.
    # "screen": desktop copy of `monitor` via mss, as a fallback.
    "capture": {
        "method": "window",
        "window_title": "ARC Raiders",   # matched as a case-insensitive substring
        "channel_order": "bgra",         # 'rgba' if capture-test shows red/blue swapped
    },
    # Monitor for the overlay panel and the "screen" method: 1 = primary display
    "monitor": 1,
    # Written by `python -m arc_vision calibrate`; see calibrate.py for the fields.
    "calibration": None,
    "match": {
        # Wiki icons vs. in-game art. A match needs a decent score AND a clear
        # lead over the runner-up (the lead is what separates real matches from
        # untracked loot that merely resembles something) — or a very high score.
        "min_score": 0.60,
        "min_margin": 0.20,
        "strong_score": 0.85,
        "strong_margin": 0.08,
        # Crops you taught are taken from the game itself, so hold them to a higher bar.
        "taught_min_score": 0.90,
    },
    # Share of the item-art border that must be grid-blue for a slot to count
    # as a blueprint (real blueprints ≈0.5, everything else ≤0.03).
    "blueprint_bg_min": 0.3,
    # Match threshold for the learned checkmark on blueprints.
    "learned_threshold": 0.65,
    # A slot whose icon area has less brightness variation than this is empty.
    "empty_std": 9.0,
    # Count digits: pixels brighter than this (0-255) count as text.
    "count_text_threshold": 170,
    # ...and at most this colourful (HSV saturation 0-255), so bright art isn't read as digits.
    "count_text_max_saturation": 70,
    # "auto" reads counts with glyph templates of the game font (digits.npz),
    # falling back to Tesseract if they're missing; "tesseract" always uses Tesseract.
    "count_reader": "auto",
    # How counts are hidden from icon matching: "ink" (digit pixels only) or
    # "box" (the whole count box, for a solid badge behind the number).
    "count_mask": "ink",
    # Stash screen anchor match threshold (TM_CCOEFF_NORMED).
    "anchor_threshold": 0.80,
    # Auto-watch: seconds between captures, and how many frames a row must be
    # seen in before it counts (filters out rows half-covered by a tooltip).
    "watch_interval_s": 0.75,
    "stable_frames": 2,
    # Detect the grid's pixel offset each frame, for stashes that scroll smoothly.
    "scroll_phase": True,
    # Who's signed in, read from the main menu (see identity.py).
    "identity": {
        "name_box": None,          # [x, y, w, h] on the main menu; set with `calibrate-name`
        "screen_size": None,
        "aliases": {},             # in-game name → arc-tracker character id (`link`)
        "require_confirmed": True, # don't sync until the signed-in raider is known
        "check_interval_s": 2.0,
    },
    "hotkeys": {
        "snapshot": "ctrl+alt+s",
        "toggle_watch": "ctrl+alt+w",
        "preview": "ctrl+alt+p",
        "apply": "ctrl+alt+a",
        "discard": "ctrl+alt+x",
        "next_character": "ctrl+alt+c",
        "toggle_full": "ctrl+alt+z",
        "toggle_overlay": "ctrl+alt+o",
        "toggle_boxes": "ctrl+alt+b",
        "save_frame": "ctrl+alt+f",
    },
    "overlay": {"corner": "top-right", "opacity": 0.88, "width": 360},
}


def _merge(base: dict, override: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out


def load() -> dict:
    data = {}
    if CONFIG_FILE.exists():
        data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    return _merge(DEFAULTS, data)


def save(cfg: dict) -> None:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2), encoding="utf-8")


def ensure_dirs() -> None:
    for d in (APP_DIR, CACHE_DIR, CACHE_DIR / "icons", TAUGHT_DIR, FRAMES_DIR):
        d.mkdir(parents=True, exist_ok=True)
