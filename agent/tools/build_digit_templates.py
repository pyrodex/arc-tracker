"""Build arc_vision/digits.npz — glyph templates for the game's count font.

Tesseract misreads the game's thin "3" as "5", so counts are read by
matching each glyph against templates cut from real screenshots. Labelled
regions are listed in a JSON file:

    [{"image": "stash.png", "box": [x, y, w, h], "text": "x24"}, ...]

`text` lists the glyphs left to right; "x" is the multiplication sign in
front of a count and "/" a slash. Thin punctuation such as commas is too
short to be segmented and is left out of `text`.

    python tools/build_digit_templates.py labels.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from arc_vision.digits import glyph_vector, holes, segment  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "arc_vision" / "digits.npz"


def main(labels_path: str) -> None:
    base = Path(labels_path).parent
    entries = json.loads(Path(labels_path).read_text())
    vecs, labels, nholes, bad = [], [], [], 0
    cache = {}
    for e in entries:
        path = base / e["image"]
        if path not in cache:
            cache[path] = cv2.imread(str(path), cv2.IMREAD_COLOR)
        x, y, w, h = e["box"]
        crop = cache[path][y:y + h, x:x + w]
        glyphs = segment(crop, keep_marks=True)
        text = e["text"]
        if len(glyphs) != len(text):
            print(f"  skip {e['image']} {e['box']}: found {len(glyphs)} glyphs for '{text}'")
            bad += 1
            continue
        for g, ch in zip(glyphs, text):
            vecs.append(glyph_vector(g))
            labels.append(ch)
            nholes.append(holes(g))
    np.savez_compressed(OUT, vectors=np.array(vecs, np.float32), labels=np.array(labels), holes=np.array(nholes))
    have = sorted(set(labels))
    print(f"{len(labels)} glyph samples, classes {''.join(have)} → {OUT} ({bad} region(s) skipped)")


if __name__ == "__main__":
    main(sys.argv[1])
