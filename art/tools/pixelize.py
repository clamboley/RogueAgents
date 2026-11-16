"""Turns a generated image into clean game pixel art.

- Crops letterbox bars (near-black rows and columns at the edges).
- Optionally keys out a flat magenta background (#FF00FF) into transparency.
- Downscales by area averaging to the target size, so each output pixel is one "art pixel".
- Reduces to a limited palette without dithering, so flat areas stay flat.
- Writes the result and a nearest-neighbour preview, scaled up for viewing.

Usage: python3 -I pixelize.py IN OUT --width 480 [--height 300] [--colors 48] [--key] [--preview 3]
"""

import argparse
import numpy as np
from PIL import Image


def crop_letterbox(img: Image.Image, mean_max: float = 19, spread_max: float = 6) -> Image.Image:
    """Removes uniform dark bands that touch the edges (letterboxing), whatever their exact color."""
    a = np.asarray(img.convert("L")).astype(float)

    def band(lines: np.ndarray) -> int:
        n = 0
        for line in lines:
            if line.mean() > mean_max or line.std() > spread_max:
                break
            n += 1
        return n

    top, bottom = band(a), band(a[::-1])
    left, right = band(a.T), band(a.T[::-1])
    return img.crop((left, top, img.width - right, img.height - bottom))


def key_magenta(img: Image.Image) -> Image.Image:
    """Makes magenta-ish pixels transparent, with a tolerance for JPEG noise and soft edges."""
    a = np.asarray(img.convert("RGBA")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    magenta = (r > 170) & (b > 170) & (g < 110) & (abs(r - b) < 90)
    a[..., 3] = np.where(magenta, 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--width", type=int, required=True)
    p.add_argument("--height", type=int)
    p.add_argument("--colors", type=int, default=48)
    p.add_argument("--key", action="store_true", help="key out a magenta background")
    p.add_argument("--no-crop", action="store_true")
    p.add_argument("--preview", type=int, default=3)
    p.add_argument("--floor", type=float, help="where the floor starts, as a fraction of the height")
    p.add_argument("--floor-to", type=float, help="where the floor should start after deepening it")
    args = p.parse_args()

    img = Image.open(args.src)
    if not args.no_crop and not args.key:
        img = crop_letterbox(img)
    if args.floor and args.floor_to:
        # Deepen the floor: stretch it downwards and squeeze the wall above, so nothing is cut off.
        rgb = img.convert("RGB")
        split = round(rgb.height * args.floor)
        wall_h = round(rgb.height * args.floor_to)
        wall = rgb.crop((0, 0, rgb.width, split)).resize((rgb.width, wall_h), Image.Resampling.LANCZOS)
        floor = rgb.crop((0, split, rgb.width, rgb.height)).resize((rgb.width, rgb.height - wall_h), Image.Resampling.LANCZOS)
        img = Image.new("RGB", rgb.size)
        img.paste(wall, (0, 0))
        img.paste(floor, (0, wall_h))
    if args.key:
        img = key_magenta(img)
    height = args.height or round(img.height * args.width / img.width)
    if args.height:
        # Cover the target box, then centre-crop, so the art is never stretched.
        scale = max(args.width / img.width, args.height / img.height)
        w, h = round(img.width * scale), round(img.height * scale)
        img = img.resize((w, h), Image.Resampling.BOX)
        left, top = (w - args.width) // 2, (h - args.height) // 2
        small = img.crop((left, top, left + args.width, top + args.height))
    else:
        small = img.resize((args.width, height), Image.Resampling.BOX)

    rgba = small.convert("RGBA")
    alpha = np.asarray(rgba)[..., 3]
    quant = rgba.convert("RGB").quantize(colors=args.colors, method=Image.Quantize.LIBIMAGEQUANT, dither=Image.Dither.NONE)
    out = quant.convert("RGBA")
    if args.key:
        o = np.asarray(out).copy()
        o[..., 3] = np.where(alpha > 127, 255, 0)
        out = Image.fromarray(o, "RGBA")
    out.save(args.dst)
    if args.preview > 1:
        # Nearest-neighbour upscale with numpy (Pillow 12's resize fails on these images).
        big = np.asarray(out).repeat(args.preview, axis=0).repeat(args.preview, axis=1)
        Image.fromarray(big, "RGBA").save(args.dst.replace(".png", f".x{args.preview}.png"))
    print(f"{args.dst}: {out.width}x{out.height}, {len(out.getcolors(1 << 16) or [])} colors")


if __name__ == "__main__":
    main()
