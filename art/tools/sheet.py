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
    p.add_argument("--drop-far", type=int, help="drop pieces farther than this (source pixels) from the largest one")
    args = p.parse_args()
    global STRICT
    STRICT = args.strict
    rows, cols = (int(v) for v in args.grid.lower().split("x"))

    src = np.asarray(Image.open(args.sheet).convert("RGB"))
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
            # Despill: translucent parts drawn over magenta keep a pink-violet cast; pull red and blue back towards green.
            cell = src[y0:y1, x0:x1].astype(int)
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
            ys, xs = np.nonzero(solid)
            out = out[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
            solid = solid[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
            if args.flip:
                out = out[:, ::-1]
                solid = solid[:, ::-1]
            low = solid[int(solid.shape[0] * 0.88) :]
            fx = float(np.nonzero(low)[1].mean()) if low.any() else solid.shape[1] / 2
            Image.fromarray(out, "RGBA").save(os.path.join(args.outdir, f"{name}.png"))
            meta[name] = {"w": int(out.shape[1]), "h": int(out.shape[0]), "ax": round(fx, 1)}
            print(f"{name}: {out.shape[1]}x{out.shape[0]} anchor {fx:.1f}")
    with open(os.path.join(args.outdir, "meta.json"), "w") as f:
        json.dump(meta, f, indent=1)


if __name__ == "__main__":
    main()
