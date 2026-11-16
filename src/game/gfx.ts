// Image assets: loading, the cloth recolor that gives every adventurer its own colors, the white silhouette for hit
// flashes, and the colour filters that dress biomes whose own art does not exist yet. Every variant is drawn once
// into a canvas and cached, so a frame only copies pixels.
import { BACKGROUNDS, SPRITES, type Background, type SpriteAsset } from "../assets/manifest"

export type { Background }

const images = new Map<string, HTMLImageElement>()
const cache = new Map<string, HTMLCanvasElement>()

function image(url: string) {
  const known = images.get(url)
  if (known) return known
  const img = new Image()
  img.src = url
  images.set(url, img)
  return img
}

/** Starts loading every asset, so the first frames already have them. */
export function preload() {
  Object.values(SPRITES).forEach((s) => image(s.url))
  Object.values(BACKGROUNDS).forEach((list) => list.forEach((b) => image(b.url)))
}

const ready = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0

/** A cached canvas holding `url` after `paint`, or undefined while the image loads. */
function variant(key: string, url: string, paint: (c: CanvasRenderingContext2D, img: HTMLImageElement) => void) {
  const known = cache.get(key)
  if (known) return known
  const img = image(url)
  if (!ready(img)) return undefined
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const c = canvas.getContext("2d", { willReadFrequently: true })!
  paint(c, img)
  cache.set(key, canvas)
  return canvas
}

// ───────── Colour helpers ─────────
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}
const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}

/**
 * The sprite with its green cloth repainted in `cloth`. The art keeps clothes in one bright green so they can be found
 * by hue; each pixel keeps its own shade, moved onto the new colour.
 */
function recolored(name: string, sprite: SpriteAsset, cloth: string) {
  return variant(`${name}|${cloth}`, sprite.url, (c, img) => {
    c.drawImage(img, 0, 0)
    const data = c.getImageData(0, 0, img.naturalWidth, img.naturalHeight)
    const [th, ts, tl] = rgbToHsl(...hexToRgb(cloth))
    const px = data.data
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue
      const [h, s, l] = rgbToHsl(px[i]!, px[i + 1]!, px[i + 2]!)
      if (h < 75 || h > 170 || s < 0.3 || l < 0.08) continue
      // The art's green sits around 45 % lightness; keep each pixel's shade relative to it.
      const [r, g, b] = hslToRgb(
        th,
        Math.min(1, ts * Math.min(1.2, s / 0.55)),
        Math.max(0.04, Math.min(0.92, l * (tl / 0.45))),
      )
      px[i] = r
      px[i + 1] = g
      px[i + 2] = b
    }
    c.putImageData(data, 0, 0)
  })
}

/** The sprite through a CSS colour filter, for biomes that borrow another biome's art. */
function filtered(name: string, url: string, filter: string) {
  return variant(`${name}|f:${filter}`, url, (c, img) => {
    c.filter = filter
    c.drawImage(img, 0, 0)
    c.filter = "none"
  })
}

/** The sprite as a flat white silhouette, for the frame a monster is hit. */
function silhouette(name: string, sprite: SpriteAsset) {
  return variant(`${name}|white`, sprite.url, (c, img) => {
    c.drawImage(img, 0, 0)
    c.globalCompositeOperation = "source-in"
    c.fillStyle = "#ffffff"
    c.fillRect(0, 0, img.naturalWidth, img.naturalHeight)
  })
}

export interface SpriteOptions {
  /** Paints the green cloth in this colour. */
  cloth?: string
  /** A CSS filter, e.g. a placeholder biome's colours. */
  filter?: string
  flash?: boolean
  /** Mirrors the sprite around its feet. */
  flip?: boolean
  /** A whole number keeps the pixels crisp. */
  scale?: number
  alpha?: number
}

/** Draws sprite `name` standing with its feet at (x, y). Returns its drawn height, 0 while it loads. */
export function drawArt(c: CanvasRenderingContext2D, name: string, x: number, y: number, o: SpriteOptions = {}) {
  const sprite = SPRITES[name]
  if (!sprite) return 0
  const source = o.flash
    ? silhouette(name, sprite)
    : o.cloth
      ? recolored(name, sprite, o.cloth)
      : o.filter
        ? filtered(name, sprite.url, o.filter)
        : variant(name, sprite.url, (ctx, img) => ctx.drawImage(img, 0, 0))
  if (!source) return 0
  const scale = o.scale ?? 1
  c.save()
  c.globalAlpha = o.alpha ?? 1
  c.translate(Math.round(x), Math.round(y))
  if (o.flip) c.scale(-1, 1)
  c.drawImage(source, Math.round(-sprite.ax * scale), -sprite.h * scale, sprite.w * scale, sprite.h * scale)
  c.restore()
  return sprite.h * scale
}

export const spriteSize = (name: string) => SPRITES[name]

/** A background of `set`, picked by `seed`, through `filter` when the biome borrows it. */
export function background(set: string, seed: number, filter: string) {
  const list = BACKGROUNDS[set] ?? BACKGROUNDS.crypt!
  const index = seed % list.length
  const bg = list[index]!
  const name = `bg:${set}:${index}`
  const canvas = filter ? filtered(name, bg.url, filter) : variant(name, bg.url, (c, img) => c.drawImage(img, 0, 0))
  return { canvas, torches: bg.torches }
}
