"""Reads numbers in the game's own font by matching glyph templates.

Tesseract misreads this font (a thin "3" comes back as "5"), so counts are
segmented into glyphs and each glyph is compared with templates cut from real
screenshots (see tools/build_digit_templates.py). A glyph that doesn't match
any template clearly makes the whole number unreadable; it is never guessed.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

GLYPH = 24
TEMPLATES = Path(__file__).with_name("digits.npz")
MIN_SCORE = 0.85
MIN_MARGIN = 0.04


def ink_mask(bgr: np.ndarray, threshold: int = 170, max_saturation: int = 70) -> np.ndarray:
    """Bright, nearly colourless pixels: white text, not brightly coloured art."""
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    sat = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)[..., 1]
    return ((gray >= threshold) & (sat <= max_saturation)).astype(np.uint8)


def segment(crop_bgr: np.ndarray, threshold: int = 170, max_saturation: int = 70,
            keep_marks: bool = False, edge_filter: bool = True) -> list[np.ndarray]:
    """The right-aligned run of glyphs in a crop, left to right, as binary images.

    Art poking into the box touches its top or left edge and is dropped
    (edge_filter). Short marks — commas, dots — are dropped; the "×" before a
    count is kept only with keep_marks (for building templates) and otherwise
    removed after classification.
    """
    ink = ink_mask(crop_bgr, threshold, max_saturation)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(ink, connectivity=8)
    comps = []
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if area < 3 or (edge_filter and (x == 0 or y == 0)):
            continue
        comps.append(i)
    if not comps:
        return []
    tallest = max(stats[i][3] for i in comps)
    comps = [i for i in comps if stats[i][3] >= 0.45 * tallest]
    comps.sort(key=lambda i: stats[i][0] + stats[i][2], reverse=True)
    run = [comps[0]]
    for i in comps[1:]:
        prev = stats[run[-1]]
        x, y, w, h, _ = stats[i]
        gap = prev[0] - (x + w)
        overlap = min(y + h, prev[1] + prev[3]) - max(y, prev[1])
        if gap <= 0.8 * tallest and overlap > 0.4 * min(h, prev[3]):
            run.append(i)
        else:
            break
    out = []
    for i in sorted(run, key=lambda i: stats[i][0]):
        x, y, w, h, _ = stats[i]
        out.append((labels[y:y + h, x:x + w] == i).astype(np.uint8) * 255)
    return out


def holes(glyph: np.ndarray) -> int:
    """Enclosed holes (0 has one, 8 has two): a font-independent check on the shape."""
    padded = cv2.copyMakeBorder(glyph, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    contours, hier = cv2.findContours(padded, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hier is None:
        return 0
    return sum(1 for c, h in zip(contours, hier[0]) if h[3] >= 0 and cv2.contourArea(c) >= 2)


def glyph_vector(glyph: np.ndarray) -> np.ndarray:
    h, w = glyph.shape
    side = max(h, w)
    canvas = np.zeros((side, side), np.uint8)
    canvas[(side - h) // 2:(side - h) // 2 + h, (side - w) // 2:(side - w) // 2 + w] = glyph
    v = cv2.resize(canvas, (GLYPH, GLYPH), interpolation=cv2.INTER_AREA).astype(np.float32).ravel()
    v -= v.mean()
    return v / (np.linalg.norm(v) + 1e-6)


def user_templates_path() -> Path:
    from . import config
    return config.APP_DIR / "digits_user.npz"


class DigitReader:
    """Shipped templates plus any you added with `teach` (for glyphs like 7 not in the screenshots yet)."""

    def __init__(self, path: Path = TEMPLATES, user_path: Path | None = None):
        self.user_path = user_path or user_templates_path()
        parts = [np.load(p) for p in (path, self.user_path) if p.exists()]
        self.ok = bool(parts)
        if self.ok:
            self.vectors = np.concatenate([d["vectors"] for d in parts])
            self.labels = np.concatenate([d["labels"] for d in parts])
            self.holes = np.concatenate([d["holes"] for d in parts])
            self.classes = sorted(set(self.labels.tolist()))

    def add_samples(self, crop_bgr: np.ndarray, text: str, threshold: int = 170, max_saturation: int = 70) -> bool:
        """Learn glyphs from a count crop you've read yourself; saved for next time."""
        glyphs = segment(crop_bgr, threshold, max_saturation)
        text = text.strip().lstrip("x×")
        if len(glyphs) != len(text) or not text.isdigit():
            return False
        vecs = np.array([glyph_vector(g) for g in glyphs], np.float32)
        labels = np.array(list(text))
        nh = np.array([holes(g) for g in glyphs])
        if self.user_path.exists():
            d = np.load(self.user_path)
            vecs = np.concatenate([d["vectors"], vecs])
            labels = np.concatenate([d["labels"], labels])
            nh = np.concatenate([d["holes"], nh])
        self.user_path.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(self.user_path, vectors=vecs, labels=labels, holes=nh)
        self.__init__(user_path=self.user_path)
        return True

    def classify(self, glyph: np.ndarray) -> tuple[str, float, float]:
        scores = self.vectors @ glyph_vector(glyph)
        # Only templates with the same number of holes compete (keeps 6 and 8 apart).
        same = self.holes == holes(glyph)
        if not same.any():
            return "?", 0.0, 0.0
        best = {c: float(scores[same & (self.labels == c)].max()) for c in self.classes if (same & (self.labels == c)).any()}
        ranked = sorted(best.items(), key=lambda kv: -kv[1])
        runner = ranked[1][1] if len(ranked) > 1 else -1.0
        return ranked[0][0], ranked[0][1], ranked[0][1] - runner

    def read(self, crop_bgr: np.ndarray, threshold: int = 170, max_saturation: int = 70) -> int | None:
        """The number in the crop, or None when any glyph is unclear."""
        if not self.ok:
            return None
        glyphs = segment(crop_bgr, threshold, max_saturation)
        text = ""
        for g in glyphs:
            ch, score, margin = self.classify(g)
            if score < MIN_SCORE or margin < MIN_MARGIN:
                return None
            text += ch
        text = text.lstrip("x")
        if not text.isdigit() or len(text) > 4 or int(text) == 0:
            return None
        return int(text)
