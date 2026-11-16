// Hand-drawn 8×8 pixel icons and a 3×5 pixel font. The same art draws on the canvas and, as SVG, in the panel's
// HTML, so the village never depends on an emoji font being installed.

const PALETTE: Record<string, string> = {
  k: "#2a1d14", // outline
  w: "#c98a4b", // wood
  W: "#8a5530", // wood shade
  q: "#e0b07a", // log ring
  s: "#c4c4cc", // stone
  S: "#8d8d95", // stone shade
  g: "#a9a9b2", // grey
  m: "#6e6e78", // metal
  y: "#ecc95e", // wheat
  Y: "#b8933e", // wheat shade
  G: "#8a9a3a", // stem
  v: "#6cb25a", // leaf
  V: "#3f7a35", // leaf shade
  p: "#f3e6cf", // paper
  P: "#d8c7a3", // paper shade
  n: "#6b4423", // brown
  R: "#c4513f", // red
  b: "#4f6fa8", // blue
  B: "#8cc3ee", // light blue
  O: "#ffd86b", // gold
  o: "#ff8a3d", // orange
  e: "#f1c27d", // skin
}

const ART = {
  wood: ["........", ".kkkkkk.", "kwwwwkqk", "kWWWWkqk", ".kkkkkk.", "kwwwwkqk", "kWWWWkqk", ".kkkkkk."],
  stone: ["........", "...kkk..", "..kssSk.", ".kkssSSk", "ksskgSSk", "ksssgSSk", "kSSSSSSk", ".kkkkkk."],
  wheat: ["y..y..y.", "Yy.Yy.Yy", ".y.yY.y.", "..yYyY..", "...GG...", "..RRRR..", "...GG...", "..G..G.."],
  lore: ["kkkkkkk.", "kPpppppk", ".kpnnnpk", ".kppppPk", ".kpnnpPk", ".kppppPk", "kkkkkkPk", "kPPPPPk."],
  saw: ["........", "kk......", "knk.....", ".knkkkkk", ".kmssssk", "..kSkSkS", "........", "........"],
  bricks: ["........", "kkkkkkkk", "kRRRkRRk", "kkkkkkkk", "kRkRRRRk", "kkkkkkkk", "kRRRkRRk", "kkkkkkkk"],
  hammer: [".kkkk...", ".kmmmk..", ".kmmmkk.", "..kkknk.", "....knk.", ".....knk", "......kk", "........"],
  magnifier: [".kkk....", "kBBBk...", "kBpBk...", "kBBBk...", ".kkknk..", "....knk.", ".....knk", "......k."],
  bird: ["........", ".kk.....", "kpOk..kk", ".kppkkpk", "..kpppk.", "...kkk..", "....O...", "........"],
  telescope: ["......kk", ".....kbk", "....kbk.", "...kbk..", "..kbk...", ".kkk....", ".k.k....", "k...k..."],
  people: ["........", ".ee..ee.", ".ee..ee.", "bbbbRRRR", "bbb..RRR", "bbb..RRR", ".n....n.", ".n....n."],
  question: ["..kkkk..", ".kOOOOk.", ".kOkkOk.", "..kkOOk.", "...kOk..", "...kk...", "...kOk..", "...kk..."],
  book: ["kkkkkkk.", "kbbbbbkp", "kbOObbkp", "kbbbbbkp", "kbbbbbkp", "kbbbbbkp", "kkkkkkkp", ".ppppppp"],
  todo: [".kkkkkk.", ".kpppPk.", ".kvpnnk.", ".kpppPk.", ".kvpnnk.", ".kpppPk.", ".kOpnnk.", ".kkkkkk."],
  wrench: [".kk.....", "kmk.....", "kmmk....", ".kmmk...", "..kmmk..", "...kmmk.", "....kmmk", ".....kk."],
  letter: ["........", "kkkkkkkk", "kkpppPkk", "kpkpPkPk", "kppkkpPk", "kpppppPk", "kkkkkkkk", "........"],
  thought: ["..kkkk..", ".kppppk.", "kppppppk", "kppppPPk", ".kppPPk.", "..kkkk..", ".kk.....", "kk......"],
  rain: ["..kkk...", ".kgggkk.", "kgggggSk", "kSSSSSSk", ".kkkkkk.", ".B..B..B", "B..B..B.", "........"],
  alert: ["...kk...", "..kOOk..", "..kOOk..", "..kOOk..", "...kk...", "...kk...", "..kOOk..", "...kk..."],
  broom: ["......nk", ".....nk.", "....nk..", "...nk...", "..yyk...", ".yyYy...", "yyYyY...", "yYyY...."],
  sparkle: ["...O....", "...O....", ".OOOOO..", "...O..O.", "...O.OOO", "......O.", "........", "........"],
  sprout: ["........", ".vv..vv.", "vVVvvVVv", ".vvVVvv.", "...VV...", "...VV...", ".nnnnnn.", "nnnnnnnn"],
  party: ["O.....R.", "...b....", ".R...O..", "..kk..b.", ".kOOk...", "kOOOk...", "kOOk....", "kk......"],
  crate: ["........", ".kkkkkk.", "kwwYYwwk", "kkkkkkkk", "kWWYYWWk", "kWWWWWWk", "kWWWWWWk", "kkkkkkkk"],
  home: ["...kk...", "..kRRk..", ".kRRRRk.", "kRRRRRRk", ".kpppPk.", ".kpnnPk.", ".kpnnPk.", ".kkkkkk."],
  dizzy: ["........", ".kkkkkk.", "kekeekek", "keekkeek", "kekeekek", "keeeeeek", "kekkkkek", ".kkkkkk."],
  moon: ["..kkk...", ".kOOk...", "kOOk....", "kOOk....", "kOOk....", "kOOOk..k", ".kOOOkkk", "..kkkk.."],
  sun: ["...O....", ".O.O.O..", "..ooo...", "OOoOoOO.", "..ooo...", ".O.O.O..", "...O....", "........"],
  crown: ["........", "O..O..O.", "OO.OO.OO", "OOOOOOOO", "ORORRORO", "OOOOOOOO", "YYYYYYYY", "........"],
  stairs: ["........", "......kk", ".....kSk", "....kSSk", "...kSSSk", "..kSSSSk", ".kSSSSSk", "kkkkkkkk"],
  door: [".kkkkkk.", "kwwkwwwk", "kwWkwWwk", "kwwkwwwk", "kwWkwOwk", "kwwkwwwk", "kwWkwWwk", "kkkkkkkk"],
  flame: ["...o....", "..oo....", "..oOo...", ".oOOo.o.", ".oOyOoo.", "oOyyyOo.", "oOyyyOo.", ".oOOOo.."],
  hourglass: ["kkkkkkk.", "kyyyyyk.", ".kyyyk..", "..kyk...", "..kpk...", ".kpypk..", "kpyyypk.", "kkkkkkk."],
  wolf: ["k.....k.", "kk...kk.", "kSkkkSk.", "kSSSSSk.", "kSkSSkSk", ".kSSSSk.", "..kppk..", "...kk..."],
  swarm: ["O.....B.", "........", "...v....", ".B....O.", "....B...", "O.......", "...O..v.", "........"],
  coin: ["..kkkk..", ".kOOOOk.", "kOOYYOOk", "kOYOOOOk", "kOYOOOOk", "kOOYYOOk", ".kOOOOk.", "..kkkk.."],
  sword: [".......k", "......ks", ".....ksk", "....ksk.", "kk.ksk..", ".kksk...", "..nk....", ".n.k...."],
} satisfies Record<string, readonly string[]>

