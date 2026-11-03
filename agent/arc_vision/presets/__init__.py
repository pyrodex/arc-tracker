"""Measured calibrations for known screen setups (default HUD scale).

Each preset is the full `calibration` block plus the main-menu name box. The
stash anchor image ships beside it. If your HUD scale differs, the check
image from `scan-image --out` will show it — run `calibrate` instead.
"""

from pathlib import Path

HERE = Path(__file__).parent

PRESETS = {
    # 3440×1440 ultrawide. Measured from real screenshots: 4-column stash,
    # 129×128 slots on a 138.67 px pitch, 6 full rows visible, pixel scrolling.
    "3440x1440": {
        "calibration": {
            "screen_size": [3440, 1440],
            "origin": [642, 363],
            "slot": [129, 128],
            "pitch": [138.67, 138.67],
            "cols": 4,
            "rows": 6,
            "icon_box": [6, 6, 117, 88],
            "count_box": [64, 97, 62, 27],
            "anchor": {"box": [636, 190, 115, 36], "file": "anchor.png"},
        },
        "anchor_image": "3440x1440-stash-anchor.png",
        "identity": {"name_box": [1640, 112, 260, 38], "screen_size": [3440, 1440]},
    },
}


def for_size(width: int, height: int) -> str | None:
    key = f"{width}x{height}"
    return key if key in PRESETS else None
