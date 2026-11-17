"""Cuts a sprite sheet on a magenta background into clean pixel-art sprites.

Pieces of foreground are found as connected components, then each piece joins the grid cell nearest to its centre
(the grid is given as rows x columns). Detached bits of a sprite, such as sparkles or a motion trail, stay with it,
and a sprite that reaches into a neighbouring row never swallows it. Every sprite of a sheet is downscaled by the
same factor, so relative sizes hold, and gets its feet anchor: the horizontal centre of its lowest opaque rows.

Usage: python3 -I sheet.py SHEET OUTDIR --grid 4x3 --scale 8 --names a,b,c,... [--colors 32]
Names are given in reading order (left to right, top to bottom); "-" skips a cell.
"""

import argparse
import json
import os
from collections import deque

import numpy as np
from PIL import Image

STEP = 4  # labeling works on a mask reduced by this factor, which also bridges hairline gaps


STRICT = False  # set by --strict: only near-pure magenta is background, for sprites with pink or violet glows


def magenta_mask(a: np.ndarray) -> np.ndarray:
    """True where the pixel is background: strongly magenta, allowing for JPEG noise and soft edges."""
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    if STRICT:
        return (r > 200) & (b > 200) & (g < 70)
    return (r - g > 90) & (b - g > 90) & (abs(r - b) < 110)


def place(idle: np.ndarray, attack: np.ndarray) -> tuple[int, int]:
    """Where the idle sprite sits best within the attack one: the offset where most opaque pixels of both agree in
    colour. The body keeps its colours from one pose to the other; a cloud of dust or a beam does not share them."""
    hi, wi = idle.shape[:2]
    ha, wa = attack.shape[:2]
    pad = np.zeros((ha + 2 * hi, wa + 2 * wi, 4), dtype=int)
    pad[hi : hi + ha, wi : wi + wa] = attack
    small = idle.astype(int)
    best, at = -1, (0, 0)
    for y in range(ha + hi + 1):
        for x in range(wa + wi + 1):
            win = pad[y : y + hi, x : x + wi]
            both = (win[..., 3] > 0) & (small[..., 3] > 0)
            close = (np.abs(win[..., :3] - small[..., :3]).sum(axis=-1) < 60) & both
            score = int(close.sum())
            if score > best:
                best, at = score, (x - wi, y - hi)
    return at


GLASS_RGB = (191, 246, 255)


