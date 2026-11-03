"""Interactive calibration: tell the agent where the stash grid is.

Works from a full-resolution screenshot of the stash screen. Every point is
picked twice — roughly on the whole screen, then exactly on a zoomed view —
so slot geometry is pixel-accurate even on a 4K screen.

Saved calibration fields (screen pixels):
  screen_size  [w, h] of the screenshot
  origin       top-left of the first (top-left) slot
  slot         [w, h] of one slot
  pitch        [dx, dy] from one slot to the next column / row
  cols, rows   grid size visible at once
  icon_box     [x, y, w, h] of the item art inside a slot (relative to the slot)
  count_box    [x, y, w, h] of the stack-count digits inside a slot (relative)
  anchor       {box: [x, y, w, h], file: "anchor.png"} — a fixed bit of the
               stash screen UI used to tell the stash is open
"""

from __future__ import annotations

import cv2
import numpy as np

from . import config

WIN = "arc-vision calibration"
MAX_VIEW = (1600, 900)
ZOOM = 5
ZOOM_RADIUS = 60


def _fit(img):
    h, w = img.shape[:2]
    s = min(MAX_VIEW[0] / w, MAX_VIEW[1] / h, 1.0)
    return (cv2.resize(img, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA) if s < 1 else img.copy()), s


BANNER = 34


