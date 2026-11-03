"""Reads the stack count printed on a slot."""

from __future__ import annotations

import hashlib
import re

import cv2
import numpy as np

try:
    import pytesseract
    pytesseract.get_tesseract_version()
    HAVE_TESSERACT = True
except Exception:  # missing module or missing tesseract binary
    pytesseract = None
    HAVE_TESSERACT = False



class CountReader:
    """Returns (count, uncertain).

    No text in the count box → a single item (1, False).
    Text that reads as a number → (n, False).
    Text that won't read → (1, True), so the slot is flagged instead of guessed.
    """

    def __init__(self, text_threshold: int = 170, min_ink: float = 0.015, max_saturation: int = 70):
        self.text_threshold = text_threshold
        self.max_saturation = max_saturation
        self.min_ink = min_ink
        self._cache: dict[bytes, int | None] = {}

    def _ink(self, bgr: np.ndarray) -> np.ndarray:
        """Bright, nearly colourless pixels: white-ish digits, not brightly coloured art."""
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        sat = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)[..., 1]
        return ((gray >= self.text_threshold) & (sat <= self.max_saturation)).astype(np.uint8)

    def binarize(self, crop_bgr: np.ndarray) -> np.ndarray:
        return self._ink(crop_bgr) * 255

    def digits_mask(self, crop_bgr: np.ndarray, scale: int = 1) -> np.ndarray:
        """Bright pixels that look like the count, with bits of item art removed.

        Art that pokes into the count box touches the box's top or left edge;
        digits sit inside it, all about the same height.
        """
        if scale > 1:
            crop_bgr = cv2.resize(crop_bgr, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        ink = self._ink(crop_bgr)
        n, labels, stats, _ = cv2.connectedComponentsWithStats(ink, connectivity=8)
        keep = []
        for i in range(1, n):
            x, y, w, h, area = stats[i]
            if x == 0 or y == 0 or area < 3 * scale * scale:
                continue
            keep.append(i)
        if not keep:
            return np.zeros_like(ink)
        tallest = max(stats[i][3] for i in keep)
        keep = [i for i in keep if stats[i][3] >= 0.55 * tallest]
        # The count is one right-aligned run of digits: start from the
        # rightmost blob and walk left while the next blob is close and level.
        keep.sort(key=lambda i: stats[i][0] + stats[i][2], reverse=True)
        run = [keep[0]]
        for i in keep[1:]:
            prev = stats[run[-1]]
            x, y, w, h, _ = stats[i]
            gap = prev[0] - (x + w)
            level = min(y + h, prev[1] + prev[3]) - max(y, prev[1]) > 0.5 * min(h, prev[3])
            if gap <= 0.8 * tallest and level:
                run.append(i)
            else:
                break
        keep = run
        return np.isin(labels, keep).astype(np.uint8) * 255

    def read(self, crop_bgr: np.ndarray) -> tuple[int, bool]:
        if crop_bgr.size == 0:
            return 1, False
        ink = self.digits_mask(crop_bgr)
        if (ink > 0).mean() < self.min_ink:
            return 1, False
        big = self.digits_mask(crop_bgr, scale=4)
        key = hashlib.blake2b(np.packbits(big > 0).tobytes() + bytes(str(big.shape), "ascii"), digest_size=12).digest()
        if key not in self._cache:
            self._cache[key] = self._ocr(big)
            if len(self._cache) > 5000:
                self._cache.clear()
        n = self._cache[key]
        if n is None:
            return 1, True
        return n, False

    def _ocr(self, ink: np.ndarray) -> int | None:
        if not HAVE_TESSERACT:
            return None
        # Tesseract wants dark text on a light page with some margin.
        img = cv2.copyMakeBorder(255 - ink, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255)
        img = cv2.GaussianBlur(img, (3, 3), 0)
        for psm in (7, 8):
            text = pytesseract.image_to_string(img, config=f"--psm {psm} -c tessedit_char_whitelist=0123456789")
            digits = re.sub(r"\D", "", text)
            if digits and len(digits) <= 4 and int(digits) > 0:
                return int(digits)
        return None
