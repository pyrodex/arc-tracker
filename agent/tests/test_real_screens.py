"""Checks against crops of real ARC Raiders stash screens (3440×1440, default HUD).

The fixtures are the stash panel only (x 600–1250, y 300–1300 of the full
screen), so the preset's coordinates are shifted by that offset.
"""

import os
import sys
import tempfile
from pathlib import Path

import cv2
import pytest

os.environ.setdefault("ARC_VISION_HOME", tempfile.mkdtemp(prefix="arc-vision-real-"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from arc_vision import config, identity  # noqa: E402
from arc_vision.catalog import Catalog  # noqa: E402
from arc_vision.presets import PRESETS  # noqa: E402
from arc_vision.scanner import ScanSession, Scanner, crop  # noqa: E402

FIX = Path(__file__).parent / "fixtures" / "real"
OFFSET = (600, 300)

# Stack counts as shown on screen, per fully visible row (1 = no number shown).
COUNTS = {
    "stash_top": [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 5, 5, 2], [24, 24, 24, 20], [60, 60, 49, 1]],
    "stash_scrolled_5_rows": [[60, 60, 49, 1], [1, 1, 1, 1], [1, 1, 5, 2], [3, 3, 1, 3], [5, 1, 5, 5]],
    "stash_scrolled_far": [[1, 1, 1, 1], [1, 1, 1, 1], [3, 2, 1, 1], [1, 3, 3, 3], [3, 3, 3, 3]],
    "stash_filtered_blueprints": [[1, 1, 1, 1], [100, 100, 4, 1], [1, None, None, None]],
}


@pytest.fixture(scope="module")
def scanner():
    cal = dict(PRESETS["3440x1440"]["calibration"])
    cal["origin"] = [cal["origin"][0] - OFFSET[0], cal["origin"][1] - OFFSET[1]]
    cal.pop("screen_size")
    cal.pop("anchor")
    cfg = config.load()
    cfg["calibration"] = cal
    return Scanner(cfg, Catalog([]))


def load(name):
    img = cv2.imread(str(FIX / f"{name}.png"), cv2.IMREAD_COLOR)
    assert img is not None, name
    return img


@pytest.mark.parametrize("name", list(COUNTS))
def test_counts_and_empty_slots(scanner, name):
    img = load(name)
    g = scanner.geometry(img)
    dy = scanner.scroll_phase(img)
    wrong = []
    for ri, r in enumerate(g.visible_rows(dy)[:len(COUNTS[name])]):
        for c, want in enumerate(COUNTS[name][ri]):
            box = g.slot_box(r, c, dy)
            art = crop(img, g.sub_box(box, g.icon_box))
            empty = float(cv2.cvtColor(art, cv2.COLOR_BGR2GRAY).std()) < scanner.cfg["empty_std"]
            if want is None:
                if not empty:
                    wrong.append((ri, c, "expected empty"))
                continue
            n, unsure = scanner.counts.read(crop(img, g.sub_box(box, g.count_box)))
            if empty or unsure or n != want:
                wrong.append((ri, c, want, n, unsure, empty))
    assert not wrong


def test_pixel_scroll_offsets(scanner):
    # The top view sits at the calibrated position; the others are mid-row.
    assert abs(scanner.scroll_phase(load("stash_top"))) <= 3
    assert scanner.scroll_phase(load("stash_scrolled_5_rows")) != 0
    assert scanner.scroll_phase(load("stash_scrolled_far")) != 0


def test_scroll_alignment_on_real_screens(scanner):
    s = ScanSession()
    assert s.add(scanner.scan(load("stash_top")), trusted=True)
    assert s.positions() == 6
    # Scrolled five rows: its first full row is the top view's last row.
    assert s.add(scanner.scan(load("stash_scrolled_5_rows")), trusted=True)
    assert s.last_offset == 5 and s.positions() == 10
    # Too far to overlap anything seen: rejected, nothing added.
    assert not s.add(scanner.scan(load("stash_scrolled_far")), trusted=True)
    assert s.positions() == 10 and s.rejected == 1
    # Back to the top lines up at 0 again and adds nothing new.
    assert s.add(scanner.scan(load("stash_top")), trusted=True)
    assert s.last_offset == 0 and s.positions() == 10


def test_blueprints_are_told_apart_by_the_grid(scanner):
    img = load("stash_filtered_blueprints")
    flags = {(r.row, r.col): r.blueprint for r in scanner.scan(img) if r.status != "empty"}
    assert {k for k, v in flags.items() if v} == {(1, 3), (2, 0)}


def test_name_resolution_tolerates_ocr_slips():
    chars = [{"id": 1, "name": "Main"}, {"id": 2, "name": "Alt"}]
    aliases = {"MortySmith": 1, "RickSanchez": 2}
    assert identity.resolve("MortySmith", chars, aliases)["id"] == 1
    assert identity.resolve("MortySmlth", chars, aliases)["id"] == 1      # one misread letter
    assert identity.resolve("RickSanchez", chars, aliases)["id"] == 2
    assert identity.resolve("SomeoneElse", chars, aliases) is None
    assert identity.resolve(None, chars, aliases) is None


@pytest.mark.skipif(not identity.HAVE_TESSERACT, reason="needs tesseract")
def test_reads_a_rendered_name():
    img = cv2.copyMakeBorder(cv2.UMat(40, 300, cv2.CV_8UC3).get() * 0, 0, 0, 0, 0, cv2.BORDER_CONSTANT)
    img[:] = (30, 25, 20)
    cv2.putText(img, "MortySmith", (40, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (235, 235, 235), 2, cv2.LINE_AA)
    assert identity.read_name(img, (0, 0, 300, 40)) == "MortySmith"



def test_learned_checkmark_on_real_blueprints(scanner):
    """Learned blueprints carry a white check in the top-right corner."""
    for name in COUNTS:
        img = load(name)
        g = scanner.geometry(img)
        dy = scanner.scroll_phase(img)
        marked = {(i, c) for i, r in enumerate(g.visible_rows(dy)) for c in range(g.cols)
                  if scanner.learned_mark(img, g.slot_box(r, c, dy), g)}
        want = {(1, 3), (2, 0)} if name == "stash_filtered_blueprints" else set()
        assert marked == want, name
