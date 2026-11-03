"""Label slots from real screenshots so the matcher learns the game's own art.

For each slot the agent couldn't identify (or, with --all, every non-empty
slot) it shows the slot enlarged and its best guesses. Labelling saves the
in-game crop as a taught template, which is matched ahead of wiki icons.
Mark guns, ammo and loot the tracker doesn't cover as "ignore" so they stop
showing up as unknown.
"""

from __future__ import annotations

from pathlib import Path

import cv2

from .catalog import IGNORE_KEY, save_taught
from .scanner import Scanner, crop, grid_foreground

WIN = "arc-vision teach"


def run(scanner: Scanner, images: list[Path], include_items: bool = False) -> int:
    cat = scanner.catalog
    saved = 0
    seen: set = set()
    cv2.namedWindow(WIN, cv2.WINDOW_AUTOSIZE)
    try:
        for path in images:
            frame = cv2.imread(str(path), cv2.IMREAD_COLOR)
            if frame is None:
                print(f"skipping {path}: not an image")
                continue
            g = scanner.geometry(frame)
            results = scanner.scan(frame)
            todo = [r for r in results if r.status == "unknown" or r.count_uncertain
                    or (include_items and r.status in ("item", "ignored"))]
            print(f"\n{path.name}: {len(todo)} slot(s) to label")
            for r in todo:
                sig = (r.signature, r.key)
                if sig in seen:
                    continue
                seen.add(sig)
                icon = crop(frame, g.sub_box(r.box, g.icon_box))
                slot_img = crop(frame, r.box)
                cv2.imshow(WIN, cv2.resize(slot_img, None, fx=4, fy=4, interpolation=cv2.INTER_NEAREST))
                cv2.waitKey(1)
                if r.status == "item" and r.count_uncertain and g.count_box:
                    saved += _teach_count(scanner, frame, g, r)
                    if not include_items:
                        continue
                label = _ask(cat, r)
                if label == "quit":
                    return saved
                if label:
                    p = save_taught(label, icon)
                    scanner.matcher.add_taught(label, icon, grid_foreground(icon, scanner.cfg.get("blueprint_bg_min", 0.3)))
                    saved += 1
                    print(f"  saved {cat.name(label)} → {p.name}")
    finally:
        cv2.destroyAllWindows()
    return saved


def _teach_count(scanner, frame, g, r) -> int:
    """The item was recognised but its count wouldn't read: learn the digits from you."""
    raw = input(f"\n{r.name}: couldn't read the stack count — what does it say? (Enter = skip): ").strip()
    if not raw:
        return 0
    cr = scanner.counts
    ok = cr.digits.add_samples(crop(frame, g.sub_box(r.box, g.count_box)), raw, cr.text_threshold, cr.max_saturation)
    cr._cache.clear()
    print("  learned those digits" if ok else "  couldn't line the digits up with what you typed; skipped")
    return 1 if ok else 0


def _ask(cat, r) -> str | None:
    print(f"\nRow {r.row + 1}, col {r.col + 1}: " +
          (f"recognised as {r.name} ({r.score:.2f})" if r.status in ("item", "ignored") else "unknown"))
    options = [c.key for c in r.candidates]
    for i, k in enumerate(options, 1):
        print(f"   {i}. {cat.name(k)}  ({r.candidates[i - 1].score:.2f})")
    while True:
        raw = input("  number / search text / i = ignore / Enter = skip / q = quit: ").strip()
        if not raw:
            return None
        if raw.lower() == "q":
            return "quit"
        if raw.lower() == "i":
            return IGNORE_KEY
        if raw.isdigit() and 1 <= int(raw) <= len(options):
            return options[int(raw) - 1]
        hits = cat.search(raw)
        if not hits:
            print("   no matches")
            continue
        options = [h.key for h in hits]
        for i, h in enumerate(hits, 1):
            print(f"   {i}. {h.name}  [{h.type}]")
