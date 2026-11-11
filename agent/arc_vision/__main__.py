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
    from .capture import wait_for_capture
    print(f"Switch to the game with the stash open — capturing in {args.delay}s…")
    time.sleep(args.delay)
    cap = wait_for_capture(cfg)
    try:
        img = cap.grab()
    finally:
        cap.close()
    return img


def apply_preset(name, cfg):
    import shutil
    from . import config
    from .presets import HERE, PRESETS
    p = PRESETS[name]
    config.ensure_dirs()
    shutil.copyfile(HERE / p["anchor_image"], config.APP_DIR / p["calibration"]["anchor"]["file"])
    cfg["calibration"] = dict(p["calibration"])
    cfg["identity"].update(p["identity"])
    config.save(cfg)
    c = p["calibration"]
    print(f"Applied the {name} preset: {c['cols']}×{c['rows']} stash grid, player-name box on the main menu.")
    print("Check it with: python -m arc_vision scan-image <stash screenshot> --out check.png")


def cmd_calibrate(args, cfg):
    from . import calibrate, config
    from .presets import PRESETS, for_size
    if args.preset:
        if args.preset not in PRESETS:
            sys.exit(f"Unknown preset. Have: {', '.join(PRESETS)}")
        return apply_preset(args.preset, cfg)
    img = _load_or_capture(args, cfg)
    match = for_size(img.shape[1], img.shape[0])
    if match and input(f"There's a measured preset for {match}. Use it instead of clicking? [Y/n] ").strip().lower() != "n":
        return apply_preset(match, cfg)
    calib = calibrate.run(img, cfg)
    if not calib:
        sys.exit("Calibration cancelled; nothing saved.")
    cfg["calibration"] = calib
    config.save(cfg)
    print(f"Saved: {calib['cols']}×{calib['rows']} grid, slot {calib['slot'][0]}×{calib['slot'][1]} px.")
    print("Check it with: python -m arc_vision scan-image <screenshot> --out check.png")


def cmd_calibrate_name(args, cfg):
    from . import calibrate, config, identity
    img = _load_or_capture(args, cfg)
    print("Drag a box around your player name on the main menu (top centre, by the crown icon).")
    import cv2
    cv2.namedWindow(calibrate.WIN, cv2.WINDOW_AUTOSIZE)
    try:
        box = calibrate.pick_rect_overview(img, "Player name on the main menu")
    finally:
        cv2.destroyAllWindows()
    if not box:
        sys.exit("Cancelled; nothing saved.")
    raw = identity.read_name(img, box)
    cfg["identity"]["name_box"] = box
    cfg["identity"]["screen_size"] = [img.shape[1], img.shape[0]]
    config.save(cfg)
    print(f"Saved. Read the name as: {raw!r}")
    if raw:
        try:
            chars = _client(cfg).characters()
        except Exception:
            chars = []
        aliases = {k: int(v) for k, v in cfg["identity"]["aliases"].items()}
        char = identity.resolve(raw, chars, aliases)
        print(f"That's {char['name']} in arc-tracker." if char else
              f"No arc-tracker character matches — link it: python -m arc_vision link \"{raw}\" <character>")


def cmd_capture_test(args, cfg):
    """Grab one frame with the configured backend and save it, to check capture works."""
    import cv2
    from .capture import wait_for_capture
    c = cfg.get("capture") or {}
    print(f"Capture method: {c.get('method', 'window')}" +
          (f" (window title containing {c.get('window_title', 'ARC Raiders')!r})" if c.get("method", "window") == "window" else ""))
    cap = wait_for_capture(cfg, timeout=args.wait)
    try:
        img = cap.grab()
        print(f"Got a {img.shape[1]}×{img.shape[0]} frame from {getattr(cap, 'title', 'the screen')!r} at {cap.region}.")
    finally:
        cap.close()
    cv2.imwrite(args.out, img)
    print(f"Saved {args.out}. Open it: colours should look normal (if red and blue are swapped, "
          f"set capture.channel_order to 'rgba').")


