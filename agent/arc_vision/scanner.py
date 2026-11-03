"""Turns a screenshot into slot results, and slot results from many frames into totals."""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from dataclasses import dataclass, field

import cv2
import numpy as np

from . import config
from .catalog import IGNORE_KEY, Catalog, icon_path, load_icon_rgba, taught_templates
from .digits import ink_mask
from .matcher import Matcher
from .ocr import CountReader


@dataclass
class SlotResult:
    row: int
    col: int
    box: tuple[int, int, int, int]          # whole slot, screen pixels
    status: str                              # 'empty' | 'item' | 'ignored' | 'unknown'
    key: str | None = None
    name: str | None = None
    score: float = 0.0
    count: int = 0
    count_uncertain: bool = False
    candidates: list = field(default_factory=list)   # top matches, for teach/debug
    signature: tuple = ()                    # coarse appearance, for unknown slots
    blueprint: bool = False                  # drawn on the blue blueprint grid
    learned: bool = False                    # blueprint shows the learned checkmark


class Geometry:
    """Slot positions from the calibration, scaled if the capture size differs."""

    def __init__(self, calib: dict, frame_size: tuple[int, int]):
        sw, sh = calib.get("screen_size") or frame_size
        fx, fy = frame_size[0] / sw, frame_size[1] / sh
        s = lambda v, f: int(round(v * f))
        self.origin = (s(calib["origin"][0], fx), s(calib["origin"][1], fy))
        self.slot = (s(calib["slot"][0], fx), s(calib["slot"][1], fy))
        self.pitch = (calib["pitch"][0] * fx, calib["pitch"][1] * fy)
        self.cols, self.rows = int(calib["cols"]), int(calib["rows"])
        ib = calib.get("icon_box")
        if not ib:  # default: the slot interior minus a 10% border
            w, h = calib["slot"]
            ib = [w * 0.1, h * 0.1, w * 0.8, h * 0.8]
        self.icon_box = tuple(s(v, f) for v, f in zip(ib, (fx, fy, fx, fy)))
        cb = calib.get("count_box")
        self.count_box = tuple(s(v, f) for v, f in zip(cb, (fx, fy, fx, fy))) if cb else None
        anchor = calib.get("anchor")
        self.anchor_box = tuple(s(v, f) for v, f in zip(anchor["box"], (fx, fy, fx, fy))) if anchor else None
        self.scale = (fx, fy)

    def slot_box(self, r: int, c: int, dy: int = 0):
        x = int(round(self.origin[0] + c * self.pitch[0]))
        y = int(round(self.origin[1] + r * self.pitch[1])) + dy
        return (x, y, self.slot[0], self.slot[1])

    @property
    def viewport(self) -> tuple[int, int, int, int]:
        """The visible grid area: top of the first row to bottom of the last."""
        x0, y0 = self.origin
        w = int(round((self.cols - 1) * self.pitch[0])) + self.slot[0]
        h = int(round((self.rows - 1) * self.pitch[1])) + self.slot[1]
        return (x0, y0, w, h)

    def visible_rows(self, dy: int) -> list[int]:
        """Grid rows (relative to the calibrated first row) fully inside the viewport after shifting by dy."""
        _, top, _, h = self.viewport
        tol = max(3, int(self.slot[1] * 0.05))   # a sliver clipped off is still readable
        out = []
        for r in range(-1, self.rows + 1):
            y = self.origin[1] + r * self.pitch[1] + dy
            if y >= top - tol and y + self.slot[1] <= top + h + tol:
                out.append(r)
        return out

    def sub_box(self, slot_box, rel):
        return (slot_box[0] + rel[0], slot_box[1] + rel[1], rel[2], rel[3])


def crop(frame, box):
    x, y, w, h = box
    H, W = frame.shape[:2]
    return frame[max(0, y):min(H, y + h), max(0, x):min(W, x + w)]


