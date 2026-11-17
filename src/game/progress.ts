// The dungeon's math: where a cumulative amount of damage stands, and what talents add. Pure functions only.

/** Damage the first floor costs, and how much more each next floor costs. Calibrated on a heavy single-agent user
 * (~75 M damage a day): the first six biomes in under two weeks, floor 100 in about a year and a half, the end in two. */
export const FLOOR_BASE = 300_000
export const FLOOR_GROWTH = 1.1
/** Each floor: four monsters, then its boss, as shares of the floor's cost. */
export const ROOM_SHARES = [0.15, 0.15, 0.15, 0.15, 0.4] as const
export const BOSS_ROOM = ROOM_SHARES.length - 1
export const FLOORS_PER_BIOME = 10
/** The last floor of the last biome. The floors after it hold one ultra boss each, alone, until the last. */
export const LAST_BIOME_FLOOR = 100
export const FINAL_FLOOR = 105

export const floorCost = (floor: number) => FLOOR_BASE * FLOOR_GROWTH ** (floor - 1)
/** Damage needed to reach the start of `floor`. */
export const costBefore = (floor: number) => (FLOOR_BASE * (FLOOR_GROWTH ** (floor - 1) - 1)) / (FLOOR_GROWTH - 1)
/** Damage that clears the dungeon: the last ultra boss falls. */
export const DUNGEON_COST = costBefore(FINAL_FLOOR + 1)
export const isUltra = (floor: number) => floor > LAST_BIOME_FLOOR

export interface Position {
  floor: number
  room: number
  boss: boolean
  /** The current monster's health, in damage. */
  hp: number
  /** Damage already dealt to it. */
  dealt: number
  /** The last ultra boss has fallen: the dungeon is cleared, and the position stays on it. */
  cleared: boolean
}

/** Where cumulative damage stands: the floor, the room in it, and the current monster's health. */
export function position(damage: number): Position {
  const d = Math.max(0, damage)
  if (d >= DUNGEON_COST) {
    const hp = floorCost(FINAL_FLOOR)
    return { floor: FINAL_FLOOR, room: BOSS_ROOM, boss: true, hp, dealt: hp, cleared: true }
  }
  // The closed form can land one floor off through rounding; step to the floor whose range holds `d`.
  let floor = Math.max(1, Math.floor(Math.log(1 + (d * (FLOOR_GROWTH - 1)) / FLOOR_BASE) / Math.log(FLOOR_GROWTH)) + 1)
  while (floor > 1 && costBefore(floor) > d) floor -= 1
  while (costBefore(floor + 1) <= d) floor += 1
  const cost = floorCost(floor)
  let within = d - costBefore(floor)
  // An ultra boss holds its whole floor alone.
  if (isUltra(floor)) return { floor, room: BOSS_ROOM, boss: true, hp: cost, dealt: within, cleared: false }
  for (let room = 0; room < ROOM_SHARES.length; room++) {
    const hp = cost * ROOM_SHARES[room]!
    if (within < hp || room === BOSS_ROOM)
      return { floor, room, boss: room === BOSS_ROOM, hp, dealt: Math.min(within, hp), cleared: false }
    within -= hp
  }
  return { floor, room: BOSS_ROOM, boss: true, hp: cost * ROOM_SHARES[BOSS_ROOM], dealt: 0, cleared: false }
}

/** The biome of a floor: 0 for floors 1–10, 1 for 11–20, and so on; the ultra bosses' floors make one more. */
export const biomeOf = (floor: number) => Math.floor((floor - 1) / FLOORS_PER_BIOME)

// ───────── Tokens ─────────

/** What a token of context (input, cache read or cache write) weighs against a generated one. Each step of an agent
 * reads its whole context again, so context piles up some twenty times faster than output: at full weight it would be
 * the whole game. Input and cache weigh the same, so a provider that caches and one that does not progress alike. */
export const CONTEXT_WEIGHT = 0.05

/** Damage per token of each kind, before talents. */
export const WEIGHT: Record<TokenKind, number> = {
  output: 1,
  reasoning: 1,
  input: CONTEXT_WEIGHT,
  cacheRead: CONTEXT_WEIGHT,
  cacheWrite: CONTEXT_WEIGHT,
}

/** Token counts as the server reports them, for a step or for a whole history. */
export interface Usage {
  input: number
  output: number
  reasoning: number
  cache: { read: number; write: number }
}

