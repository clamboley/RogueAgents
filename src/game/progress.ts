// The dungeon's math: where a cumulative amount of damage stands, and what talents add. Pure functions only.

/** Tokens the first floor costs, and how much more each next floor costs. */
export const FLOOR_BASE = 50_000
export const FLOOR_GROWTH = 1.15
/** Each floor: four monsters, then its boss, as shares of the floor's cost. */
export const ROOM_SHARES = [0.15, 0.15, 0.15, 0.15, 0.4] as const
export const BOSS_ROOM = ROOM_SHARES.length - 1
export const FLOORS_PER_BIOME = 10

export const floorCost = (floor: number) => FLOOR_BASE * FLOOR_GROWTH ** (floor - 1)
/** Damage needed to reach the start of `floor`. */
export const costBefore = (floor: number) => (FLOOR_BASE * (FLOOR_GROWTH ** (floor - 1) - 1)) / (FLOOR_GROWTH - 1)

export interface Position {
  floor: number
  room: number
  boss: boolean
  /** The current monster's health, in tokens. */
  hp: number
  /** Damage already dealt to it. */
  dealt: number
}

/** Where cumulative damage stands: the floor, the room in it, and the current monster's health. */
export function position(damage: number): Position {
  const d = Math.max(0, damage)
  // The closed form can land one floor off through rounding; step to the floor whose range holds `d`.
  let floor = Math.max(1, Math.floor(Math.log(1 + (d * (FLOOR_GROWTH - 1)) / FLOOR_BASE) / Math.log(FLOOR_GROWTH)) + 1)
  while (floor > 1 && costBefore(floor) > d) floor -= 1
  while (costBefore(floor + 1) <= d) floor += 1
  const cost = floorCost(floor)
  let within = d - costBefore(floor)
  for (let room = 0; room < ROOM_SHARES.length; room++) {
    const hp = cost * ROOM_SHARES[room]!
    if (within < hp || room === BOSS_ROOM)
      return { floor, room, boss: room === BOSS_ROOM, hp, dealt: Math.min(within, hp) }
    within -= hp
  }
  return { floor, room: BOSS_ROOM, boss: true, hp: cost * ROOM_SHARES[BOSS_ROOM], dealt: 0 }
}

/** The biome of a floor: 0 for floors 1–10, 1 for 11–20, and so on. */
export const biomeOf = (floor: number) => Math.floor((floor - 1) / FLOORS_PER_BIOME)

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

/** One talent point every two floors cleared: points stay scarce, so a tree is a choice. The 30th comes with the
 * Archon at the end of the first cycle (floor 60, ~1.3 billion tokens); the 40 that fill every branch, past 20 billion. */
export const talentPoints = (floor: number) => Math.floor((floor - 1) / 2)
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
