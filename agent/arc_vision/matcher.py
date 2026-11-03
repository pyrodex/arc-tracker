"""Icon matching.

Every reference image becomes a small SIZE×SIZE template. A slot is compared
against all templates at once with zero-mean normalised correlation on two
channels — brightness and edges — minus a small penalty for average-colour
difference so recolours of the same art (Mk. I vs Mk. II) can be told apart.

Wiki icons have transparency, so their brightness template is composited at
match time onto the slot's own background colour: the art's outline against
the slot is part of what's compared, whatever colour the slot is.

Both sides are normalised the same way — the art's bounds squared, with a
margin — so they're compared at the same scale however large the game draws
a particular item. A few extra scales/offsets absorb small errors in finding
those bounds. Pixels under the stack-count digits are left out.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

SIZE = 32
ART_FRAC = 0.8              # art fills this much of the template; the rest is background
SCALES = (0.9, 1.0, 1.1)
SHIFT_FRAC = 0.04
SHIFTS = ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1))
COLOR_WEIGHT = 0.15
BG_DISTANCE = 28
EPS = 1e-6
BLUR = 1.0   # Gaussian sigma at SIZE scale; makes thin lines tolerant of 1-2 px misalignment


def _blur(x: np.ndarray) -> np.ndarray:
    return cv2.GaussianBlur(x, (0, 0), BLUR)


@dataclass
class Match:
    key: str
    score: float
    taught: bool


def _gray_lab(bgr: np.ndarray):
    gray = _blur(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32))
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    return gray, lab[..., 1] - 128.0, lab[..., 2] - 128.0


def _edges(gray: np.ndarray) -> np.ndarray:
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    return cv2.magnitude(gx, gy)


def _fit_rgba(rgba: np.ndarray) -> np.ndarray:
    """Crop to the art's alpha bounds and centre it on a SIZE×SIZE canvas at ART_FRAC."""
    alpha = rgba[..., 3]
    ys, xs = np.nonzero(alpha > 32)
    if len(xs) == 0:
        raise ValueError("icon is fully transparent")
    art = rgba[ys.min(): ys.max() + 1, xs.min(): xs.max() + 1]
    h, w = art.shape[:2]
    scale = SIZE * ART_FRAC / max(h, w)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    art = cv2.resize(art, (nw, nh), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((SIZE, SIZE, 4), np.uint8)
    x0, y0 = (SIZE - nw) // 2, (SIZE - nh) // 2
    canvas[y0:y0 + nh, x0:x0 + nw] = art
    return canvas


def art_box(img: np.ndarray, box, valid: np.ndarray | None = None):
    """(centre x, centre y, side, background BGR) of the art inside `box`.

    The slot background is estimated from the box's outer ring; pixels that
    differ from it are art.
    """
    x, y, w, h = box
    sub = img[y:y + h, x:x + w].astype(np.int16)
    if sub.shape[0] < 6 or sub.shape[1] < 6:
        return x + w / 2, y + h / 2, max(w, h), np.zeros(3)
    ring = np.concatenate([sub[:2].reshape(-1, 3), sub[-2:].reshape(-1, 3),
                           sub[:, :2].reshape(-1, 3), sub[:, -2:].reshape(-1, 3)])
    bg = np.median(ring, axis=0)
    fg = np.abs(sub - bg).sum(axis=2) > BG_DISTANCE
    if valid is not None:
        fg &= valid[y:y + h, x:x + w] > 0
    fg = cv2.morphologyEx(fg.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    ys, xs = np.nonzero(fg)
    if len(xs) < 12:
        return x + w / 2, y + h / 2, max(w, h), bg
    x0, x1 = np.percentile(xs, [0.5, 99.5])
    y0, y1 = np.percentile(ys, [0.5, 99.5])
    side = max(x1 - x0, y1 - y0) + 1
    return x + (x0 + x1 + 1) / 2, y + (y0 + y1 + 1) / 2, side, bg


class Matcher:
    def __init__(self):
        self._keys: list[str] = []
        self._taught: list[bool] = []
        # per template: gray art·α (P), 1-α (Q), gray mask, edges, edge mask, colour mask, mean a, mean b
        self._rows: list[tuple] = []
        self._ready = False

    def __len__(self):
        return len(self._keys)

    # ── building templates ───────────────────────────────────────────────────
    def add_icon(self, key: str, rgba: np.ndarray) -> None:
        """A wiki icon with transparency (BGRA)."""
        c = _fit_rgba(rgba)
        alpha = c[..., 3].astype(np.float32) / 255.0
        art = c[..., :3].astype(np.float32)
        gray_art = cv2.cvtColor(c[..., :3], cv2.COLOR_BGR2GRAY).astype(np.float32)
        solid = (alpha > 0.5).astype(np.uint8)
        # Brightness is compared over the art plus a band of background around it.
        mask_g = cv2.dilate(solid, np.ones((5, 5), np.uint8)).astype(np.float32)
        comp = (art * alpha[..., None] + 30 * (1 - alpha[..., None])).astype(np.uint8)
        _, a, b = _gray_lab(comp)
        mask_c = cv2.erode(solid, np.ones((3, 3), np.uint8)).astype(np.float32)
        if mask_c.sum() < 10:
            mask_c = solid.astype(np.float32)
        edge = _edges(_blur(cv2.cvtColor(comp, cv2.COLOR_BGR2GRAY).astype(np.float32)))
        self._add(key, False, _blur(gray_art * alpha), _blur(1 - alpha), mask_g, edge, mask_g, mask_c, a, b)

    def add_taught(self, key: str, icon_bgr: np.ndarray) -> None:
        """An in-game crop of the icon box, labelled by you."""
        h, w = icon_bgr.shape[:2]
        img = self.variants(icon_bgr, (0, 0, w, h), only_base=True)[0][0]
        gray, a, b = _gray_lab(img)
        ones = np.ones((SIZE, SIZE), np.float32)
        self._add(key, True, gray, np.zeros_like(gray), ones, _edges(gray), ones, ones, a, b)

    def _add(self, key, taught, P, Q, mask_g, edge, mask_e, mask_c, a, b):
        cnt = mask_c.sum()
        self._keys.append(key)
        self._taught.append(taught)
        self._rows.append((P, Q, mask_g, edge, mask_e, mask_c,
                           float((a * mask_c).sum() / cnt), float((b * mask_c).sum() / cnt)))
        self._ready = False

    def _build(self):
        def st(i):
            return np.stack([r[i].ravel() for r in self._rows]).astype(np.float32)

        self._Mg = st(2)
        self._PM = st(0) * self._Mg
        self._QM = st(1) * self._Mg
        self._Me = st(4)
        self._E = st(3) * self._Me
        self._Mc = st(5)
        self._mean_a = np.array([r[6] for r in self._rows], np.float32)
        self._mean_b = np.array([r[7] for r in self._rows], np.float32)
        self._taught_arr = np.array(self._taught)
        self._ready = True

    # ── matching ─────────────────────────────────────────────────────────────
    @staticmethod
    def variants(frame: np.ndarray, box, only_base: bool = False, valid: np.ndarray | None = None):
        """[(image, validity mask, background gray)] — the art squared at a few scales/offsets."""
        cx, cy, side, bg = art_box(frame, box, valid)
        bg_gray = float(cv2.cvtColor(np.uint8([[np.clip(bg, 0, 255)]]), cv2.COLOR_BGR2GRAY)[0, 0])
        if valid is None:
            valid = np.ones(frame.shape[:2], np.uint8)
        full = side / ART_FRAC
        pad = int(full) + 4
        # Pad with edge pixels so squares reaching past the frame stay valid.
        padded = cv2.copyMakeBorder(frame, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
        vpad = cv2.copyMakeBorder(valid, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
        out = []
        for s in ((1.0,) if only_base else SCALES):
            for dx, dy in (((0, 0),) if only_base else SHIFTS):
                half = full * s / 2
                ox, oy = cx + dx * SHIFT_FRAC * side + pad, cy + dy * SHIFT_FRAC * side + pad
                x0, y0 = int(round(ox - half)), int(round(oy - half))
                x1, y1 = int(round(ox + half)), int(round(oy + half))
                if x1 - x0 < 4 or y1 - y0 < 4:
                    continue
                img = cv2.resize(padded[y0:y1, x0:x1], (SIZE, SIZE), interpolation=cv2.INTER_AREA)
                m = cv2.resize(vpad[y0:y1, x0:x1], (SIZE, SIZE), interpolation=cv2.INTER_NEAREST)
                out.append((img, m, bg_gray))
        return out

    def match(self, frame: np.ndarray, box, top: int = 5, valid: np.ndarray | None = None) -> list[Match]:
        if not self._keys:
            return []
        if not self._ready:
            self._build()
        Gs, As, Bs, Es, Ws, bgs = [], [], [], [], [], []
        for c, m, bg in self.variants(frame, box, valid=valid):
            g, a, b = _gray_lab(c)
            Gs.append(g.ravel()); As.append(a.ravel()); Bs.append(b.ravel()); Es.append(_edges(g).ravel())
            Ws.append((m > 0).astype(np.float32).ravel()); bgs.append(bg)
        if not Gs:
            return []
        G, A, B, E, W = (np.stack(x) for x in (Gs, As, Bs, Es, Ws))   # (V, SIZE²)
        bg = np.array(bgs, np.float32)[:, None]                         # (V, 1)

        # Brightness: template = P + bg·Q, i.e. the icon composited onto this slot's background.
        PM, QM, Mg = self._PM, self._QM, self._Mg
        cnt = np.maximum(W @ Mg.T, 1.0)
        GW = G * W
        s_sum = GW @ Mg.T
        s_var = np.maximum((GW * G) @ Mg.T - s_sum ** 2 / cnt, EPS)
        t_sum = W @ PM.T + bg * (W @ QM.T)
        t_sq = W @ (PM * PM).T + 2 * bg * (W @ (PM * QM).T) + bg ** 2 * (W @ (QM * QM).T)
        t_var = np.maximum(t_sq - t_sum ** 2 / cnt, EPS)
        num = GW @ PM.T + bg * (GW @ QM.T) - s_sum * t_sum / cnt
        gray_score = num / np.sqrt(s_var * t_var)

        # Edges: fixed template, same re-centred correlation over the overlap.
        Me, Et = self._Me, self._E
        cnt = np.maximum(W @ Me.T, 1.0)
        EW = E * W
        s_sum = EW @ Me.T
        s_var = np.maximum((EW * E) @ Me.T - s_sum ** 2 / cnt, EPS)
        t_sum = W @ Et.T
        t_var = np.maximum(W @ (Et * Et).T - t_sum ** 2 / cnt, EPS)
        edge_score = (EW @ Et.T - s_sum * t_sum / cnt) / np.sqrt(s_var * t_var)

        score = 0.5 * gray_score + 0.5 * edge_score
        cnt = np.maximum(W @ self._Mc.T, 1.0)
        ma = ((A * W) @ self._Mc.T) / cnt
        mb = ((B * W) @ self._Mc.T) / cnt
        dist = np.sqrt((ma - self._mean_a) ** 2 + (mb - self._mean_b) ** 2)
        score -= COLOR_WEIGHT * np.minimum(dist / 64.0, 1.0)

        best = score.max(0)                                 # best variant per template
        per_key: dict[str, Match] = {}
        for i in np.argsort(-best):
            k = self._keys[i]
            if k not in per_key:
                per_key[k] = Match(k, float(best[i]), bool(self._taught_arr[i]))
            if len(per_key) >= top:
                break
        return list(per_key.values())
