"""Synthetic stash screens for testing the pipeline without the game.

Draws a fake catalog of icons, lays them out in a tall stash, and renders
screen frames that look at the stash at any pixel scroll offset. Ground truth
comes back with every frame so tests can check detection and totals.
"""

from __future__ import annotations

import json
import random

import cv2
import numpy as np

SCREEN = (1920, 1080)
ORIGIN = (600, 220)
SLOT = 84
GAP = 8
PITCH = SLOT + GAP
COLS = 8
ROWS = 7          # visible rows
COUNT_BOX = [30, 54, 52, 28]   # relative to slot; room for 3 digits
ICON_BOX = [8, 8, 68, 68]


def make_icon(rng: random.Random, size: int = 128) -> np.ndarray:
    img = np.zeros((size, size, 4), np.uint8)
    for _ in range(rng.randint(3, 6)):
        color = [rng.randint(40, 255) for _ in range(3)] + [255]
        kind = rng.choice(["circle", "rect", "poly", "line"])
        if kind == "circle":
            cv2.circle(img, (rng.randint(20, 108), rng.randint(20, 108)), rng.randint(10, 40), color, -1, cv2.LINE_AA)
        elif kind == "rect":
            x, y = rng.randint(5, 80), rng.randint(5, 80)
            cv2.rectangle(img, (x, y), (x + rng.randint(15, 45), y + rng.randint(15, 45)), color, -1)
        elif kind == "poly":
            pts = np.array([[rng.randint(5, 123), rng.randint(5, 123)] for _ in range(rng.randint(3, 6))], np.int32)
            cv2.fillPoly(img, [pts], color, cv2.LINE_AA)
        else:
            cv2.line(img, (rng.randint(0, 127), rng.randint(0, 127)), (rng.randint(0, 127), rng.randint(0, 127)), color, rng.randint(4, 10), cv2.LINE_AA)
    return img


def build_catalog(rng, n_tracked=60, n_untracked=25):
    types = ["blueprint", "stencil", "arc_part", "amplification", "workshop_material"]
    items, icons, untracked = [], {}, []
    for i in range(n_tracked):
        t = types[i % len(types)]
        key = f"{t}:{i + 1}"
        items.append({"type": t, "id": i + 1, "name": f"Item {i + 1}", "slug": f"item-{i + 1}",
                      "icon_url": f"/icons/item-{i + 1}.png", "icon_standin": False})
        icons[key] = make_icon(rng)
    for _ in range(n_untracked):
        untracked.append(make_icon(rng))
    return {"types": types, "items": items}, icons, untracked


def render_slot(rng, content, icons, untracked):
    """content: None | ('item', key, count) | ('other', idx)."""
    slot = np.full((SLOT, SLOT, 3), (38, 34, 30), np.uint8)
    cv2.rectangle(slot, (0, 0), (SLOT - 1, SLOT - 1), (90, 84, 76), 2)
    if content is None:
        return slot
    rgba = icons[content[1]] if content[0] == "item" else untracked[content[1]]
    art = cv2.resize(rgba, (60, 60), interpolation=cv2.INTER_AREA)
    a = art[..., 3:4].astype(np.float32) / 255
    x0 = y0 = (SLOT - 60) // 2
    roi = slot[y0:y0 + 60, x0:x0 + 60].astype(np.float32)
    slot[y0:y0 + 60, x0:x0 + 60] = (art[..., :3] * a + roi * (1 - a)).astype(np.uint8)
    if content[0] == "item" and content[2] > 1:
        txt = str(content[2])
        (tw, th), _ = cv2.getTextSize(txt, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
        org = (SLOT - 6 - tw, SLOT - 7)
        # Light digits with a dark outline, drawn straight over the art.
        cv2.putText(slot, txt, org, cv2.FONT_HERSHEY_SIMPLEX, 0.55, (10, 10, 10), 5, cv2.LINE_AA)
        cv2.putText(slot, txt, org, cv2.FONT_HERSHEY_SIMPLEX, 0.55, (235, 235, 235), 2, cv2.LINE_AA)
    return slot


def build_stash(rng, catalog_keys, n_untracked, total_rows=16, fill=0.7):
    """Grid of contents; includes two identical rows at different positions."""
    grid = []
    for r in range(total_rows):
        row = []
        for c in range(COLS):
            p = rng.random()
            if r >= total_rows - 2 or p > fill:
                row.append(None)
            elif p < fill * 0.6:
                k = rng.choice(catalog_keys)
                row.append(("item", k, rng.choice([1, 1, 2, 3, 5, 12, 47, 150])))
            else:
                row.append(("other", rng.randrange(n_untracked)))
        grid.append(row)
    grid[9] = list(grid[3])   # a duplicate row far enough apart to be on different screens
    return grid


def truth_totals(grid):
    out = {}
    for row in grid:
        for s in row:
            if s and s[0] == "item":
                out[s[1]] = out.get(s[1], 0) + s[2]
    return out


def render_stash_canvas(rng, grid, icons, untracked):
    h = len(grid) * PITCH
    canvas = np.full((h, COLS * PITCH, 3), (24, 22, 20), np.uint8)
    for r, row in enumerate(grid):
        for c, content in enumerate(row):
            canvas[r * PITCH: r * PITCH + SLOT, c * PITCH: c * PITCH + SLOT] = render_slot(rng, content, icons, untracked)
    return canvas


def render_frame(canvas, scroll_px, noise_rng=None, tooltip=None):
    frame = np.full((SCREEN[1], SCREEN[0], 3), (16, 15, 14), np.uint8)
    cv2.putText(frame, "STASH", (ORIGIN[0], ORIGIN[1] - 60), cv2.FONT_HERSHEY_DUPLEX, 1.4, (200, 200, 200), 2, cv2.LINE_AA)
    vw = (COLS - 1) * PITCH + SLOT
    vh = (ROWS - 1) * PITCH + SLOT
    view = canvas[scroll_px: scroll_px + vh, :vw]
    frame[ORIGIN[1]: ORIGIN[1] + view.shape[0], ORIGIN[0]: ORIGIN[0] + vw] = view
    if tooltip:
        x, y = tooltip
        cv2.rectangle(frame, (x, y), (x + 260, y + 170), (60, 60, 60), -1)
    if noise_rng is not None:
        noise = noise_rng.normal(0, 3, frame.shape)
        frame = np.clip(frame.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    return frame


def calibration():
    return {
        "screen_size": list(SCREEN),
        "origin": list(ORIGIN),
        "slot": [SLOT, SLOT],
        "pitch": [PITCH, PITCH],
        "cols": COLS, "rows": ROWS,
        "icon_box": ICON_BOX,
        "count_box": COUNT_BOX,
        "anchor": {"box": [ORIGIN[0] - 4, ORIGIN[1] - 100, 150, 56], "file": "anchor.png"},
    }


def write_fixture(home, catalog, icons, anchor_frame):
    """Lay out ARC_VISION_HOME as if `refresh` and `calibrate` had run."""
    (home / "cache" / "icons").mkdir(parents=True, exist_ok=True)
    (home / "cache" / "catalog.json").write_text(json.dumps(catalog))
    for it in catalog["items"]:
        key = f"{it['type']}:{it['id']}"
        cv2.imwrite(str(home / "cache" / "icons" / f"{it['type']}__{it['slug']}.png"), icons[key])
    cal = calibration()
    x, y, w, h = cal["anchor"]["box"]
    cv2.imwrite(str(home / "anchor.png"), anchor_frame[y:y + h, x:x + w])
    return cal
