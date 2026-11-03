"""Which raider is signed in: reads the player name the main menu shows.

The stash screen doesn't show the name, but the main menu does (top centre,
next to the crown icon, above "In Speranza"), and switching characters means
signing into another account, which always passes through it. So the agent
reads the name whenever the menu is up and keeps it until it sees another.

In-game names map to arc-tracker characters by name or by an alias you set
(`python -m arc_vision link <in-game name> <character>`).
"""

from __future__ import annotations

import difflib
import re

import cv2
import numpy as np

try:
    import pytesseract
    pytesseract.get_tesseract_version()
    HAVE_TESSERACT = True
except Exception:
    pytesseract = None
    HAVE_TESSERACT = False

MATCH_RATIO = 0.84


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def read_name(frame: np.ndarray, box: tuple[int, int, int, int]) -> str | None:
    """Raw OCR of the name box, or None if there's nothing name-like there."""
    if not HAVE_TESSERACT:
        return None
    x, y, w, h = box
    sub = frame[max(0, y):y + h, max(0, x):x + w]
    if sub.size == 0:
        return None
    gray = cv2.cvtColor(sub, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    text = pytesseract.image_to_string(255 - gray, config="--psm 7")
    # The crown icon reads as stray punctuation; names are the longest word.
    words = re.findall(r"[A-Za-z0-9_#.\-]{3,}", text)
    return max(words, key=len) if words else None


def resolve(raw: str | None, characters: list[dict], aliases: dict[str, int]) -> dict | None:
    """The arc-tracker character an OCR'd name belongs to, tolerating a misread letter or two."""
    if not raw:
        return None
    by_id = {c["id"]: c for c in characters}
    names: list[tuple[str, dict]] = [(_norm(c["name"]), c) for c in characters]
    names += [(_norm(a), by_id[cid]) for a, cid in aliases.items() if cid in by_id]
    target = _norm(raw)
    best, best_ratio = None, 0.0
    for n, c in names:
        if not n:
            continue
        r = difflib.SequenceMatcher(None, target, n).ratio()
        if r > best_ratio:
            best, best_ratio = c, r
    return best if best_ratio >= MATCH_RATIO else None
