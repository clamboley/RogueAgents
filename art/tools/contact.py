"""Lays sprites out on a dark background, scaled up with nearest neighbour, for review."""
import sys, glob, os
import numpy as np
from PIL import Image

out, scale, files = sys.argv[1], int(sys.argv[2]), sorted(sum((glob.glob(g) for g in sys.argv[3:]), []))
sprites = [Image.open(f).convert("RGBA") for f in files if f.endswith(".png")]
pad = 6
w = sum(s.width for s in sprites) + pad * (len(sprites) + 1)
h = max(s.height for s in sprites) + pad * 2
canvas = Image.new("RGBA", (w, h), (40, 36, 48, 255))
x = pad
for s in sprites:
    canvas.alpha_composite(s, (x, h - pad - s.height))
    x += s.width + pad
big = np.asarray(canvas).repeat(scale, axis=0).repeat(scale, axis=1)
Image.fromarray(big, "RGBA").save(out)
print(out, big.shape[1], "x", big.shape[0])
