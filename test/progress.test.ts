import { describe, expect, it } from "vitest"
import { BIOMES, FINALE, biome } from "../src/game/art"
import {
  BRANCHES,
  CONTEXT_WEIGHT,
  DUNGEON_COST,
  FINAL_FLOOR,
  MAX_RANK,
  ROOM_SHARES,
  biomeOf,
  costBefore,
  emptyTalents,
  floorCost,
  multiplier,
  position,
  rawTokens,
  settle,
  spentPoints,
  talentPoints,
  weightedTokens,
  type Context,
  type Talents,
  type Usage,
} from "../src/game/progress"

const base: Context = { kind: "output", familiar: false, adventurers: 1, sessionAgeMs: 0, phoenix: false, tools: 0 }
const full = (rank = MAX_RANK): Talents => Object.fromEntries(BRANCHES.map((b) => [b, rank])) as Talents

describe("floors", () => {
  it("starts on floor 1, room 1", () => {
    expect(position(0)).toMatchObject({ floor: 1, room: 0, boss: false, dealt: 0 })
  })

  it("makes each floor cost more than the last", () => {
    for (let f = 1; f < 100; f++) expect(floorCost(f + 1)).toBeGreaterThan(floorCost(f))
  })

  it("lands exactly on the start of every floor, despite float rounding", () => {
    for (let f = 1; f <= FINAL_FLOOR; f++) {
      expect(position(costBefore(f)).floor).toBe(f)
      expect(position(costBefore(f + 1) - 1).floor).toBe(f)
    }
  })

  it("walks four monsters, then the boss, which holds the rest of the floor", () => {
    let start = costBefore(7)
    ROOM_SHARES.forEach((share, room) => {
      const p = position(start + 1)
      expect(p).toMatchObject({ floor: 7, room, boss: room === ROOM_SHARES.length - 1 })
      expect(p.hp).toBeCloseTo(floorCost(7) * share)
      start += floorCost(7) * share
    })
    expect(ROOM_SHARES.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })

  it("changes biome every ten floors", () => {
    expect([1, 10, 11, 20, 21, 60, 61].map(biomeOf)).toEqual([0, 0, 1, 1, 2, 5, 6])
  })

  it("keeps the comparison points the docs promise", () => {
    expect(costBefore(11) / 1e6).toBeCloseTo(4.8, 1)
    expect(costBefore(61) / 1e6).toBeCloseTo(910, -1)
    expect(costBefore(101) / 1e9).toBeCloseTo(41, 0)
    expect(DUNGEON_COST / 1e9).toBeCloseTo(67, 0)
  })

  it("gives each floor after the last biome to one ultra boss, alone", () => {
    for (let f = 101; f <= FINAL_FLOOR; f++) {
      expect(position(costBefore(f) + 1)).toMatchObject({ floor: f, boss: true, hp: floorCost(f), cleared: false })
      expect(position(costBefore(f + 1) - 1)).toMatchObject({ floor: f, cleared: false })
    }
  })

  it("ends when the last ultra boss falls, and stays there", () => {
    for (const d of [DUNGEON_COST, DUNGEON_COST * 10]) {
      const p = position(d)
      expect(p).toMatchObject({ floor: FINAL_FLOOR, boss: true, cleared: true })
      expect(p.dealt).toBe(p.hp)
    }
  })
})

describe("biomes", () => {
  it("has ten biomes for floors 1–100, then the finale with one ultra boss per floor", () => {
    expect(BIOMES).toHaveLength(10)
    expect(biome(biomeOf(100))).toBe(BIOMES[9])
    expect(biome(biomeOf(101))).toBe(FINALE)
    expect(biome(biomeOf(FINAL_FLOOR))).toBe(FINALE)
    expect(FINALE.ultras).toHaveLength(FINAL_FLOOR - 100)
  })
})

describe("talent points", () => {
  it("gives one point every five floors cleared, 20 at the end of the last biome and no more", () => {
    expect([1, 5, 6, 10, 11, 51, 100, 101, 105].map(talentPoints)).toEqual([0, 0, 1, 1, 2, 10, 19, 20, 20])
  })

  it("never fills more than half of the tree", () => {
    expect(talentPoints(FINAL_FLOOR) * 2).toBe(BRANCHES.length * MAX_RANK)
  })

  it("counts what a tree spends", () => {
    expect(spentPoints(emptyTalents())).toBe(0)
    expect(spentPoints(full())).toBe(BRANCHES.length * MAX_RANK)
  })
})

describe("multiplier", () => {
  it("is exactly 1 without talents, whatever happens", () => {
    const busy: Context = {
      kind: "reasoning",
      familiar: true,
      adventurers: 6,
      sessionAgeMs: 9e9,
      phoenix: true,
      tools: 50,
    }
    expect(multiplier(emptyTalents(), base)).toBe(1)
    expect(multiplier(emptyTalents(), busy)).toBe(1)
  })

  it("rewards each style only in its own situation", () => {
    const t = { ...emptyTalents(), lone: 5, swarm: 5 }
    expect(multiplier(t, { ...base, adventurers: 1 })).toBeCloseTo(1.3)
    expect(multiplier(t, { ...base, adventurers: 2 })).toBeCloseTo(1)
    expect(multiplier(t, { ...base, adventurers: 2, familiar: true })).toBeCloseTo(1.3)
  })

  it("caps the stacking bonuses", () => {
    const legion = { ...emptyTalents(), legion: 5 }
    expect(multiplier(legion, { ...base, adventurers: 50 })).toBe(multiplier(legion, { ...base, adventurers: 5 }))
    const artisan = { ...emptyTalents(), artisan: 5 }
    expect(multiplier(artisan, { ...base, tools: 500 })).toBe(multiplier(artisan, { ...base, tools: 12 }))
    const marathon = { ...emptyTalents(), marathon: 5 }
    expect(multiplier(marathon, { ...base, sessionAgeMs: 1e12 })).toBeCloseTo(1.3)
  })

  it("stays bounded: even a full tree with every condition met at once only triples damage", () => {
    const best: Context = {
      kind: "reasoning",
      familiar: true,
      adventurers: 1,
      sessionAgeMs: 9e9,
      phoenix: true,
      tools: 12,
    }
    expect(multiplier(full(), best)).toBeCloseTo(3)
  })
})

const usage = (output: number, context: number): Usage => ({
  input: context / 4,
  output,
  reasoning: 0,
  cache: { read: (context * 3) / 4, write: 0 },
})

describe("tokens", () => {
  it("counts generated tokens in full and context at its weight", () => {
    const u: Usage = { input: 1000, output: 200, reasoning: 100, cache: { read: 9000, write: 400 } }
    expect(rawTokens(u)).toBe(10_700)
    expect(weightedTokens(u)).toBeCloseTo(300 + 10_400 * CONTEXT_WEIGHT)
  })

  it("weighs a context the same whether the provider caches it or not", () => {
    const cached: Usage = { input: 500, output: 0, reasoning: 0, cache: { read: 9500, write: 0 } }
    const uncached: Usage = { input: 10_000, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }
    expect(weightedTokens(cached)).toBeCloseTo(weightedTokens(uncached))
  })
})

describe("settle", () => {
  it("starts the guild at zero, whatever its history", () => {
    const history = usage(16e6, 1.5e9)
    const first = settle(undefined, history)
    expect(first).toMatchObject({ damage: 0, tokens: 0 })
    expect(first.mark).toEqual({ tokens: rawTokens(history), weighted: weightedTokens(history) })
  })

  it("catches up on what happened since the mark, and only that", () => {
    const before = settle(undefined, usage(1000, 100_000)).mark
    const after = settle(before, usage(3000, 300_000))
    expect(after.damage).toBeCloseTo(2000 + 200_000 * CONTEXT_WEIGHT)
    expect(after.tokens).toBe(202_000)
    expect(settle(after.mark, usage(3000, 300_000))).toMatchObject({ damage: 0, tokens: 0 })
  })

  it("moves the mark down when sessions are deleted, so later work still counts", () => {
    const high = settle(undefined, usage(10_000, 1e6)).mark
    const low = settle(high, usage(100, 1000))
    expect(low.damage).toBe(0)
    expect(settle(low.mark, usage(600, 1000)).damage).toBeCloseTo(500)
  })
})