export type SpriteName = keyof typeof ART

/** Draws a sprite with its top-left corner at (x, y), one game pixel per art pixel. */
export function drawSprite(ctx: CanvasRenderingContext2D, name: SpriteName, x: number, y: number) {
  ART[name].forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const color = PALETTE[row[i]!]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1)
    }
  })
}

/** The sprite as an SVG data URL, for `<img>` in the panel. Crisp at any size with `image-rendering: pixelated`. */
export function spriteUrl(name: SpriteName) {
  const rects = ART[name].flatMap((row, j) =>
    [...row].flatMap((c, i) =>
      PALETTE[c] ? [`<rect x="${i}" y="${j}" width="1" height="1" fill="${PALETTE[c]}"/>`] : [],
    ),
  )
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">${rects.join("")}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const GLYPHS: Record<string, readonly string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", ".##", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  "+": ["...", ".#.", "###", ".#.", "..."],
  ".": ["...", "...", "...", "...", ".#."],
  k: ["#..", "#.#", "##.", "#.#", "#.#"],
  M: ["#.#", "###", "###", "#.#", "#.#"],
  z: ["...", "###", ".#.", "#..", "###"],
  " ": ["...", "...", "...", "...", "..."],
}

/** The width in game pixels of `text` in the pixel font. */
export const textWidth = (text: string) => text.length * 4 - 1

/** Draws `text` in the 3×5 pixel font with a dark outline, its top-left corner at (x, y). */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = "#f3e6cf") {
  const plot = (fill: string, ox: number, oy: number) => {
    ctx.fillStyle = fill
    ;[...text].forEach((ch, n) =>
      (GLYPHS[ch] ?? GLYPHS[" "]!).forEach((row, j) => {
        for (let i = 0; i < 3; i++)
          if (row[i] === "#") ctx.fillRect(Math.round(x) + n * 4 + i + ox, Math.round(y) + j + oy, 1, 1)
      }),
    )
  }
  for (const [ox, oy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const)
    plot("#2a1d14", ox, oy)
  plot(color, 0, 0)
}

/** A compact number for the pixel font: 12, 3.4k, 1.2M. */
export function shortNumber(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k`
  return n >= 10 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, "")
}
