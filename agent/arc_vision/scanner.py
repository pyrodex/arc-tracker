"""Turns a screenshot into slot results, and slot results from many frames into totals."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field

import cv2
import numpy as np

from . import config
from .catalog import IGNORE_KEY, Catalog, icon_path, load_icon_rgba, taught_templates
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
        out = []
        for r in range(-1, self.rows + 1):
            y = self.origin[1] + r * self.pitch[1] + dy
            if y >= top - 2 and y + self.slot[1] <= top + h + 2:
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
        self.matcher = matcher or build_matcher(catalog)
        self.counts = CountReader(cfg["count_text_threshold"], max_saturation=cfg.get("count_text_max_saturation", 70))
        self._anchor = None
        anchor = self.calib.get("anchor")
        if anchor and anchor.get("file"):
            img = cv2.imread(str(config.APP_DIR / anchor["file"]), cv2.IMREAD_COLOR)
            if img is not None:
                self._anchor = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        self._geom_cache: dict = {}

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

        Slot borders make horizontal edges every `pitch` pixels; find the offset
        where they line up best. Returns 0 when the evidence is weak (e.g. a UI
        without visible slot borders) or the grid sits where it was calibrated.
        """
        if not self.cfg.get("scroll_phase", True):
            return 0
        g = self.geometry(frame)
        x, y, w, h = g.viewport
        region = cv2.cvtColor(crop(frame, (x, y, w, h)), cv2.COLOR_BGR2GRAY).astype(np.float32)
        if region.shape[0] < g.pitch[1] * 2:
            return 0
        profile = np.abs(cv2.Sobel(region, cv2.CV_32F, 0, 1, ksize=3)).mean(axis=1)
        pitch = g.pitch[1]
        ys = np.arange(len(profile))
        scores = []
        for d in range(int(round(pitch))):
            ph = (ys - d) % pitch
            near = (np.minimum(ph, pitch - ph) <= 1) | (np.abs(ph - g.slot[1]) <= 1)
            scores.append(profile[near].mean() if near.any() else 0.0)
        scores = np.array(scores)
        d = int(scores.argmax())
        if scores.max() < 1.3 * np.median(scores):
            return 0
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
                cands = self.matcher.match(local, lbox, valid=valid)
                res = SlotResult(idx, c, sbox, "unknown", candidates=cands, signature=_signature(icon))
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
                            if g.count_box:
                                res.count, res.count_uncertain = self.counts.read(crop(frame, g.sub_box(sbox, g.count_box)))
                            else:
                                res.count = 1
                    else:
                        res.score = best.score
                out.append(res)
        return out


def _signature(icon_bgr) -> tuple:
    """Coarse colour layout of a slot; stable frame to frame, cheap to compare."""
    small = cv2.resize(icon_bgr, (3, 3), interpolation=cv2.INTER_AREA)
    return tuple((small // 48).ravel().tolist())


def build_matcher(catalog: Catalog) -> Matcher:
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
            mt.add_taught(key, img)
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
    return tuple(s[:3] if s[0] in ("item", "unread") else (s[0],) for s in row)


def _blank(row: tuple) -> bool:
    return all(s[0] == "empty" for s in row)


def _slots_match(a: tuple, b: tuple) -> bool:
    if a[0] != b[0]:
        return False
    if a[0] in ("item", "unread"):
        return a[1:3] == b[1:3]
    if a[0] == "empty":
        return True
    # unknown / ignored: compare appearance loosely; hover can nudge colours
    return sum(abs(x - y) for x, y in zip(a[-1], b[-1])) <= SIGNATURE_TOLERANCE


def _rows_match(a: tuple, b: tuple) -> bool:
    return len(a) == len(b) and all(_slots_match(x, y) for x, y in zip(a, b))


def _slot_key(s: SlotResult) -> tuple:
    """(kind, item key, count, signature) — signature last, used only for alignment."""
    if s.status == "item":
        return ("unread", s.key, None, s.signature) if s.count_uncertain else ("item", s.key, s.count, s.signature)
    if s.status in ("ignored", "unknown"):
        return (s.status, None, None, s.signature)
    return ("empty", None, None, ())
