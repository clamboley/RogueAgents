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
  /** Sprites that circle the monster on a tilted ring, passing behind it on the far side; it also glows. */
  orbit?: string[]
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
  /** The familiars a guild unlocks on reaching this biome, for good. */
  familiars?: string[]
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
    familiars: ["quartzling", "glowfly"],
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
    familiars: ["sporehopper", "snail"],
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
    familiars: ["salamander", "emberling"],
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
    familiars: ["octopus", "seahorse"],
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
    familiars: ["snowfox", "penguin"],
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
    familiars: ["griffonling", "stormcloud"],
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
    familiars: ["cherub", "unicorn"],
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
    familiars: ["cometling", "moonmoth"],
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
  {
    key: "void",
    art: "void",
    familiars: ["floateye", "shadeling"],
    filter: "",
    light: "#c69bff",
    monsters: [
      { key: "voidwalker", sprite: "voidwalker" },
      { key: "riftcrawler", sprite: "riftcrawler" },
      { key: "nulleye", sprite: "nulleye", hover: 18 },
      { key: "stareater", sprite: "stareater", hover: 22 },
    ],
    boss: { key: "unmaker", sprite: "unmaker", scale: 1, hover: 8 },
  },
]

const byKey = (key: string) => OWN.find((b) => b.key === key)!

/** The ten biomes, one per ten floors: down to the abyss, then up through the ice and the storm to the celestial palace,
 * out into space and the void. */
export const BIOMES: Biome[] = [
  ...["crypt", "crystal", "fungal", "forge", "abyss", "frost", "storm", "celestial", "space", "void"].map(byKey),
]

/** The last ultra boss: the alien who made the simulation, floating among fragments of the worlds it built, one per
 * biome. TODO: it borrows the celestial boss's sprite until it has its own. */
const ARCHITECT: MonsterDef = {
  key: "architect",
  sprite: "archon",
  hover: 6,
  scale: 1,
  orbit: ["crypt", "crystal", "fungal", "forge", "abyss", "frost", "storm", "celestial", "space", "void"].map(
    (biome) => `fragment-${biome}`,
  ),
}

/** Floors 101–105: outside the simulation. The guild has escaped the dungeon and meets the alien beings who made it;
 * five ultra bosses wait alone, one per floor. */
export const FINALE: Biome = {
  key: "heart",
  art: "heart",
  filter: "",
  light: "#bff6ff",
  monsters: [],
  boss: ARCHITECT,
  ultras: [
    { key: "ratelimiter", sprite: "ratelimiter", scale: 1 },
    { key: "hallucination", sprite: "hallucination", scale: 1 },
    { key: "infiniteloop", sprite: "infiniteloop", scale: 1 },
    { key: "contextwindow", sprite: "contextwindow", scale: 1 },
    ARCHITECT,
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

/** The familiars every guild starts with; each biome after the crypts unlocks two more (`Biome.familiars`). A species
 * has `<species>-idle` and `-attack` sprites. */
export const BASE_FAMILIARS = ["cat", "owl", "dragon", "slime", "wisp", "fox", "frog", "mushroom"]
/** Species that float above the floor, and by how much. */
export const HOVER: Record<string, number> = {
  wisp: 12,
  glowfly: 14,
  seahorse: 10,
  stormcloud: 14,
  cherub: 12,
  cometling: 14,
  moonmoth: 14,
  floateye: 12,
}
const SPARKS = ["#7cf0ff", "#ffd86b", "#ff8a3d", "#b8ff6b", "#ff9ae0", "#c8a8ff"]

export interface FamiliarLook {
  species: string
  /** The colour of its projectiles. */
  accent: string
}

/** The familiars a guild can summon: every one unlocked so far, and the current biome's newcomers. */
export interface FamiliarPool {
  all: string[]
  fresh: string[]
}

/** The pool once the guild has reached biome `index` (the finale unlocks none), keeping only species with art, so a
 * biome's familiars appear only once their sprites exist. */
export function familiarPool(index: number, hasArt: (species: string) => boolean): FamiliarPool {
  const reached = BIOMES.slice(1, Math.min(index, BIOMES.length - 1) + 1)
  return {
    all: [...BASE_FAMILIARS, ...reached.flatMap((b) => b.familiars ?? [])].filter(hasArt),
    fresh: (BIOMES[index]?.familiars ?? []).filter(hasArt),
  }
}

/** A familiar drawn from a seed: half the time one of the current biome's newcomers, so they show up often among the
 * many unlocked before them. */
export function familiarFor(seed: number, pool: FamiliarPool): FamiliarLook {
  const r = rng(seed ^ 0x5bd1e995)
  const fresh = pool.fresh.length > 0 && r() < 0.5
  return { species: pick(fresh ? pool.fresh : pool.all, r), accent: pick(SPARKS, r) }
}
