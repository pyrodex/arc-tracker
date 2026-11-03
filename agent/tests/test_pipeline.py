"""End-to-end checks on synthetic stash screens: run with `python -m pytest agent/tests`."""

import os
import random
import sys
import tempfile
from pathlib import Path

import numpy as np
import pytest

HOME = Path(tempfile.mkdtemp(prefix="arc-vision-test-"))
os.environ["ARC_VISION_HOME"] = str(HOME)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from arc_vision import config  # noqa: E402
from arc_vision.catalog import IGNORE_KEY, Catalog  # noqa: E402
from arc_vision.engine import Engine  # noqa: E402
from arc_vision.scanner import ScanSession, Scanner, crop  # noqa: E402
import synthetic as syn  # noqa: E402


@pytest.fixture(scope="module")
def world():
    rng = random.Random(7)
    catalog_payload, icons, untracked = syn.build_catalog(rng)
    keys = list(icons)
    grid = syn.build_stash(rng, keys, len(untracked))
    canvas = syn.render_stash_canvas(rng, grid, icons, untracked)
    first = syn.render_frame(canvas, 0)
    cal = syn.write_fixture(HOME, catalog_payload, icons, first)
    cfg = config.load()
    cfg["calibration"] = cal
    catalog = Catalog.load_cached()
    scanner = Scanner(cfg, catalog)
    # Untracked loot can resemble a tracked icon. The fix is the `teach`
    # workflow: label it "ignore" once. Do that here for any lookalikes on
    # the first screens, and record how many there were.
    lookalikes = teach_lookalikes(scanner, grid, canvas)
    return dict(cfg=cfg, catalog=catalog, scanner=scanner, grid=grid, canvas=canvas,
                rng=np.random.default_rng(1), lookalikes=lookalikes)


def teach_lookalikes(scanner, grid, canvas):
    taught = set()
    for off in (0, 368, 736):
        frame = syn.render_frame(canvas, off)
        g = scanner.geometry(frame)
        first = off // syn.PITCH
        for r in scanner.scan(frame):
            truth = grid[first + r.row][r.col]
            if truth and truth[0] == "other" and r.status == "item" and truth[1] not in taught:
                scanner.matcher.add_taught(IGNORE_KEY, crop(frame, g.sub_box(r.box, g.icon_box)))
                taught.add(truth[1])
    return taught


