"""arc-vision command line.

    python -m arc_vision setup --server http://homelab:3333
    python -m arc_vision calibrate --delay 5        # or --image stash.png
    python -m arc_vision scan-image stash1.png stash2.png --out annotated.png
    python -m arc_vision teach                      # label slots in saved frames
    python -m arc_vision run                        # overlay + hotkeys
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path


def _dpi_aware():
    # Without this, Windows display scaling makes capture pixels and overlay
    # coordinates disagree. Must run before any window or capture is created.
    if sys.platform == "win32":
        import ctypes
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except Exception:
            ctypes.windll.user32.SetProcessDPIAware()


def _client(cfg):
    from .client import TrackerClient
    return TrackerClient(cfg["server_url"])


def _catalog(cfg, refresh=False):
    from .catalog import Catalog
    if refresh:
        return Catalog.refresh(_client(cfg))
    try:
        return Catalog.load_cached()
    except FileNotFoundError:
        print("No cached catalog — fetching it from arc-tracker.")
        return Catalog.refresh(_client(cfg))


def cmd_setup(args, cfg):
    from . import config
    if args.server:
        cfg["server_url"] = args.server.rstrip("/")
    client = _client(cfg)
    try:
        client.health()
    except Exception as e:
        sys.exit(f"Can't reach arc-tracker at {cfg['server_url']}: {e}")
    chars = client.characters()
    if not chars:
        sys.exit("arc-tracker has no characters yet — add one in the web UI first.")
    for i, c in enumerate(chars, 1):
        print(f"  {i}. {c['name']}")
    pick = args.character or input("Character to sync [1]: ").strip() or "1"
    match = next((c for c in chars if c["name"].lower() == str(pick).lower()), None)
    if not match and str(pick).isdigit() and 1 <= int(pick) <= len(chars):
        match = chars[int(pick) - 1]
    if not match:
        sys.exit(f"No character '{pick}'.")
    cfg["character_id"] = match["id"]
    config.save(cfg)
    cat = _catalog(cfg, refresh=True)
    with_icons = sum(1 for it in cat.items.values() if it.icon_url and not it.icon_standin)
    print(f"Saved. Syncing to {match['name']}; {len(cat.items)} trackable items, {with_icons} with icons.")
    print("Next: python -m arc_vision calibrate")


def cmd_refresh(args, cfg):
    cat = _catalog(cfg, refresh=True)
    print(f"Catalog refreshed: {len(cat.items)} items.")


def _load_or_capture(args, cfg):
    import cv2
    if args.image:
        img = cv2.imread(args.image, cv2.IMREAD_COLOR)
        if img is None:
            sys.exit(f"Can't read {args.image}")
        return img
    from .capture import ScreenCapture
    print(f"Switch to the game with the stash open — capturing in {args.delay}s…")
    time.sleep(args.delay)
    cap = ScreenCapture(cfg["monitor"])
    img = cap.grab()
    cap.close()
    return img


def cmd_calibrate(args, cfg):
    from . import calibrate, config
    img = _load_or_capture(args, cfg)
    calib = calibrate.run(img, cfg)
    if not calib:
        sys.exit("Calibration cancelled; nothing saved.")
    cfg["calibration"] = calib
    config.save(cfg)
    print(f"Saved: {calib['cols']}×{calib['rows']} grid, slot {calib['slot'][0]}×{calib['slot'][1]} px.")
    print("Check it with: python -m arc_vision scan-image <screenshot> --out check.png")


def cmd_scan_image(args, cfg):
    import cv2
    from .calibrate import draw_grid
    from .scanner import ScanSession, Scanner

    cat = _catalog(cfg)
    sc = Scanner(cfg, cat)
    session = ScanSession(cfg["stable_frames"])
    last = None
    for path in args.images:
        frame = cv2.imread(path, cv2.IMREAD_COLOR)
        if frame is None:
            sys.exit(f"Can't read {path}")
        if not sc.stash_visible(frame):
            print(f"{path}: stash screen not detected (anchor didn't match) — skipped")
            continue
        results = sc.scan(frame)
        placed = session.add(results, trusted=True)
        counts = {s: sum(1 for r in results if r.status == s) for s in ("item", "unknown", "ignored", "empty")}
        print(f"{path}: {counts}" + ("" if placed else "  ← couldn't line up with earlier screenshots; skipped"))
        last = (frame, results)
    totals, unread = session.totals(), session.unread()
    print(f"\nTotals over {session.frames} screenshot(s), {session.positions()} row position(s):")
    for k, v in sorted(totals.items(), key=lambda kv: cat.name(kv[0])):
        print(f"  {cat.name(k):<32} {v}")
    for k, n in unread.items():
        print(f"  {cat.name(k):<32} ? (count unreadable in {n} stack(s))")
    if args.out and last:
        frame, results = last
        out = draw_grid(frame, cfg["calibration"])
        colors = {"item": (80, 220, 80), "unknown": (60, 60, 240), "ignored": (150, 150, 150)}
        for r in results:
            if r.status == "empty":
                continue
            x, y, w, h = r.box
            cv2.rectangle(out, (x, y), (x + w, y + h), colors[r.status], 2)
            label = f"{(r.name or '?')[:14]} x{r.count}" if r.status == "item" else f"{r.score:.2f}"
            cv2.putText(out, label, (x + 2, y + h - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.38, colors[r.status], 1, cv2.LINE_AA)
        cv2.imwrite(args.out, out)
        print(f"\nAnnotated image (last screenshot): {args.out}")
    if args.preview or args.apply:
        if not cfg.get("character_id"):
            sys.exit("No character set — run setup first.")
        counts = {k: v for k, v in totals.items() if k not in unread}
        resp = _client(cfg).sync(cfg["character_id"], counts, apply=args.apply)
        print(f"\n{'Applied' if resp['applied'] else 'Would change'} {len(resp['changes'])} item(s):")
        for c in resp["changes"]:
            print(f"  {c['name']:<32} {c['before']} → {c['after']}")


def cmd_teach(args, cfg):
    from . import config, teach
    from .scanner import Scanner
    images = [Path(p) for p in args.images] or sorted(config.FRAMES_DIR.glob("*.png"))
    if not images:
        sys.exit(f"No images given and none saved in {config.FRAMES_DIR} (use the save-frame hotkey in `run`).")
    n = teach.run(Scanner(cfg, _catalog(cfg)), images, include_items=args.all)
    print(f"\nSaved {n} taught template(s).")


def cmd_run(args, cfg):
    import mss
    from .capture import ScreenCapture
    from .engine import Engine
    from .overlay import Overlay

    try:
        import keyboard
    except ImportError:
        sys.exit("The `keyboard` package is needed for hotkeys: pip install keyboard")
    if not cfg.get("calibration"):
        sys.exit("Not calibrated yet — run: python -m arc_vision calibrate")
    with mss.mss() as s:
        mon = s.monitors[cfg["monitor"]]
    cat = _catalog(cfg)
    engine = Engine(cfg, _client(cfg), cat, lambda: ScreenCapture(cfg["monitor"]))
    overlay = Overlay(engine, cfg, mon)
    hk = cfg["hotkeys"]
    for name in ("snapshot", "toggle_watch", "preview", "apply", "discard", "next_character", "save_frame", "toggle_full"):
        keyboard.add_hotkey(hk[name], engine.send, args=(name,))
    keyboard.add_hotkey(hk["toggle_overlay"], overlay.toggle_visible)
    keyboard.add_hotkey(hk["toggle_boxes"], overlay.toggle_boxes)
    engine.start()
    print("arc-vision running. Hotkeys:")
    for k, v in hk.items():
        print(f"  {v:<16} {k.replace('_', ' ')}")
    print("Ctrl+C here to quit.")
    try:
        overlay.run()
    except KeyboardInterrupt:
        pass
    finally:
        keyboard.unhook_all_hotkeys()
        engine.stop()


def main(argv=None):
    from . import config
    _dpi_aware()
    p = argparse.ArgumentParser(prog="arc_vision", description="Read the ARC Raiders stash from the screen and sync it to arc-tracker.")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("setup", help="point at arc-tracker, pick a character, download icons")
    s.add_argument("--server", help="arc-tracker URL, e.g. http://homelab:3333")
    s.add_argument("--character", help="character name or number")
    sub.add_parser("refresh", help="re-download the catalog and any new icons")
    s = sub.add_parser("calibrate", help="mark the stash grid on a screenshot")
    s.add_argument("--image", help="screenshot to calibrate on (default: capture the screen)")
    s.add_argument("--delay", type=int, default=5, help="seconds before capturing (default 5)")
    s = sub.add_parser("scan-image", help="scan screenshots (in scroll order) and show what was found")
    s.add_argument("images", nargs="+")
    s.add_argument("--out", help="write an annotated copy of the last screenshot")
    s.add_argument("--preview", action="store_true", help="show what would change in arc-tracker")
    s.add_argument("--apply", action="store_true", help="write the counts to arc-tracker")
    s = sub.add_parser("teach", help="label unrecognised slots in screenshots")
    s.add_argument("images", nargs="*", help="screenshots (default: frames saved from `run`)")
    s.add_argument("--all", action="store_true", help="also review slots that were recognised")
    sub.add_parser("run", help="overlay + hotkeys while you play")
    args = p.parse_args(argv)
    cfg = config.load()
    {"setup": cmd_setup, "refresh": cmd_refresh, "calibrate": cmd_calibrate, "scan-image": cmd_scan_image,
     "teach": cmd_teach, "run": cmd_run}[args.cmd](args, cfg)


if __name__ == "__main__":
    main()
