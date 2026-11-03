"""On-screen overlay: a status panel plus optional boxes over the stash slots.

Both windows are always on top and click-through (on Windows), so the game
keeps receiving every click; everything is driven by hotkeys. Needs the game
in borderless windowed mode — exclusive fullscreen draws over any overlay.
"""

from __future__ import annotations

import sys
import tkinter as tk

from .engine import Engine

BG = "#101418"
FG = "#d8dee9"
DIM = "#7b8794"
ACCENT = "#f5a524"
GOOD = "#4ade80"
BAD = "#f87171"
KEY_COLOR = "#ff00ff"   # made transparent in the boxes window

STATUS_COLORS = {"item": GOOD, "unknown": BAD, "ignored": DIM}


def _click_through(win: tk.Misc) -> None:
    """Let mouse input pass to the game, and keep the window out of screen captures.

    WS_EX_TRANSPARENT makes it click-through. WDA_EXCLUDEFROMCAPTURE (Windows 10
    2004+) hides it from capture APIs, so the agent never reads its own boxes
    and labels back as part of the stash.
    """
    if sys.platform != "win32":
        return
    import ctypes

    GWL_EXSTYLE, WS_EX_LAYERED, WS_EX_TRANSPARENT, WS_EX_TOOLWINDOW, WS_EX_NOACTIVATE = -20, 0x80000, 0x20, 0x80, 0x08000000
    WDA_EXCLUDEFROMCAPTURE = 0x11
    user32 = ctypes.windll.user32
    hwnd = user32.GetParent(win.winfo_id()) or win.winfo_id()
    style = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
    user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style | WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE)
    if not user32.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE):
        print("warning: this Windows version can't hide the overlay from capture; "
              "keep the panel away from the stash grid and leave slot boxes off while scanning.")