def frame_truth(grid, scroll_px):
    """Rows fully visible at this scroll offset, as in the scanner."""
    first = -(-scroll_px // syn.PITCH)  # ceil
    rows = []
    r = first
    while (r * syn.PITCH - scroll_px) + syn.SLOT <= (syn.ROWS - 1) * syn.PITCH + syn.SLOT + 2 and r < len(grid):
        rows.append(grid[r])
        r += 1
    return rows


def test_single_frame_detection(world):
    frame = syn.render_frame(world["canvas"], 0, world["rng"])
    results = world["scanner"].scan(frame)
    truth = frame_truth(world["grid"], 0)
    by_pos = {(r.row, r.col): r for r in results}
    wrong, total = [], 0
    for ri, row in enumerate(truth):
        for c, content in enumerate(row):
            res = by_pos[(ri, c)]
            total += 1
            if content is None:
                ok = res.status == "empty"
            elif content[0] == "other":
                ok = res.status in ("unknown", "ignored")
            else:
                ok = res.status == "item" and res.key == content[1] and res.count == content[2]
            if not ok:
                wrong.append(((ri, c), content, res.status, res.key, res.count, round(res.score, 3)))
    assert not wrong, f"{len(wrong)}/{total} slots wrong: {wrong[:10]}"


def test_few_lookalikes_needed_teaching(world):
    # Out of 25 untracked icons, only the odd one should need an "ignore" label.
    assert len(world["lookalikes"]) <= 2


def test_stash_anchor(world):
    s = world["scanner"]
    assert s.stash_visible(syn.render_frame(world["canvas"], 0))
    blank = np.full((syn.SCREEN[1], syn.SCREEN[0], 3), 16, np.uint8)
    assert not s.stash_visible(blank)


@pytest.mark.parametrize("offsets,trusted", [
    ([0, 92, 184, 276, 368, 460, 552, 644, 736], True),           # whole-row scrolling, snapshots
    ([0, 37, 81, 150, 199, 260, 333, 401, 470, 530, 600, 660, 736], False),  # pixel scrolling, watch mode
])
def test_scrolling_totals_match_truth(world, offsets, trusted):
    s = world["scanner"]
    session = ScanSession(stable_frames=2)
    for off in offsets:
        frame = syn.render_frame(world["canvas"], off, world["rng"])
        for _ in range(1 if trusted else 2):     # watch mode sees each view at least twice
            assert session.add(s.scan(frame), trusted=trusted), f"offset {off} rejected"
    truth = syn.truth_totals(world["grid"])
    assert session.totals() == truth
    assert session.unread() == {}


def test_revisiting_rows_does_not_double_count(world):
    s = world["scanner"]
    session = ScanSession()
    for off in [0, 184, 368, 184, 0, 184, 368, 552, 736, 552]:
        assert session.add(s.scan(syn.render_frame(world["canvas"], off)), trusted=True)
    assert session.totals() == syn.truth_totals(world["grid"])


def test_jump_without_overlap_is_rejected(world):
    s = world["scanner"]
    session = ScanSession()
    assert session.add(s.scan(syn.render_frame(world["canvas"], 0)), trusted=True)
    before = session.totals()
    # 7 visible rows; jumping 8 rows leaves nothing in common with the first view
    assert not session.add(s.scan(syn.render_frame(world["canvas"], 8 * syn.PITCH)), trusted=True)
    assert session.rejected == 1
    assert session.totals() == before


def test_tooltip_frame_does_not_corrupt_totals(world):
    s = world["scanner"]
    session = ScanSession(stable_frames=2)
    offsets = [0, 0, 184, 184, 368, 368, 552, 552, 736, 736]
    for i, off in enumerate(offsets):
        tip = (syn.ORIGIN[0] + 200, syn.ORIGIN[1] + 150) if i == 3 else None
        session.add(s.scan(syn.render_frame(world["canvas"], off, tooltip=tip)))
    assert session.totals() == syn.truth_totals(world["grid"])


class FakeCapture:
    def __init__(self, frames):
        self.frames = list(frames)

    def grab(self):
        return self.frames.pop(0) if len(self.frames) > 1 else self.frames[0]


class FakeClient:
    def __init__(self):
        self.calls = []

    def characters(self):
        return [{"id": 1, "name": "Main"}, {"id": 2, "name": "Alt"}]

    def sync(self, character_id, counts, apply):
        self.calls.append((character_id, dict(counts), apply))
        return {"applied": apply, "sync_id": 9 if apply else None,
                "changes": [{"type": k.split(":")[0], "id": int(k.split(":")[1]), "before": 0, "after": v} for k, v in counts.items()],
                "unchanged": 0, "unknown": []}


def test_engine_preview_then_apply(world):
    frames = [syn.render_frame(world["canvas"], off) for off in (0, 184, 368, 552, 736)]
    client = FakeClient()
    eng = Engine(world["cfg"], client, world["catalog"], lambda: FakeCapture(frames), scanner=world["scanner"])
    eng._capture = eng._capture_factory()
    eng._load_characters()
    for _ in frames:
        eng._handle("snapshot")
    eng._handle("apply")
    assert "Preview first" in eng.state().message and not client.calls
    eng._handle("preview")
    eng._handle("apply")
    truth = syn.truth_totals(world["grid"])
    assert client.calls[0] == (1, truth, False)
    assert client.calls[1] == (1, truth, True)
    assert eng.state().frames == 0 and "Applied" in eng.state().message


def test_engine_thread_watch_mode(world):
    import time
    frames = [syn.render_frame(world["canvas"], off) for off in (0, 0, 92, 92, 184, 184, 276, 276, 368, 368,
                                                               460, 460, 552, 552, 644, 644, 736, 736)]
    cfg = dict(world["cfg"], watch_interval_s=0.01)
    client = FakeClient()
    eng = Engine(cfg, client, world["catalog"], lambda: FakeCapture(frames), scanner=world["scanner"])
    eng.start()
    try:
        eng.send("toggle_watch")
        deadline = time.time() + 60
        while time.time() < deadline and eng.state().frames < len(frames):
            time.sleep(0.05)
        eng.send("toggle_watch")
        eng.send("preview")
        while time.time() < deadline and eng.state().preview is None:
            time.sleep(0.05)
    finally:
        eng.stop()
    st = eng.state()
    assert not st.error, st.error
    assert st.totals == syn.truth_totals(world["grid"])
    assert client.calls and client.calls[-1][2] is False