def _banner(img, text):
    """Adds an instruction strip ABOVE the image; picked y values subtract BANNER."""
    out = cv2.copyMakeBorder(img, BANNER, 0, 0, max(0, 900 - img.shape[1]), cv2.BORDER_CONSTANT, value=(0, 0, 0))
    cv2.putText(out, text, (10, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (80, 220, 255), 1, cv2.LINE_AA)
    return out


def _click(view, prompt) -> tuple[int, int] | None:
    pt = []

    def cb(ev, x, y, *_):
        if ev == cv2.EVENT_LBUTTONDOWN and y >= BANNER and x < view.shape[1]:
            pt[:] = [(x, y - BANNER)]

    cv2.imshow(WIN, _banner(view, prompt + "   (Esc = cancel)"))
    cv2.setMouseCallback(WIN, cb)
    while not pt:
        if cv2.waitKey(30) == 27:
            return None
    return pt[0]


def pick_point(img, prompt) -> tuple[int, int] | None:
    """Rough click on the overview, then an exact click on a zoomed crop."""
    view, s = _fit(img)
    p = _click(view, prompt + " — click roughly")
    if p is None:
        return None
    cx, cy = int(p[0] / s), int(p[1] / s)
    H, W = img.shape[:2]
    x0, y0 = max(0, cx - ZOOM_RADIUS), max(0, cy - ZOOM_RADIUS)
    x1, y1 = min(W, cx + ZOOM_RADIUS), min(H, cy + ZOOM_RADIUS)
    zoom = cv2.resize(img[y0:y1, x0:x1], None, fx=ZOOM, fy=ZOOM, interpolation=cv2.INTER_NEAREST)
    q = _click(zoom, prompt + " — now click exactly")
    if q is None:
        return None
    return x0 + q[0] // ZOOM, y0 + q[1] // ZOOM


def pick_rect_zoomed(img, box, prompt) -> list[int] | None:
    """Drag a rectangle on an enlarged crop of `box`; returns it relative to the box."""
    x, y, w, h = box
    sub = img[y:y + h, x:x + w]
    z = max(1, min(8, 640 // max(w, h)))
    big = cv2.resize(sub, None, fx=z, fy=z, interpolation=cv2.INTER_NEAREST)
    r = cv2.selectROI(WIN, _banner(big, prompt + "  — drag, then Enter (c = skip)"), showCrosshair=False)
    if r[2] == 0 or r[3] == 0:
        return None
    return [int(r[0] / z), max(0, int((r[1] - BANNER) / z)), int(r[2] / z), int(r[3] / z)]


def pick_rect_overview(img, prompt) -> list[int] | None:
    view, s = _fit(img)
    r = cv2.selectROI(WIN, _banner(view, prompt + "  — drag, then Enter (c = skip)"), showCrosshair=False)
    if r[2] == 0 or r[3] == 0:
        return None
    return [int(r[0] / s), max(0, int((r[1] - BANNER) / s)), int(r[2] / s), int(r[3] / s)]


def _ask_int(prompt, default=None) -> int:
    while True:
        raw = input(f"{prompt}{f' [{default}]' if default else ''}: ").strip()
        if not raw and default:
            return default
        if raw.isdigit() and int(raw) > 0:
            return int(raw)
        print("  enter a positive whole number")


def draw_grid(img, calib, results=None):
    from .scanner import Geometry

    g = Geometry(calib, (img.shape[1], img.shape[0]))
    out = img.copy()
    for r in range(g.rows):
        for c in range(g.cols):
            sb = g.slot_box(r, c)
            cv2.rectangle(out, sb[:2], (sb[0] + sb[2], sb[1] + sb[3]), (0, 200, 255), 1)
            ib = g.sub_box(sb, g.icon_box)
            cv2.rectangle(out, ib[:2], (ib[0] + ib[2], ib[1] + ib[3]), (255, 160, 0), 1)
            if g.count_box:
                cb = g.sub_box(sb, g.count_box)
                cv2.rectangle(out, cb[:2], (cb[0] + cb[2], cb[1] + cb[3]), (0, 255, 0), 1)
    if g.anchor_box:
        a = g.anchor_box
        cv2.rectangle(out, a[:2], (a[0] + a[2], a[1] + a[3]), (255, 0, 255), 2)
    return out


def run(img: np.ndarray, cfg: dict) -> dict | None:
    print(__doc__.split("Saved calibration")[0])
    cv2.namedWindow(WIN, cv2.WINDOW_AUTOSIZE)
    try:
        while True:
            tl = pick_point(img, "1/2  TOP-LEFT corner of the top-left stash slot")
            br = tl and pick_point(img, "2/2  BOTTOM-RIGHT corner of that same slot")
            if not br:
                return None
            print("\nNow in the terminal:")
            cols = _ask_int("  How many slot COLUMNS does the stash grid show", 4)
            rows = _ask_int("  How many FULL slot ROWS are visible at once (ignore a cut-off row)", 6)
            # Measuring across the whole grid keeps a fractional pitch accurate.
            if cols > 1:
                lx = pick_point(img, f"TOP-LEFT corner of the LAST slot in the first row (column {cols})")
                pitch_x = (lx[0] - tl[0]) / (cols - 1) if lx else None
            else:
                pitch_x = br[0] - tl[0] + 1
            if rows > 1:
                ly = pick_point(img, f"TOP-LEFT corner of the first slot in the LAST full row (row {rows})")
                pitch_y = (ly[1] - tl[1]) / (rows - 1) if ly else None
            else:
                pitch_y = br[1] - tl[1] + 1
            if not pitch_x or not pitch_y:
                return None
            calib = {
                "screen_size": [img.shape[1], img.shape[0]],
                "origin": list(tl),
                "slot": [br[0] - tl[0], br[1] - tl[1]],
                "pitch": [round(pitch_x, 2), round(pitch_y, 2)],
                "cols": cols,
                "rows": rows,
            }
            if min(calib["slot"]) < 8 or min(calib["pitch"]) < 8:
                print("Those points don't make a sensible slot — let's try again.")
                continue

            slot_box = (*calib["origin"], *calib["slot"])
            print("\nBack in the window: drag a box around the item ART area of that first slot — "
                  "everything above the footer strip with the category icon and count. Press c for the default.")
            calib["icon_box"] = pick_rect_zoomed(img, slot_box, "Item art inside the slot")
            print("Drag a box around the right part of the footer where the count (×24) sits — "
                  "leave room for ×100, and keep the category icon on the left out. Press c if there are no counts.")
            calib["count_box"] = pick_rect_zoomed(img, slot_box, "Stack-count digits")
            print("Last: drag a box around a fixed UI element that is only on the stash screen "
                  "(a header or tab label works well). Press c to skip — then every frame counts as the stash.")
            anchor = pick_rect_overview(img, "Fixed stash-screen element")
            if anchor:
                x, y, w, h = anchor
                config.ensure_dirs()
                cv2.imwrite(str(config.APP_DIR / "anchor.png"), img[y:y + h, x:x + w])
                calib["anchor"] = {"box": anchor, "file": "anchor.png"}

            preview, _ = _fit(draw_grid(img, calib))
            cv2.imshow(WIN, _banner(preview, "Grid preview: Enter = save, r = redo, Esc = cancel"))
            while True:
                k = cv2.waitKey(0) & 0xFF
                if k in (13, 10):
                    return calib
                if k == ord("r"):
                    break
                if k == 27:
                    return None
    finally:
        cv2.destroyAllWindows()