class Overlay:
    def __init__(self, engine: Engine, cfg: dict, monitor_rect: dict):
        self.engine = engine
        self.cfg = cfg
        self.mon = monitor_rect
        self.root = tk.Tk()
        self.root.withdraw()
        self.visible = True
        self.show_boxes = False

        # ── status panel ────────────────────────────────────────────────────
        oc = cfg["overlay"]
        self.panel = tk.Toplevel(self.root, bg=BG)
        self.panel.overrideredirect(True)
        self.panel.attributes("-topmost", True)
        self.panel.attributes("-alpha", oc["opacity"])
        width = oc["width"]
        x = self.mon["left"] + (self.mon["width"] - width - 16 if "right" in oc["corner"] else 16)
        y = self.mon["top"] + (16 if "top" in oc["corner"] else self.mon["height"] - 420)
        self.panel.geometry(f"+{x}+{y}")   # height follows the content
        self.title = tk.Label(self.panel, bg=BG, fg=ACCENT, font=("Segoe UI", 10, "bold"), anchor="w")
        self.title.pack(fill="x", padx=10, pady=(8, 0))
        self.status = tk.Label(self.panel, bg=BG, fg=FG, font=("Segoe UI", 9), anchor="w", justify="left")
        self.status.pack(fill="x", padx=10)
        self.body = tk.Label(self.panel, bg=BG, fg=FG, font=("Consolas", 9), anchor="w", justify="left",
                             width=max(20, width // 7))
        self.body.pack(fill="x", padx=10, pady=(4, 0))
        self.msg = tk.Label(self.panel, bg=BG, fg=ACCENT, font=("Segoe UI", 9), anchor="w", justify="left",
                            wraplength=width - 20)
        self.msg.pack(fill="x", padx=10, pady=(4, 0))
        hk = cfg["hotkeys"]
        legend = (f"{hk['snapshot']} snapshot · {hk['toggle_watch']} watch · {hk['preview']} preview · "
                  f"{hk['apply']} apply · {hk['discard']} discard · {hk['next_character']} character · "
                  f"{hk['toggle_full']} full-stash · {hk['toggle_boxes']} boxes · {hk['toggle_overlay']} hide")
        tk.Label(self.panel, text=legend, bg=BG, fg=DIM, font=("Segoe UI", 8), anchor="w", justify="left",
                 wraplength=width - 20).pack(fill="x", padx=10, pady=(6, 8))

        # ── slot boxes (full-monitor, transparent) ──────────────────────────
        self.boxes = tk.Toplevel(self.root, bg=KEY_COLOR)
        self.boxes.overrideredirect(True)
        self.boxes.attributes("-topmost", True)
        if sys.platform == "win32":
            self.boxes.attributes("-transparentcolor", KEY_COLOR)
        self.boxes.geometry(f"{self.mon['width']}x{self.mon['height']}+{self.mon['left']}+{self.mon['top']}")
        self.canvas = tk.Canvas(self.boxes, bg=KEY_COLOR, highlightthickness=0)
        self.canvas.pack(fill="both", expand=True)
        self.boxes.withdraw()

        self.root.update_idletasks()
        _click_through(self.panel)
        _click_through(self.boxes)
        self._drawn_results = None

    # hotkey thread → Tk thread
    def toggle_visible(self):
        self.root.after(0, self._toggle_visible)

    def toggle_boxes(self):
        self.root.after(0, self._toggle_boxes)

    def _toggle_visible(self):
        self.visible = not self.visible
        (self.panel.deiconify if self.visible else self.panel.withdraw)()
        self._sync_boxes_window()

    def _toggle_boxes(self):
        self.show_boxes = not self.show_boxes
        self._sync_boxes_window()

    def _sync_boxes_window(self):
        if self.visible and self.show_boxes:
            self.boxes.deiconify()
            _click_through(self.boxes)
        else:
            self.boxes.withdraw()

    def _refresh(self):
        st = self.engine.state()
        char = st.character["name"] if st.character else "no character"
        if st.character and self.engine._identity_box() and not st.character_confirmed:
            char += " (unconfirmed — visit the main menu)"
        elif st.in_game_name:
            char += f" ({st.in_game_name})"
        mode = "WATCHING" if st.watching else "idle"
        self.title.config(text=f"arc-vision · {char} · {mode}" + (" · FULL STASH" if st.full_mode else ""))
        stash = "stash open" if st.stash_visible else "stash not detected"
        self.status.config(text=f"{stash} · {st.frames} frame(s) · {st.rows} row(s) placed"
                                + (f" · {st.rejected} skipped" if st.rejected else ""))
        self.body.config(text=self._body_text(st))
        msg = st.error or st.message
        self.msg.config(text=msg, fg=BAD if st.error else ACCENT)
        if self.show_boxes and st.last_results is not self._drawn_results:
            self._draw_boxes(st.last_results)
        self.root.after(200, self._refresh)

    def _body_text(self, st) -> str:
        names = self.engine.catalog.name
        lines = []
        if st.preview:
            ch = st.preview["changes"]
            lines.append(f"Preview — {len(ch)} change(s), {st.preview['unchanged']} unchanged:")
            for c in ch[:14]:
                if c.get("field") == "learned":
                    lines.append(f"  {c['name'][:24]:<24} learned ✓")
                else:
                    lines.append(f"  {c['name'][:24]:<24} {c['before']:>4} → {c['after']:<4}")
            if len(ch) > 14:
                lines.append(f"  … and {len(ch) - 14} more")
        elif st.totals:
            lines.append(f"Seen so far — {len(st.totals)} tracked item(s):")
            for k, v in sorted(st.totals.items(), key=lambda kv: names(kv[0]))[:14]:
                lines.append(f"  {names(k)[:28]:<28} ×{v}")
            if len(st.totals) > 14:
                lines.append(f"  … and {len(st.totals) - 14} more")
        else:
            lines.append("Open the stash, then snapshot or watch.")
        if st.unread:
            lines.append("Couldn't read the count for (left unchanged):")
            for k, n in list(st.unread.items())[:5]:
                lines.append(f"  {names(k)[:28]} ({n} stack{'s' if n > 1 else ''})")
        return "\n".join(lines)

    def _draw_boxes(self, results):
        self._drawn_results = results
        self.canvas.delete("all")
        for r in results:
            if r.status == "empty":
                continue
            x, y, w, h = r.box
            color = STATUS_COLORS.get(r.status, FG)
            self.canvas.create_rectangle(x, y, x + w, y + h, outline=color, width=2)
            if r.status == "item":
                label = f"{(r.name or '')[:12]} ×{r.count}" + ("?" if r.count_uncertain else "")
                self.canvas.create_text(x + 3, y + h - 3, text=label, anchor="sw", fill=color, font=("Segoe UI", 8, "bold"))

    def run(self):
        self.root.after(200, self._refresh)
        self.root.mainloop()

    def quit(self):
        self.root.after(0, self.root.destroy)