def cmd_link(args, cfg):
    from . import config
    chars = _client(cfg).characters()
    want = args.character.lower()
    char = next((c for c in chars if c["name"].lower() == want or str(c["id"]) == want), None)
    if not char:
        sys.exit(f"No arc-tracker character '{args.character}'. Have: " + ", ".join(c["name"] for c in chars))
    cfg["identity"]["aliases"][args.name] = char["id"]
    config.save(cfg)
    print(f"In-game name {args.name!r} → {char['name']}.")


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
    if session.learned():
        print("Learned (checkmark): " + ", ".join(sorted(cat.name(k) for k in session.learned())))
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
            if r.blueprint:
                label = "BP " + label
            cv2.putText(out, label, (x + 2, y + h - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.38, colors[r.status], 1, cv2.LINE_AA)
        cv2.imwrite(args.out, out)
        print(f"\nAnnotated image (last screenshot): {args.out}")
    if args.preview or args.apply:
        if not cfg.get("character_id"):
            sys.exit("No character set — run setup first.")
        counts = {k: v for k, v in totals.items() if k not in unread}
        resp = _client(cfg).sync(cfg["character_id"], counts, apply=args.apply, learned=session.learned())
        print(f"\n{'Applied' if resp['applied'] else 'Would change'} {len(resp['changes'])} item(s):")
        for c in resp["changes"]:
            what = "learned" if c.get("field") == "learned" else f"{c['before']} → {c['after']}"
            print(f"  {c['name']:<32} {what}")


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
    from .capture import make_capture
    from .engine import Engine
    from .hotkeys import Hotkeys
    from .overlay import Overlay

    if not cfg.get("calibration"):
        sys.exit("Not calibrated yet — run: python -m arc_vision calibrate")
    with mss.mss() as s:
        mon = s.monitors[cfg["monitor"]]
    cat = _catalog(cfg)
    engine = Engine(cfg, _client(cfg), cat, lambda: make_capture(cfg))
    overlay = Overlay(engine, cfg, mon)
    hk = cfg["hotkeys"]
    keys = Hotkeys()
    for name in ("snapshot", "toggle_watch", "preview", "apply", "discard", "next_character", "save_frame", "toggle_full"):
        keys.add(hk[name], lambda n=name: engine.send(n))
    keys.add(hk["toggle_overlay"], overlay.toggle_visible)
    keys.add(hk["toggle_boxes"], overlay.toggle_boxes)
    keys.start()
    if keys.failed:
        print("These hotkeys are taken by another app; change them in config.json: " + ", ".join(keys.failed))
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
        keys.stop()
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
    s.add_argument("--preset", help="use a measured preset (e.g. 3440x1440) without clicking")
    s = sub.add_parser("scan-image", help="scan screenshots (in scroll order) and show what was found")
    s.add_argument("images", nargs="+")
    s.add_argument("--out", help="write an annotated copy of the last screenshot")
    s.add_argument("--preview", action="store_true", help="show what would change in arc-tracker")
    s.add_argument("--apply", action="store_true", help="write the counts to arc-tracker")
    s = sub.add_parser("teach", help="label unrecognised slots in screenshots")
    s.add_argument("images", nargs="*", help="screenshots (default: frames saved from `run`)")
    s.add_argument("--all", action="store_true", help="also review slots that were recognised")
    s = sub.add_parser("calibrate-name", help="mark where the main menu shows your player name")
    s.add_argument("--image", help="main-menu screenshot (default: capture the screen)")
    s.add_argument("--delay", type=int, default=5)
    s = sub.add_parser("capture-test", help="grab one frame of the game and save it")
    s.add_argument("--out", default="capture-test.png")
    s.add_argument("--wait", type=int, default=30, help="seconds to wait for the game window")
    s = sub.add_parser("link", help="link an in-game name to an arc-tracker character")
    s.add_argument("name", help="player name as shown on the main menu")
    s.add_argument("character", help="arc-tracker character name or id")
    sub.add_parser("run", help="overlay + hotkeys while you play")
    args = p.parse_args(argv)
    cfg = config.load()
    {"setup": cmd_setup, "refresh": cmd_refresh, "calibrate": cmd_calibrate, "scan-image": cmd_scan_image,
     "teach": cmd_teach, "run": cmd_run, "calibrate-name": cmd_calibrate_name, "link": cmd_link,
     "capture-test": cmd_capture_test}[args.cmd](args, cfg)


if __name__ == "__main__":
    main()
