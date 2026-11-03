# arc-vision — stash reader for arc-tracker

arc-vision runs on your gaming PC. It reads the ARC Raiders stash screen with
screen capture and computer vision, then syncs the counts to your self-hosted
arc-tracker. It shows its progress in a small click-through overlay.

It only reads pixels from your screen. It never touches the game process, its
memory, its network traffic or its files.

```
Gaming PC                                   Homelab
┌────────────────────────────────┐         ┌──────────────────────────┐
│ ARC Raiders (borderless)       │         │ arc-tracker              │
│   ▲ overlay (hotkeys)          │  HTTP   │  GET  /api/vision/catalog│
│ arc-vision: capture → match →  │ ──────► │  POST /api/vision/sync   │
│   OCR counts → scroll tracking │         │  Vision Sync page/revert │
└────────────────────────────────┘         └──────────────────────────┘
```

## What it tracks

Everything arc-tracker counts:

| Item type | What gets written |
|---|---|
| Blueprints and stencils | `extras` (copies held). `learned` is never changed. |
| ARC parts, amplification components, workshop materials | `count` |

Anything else in your stash (guns, ammo, loot) is skipped.

## Install (Windows)

1. Install Python 3.10 or newer from python.org (the installer includes tkinter).
2. Install Tesseract OCR, for example the UB Mannheim build. Make sure
   `tesseract.exe` is on your PATH.
3. In this folder, run:
   ```powershell
   py -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```
4. Set ARC Raiders to **borderless windowed**. Exclusive fullscreen usually
   captures as black and draws over the overlay.

## First-time setup

```powershell
python -m arc_vision setup --server http://<homelab>:3333   # pick a character, download icons
python -m arc_vision calibrate --delay 5                    # or --image stash.png
python -m arc_vision scan-image stash.png --out check.png   # sanity check
```

`calibrate` walks you through these steps on a screenshot of the open stash:

1. Click the top-left and bottom-right corners of the first slot, then the
   top-left corner of the slot to its right and of the slot below it. Each
   click starts on the full screen, then you click again on a zoomed view to
   place it exactly.
2. Type the number of columns and visible rows in the terminal.
3. Drag boxes around the item art and around the stack-count digits.
4. Drag a box around a fixed piece of stash UI, such as a header. The agent
   uses it to tell when the stash is open.

`check.png` shows what was found: green for tracked items with their counts,
red for unknown, grey for ignored. Re-run `calibrate` if you change resolution
or HUD scale.

## Teaching it (recommended)

Out of the box it matches against the wiki icons that arc-tracker already
downloads. The game draws items a little differently, and some untracked loot
looks like tracked items. Labelling a few real slots fixes both:

```powershell
python -m arc_vision teach stash1.png stash2.png   # or no args: frames saved with Ctrl+Alt+F
python -m arc_vision teach --all stash1.png        # also review recognised slots
```

For each slot it shows the item enlarged with its best guesses. Type a number,
search by name, or press `i` to mark it **ignore** (guns, ammo, loot). Labelled
crops are saved in `~/.arc_vision/taught/` and are matched before wiki icons.

Blueprints and stencils whose wiki icon is a generic stand-in can only be
recognised once they've been taught.

## Playing with it

```powershell
python -m arc_vision run
```

| Hotkey | Action |
|---|---|
| Ctrl+Alt+S | Snapshot: read the current stash view |
| Ctrl+Alt+W | Watch: keep reading while you scroll |
| Ctrl+Alt+P | Preview the changes in arc-tracker (nothing is written yet) |
| Ctrl+Alt+A | Apply the previewed changes |
| Ctrl+Alt+X | Discard the current scan |
| Ctrl+Alt+C | Next character |
| Ctrl+Alt+Z | Full-stash mode (see below) |
| Ctrl+Alt+B | Show/hide slot boxes |
| Ctrl+Alt+F | Save the current frame to use with `teach` |
| Ctrl+Alt+O | Show/hide the overlay |

You can change any of these under `hotkeys` in `~/.arc_vision/config.json`.

A typical scan:

1. Open the stash and press Ctrl+Alt+W.
2. Scroll from top to bottom at a steady pace.
3. Press Ctrl+Alt+P and check the change list in the overlay.
4. Press Ctrl+Alt+A to apply.

Every applied sync appears on the **Vision Sync** page in arc-tracker, and you
can revert it there.

### Scrolling never double-counts

Each frame is lined up against the rows already seen, so every row gets an
absolute position in the stash:

- Scrolling back over rows you've already seen updates them; it doesn't add them again.
- Two identical rows at different positions are both counted.
- A frame that can't be lined up is **skipped, not guessed**. That happens if
  you jumped more than a screen, nothing overlaps, or several positions fit
  equally well. If it happens, scroll back a little.
- In watch mode, a row has to read the same in two frames before it counts, so
  a tooltip passing over it doesn't corrupt it.
- Stashes that scroll by pixels instead of whole rows are handled too. The
  agent finds the grid's offset in each frame and only reads rows that are
  fully visible.

### What it won't do on its own

- **It doesn't zero items it didn't see.** A scan only changes the items it
  read, so a partial scan is safe. If you've scanned the entire stash and want
  anything not seen set to 0 (sold, used up), turn on full-stash mode
  (Ctrl+Alt+Z) before you preview.
- **It doesn't guess counts it can't read.** Those items are listed in the
  overlay and left unchanged.

## Tuning

These live in `~/.arc_vision/config.json`:

| Setting | Default | Meaning |
|---|---|---|
| `match.min_score` / `match.min_margin` | 0.60 / 0.20 | A wiki-icon match needs this score **and** this lead over the runner-up |
| `match.strong_score` / `match.strong_margin` | 0.85 / 0.08 | …or a very high score with a smaller lead |
| `match.taught_min_score` | 0.90 | Threshold for taught crops |
| `empty_std` | 9 | A slot with less contrast than this is treated as empty |
| `count_text_threshold` / `count_text_max_saturation` | 170 / 70 | Which pixels count as digit text (bright and nearly colourless) |
| `count_mask` | `ink` | Use `box` if the game draws a solid badge behind counts |
| `stable_frames` | 2 | How many frames a row must read the same before it counts (watch mode) |
| `scroll_phase` | true | Detect pixel-scroll offsets |
| `anchor_threshold` | 0.80 | Match threshold for the stash-open element |

## Notes and limits

- The overlay hides itself from screen capture on Windows 10 2004 and later,
  so the agent never reads its own boxes. On older Windows, keep slot boxes
  off while scanning.
- If the game runs as administrator, run arc-vision as administrator too, or
  hotkeys won't register while the game has focus.
- Rarity borders aren't used yet. Items that share art and differ only by tier
  colour depend on the colour check and on teaching.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest tests
```

The tests render synthetic stash screens (icons, counts, empty slots,
untracked loot, tooltips) and check detection, counts, pixel and row
scrolling, revisiting rows, rejecting jumps, and the preview → apply flow.