def glass_mask(src: np.ndarray) -> np.ndarray:
    """Large areas of pale, cool light: a wall of light that Gemini drew see-through over the magenta, so it came out
    lavender. Small bits of the same colour, like a glowing eye, stay solid."""
    r, g, b = (src[..., i].astype(int) for i in range(3))
    cool = (b - r > 40) & (b > 200) & (g > 150) & (r > 150)
    H, W = cool.shape
    small = cool[: H - H % STEP, : W - W % STEP].reshape(H // STEP, STEP, W // STEP, STEP).sum(axis=(1, 3)) >= 12
    labels, _ = label(small)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    big = np.isin(labels, np.nonzero(sizes > small.size * 0.0004)[0])
    full = np.zeros_like(cool)
    full[: big.shape[0] * STEP, : big.shape[1] * STEP] = big.repeat(STEP, axis=0).repeat(STEP, axis=1)
    return full & cool


def label(mask: np.ndarray) -> tuple[np.ndarray, int]:
    """8-connected component labels of a boolean mask."""
    labels = np.zeros(mask.shape, dtype=np.int32)
    n = 0
    h, w = mask.shape
    for y, x in zip(*np.nonzero(mask)):
        if labels[y, x]:
            continue
        n += 1
        labels[y, x] = n
        queue = deque([(y, x)])
        while queue:
            cy, cx = queue.popleft()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = n
                        queue.append((ny, nx))
    return labels, n


def kmeans_1d(values: np.ndarray, weights: np.ndarray, k: int) -> np.ndarray:
    """Centres of k clusters of 1-D values, seeded evenly across their range."""
    centres = np.linspace(values.min(), values.max(), k)
    for _ in range(50):
        nearest = np.abs(values[:, None] - centres[None, :]).argmin(axis=1)
        for c in range(k):
            sel = nearest == c
            if sel.any():
                centres[c] = np.average(values[sel], weights=weights[sel])
    return np.sort(centres)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("sheet")
    p.add_argument("outdir")
    p.add_argument("--grid", required=True, help="rows x columns, e.g. 4x3")
    p.add_argument("--scale", type=float, required=True, help="source pixels per output pixel")
    p.add_argument("--names", required=True)
    p.add_argument("--colors", type=int, default=32)
    p.add_argument("--despill", action="store_true", help="pull a pink-violet cast out of translucent parts")
    p.add_argument("--strict", action="store_true", help="key out only near-pure magenta")
    p.add_argument("--flip", action="store_true", help="mirror every sprite, for a sheet drawn facing the wrong way")
    p.add_argument("--flip-only", default="", help="mirror only these sprites (comma-separated names)")
    p.add_argument(
        "--pair-anchor",
        action="store_true",
        help="place each <x>-attack on its <x>-idle, so a breath or a bolt does not move the body",
    )
    p.add_argument(
        "--hang",
        default="",
        help="with --pair-anchor, these attacks keep what hangs below their body under the feet line, like a bolt",
    )
    p.add_argument(
        "--glass",
        type=float,
        help="turn large areas of pale cool light (a wall of light) into pale cyan glass of this opacity, e.g. 0.4",
    )
    p.add_argument(
        "--unmix",
        help="hex colour of a glow painted over the magenta (e.g. bff6ff): pink-cast pixels become that glow, see-through",
    )
    p.add_argument(
        "--body-anchor",
        action="store_true",
        help="anchor each sprite on the box of its largest piece, so a halo or sparkles around it do not shift it",
    )
    p.add_argument("--drop-far", type=int, help="drop pieces farther than this (source pixels) from the largest one")
    args = p.parse_args()
    global STRICT
    STRICT = args.strict
    rows, cols = (int(v) for v in args.grid.lower().split("x"))

    src = np.asarray(Image.open(args.sheet).convert("RGB"))
    glass = glass_mask(src) if args.glass else None
    fg = ~magenta_mask(src)
    H, W = fg.shape
    small = fg[: H - H % STEP, : W - W % STEP].reshape(H // STEP, STEP, W // STEP, STEP).sum(axis=(1, 3)) >= 3
    labels, n = label(small)
    comps = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(labels == i)
        if len(ys) >= 4:
            comps.append((i, ys.mean(), xs.mean(), len(ys)))
    if args.drop_far is not None:
        # Keep only pieces close to the main body, so stray debris does not widen a single sprite.
        main = max(comps, key=lambda c: c[3])[0]
        my, mx = np.nonzero(labels == main)
        box = (my.min(), my.max(), mx.min(), mx.max())
        far = args.drop_far / STEP

        def near(i: int) -> bool:
            ys, xs = np.nonzero(labels == i)
            dy = max(box[0] - ys.max(), ys.min() - box[1], 0)
            dx = max(box[2] - xs.max(), xs.min() - box[3], 0)
            return max(dy, dx) <= far

        comps = [c for c in comps if near(c[0])]
    ids = np.array([c[0] for c in comps])
    cy = np.array([c[1] for c in comps])
    cx = np.array([c[2] for c in comps])
    area = np.array([c[3] for c in comps], dtype=float)
    row_c = kmeans_1d(cy, area, rows)
    col_c = kmeans_1d(cx, area, cols)
    cell_of = {
        int(i): (int(np.abs(row_c - y).argmin()), int(np.abs(col_c - x).argmin())) for i, y, x in zip(ids, cy, cx)
    }

    names = [s.strip() for s in args.names.split(",")]
    os.makedirs(args.outdir, exist_ok=True)
    meta = {}
    images: dict[str, np.ndarray] = {}
    for r in range(rows):
        for c in range(cols):
            name = names[r * cols + c] if r * cols + c < len(names) else f"r{r}c{c}"
            if name == "-":
                continue
            members = [i for i, cell in cell_of.items() if cell == (r, c)]
            if not members:
                print(f"{name}: empty cell")
                continue
            # Full-resolution mask of this cell's pieces only.
            piece = np.isin(labels, members).repeat(STEP, axis=0).repeat(STEP, axis=1)
            mask = np.zeros_like(fg)
            mask[: piece.shape[0], : piece.shape[1]] = piece
            mask &= fg
            ys, xs = np.nonzero(mask)
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            # The body: the cell's largest piece, in source pixels.
            body_id = max(members, key=lambda i: area[np.nonzero(ids == i)[0][0]])
            body = np.zeros_like(fg)
            up = (labels == body_id).repeat(STEP, axis=0).repeat(STEP, axis=1)
            body[: up.shape[0], : up.shape[1]] = up
            bys, bxs = np.nonzero(body & mask)
            # Despill: translucent parts drawn over magenta keep a pink-violet cast; pull red and blue back towards green.
            cell = src[y0:y1, x0:x1].astype(int)
            # How much magenta shows through each pixel, measured before any despill.
            spill_map = np.clip(np.minimum(cell[..., 0], cell[..., 2]) - cell[..., 1], 0, 255).astype(np.uint8)
            green_map = cell[..., 1].astype(np.uint8)
            if args.despill:
                spill = np.clip(np.minimum(cell[..., 0], cell[..., 2]) - cell[..., 1] - 12, 0, None)
                cell[..., 0] -= (spill * 0.85).astype(int)
                cell[..., 2] -= (spill * 0.85).astype(int)
            rgba = np.dstack([np.clip(cell, 0, 255).astype(np.uint8), np.where(mask[y0:y1, x0:x1], 255, 0).astype(np.uint8)])
            img = Image.fromarray(rgba, "RGBA")
            w, h = max(1, round(img.width / args.scale)), max(1, round(img.height / args.scale))
            # Box downscale with premultiplied alpha, then a hard alpha cut: no pink fringe, no half pixels.
            down = np.asarray(img.resize((w, h), Image.Resampling.BOX)).copy()
            solid = down[..., 3] > 110
            rgb = Image.fromarray(down[..., :3], "RGB").quantize(
                colors=args.colors, method=Image.Quantize.LIBIMAGEQUANT, dither=Image.Dither.NONE
            )
            out = np.dstack([np.asarray(rgb.convert("RGB")), np.where(solid, 255, 0).astype(np.uint8)])
            if args.unmix:
                # A glow over magenta: green only comes from the glow, so it tells how much of it there is.
                glow = tuple(int(args.unmix[i : i + 2], 16) for i in (0, 2, 4))
                inside = mask[y0:y1, x0:x1]
                spill = np.asarray(Image.fromarray(np.where(inside, spill_map, 0)).resize((w, h), Image.Resampling.BOX))
                green = np.asarray(Image.fromarray(np.where(inside, green_map, 0)).resize((w, h), Image.Resampling.BOX))
                haze = solid & (spill > 16)
                alpha = np.clip(green.astype(float) / glow[1], 0, 1)
                alpha = np.round(alpha * 8) / 8
                out[haze & (alpha < 0.25), 3] = 0
                keep = haze & (alpha >= 0.25)
                out[keep, :3] = glow
                out[keep, 3] = (alpha[keep] * 255).astype(np.uint8)
            if glass is not None:
                cell_glass = Image.fromarray((glass[y0:y1, x0:x1] & mask[y0:y1, x0:x1]).astype(np.uint8) * 255, "L")
                see = (np.asarray(cell_glass.resize((w, h), Image.Resampling.BOX)) > 127) & solid
                out[see] = (*GLASS_RGB, round(255 * args.glass))
            ys, xs = np.nonzero(solid)
            top, left = ys.min(), xs.min()
            out = out[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
            solid = solid[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
            flip = args.flip or name in args.flip_only.split(",")
            if flip:
                out = out[:, ::-1]
                solid = solid[:, ::-1]
            low = solid[int(solid.shape[0] * 0.88) :]
            fx = float(np.nonzero(low)[1].mean()) if low.any() else solid.shape[1] / 2
            below = 0
            if args.body_anchor:
                fx = ((bxs.min() + bxs.max() + 1) / 2 - x0) * w / img.width - left
                if flip:
                    fx = solid.shape[1] - fx
                below = max(0, solid.shape[0] - round((bys.max() + 1 - y0) * h / img.height - top))
            Image.fromarray(out, "RGBA").save(os.path.join(args.outdir, f"{name}.png"))
            meta[name] = {"w": int(out.shape[1]), "h": int(out.shape[0]), "ax": round(float(fx), 1)}
            if below:
                meta[name]["below"] = int(below)
            images[name] = out
            print(f"{name}: {out.shape[1]}x{out.shape[0]} anchor {fx:.1f}")
    if args.pair_anchor:
        for name in images:
            idle = name.removesuffix("-attack") + "-idle"
            if name.endswith("-attack") and idle in images:
                dx, dy = place(images[idle], images[name])
                meta[name]["ax"] = round(meta[idle]["ax"] + dx, 1)
                below = meta[name]["h"] - (dy + meta[idle]["h"])
                # A walking body changes its pose and keeps its feet on the ground; only a floating one hangs its attack.
                if below > 0 and name in args.hang.split(","):
                    meta[name]["below"] = below
                else:
                    below = 0
                print(f"{name}: on {idle} at {dx},{dy}, anchor {meta[name]['ax']}" + (f", {below} below" if below > 0 else ""))
    with open(os.path.join(args.outdir, "meta.json"), "w") as f:
        json.dump(meta, f, indent=1)


if __name__ == "__main__":
    main()
