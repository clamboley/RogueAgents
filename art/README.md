# Art pipeline

The game's art was generated with Google Gemini as large images on a flat magenta background, then turned into clean
pixel art by the scripts here. The game only ships the result, in `src/assets/`.

The raw images (`art/raw/`, about 85 MB) are not in the repository. With them in place, one command rebuilds every
sprite and the manifest, byte for byte:

```sh
art/build.sh
```

## Requirements

Python 3 with `numpy` and `Pillow`. Pillow must be built with **libimagequant** (the palette reduction keeps small
bright details such as torch flames). The Debian/Ubuntu `python3-pil` package has it; the PyPI wheels do not. Check
with:

```sh
python3 -c "from PIL import features; print(features.check('libimagequant'))"
```

## Tools

| Script              | Does                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `tools/pixelize.py` | A background: crop the letterbox, stretch the floor down, downscale to 480×300, reduce the palette.  |
| `tools/sheet.py`    | A sheet of sprites on magenta: find each sprite, key out the background, downscale, anchor the feet. |
| `tools/ui.py`       | The talent menu's frame, banner and scroll (the scroll is reshaped into a wide strip).               |
| `tools/export.py`   | Copies the processed art to `src/assets/` as indexed PNGs and writes `src/assets/manifest.ts`.       |
| `tools/contact.py`  | A contact sheet of processed sprites, for review.                                                    |
| `lights.json`       | Where the light sources are in each background, for the flickering glow drawn over them.             |

`build.sh` lists the exact options for every image: grid, scale, palette size, and fixes such as `--strict` (only
pure magenta is background, for sprites with pink glows), `--despill` (removes the pink cast from translucent parts),
`--flip` (mirrors a whole sheet), `--flip-only` (mirrors the sprites it names) and `--drop-far`. For familiars,
`--pair-anchor` sets each `-attack` sprite's anchor by laying its `-idle` pose over it, so a breath or a beam does not
move the body; `--hang` lets the attacks it names keep what hangs below the body (a bolt) under the feet line.
`--glass` turns a large wall of pale light into see-through cyan glass, kept as a partly transparent palette entry.

## Adding art

1. Generate the image on a flat `#FF00FF` background, sprites evenly spaced in a grid, and save it in `art/raw/`.
2. Add a line for it to `build.sh` and run it.
3. Reference the new sprite by name in the game (`src/game/art.ts` for characters and monsters).
