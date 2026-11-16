"""Builds the talent menu's one-piece UI art into art/processed/ui, with its meta.json for export.py.

- talent-menu: the stone frame, full bleed, at the stage's 480x300 grid.
- ui-scroll: the parchment, reshaped from Gemini's tall scroll into a wide strip: a band across the middle of its
  height is cut out (the rolls are uniform there), then the parchment between the rolls is stretched sideways.
- ui-banner: the crimson title ribbon.

Usage: python3 -I tools/ui.py   (run from the art directory)
"""

import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw")
OUT = os.path.join(ROOT, "processed", "ui")


def foreground(a: np.ndarray) -> np.ndarray:
    """True where the pixel is not the magenta background."""
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return ~((r - g > 90) & (b - g > 90) & (abs(r - b) < 110))


def cut(path: str) -> np.ndarray:
    """The object as RGBA, cropped to its bounding box."""
    a = np.asarray(Image.open(path).convert("RGB"))
    fg = foreground(a)
    ys, xs = np.nonzero(fg)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return np.dstack([a[y0:y1, x0:x1], np.where(fg[y0:y1, x0:x1], 255, 0).astype(np.uint8)])


def pixelize(rgba: np.ndarray, width: int, colors: int) -> np.ndarray:
    """Box downscale to `width`, hard alpha, a small palette: clean pixel art at the target size."""
    h = round(rgba.shape[0] * width / rgba.shape[1])
    down = np.asarray(Image.fromarray(rgba, "RGBA").resize((width, h), Image.Resampling.BOX)).copy()
    solid = down[..., 3] > 110
    rgb = Image.fromarray(down[..., :3], "RGB").quantize(colors=colors, method=Image.Quantize.LIBIMAGEQUANT, dither=Image.Dither.NONE)
    out = np.dstack([np.asarray(rgb.convert("RGB")), np.where(solid, 255, 0).astype(np.uint8)])
    ys, xs = np.nonzero(solid)
    return out[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def save(name: str, a: np.ndarray, meta: dict) -> None:
    Image.fromarray(a, "RGBA").save(os.path.join(OUT, f"{name}.png"))
    meta[name] = {"w": int(a.shape[1]), "h": int(a.shape[0]), "ax": round(a.shape[1] / 2, 1)}
    print(f"{name}: {a.shape[1]}x{a.shape[0]}")


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {}

    # The frame: trim the few extra columns of its 1.608:1 to the stage's 1.6:1, then the 480x300 grid.
    src = Image.open(os.path.join(RAW, "talent-menu.jpeg")).convert("RGB")
    w = round(src.height * 1.6)
    x0 = (src.width - w) // 2
    menu = src.crop((x0, 0, x0 + w, src.height)).resize((480, 300), Image.Resampling.BOX)
    menu = menu.quantize(colors=48, method=Image.Quantize.LIBIMAGEQUANT, dither=Image.Dither.NONE).convert("RGBA")
    save("talent-menu", np.asarray(menu), meta)

    # The scroll: drop a fifth of its height across the middle, then stretch the parchment between the rolls 2.1x.
    s = cut(os.path.join(RAW, "ui-scroll.jpeg"))
    h, w = s.shape[:2]
    s = np.concatenate([s[: round(h * 0.36)], s[round(h * 0.58) :]])
    left, right = round(w * 0.124), round(w * 0.876)
    mid = s[:, left:right]
    # Nearest-neighbour stretch by index (Pillow's resize fails on array views here).
    stretched = mid[:, (np.arange(round(mid.shape[1] * 2.1)) / 2.1).astype(int)]
    s = np.concatenate([s[:, :left], stretched, s[:, right:]], axis=1)
    save("ui-scroll", pixelize(s, 330, 32), meta)

    save("ui-banner", pixelize(cut(os.path.join(RAW, "ui-banner.jpeg")), 240, 24), meta)

    with open(os.path.join(OUT, "meta.json"), "w") as f:
        json.dump(meta, f, indent=1)


if __name__ == "__main__":
    main()
