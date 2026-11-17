// What the dungeon looks like: biomes and their monsters, adventurers' classes and colours, and the familiars, which
// are still drawn procedurally until they get their own art.

export type Ctx = CanvasRenderingContext2D

/** A seeded random generator (mulberry32). */
export function rng(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let x = Math.imul(s ^ (s >>> 15), 1 | s)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}
export const hash = (s: string) => [...s].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0
export const pick = <T>(list: readonly T[], r: () => number) => list[Math.floor(r() * list.length)]!

export function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)))
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, "0")}`
}

// ───────── Biomes ─────────

/** A monster: its name key, the sprite it uses, and how it stands (fliers hover above the floor). */
export interface MonsterDef {
  key: string
  sprite: string
  hover?: number
  /** A biome boss's scale: 1 for its own art, 3 for a borrowed monster sprite. */
  scale?: number
}

export interface Biome {
  key: string
  /** The background set; biomes without their own art borrow the crypt's. */
  art: string
  /** A CSS filter that recolours borrowed art into this biome's mood; empty for its own art. */
  filter: string
  /** The torches' glow. */
  light: string
  monsters: MonsterDef[]
  boss: MonsterDef
  /** The final biome's ultra bosses, one per floor after the last biome. */
  ultras?: MonsterDef[]
}

const CRYPT_MONSTERS = (keys: [string, string, string, string]): MonsterDef[] => [
  { key: keys[0], sprite: "skeleton" },
  { key: keys[1], sprite: "rat" },
  { key: keys[2], sprite: "ghost", hover: 10 },
  { key: keys[3], sprite: "bat", hover: 26 },
]

/** The biomes with their own art; `BIOMES` puts them in the order the guild meets them. */
const OWN: Biome[] = [
  {
    key: "crypt",
    art: "crypt",
    filter: "",
    light: "#ffb347",
    monsters: CRYPT_MONSTERS(["skeleton", "rat", "ghost", "bat"]),
    boss: { key: "lich", sprite: "lich", scale: 1 },
  },
  {
    key: "crystal",
    art: "crystal",
    filter: "",
    light: "#7cf0ff",
    monsters: [
      { key: "shardling", sprite: "shardling" },
      { key: "geode", sprite: "geode" },
      { key: "echo", sprite: "echo", hover: 10 },
      { key: "glimmerbat", sprite: "glimmerbat", hover: 26 },
    ],
    boss: { key: "prism", sprite: "prism", scale: 1 },
  },
  {
    key: "fungal",
    art: "fungal",
    filter: "",
    light: "#b8ff6b",
    monsters: [
      { key: "mossbones", sprite: "mossbones" },
      { key: "boar", sprite: "boar" },
      { key: "sporeling", sprite: "sporeling" },
      { key: "mothling", sprite: "mothling", hover: 24 },
    ],
    boss: { key: "mycelord", sprite: "mycelord", scale: 1 },
  },
  {
    key: "forge",
    art: "forge",
    filter: "",
    light: "#ff7a2f",
    monsters: [
      { key: "ashwraith", sprite: "ashwraith", hover: 8 },
      { key: "cinderhound", sprite: "cinderhound" },
      { key: "ember", sprite: "ember", hover: 6 },
      { key: "magmaw", sprite: "magmaw" },
    ],
    boss: { key: "forgeking", sprite: "forgeking", scale: 1 },
  },
  {
    key: "abyss",
    art: "abyss",
    filter: "",
    light: "#5cf0d0",
    monsters: [
      { key: "drowned", sprite: "drowned" },
      { key: "lurker", sprite: "lurker" },
      { key: "shade", sprite: "shade", hover: 8 },
      { key: "jelly", sprite: "jelly", hover: 18 },
    ],
    boss: { key: "leviathan", sprite: "leviathan", scale: 1 },
  },
  {
    key: "frost",
    art: "frost",
    filter: "",
    light: "#8fd8ff",
    monsters: [
      { key: "icebound", sprite: "icebound" },
      { key: "frostwolf", sprite: "frostwolf" },
      { key: "rimewisp", sprite: "rimewisp", hover: 14 },
      { key: "snowowl", sprite: "snowowl", hover: 26 },
    ],
    boss: { key: "frostwyrm", sprite: "frostwyrm", scale: 1 },
  },
  {
    key: "storm",
    art: "storm",
    filter: "",
    light: "#9fc8ff",
    monsters: [
      { key: "stormknight", sprite: "stormknight" },
      { key: "tempestharpy", sprite: "tempestharpy", hover: 8 },
      { key: "windwraith", sprite: "windwraith" },
      { key: "thunderwyvern", sprite: "thunderwyvern", hover: 26 },
    ],
    boss: { key: "tempestking", sprite: "tempestking", scale: 1 },
  },
  {
    key: "celestial",
    art: "celestial",
    filter: "",
    light: "#ffe9a0",
    monsters: [
      { key: "sentinel", sprite: "sentinel" },
      { key: "griffin", sprite: "griffin" },
      { key: "seraphling", sprite: "seraphling", hover: 20 },
      { key: "starbat", sprite: "starbat", hover: 26 },
    ],
    boss: { key: "archon", sprite: "archon", scale: 1 },
  },
  {
    key: "space",
    art: "space",
    filter: "",
    light: "#bfe6ff",
    monsters: [
      { key: "moongolem", sprite: "moongolem" },
      { key: "comethound", sprite: "comethound" },
      { key: "nebulajelly", sprite: "nebulajelly", hover: 16 },
      { key: "starmanta", sprite: "starmanta", hover: 26 },
    ],
    boss: { key: "starweaver", sprite: "starweaver", scale: 1 },
  },
]

/** A biome still waiting for its art: another biome's rooms and monsters, recoloured by `filter`. */
const placeholder = (key: string, from: Biome, filter: string, light: string): Biome => ({
  ...from,
  key,
  filter,
  light,
})
const byKey = (key: string) => OWN.find((b) => b.key === key)!

/** The ten biomes, one per ten floors: down to the abyss, then up through the ice and the storm to the celestial palace,
 * out into space and the void. TODO: the void still borrows recoloured art. */
export const BIOMES: Biome[] = [
  ...["crypt", "crystal", "fungal", "forge", "abyss", "frost", "storm", "celestial", "space"].map(byKey),
  placeholder("void", byKey("abyss"), "hue-rotate(80deg) saturate(0.8) brightness(0.65)", "#b77cff"),
]

/** Floors 101–105: the heart of the dungeon, where five ultra bosses wait alone, one per floor. TODO: their own art. */
export const FINALE: Biome = {
  ...placeholder("heart", byKey("celestial"), "hue-rotate(250deg) saturate(1.4) brightness(0.55)", "#ff6b9a"),
  monsters: [],
  boss: { key: "devourer", sprite: "archon", scale: 1 },
  ultras: [
    { key: "ratelimiter", sprite: "forgeking", scale: 1 },
    { key: "hallucination", sprite: "mycelord", scale: 1 },
    { key: "infiniteloop", sprite: "leviathan", scale: 1 },
    { key: "contextwindow", sprite: "prism", scale: 1 },
    { key: "devourer", sprite: "archon", scale: 1 },
  ],
}

/** The biome of a biome index; past the last biome, the finale. */
export const biome = (index: number): Biome => BIOMES[index] ?? FINALE

// ───────── Adventurers ─────────

/** Classes with art; each has `<class>-idle`, `-attack` and `-sit` sprites. */
export const CLASSES = ["knight", "dwarf", "archer", "wizard", "rogue", "cleric", "barbarian", "necromancer"] as const
export type ClassId = (typeof CLASSES)[number]
export const RANGED: readonly ClassId[] = ["archer", "wizard", "necromancer"]

const CLOTHES = [
  "#4f6fa8",
  "#b5483b",
  "#3f8a6e",
  "#8a5a9e",
  "#c07a2c",
  "#2f7f95",
  "#9e4f6f",
  "#5a7a3a",
  "#3a4a6a",
  "#a8a040",
  "#6a4a8a",
  "#c0c4cc",
  "#d06a8a",
  "#2a2a33",
]

export interface Look {
  cls: ClassId
  /** The colour their green cloth is painted in. */
  cloth: string
  /** A spark colour for spells and hits. */
  accent: string
}

/** A look drawn from a seed: same session, same adventurer, every time. */
export function lookFor(seed: number): Look {
  const r = rng(seed)
  return { cls: pick(CLASSES, r), cloth: pick(CLOTHES, r), accent: pick(CLOTHES, r) }
}

// ───────── Familiars ─────────

/** Familiar species with art; each has `<species>-idle` and `-attack` sprites. */
export const SPECIES = ["cat", "owl", "dragon", "slime", "wisp", "fox", "frog", "mushroom"] as const
export type Species = (typeof SPECIES)[number]
/** Species that float above the floor, and by how much. */
export const HOVER: Partial<Record<Species, number>> = { wisp: 12 }
const SPARKS = ["#7cf0ff", "#ffd86b", "#ff8a3d", "#b8ff6b", "#ff9ae0", "#c8a8ff"]

export interface FamiliarLook {
  species: Species
  /** The colour of its projectiles. */
  accent: string
}

export function familiarFor(seed: number): FamiliarLook {
  const r = rng(seed ^ 0x5bd1e995)
  return { species: pick(SPECIES, r), accent: pick(SPARKS, r) }
}
