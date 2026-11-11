"""Trackable items and their reference images.

Two sources of reference images feed the matcher:
  * icons arc-tracker already downloads from the wiki (cached locally), and
  * "taught" crops: slots you labelled from real screenshots with `teach`.
    Files are named <type>__<id>__<n>.png, or ignore__<n>.png for items you
    want recognised and skipped (guns, ammo, loot the tracker doesn't cover).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from . import config

IGNORE_KEY = "ignore"


@dataclass
class CatalogItem:
    key: str           # "type:id", the unit the server syncs on
    type: str
    id: int
    name: str
    slug: str
    icon_url: str | None
    icon_standin: bool


class Catalog:
    def __init__(self, items: list[CatalogItem]):
        self.items = {it.key: it for it in items}

    def name(self, key: str) -> str:
        if key == IGNORE_KEY:
            return "(ignored)"
        it = self.items.get(key)
        return it.name if it else key

    def search(self, text: str, limit: int = 10) -> list[CatalogItem]:
        t = text.lower().strip()
        hits = [it for it in self.items.values() if t in it.name.lower()]
        hits.sort(key=lambda it: (not it.name.lower().startswith(t), len(it.name)))
        return hits[:limit]

    # ── loading ──────────────────────────────────────────────────────────────
    @classmethod
    def from_payload(cls, payload: dict) -> "Catalog":
        items = [
            CatalogItem(
                key=f"{i['type']}:{i['id']}", type=i["type"], id=int(i["id"]), name=i["name"],
                slug=i["slug"], icon_url=i.get("icon_url"), icon_standin=bool(i.get("icon_standin")),
            )
            for i in payload["items"]
        ]
        return cls(items)

    @classmethod
    def refresh(cls, client) -> "Catalog":
        """Pull the catalog and any missing icons from arc-tracker into the cache."""
        config.ensure_dirs()
        payload = client.catalog()
        (config.CACHE_DIR / "catalog.json").write_text(json.dumps(payload), encoding="utf-8")
        cat = cls.from_payload(payload)
        for it in cat.items.values():
            if not it.icon_url or it.icon_standin:
                continue
            dest = icon_path(it)
            if dest.exists():
                continue
            try:
                dest.write_bytes(client.icon_bytes(it.icon_url))
            except Exception as e:  # one bad icon shouldn't stop the rest
                print(f"  icon download failed for {it.name}: {e}")
        return cat

    @classmethod
    def load_cached(cls) -> "Catalog":
        f = config.CACHE_DIR / "catalog.json"
        if not f.exists():
            raise FileNotFoundError("No cached catalog yet — run `python -m arc_vision refresh` first.")
        return cls.from_payload(json.loads(f.read_text(encoding="utf-8")))


def icon_path(it: CatalogItem) -> Path:
    ext = Path(it.icon_url or ".png").suffix or ".png"
    return config.CACHE_DIR / "icons" / f"{it.type}__{it.slug}{ext}"


def load_icon_rgba(path: Path) -> np.ndarray | None:
    img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if img is None:
        return None
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGRA)
    elif img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    return img


_TAUGHT_RE = re.compile(r"^(?:(?P<type>[a-z_]+)__(?P<id>\d+)|ignore)__(?P<n>\d+)\.png$")


def taught_templates(taught_dir: Path | None = None) -> list[tuple[str, np.ndarray]]:
    """[(key, bgr_crop)] for every taught crop on disk."""
    out = []
    d = taught_dir or config.TAUGHT_DIR
    if not d.exists():
        return out
    for f in sorted(d.glob("*.png")):
        m = _TAUGHT_RE.match(f.name)
        if not m:
            continue
        key = f"{m['type']}:{m['id']}" if m["type"] else IGNORE_KEY
        img = cv2.imread(str(f), cv2.IMREAD_COLOR)
        if img is not None:
            out.append((key, img))
    return out


def save_taught(key: str, crop_bgr: np.ndarray, taught_dir: Path | None = None) -> Path:
    d = taught_dir or config.TAUGHT_DIR
    d.mkdir(parents=True, exist_ok=True)
    prefix = "ignore" if key == IGNORE_KEY else key.replace(":", "__")
    n = 1
    while (d / f"{prefix}__{n}.png").exists():
        n += 1
    path = d / f"{prefix}__{n}.png"
    cv2.imwrite(str(path), crop_bgr)
    return path