export const rawTokens = (u: Usage) => u.input + u.output + u.reasoning + u.cache.read + u.cache.write
/** The damage a usage is worth, before talents. */
export const weightedTokens = (u: Usage) =>
  u.output * WEIGHT.output +
  u.reasoning * WEIGHT.reasoning +
  u.input * WEIGHT.input +
  u.cache.read * WEIGHT.cacheRead +
  u.cache.write * WEIGHT.cacheWrite

/** The server's lifetime totals the dungeon has accounted for; `undefined` until it first reads them. */
export interface Mark {
  tokens: number
  weighted: number
}

/** Settles a reading of the server's lifetime totals against the mark. The first reading only sets the mark: the
 * guild starts on floor 1, whatever its history. Later readings return what the live events missed, such as work
 * done while the app was closed; it counts at face value, without talents. The mark always moves to the reading, so a
 * lower one (sessions deleted) does not hold back the work that follows. */
export function settle(mark: Mark | undefined, lifetime: Usage) {
  const next: Mark = { tokens: rawTokens(lifetime), weighted: weightedTokens(lifetime) }
  const missing = mark ? next.weighted - mark.weighted : 0
  if (!mark || missing <= 0) return { mark: next, damage: 0, tokens: 0 }
  return { mark: next, damage: missing, tokens: Math.max(0, next.tokens - mark.tokens) }
}

// ───────── Talents ─────────

export const BRANCHES = ["swarm", "legion", "lone", "marathon", "phoenix", "scholar", "thrift", "artisan"] as const
export type Branch = (typeof BRANCHES)[number]
export type Talents = Record<Branch, number>
export const MAX_RANK = 5

export const emptyTalents = (): Talents => ({
  swarm: 0,
  legion: 0,
  lone: 0,
  marathon: 0,
  phoenix: 0,
  scholar: 0,
  thrift: 0,
  artisan: 0,
})

/** One talent point every five floors cleared, one at each biome's midway champion and one at its boss: 20 when the
 * last biome falls, against 40 ranks in the tree, so only half of it ever fills and the tree stays a choice. The ultra
 * bosses give none. */
export const talentPoints = (floor: number) => Math.floor((Math.min(floor, LAST_BIOME_FLOOR + 1) - 1) / 5)
export const spentPoints = (t: Talents) => BRANCHES.reduce((sum, b) => sum + t[b], 0)

/** Per-rank strength of each branch, used both for damage and for the panel's descriptions (in percent). */
export const PER_RANK = {
  swarm: 6, // familiars deal +6 % per rank
  legion: 1.5, // +1.5 % per rank and per extra adventurer, up to 4 extras
  lone: 6, // +6 % per rank while one adventurer fights alone
  marathon: 6, // +6 % per rank once the session has run for 2 h, scaling up to it
  phoenix: 8, // +8 % per rank for 15 min after a compaction
  scholar: 8, // reasoning tokens +8 % per rank
  thrift: 6, // cache-read tokens +6 % per rank
  artisan: 0.5, // +0.5 % per rank and per successful tool in the current run, up to 12 tools
} satisfies Record<Branch, number>

export const MARATHON_FULL_MS = 2 * 60 * 60 * 1000
export const PHOENIX_MS = 15 * 60 * 1000
export const LEGION_MAX_EXTRA = 4
export const ARTISAN_MAX_TOOLS = 12

export type TokenKind = "output" | "reasoning" | "input" | "cacheRead" | "cacheWrite"

/** The situation one packet of tokens is dealt in. */
export interface Context {
  kind: TokenKind
  familiar: boolean
  adventurers: number
  sessionAgeMs: number
  phoenix: boolean
  tools: number
}

/** Damage per token for a packet, with the talents' bonuses. */
export function multiplier(t: Talents, c: Context) {
  const pct =
    (c.familiar ? t.swarm * PER_RANK.swarm : 0) +
    t.legion * PER_RANK.legion * Math.min(LEGION_MAX_EXTRA, Math.max(0, c.adventurers - 1)) +
    (c.adventurers === 1 ? t.lone * PER_RANK.lone : 0) +
    t.marathon * PER_RANK.marathon * Math.min(1, c.sessionAgeMs / MARATHON_FULL_MS) +
    (c.phoenix ? t.phoenix * PER_RANK.phoenix : 0) +
    (c.kind === "reasoning" ? t.scholar * PER_RANK.scholar : 0) +
    (c.kind === "cacheRead" ? t.thrift * PER_RANK.thrift : 0) +
    t.artisan * PER_RANK.artisan * Math.min(ARTISAN_MAX_TOOLS, c.tools)
  return 1 + pct / 100
}