class Scanner:
    def __init__(self, cfg: dict, catalog: Catalog, matcher: Matcher | None = None):
        if not cfg.get("calibration"):
            raise RuntimeError("Not calibrated yet — run `python -m arc_vision calibrate`.")
        self.cfg = cfg
        self.calib = cfg["calibration"]
        self.catalog = catalog
        self.matcher = matcher or build_matcher(catalog, cfg.get("blueprint_bg_min", 0.3))
        self.counts = CountReader(cfg["count_text_threshold"], max_saturation=cfg.get("count_text_max_saturation", 70),
                                   mode=cfg.get("count_reader", "auto"))
        self._anchor = None
        anchor = self.calib.get("anchor")
        if anchor and anchor.get("file"):
            img = cv2.imread(str(config.APP_DIR / anchor["file"]), cv2.IMREAD_COLOR)
            if img is not None:
                self._anchor = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        self._geom_cache: dict = {}
        self._check = None
        check_file = config.APP_DIR / "learned.png"
        if not check_file.exists():
            check_file = Path(__file__).parent / "presets" / "3440x1440-learned-check.png"
        img = cv2.imread(str(check_file), cv2.IMREAD_GRAYSCALE)
        if img is not None:
            self._check = (img > 127).astype(np.float32) * 255
        self._check_scaled: dict = {}

    def learned_mark(self, frame, sbox, g: "Geometry") -> bool:
        """Learned blueprints show a white checkmark in the slot's top-right corner."""
        if self._check is None:
            return False
        w, h = g.slot
        rel = self.calib.get("learned_box") or [round(w * 0.71), round(h * 0.016), round(w * 0.28), round(h * 0.23)]
        if g.scale != (1.0, 1.0) and self.calib.get("learned_box"):
            rel = [round(v * f) for v, f in zip(rel, (*g.scale, *g.scale))]
        region = crop(frame, g.sub_box(sbox, rel))
        # The shipped mark was cut from 129 px slots; scale it to these.
        f = w / 129.0
        if f not in self._check_scaled:
            t = self._check if abs(f - 1) < 0.02 else cv2.resize(self._check, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
            self._check_scaled[f] = t
        tpl = self._check_scaled[f]
        ink = ink_mask(region, 180, 60).astype(np.float32) * 255
        if ink.max() == 0 or ink.shape[0] < tpl.shape[0] or ink.shape[1] < tpl.shape[1]:
            return False
        score = float(cv2.matchTemplate(ink, tpl, cv2.TM_CCOEFF_NORMED).max())
        return score >= self.cfg.get("learned_threshold", 0.65)

    def geometry(self, frame) -> Geometry:
        size = (frame.shape[1], frame.shape[0])
        if size not in self._geom_cache:
            self._geom_cache[size] = Geometry(self.calib, size)
        return self._geom_cache[size]

    def stash_visible(self, frame) -> bool:
        """True when the fixed stash-screen element picked during calibration is on screen."""
        g = self.geometry(frame)
        if self._anchor is None or g.anchor_box is None:
            return True
        tpl = self._anchor
        if g.scale != (1.0, 1.0):
            tpl = cv2.resize(tpl, None, fx=g.scale[0], fy=g.scale[1])
        x, y, w, h = g.anchor_box
        pad = max(8, w // 4)
        region = crop(frame, (x - pad, y - pad, w + 2 * pad, h + 2 * pad))
        region = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        if region.shape[0] < tpl.shape[0] or region.shape[1] < tpl.shape[1]:
            return False
        res = cv2.matchTemplate(region, tpl, cv2.TM_CCOEFF_NORMED)
        return float(res.max()) >= self.cfg["anchor_threshold"]

    def scroll_phase(self, frame) -> int:
        """Vertical offset of the slot grid in this frame, for stashes that scroll by pixels.

        Looks straight down each slot's left border: it's bright where a slot
        is and dark in the gaps between rows, a square wave with the row pitch.
        The offset is where that wave lines up best. Only the border columns
        are read, so item art (and the blueprint grid) can't fool it. Returns 0
        when the evidence is weak or the grid sits where it was calibrated.
        """
        if not self.cfg.get("scroll_phase", True):
            return 0
        g = self.geometry(frame)
        x, y, w, h = g.viewport
        pitch = g.pitch[1]
        if h < pitch * 2:
            return 0
        gray = cv2.cvtColor(crop(frame, (x - 2, y, w + 4, h)), cv2.COLOR_BGR2GRAY).astype(np.float32)
        cols = []
        for c in range(g.cols):
            bx = int(round(c * g.pitch[0])) + 2          # +2: the crop starts 2 px left of the grid
            cols.append(gray[:, max(0, bx - 1): bx + 3].max(axis=1))
        profile = np.mean(cols, axis=0)
        ys = np.arange(len(profile))
        scores = []
        for d in range(int(round(pitch))):
            inside = ((ys - d) % pitch) < g.slot[1]
            if inside.all() or not inside.any():
                scores.append(0.0)
                continue
            scores.append(float(profile[inside].mean() - profile[~inside].mean()))
        scores = np.array(scores)
        d = int(scores.argmax())
        if scores.max() <= 0 or scores.max() < 1.5 * max(np.median(scores), 1e-3):
            return 0
        # Refine: each slot's top border is a bright line right under the dark
        # gap between rows. Look for that step across the middle of every slot
        # (corners are rounded, so the left border alone is a few px off) and
        # take the median over columns so item art can't outvote it.
        mids = []
        for c in range(g.cols):
            sx = int(round(c * g.pitch[0])) + 2
            mids.append(gray[:, sx + g.slot[0] // 4: sx + 3 * g.slot[0] // 4])
        mid = np.median(np.concatenate(mids, axis=1), axis=1)
        step = np.zeros_like(mid)
        step[2:] = mid[2:] - mid[:-2]
        best_d, best = d, -1e9
        for cand in range(d - 6, d + 7):
            tops = [int(round(cand + k * pitch)) for k in range(-1, int(h / pitch) + 2)]
            tops = [t for t in tops if 2 <= t < len(step)]
            score = float(np.mean([max(step[t - 1], step[t], step[t + 1] if t + 1 < len(step) else 0) for t in tops])) if tops else -1e9
            if score > best:
                best_d, best = cand, score
        d = best_d % int(round(pitch))
        dy = d if d <= pitch / 2 else d - int(round(pitch))
        return 0 if abs(dy) <= 1 else dy

    def _art_patch(self, frame, sbox, g: "Geometry"):
        """The slot, plus a mask that hides the stack-count digits from the matcher.

        Counts sit on top of the art; left in, they'd be matched as part of
        it. "ink" mode hides just the digit pixels (and a small halo for their
        outline); "box" hides the whole count box, for UIs that draw a solid
        badge behind the number.
        """
        local = crop(frame, sbox)
        valid = np.ones(local.shape[:2], np.uint8)
        if g.count_box:
            cx, cy, cw, ch = g.count_box
            sub = (slice(max(0, cy), cy + ch), slice(max(0, cx), cx + cw))
            if self.cfg.get("count_mask", "ink") == "box":
                valid[sub] = 0
            else:
                ink = self.counts.binarize(local[sub])
                ink = cv2.dilate(ink, np.ones((5, 5), np.uint8))
                valid[sub][ink > 0] = 0
        return local, g.icon_box, valid

    def scan(self, frame) -> list[SlotResult]:
        g = self.geometry(frame)
        m = self.cfg["match"]
        dy = self.scroll_phase(frame)
        out = []
        for idx, r in enumerate(g.visible_rows(dy)):
            for c in range(g.cols):
                sbox = g.slot_box(r, c, dy)
                ibox = g.sub_box(sbox, g.icon_box)
                icon = crop(frame, ibox)
                if icon.size == 0:
                    continue
                gray = cv2.cvtColor(icon, cv2.COLOR_BGR2GRAY)
                if float(gray.std()) < self.cfg["empty_std"]:
                    out.append(SlotResult(idx, c, sbox, "empty"))
                    continue
                local, lbox, valid = self._art_patch(frame, sbox, g)
                art_fg = grid_foreground(crop(local, lbox), self.cfg.get("blueprint_bg_min", 0.3))
                fg_hint = None
                if art_fg is not None:
                    fg_hint = np.zeros(local.shape[:2], np.uint8)
                    x, y, w, h = lbox
                    fg_hint[y:y + h, x:x + w] = art_fg
                is_bp = art_fg is not None
                cands = self.matcher.match(local, lbox, valid=valid, fg_hint=fg_hint,
                                           allow=lambda k, bp=is_bp: _type_allowed(k, bp))
                res = SlotResult(idx, c, sbox, "unknown", candidates=cands, signature=_signature(icon), blueprint=is_bp)
                if cands:
                    best = cands[0]
                    runner = cands[1].score if len(cands) > 1 else -1.0
                    lead = best.score - runner
                    ok = (best.score >= m["taught_min_score"]) if best.taught else (
                        (best.score >= m["min_score"] and lead >= m["min_margin"])
                        or (best.score >= m["strong_score"] and lead >= m["strong_margin"]))
                    if ok:
                        res.key, res.name, res.score = best.key, self.catalog.name(best.key), best.score
                        if best.key == IGNORE_KEY:
                            res.status = "ignored"
                        else:
                            res.status = "item"
                            if res.blueprint:
                                res.learned = self.learned_mark(frame, sbox, g)
                            if g.count_box:
                                res.count, res.count_uncertain = self.counts.read(crop(frame, g.sub_box(sbox, g.count_box)))
                            else:
                                res.count = 1
                    else:
                        res.score = best.score
                out.append(res)
        return out


def blueprint_grid(art_bgr, min_fraction: float) -> np.ndarray | None:
    """Mask of grid-blue pixels if this slot is drawn on the blueprint grid, else None.

    Blueprints sit on a saturated blue grid that runs to the slot's edges;
    ordinary items sit on dark navy with at most a rarity-coloured corner. So
    the test looks only at the art box's outer border, where blue item art
    rarely reaches: about half of it is grid-blue on a blueprint, ≤3% on
    anything else (measured on real screenshots).
    """
    if art_bgr.size == 0 or min(art_bgr.shape[:2]) < 12:
        return None
    hsv = cv2.cvtColor(art_bgr, cv2.COLOR_BGR2HSV)
    blue = ((hsv[..., 0] > 100) & (hsv[..., 0] < 130) & (hsv[..., 1] > 120) & (hsv[..., 2] > 70)).astype(np.uint8)
    ring = np.zeros(blue.shape, bool)
    ring[:5] = ring[-5:] = True
    ring[:, :5] = ring[:, -5:] = True
    return blue if blue[ring].mean() >= min_fraction else None


def grid_foreground(art_bgr, min_fraction: float) -> np.ndarray | None:
    """On the blueprint grid, the art is whatever doesn't look like the grid; None off the grid.

    The grid's own colours (fill and lines) are taken from the border ring, so
    blue parts of the item art itself still count as art.
    """
    if blueprint_grid(art_bgr, min_fraction) is None:
        return None
    ring = np.concatenate([art_bgr[:5].reshape(-1, 3), art_bgr[-5:].reshape(-1, 3),
                           art_bgr[:, :5].reshape(-1, 3), art_bgr[:, -5:].reshape(-1, 3)]).astype(np.float32)
    k = min(3, len(ring))
    _, _, centers = cv2.kmeans(ring, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0),
                               3, cv2.KMEANS_PP_CENTERS)
    px = art_bgr.reshape(-1, 1, 3).astype(np.float32)
    dist = np.abs(px - centers[None]).sum(axis=2).min(axis=1).reshape(art_bgr.shape[:2])
    fg = (dist > 45).astype(np.uint8)
    return cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))


def _type_allowed(key: str, on_blueprint_grid: bool) -> bool:
    """A weapon and its blueprint share art; the grid says which one this is.

    Blueprints only match slots on the grid; parts, materials and
    amplification components only match slots off it. Stencils and taught
    "ignore" labels aren't restricted.
    """
    t = key.split(":", 1)[0]
    if t == "blueprint":
        return on_blueprint_grid
    if t in ("arc_part", "amplification", "workshop_material"):
        return not on_blueprint_grid
    return True


def _signature(icon_bgr) -> tuple:
    """Coarse colour layout of a slot; stable frame to frame, cheap to compare."""
    small = cv2.resize(icon_bgr, (3, 3), interpolation=cv2.INTER_AREA)
    return tuple((small // 48).ravel().tolist())


def build_matcher(catalog: Catalog, bp_min: float = 0.3) -> Matcher:
    mt = Matcher()
    for it in catalog.items.values():
        if not it.icon_url or it.icon_standin:
            continue
        p = icon_path(it)
        if not p.exists():
            continue
        rgba = load_icon_rgba(p)
        if rgba is None:
            continue
        try:
            mt.add_icon(it.key, rgba)
        except ValueError:
            pass
    for key, img in taught_templates():
        if key == IGNORE_KEY or key in catalog.items:
            mt.add_taught(key, img, grid_foreground(img, bp_min))
    return mt


class ScanSession:
    """Adds up what was seen across frames while you scroll through the stash.

    Scrolling is tracked, not guessed. Each new frame is lined up against the
    rows already placed by finding the vertical shift where its rows match
    rows seen before; that gives every row an absolute position in the stash.
    A row seen again after scrolling just updates its position, so nothing is
    counted twice, while identical rows at different positions still count
    separately.

    A frame that can't be lined up — no overlap with what's been seen (you
    jumped more than a screen) or more than one shift fits equally well — is
    rejected and reported, never guessed. The first frame of a session sets
    position 0.

    In auto-watch a position's contents must be seen `stable_frames` times
    before they count, which filters rows half-hidden behind a tooltip;
    manual snapshots count straight away. Stacks whose count wouldn't read
    are left out of the totals and listed by unread().
    """

    def __init__(self, stable_frames: int = 2):
        self.stable_frames = max(1, stable_frames)
        self.frames = 0          # frames accepted
        self.rejected = 0        # frames that couldn't be lined up
        self.last_offset = 0     # absolute position of the latest frame's first row
        self._seen_rows: dict[int, tuple] = {}   # position → latest row (with signatures), for alignment
        # position → {row contents: frames seen}, and the contents that currently count
        self._votes: dict[int, dict[tuple, int]] = defaultdict(lambda: defaultdict(int))
        self._current: dict[int, tuple] = {}

    @staticmethod
    def frame_rows(results: list[SlotResult]) -> list[tuple]:
        rows = defaultdict(list)
        for r in results:
            rows[r.row].append(r)
        return [tuple(_slot_key(s) for s in sorted(rows[i], key=lambda s: s.col)) for i in sorted(rows)]

    def add(self, results: list[SlotResult], trusted: bool = False) -> bool:
        """Place a frame. Returns False (and changes nothing) if it can't be lined up."""
        rows = self.frame_rows(results)
        if not rows:
            return False
        if not self._seen_rows:
            offset = 0
        else:
            offset = self._align(rows)
            if offset is None:
                self.rejected += 1
                return False
        self.frames += 1
        self.last_offset = offset
        for i, row in enumerate(rows):
            pos = offset + i
            self._seen_rows[pos] = row
            contents = _contents(row)
            votes = self._votes[pos]
            votes[contents] += self.stable_frames if trusted else 1
            if votes[contents] >= self.stable_frames:
                # Latest stable reading wins, so moving items mid-scan is handled.
                self._current[pos] = contents
        return True

    def _align(self, rows: list[tuple]) -> int | None:
        known = self._seen_rows
        n = len(rows)
        best, ties = None, []
        for off in range(min(known) - n + 1, max(known) + 1):
            overlap = matched = informative = 0
            for i, row in enumerate(rows):
                prev = known.get(off + i)
                if prev is None:
                    continue
                overlap += 1
                if _rows_match(prev, row):
                    matched += 1
                    if not _blank(row):
                        informative += 1
            # Need a matching row that isn't empty; allow one mismatched row
            # (a tooltip or hover highlight) once three or more rows overlap.
            if informative == 0 or overlap - matched > (1 if overlap >= 3 else 0):
                continue
            score = (matched, informative)
            if best is None or score > best:
                best, ties = score, [off]
            elif score == best:
                ties.append(off)
        if not ties:
            return None
        if len(ties) == 1:
            return ties[0]
        # Several shifts fit equally (repeating rows). Not having scrolled is
        # the only safe tie-break; anything else would be a guess, so reject.
        return self.last_offset if self.last_offset in ties else None

    def positions(self) -> int:
        return len(self._current)

    def totals(self) -> dict[str, int]:
        out: dict[str, int] = defaultdict(int)
        for contents in self._current.values():
            for slot in contents:
                if slot[0] == "item":
                    out[slot[1]] += slot[2]
        return dict(out)

    def learned(self) -> set[str]:
        """Blueprints seen with the learned checkmark."""
        return {slot[1] for contents in self._current.values() for slot in contents
                if slot[0] in ("item", "unread") and slot[3]}

    def unread(self) -> dict[str, int]:
        """Item key → stacks whose count wouldn't read (not included in totals)."""
        out: dict[str, int] = defaultdict(int)
        for contents in self._current.values():
            for slot in contents:
                if slot[0] == "unread":
                    out[slot[1]] += 1
        return dict(out)


SIGNATURE_TOLERANCE = 4


def _contents(row: tuple) -> tuple:
    """What counts: tracked items and their counts. Untracked slots collapse to 'other'."""
    return tuple(s[:4] if s[0] in ("item", "unread") else (s[0],) for s in row)


def _blank(row: tuple) -> bool:
    return all(s[0] == "empty" for s in row)


def _slots_match(a: tuple, b: tuple) -> bool:
    if a[0] != b[0]:
        return False
    if a[0] in ("item", "unread"):
        return a[1:4] == b[1:4]
    if a[0] == "empty":
        return True
    # unknown / ignored: compare appearance loosely; hover can nudge colours
    return sum(abs(x - y) for x, y in zip(a[-1], b[-1])) <= SIGNATURE_TOLERANCE


def _rows_match(a: tuple, b: tuple) -> bool:
    return len(a) == len(b) and all(_slots_match(x, y) for x, y in zip(a, b))


def _slot_key(s: SlotResult) -> tuple:
    """(kind, item key, count, signature) — signature last, used only for alignment."""
    if s.status == "item":
        kind = "unread" if s.count_uncertain else "item"
        return (kind, s.key, None if s.count_uncertain else s.count, s.learned, s.signature)
    if s.status in ("ignored", "unknown"):
        return (s.status, None, None, False, s.signature)
    return ("empty", None, None, False, ())
