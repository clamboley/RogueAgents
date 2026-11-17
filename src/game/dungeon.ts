// The dungeon: saved progress, the party (one adventurer per active session, one familiar per subagent), how agent
// events turn into damage, and how it all draws. One instance per window; every open panel draws it.
import { createStore } from "solid-js/store"
import {
  BIOMES,
  HOVER,
  RANGED,
  biome,
  familiarFor,
  familiarPool,
  hash,
  lookFor,
  rng,
  type FamiliarLook,
  type Look,
  type MonsterDef,
} from "./art"
import { background, drawArt, preload, spriteSize } from "./gfx"
import {
  BRANCHES,
  MAX_RANK,
  PHOENIX_MS,
  biomeOf,
  emptyTalents,
  floorCost,
  costBefore,
  isUltra,
  LAST_BIOME_FLOOR,
  multiplier,
  position,
  rawTokens,
  settle,
  spentPoints,
  talentPoints,
  weightedTokens,
  WEIGHT,
  type Branch,
  type Talents,
  type TokenKind,
  type Usage,
} from "./progress"
import { drawSprite, drawText, shortNumber, textWidth, type SpriteName } from "./sprites"

export const W = 480
export const H = 300
/** Where the wall meets the floor; characters stand below it. */
const FLOOR_Y = 192
/** The front row's feet; rows behind stand higher up the floor. */
const GROUND = 258
const FIRE_X = 150
/** Where the monster stands. */
const MONSTER_X = 382
const MONSTER_Y = 262
/** How long a session stays in the dungeon after its last sign of activity. */
const ACTIVE_MS = 5 * 60 * 1000
const MAX_SHOWN = 10
const CHARS_PER_TOKEN = 4

/** What the dungeon saves between runs. */
export interface Saved {
  damage: number
  /** Tokens spent since the guild was founded, every kind at face value, as the share line counts them. */
  tokens: number
  talents: Talents
  /** Whether the server's lifetime totals have been read once; that first reading only marks where the guild starts. */
  synced: boolean
  /** The server's lifetime totals already accounted for, raw and weighted, so a later reading adds only what is new. */
  seenTokens: number
  seenWeighted: number
  /** When the guild was founded (the first reading of the server) and when it cleared the dungeon; 0 until then. */
  startedAt: number
  clearedAt: number
}

export const freshSave = (): Saved => ({
  damage: 0,
  tokens: 0,
  talents: emptyTalents(),
  synced: false,
  seenTokens: 0,
  seenWeighted: 0,
  startedAt: 0,
  clearedAt: 0,
})

export type Translate = (key: string, params?: Record<string, string | number>) => string
export type Status = "idle" | "connecting" | "live" | "offline" | "demo"
export type TownEvent = { readonly type: string; readonly data?: unknown }

export interface LifetimeStats {
  tokens: Usage
}

interface Unit {
  id: string
  /** Arrival order, which fixes the unit's place in the formation. */
  joined: number
  parent: string | undefined
  familiar: boolean
  look: Look
  pet: FamiliarLook
  createdAt: number
  lastActive: number
  executing: boolean
  tools: number
  phoenixUntil: number
  lastBurst: number
  estimate: { output: number; reasoning: number }
  charge: number | undefined
  queued: number
  queuedBig: number
  nextAttack: number
  attackStart: number
  x: number
  y: number
  phase: number
  emote: { icon: SpriteName; until: number } | undefined
  stumbleUntil: number
}

type Particle =
  | { kind: "number"; text: string; big: boolean; x: number; y: number; t0: number; dur: number; color: string }
  | {
      kind: "spark" | "bit" | "ember"
      x: number
      y: number
      vx: number
      vy: number
      color: string
      t0: number
      dur: number
    }

interface Projectile {
  x0: number
  y0: number
  t0: number
  dur: number
  color: string
  big: boolean
}

const TOOL_KINDS: Record<string, SpriteName> = {
  read: "lore",
  edit: "saw",
  patch: "saw",
  write: "bricks",
  shell: "hammer",
  bash: "hammer",
  execute: "hammer",
  grep: "magnifier",
  glob: "magnifier",
  webfetch: "bird",
  websearch: "telescope",
  subagent: "people",
  task: "people",
  question: "question",
  skill: "book",
  todowrite: "todo",
  todo: "todo",
}
const toolIcon = (name: string): SpriteName => {
  const lower = name.toLowerCase()
  return TOOL_KINDS[lower] ?? TOOL_KINDS[lower.split(/[_.:-]/).pop() ?? ""] ?? "wrench"
}

export function createDungeon(options: {
  t: Translate
  saved: Saved
  save: (saved: Saved) => void
  /** Looks up a session the dungeon has not seen start: its parent and when it was created. */
  resolve: (sessionID: string) => Promise<{ parentID?: string; created?: number } | undefined>
}) {
  const t = options.t
  let real: Saved = structuredClone(options.saved)
  // A tree that spends more points than the guild has (after a change to how points come) is handed back to place again.
  if (spentPoints(real.talents) > talentPoints(position(real.damage).floor)) real = { ...real, talents: emptyTalents() }
  let state = real
  let demoRun = 0
  let joinSeq = 0
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  const units = new Map<string, Unit>()
  const resolving = new Set<string>()
  /** Each subagent's parent session, kept after its familiar leaves so it comes back as the same familiar. */
  const parents = new Map<string, string>()
  // Who sits by the fire while no session works: the last adventurers to leave, else one of the guild's own.
  let recent: Look[] = [lookFor(hash("guild")), lookFor(hash("guild-2"))]
  let particles: Particle[] = []
  let projectiles: Projectile[] = []
  let transition: { from: string; t0: number } | undefined
  let dying: { def: MonsterDef; scale: number; crown: boolean; filter: string; t0: number } | undefined
  preload()
  let lastRoomKey = ""
  let shake = 0

  const now = () => Date.now()
  /** The familiars the guild can summon on `floor` (by default, the current one). */
  const pool = (floor = position(state.damage).floor) =>
    familiarPool(biomeOf(floor), (species) => !!spriteSize(`${species}-idle`))
  const pos0 = position(state.damage)
  const [ui, setUi] = createStore({
    floor: pos0.floor,
    room: pos0.room,
    boss: pos0.boss,
    hp: pos0.hp,
    dealt: pos0.dealt,
    monster: "",
    biome: "",
    tokens: state.tokens,
    nextFloorIn: 0,
    points: talentPoints(pos0.floor),
    talents: { ...state.talents },
    resting: true,
    cleared: pos0.cleared,
    status: "idle" as Status,
    demo: false,
    banner: { floor: 0, at: 0, cleared: false, familiars: [] as string[] },
  })

  // ───────── Saving and the panel's view ─────────
  function persist() {
    if (state !== real) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => options.save(structuredClone(real)), 400)
  }

  function monsterOf(floor: number, room: number, boss: boolean) {
    const b = biome(biomeOf(floor))
    const r = rng(floor * 31 + room)
    const ultra = isUltra(floor)
    const bigBoss = boss && (ultra || floor % 10 === 0)
    const def = ultra
      ? (b.ultras?.[floor - LAST_BIOME_FLOOR - 1] ?? b.boss)
      : bigBoss
        ? b.boss
        : b.monsters[Math.floor(r() * b.monsters.length)]!
    const name = bigBoss
      ? t(`monster.${def.key}`)
      : boss
        ? t("monster.champion", { name: t(`monster.${def.key}`) })
        : t(`monster.${def.key}`)
    // Whole-number scales keep the pixels crisp: champions are twice the size; a biome boss has its own art at its
    // own size, or borrows a monster sprite at three times.
    return {
      def,
      name,
      scale: bigBoss ? (def.scale ?? 3) : boss ? 2 : 1,
      crown: boss && !bigBoss,
      biome: b,
      filter: b.filter,
    }
  }

  function refresh() {
    const p = position(state.damage)
    const mon = monsterOf(p.floor, p.room, p.boss)
    if (p.floor !== ui.floor && ui.floor) {
      // Entering a new biome announces the familiars it unlocks (not in the demo, which unlocks nothing).
      const fresh = state === real && biomeOf(p.floor) > biomeOf(ui.floor) ? pool(p.floor).fresh : []
      setUi("banner", { floor: p.floor, at: now(), cleared: false, familiars: fresh.map((s) => t(`species.${s}`)) })
    }
    if (p.cleared && !ui.cleared && ui.floor)
      setUi("banner", { floor: p.floor, at: now(), cleared: true, familiars: [] })
    if (p.cleared && state === real && !real.clearedAt) real.clearedAt = now()
    setUi({
      floor: p.floor,
      room: p.room,
      boss: p.boss,
      hp: p.hp,
      dealt: p.dealt,
      monster: mon.name,
      biome: t(`biome.${mon.biome.key}`),
      cleared: p.cleared,
      tokens: state.tokens,
      nextFloorIn: costBefore(p.floor + 1) - state.damage,
      points: talentPoints(p.floor),
      talents: { ...state.talents },
    })
  }

  // ───────── Talents ─────────
  function setTalent(branch: Branch, delta: 1 | -1) {
    const next = state.talents[branch] + delta
    if (next < 0 || next > MAX_RANK) return
    if (delta > 0 && spentPoints(state.talents) >= talentPoints(position(state.damage).floor)) return
    state.talents = { ...state.talents, [branch]: next }
    refresh()
    persist()
  }
  function resetTalents() {
    state.talents = emptyTalents()
    refresh()
    persist()
  }

  // ───────── Units ─────────
  const activeAdventurers = () => [...units.values()].filter((u) => !u.familiar && now() - u.lastActive < ACTIVE_MS)

  function unit(id: string): Unit {
    const known = units.get(id)
    if (known) return known
    const seed = hash(id)
    joinSeq += 1
    const u: Unit = {
      id,
      joined: joinSeq,
      parent: undefined,
      familiar: false,
      look: lookFor(seed),
      pet: familiarFor(seed, pool()),
      createdAt: now(),
      lastActive: now(),
      executing: false,
      tools: 0,
      phoenixUntil: 0,
      lastBurst: 0,
      estimate: { output: 0, reasoning: 0 },
      charge: undefined,
      queued: 0,
      queuedBig: 0,
      nextAttack: 0,
      attackStart: -1e9,
      x: -20,
      y: FLOOR_Y,
      phase: (seed % 100) / 10,
      emote: undefined,
      stumbleUntil: 0,
    }
    units.set(id, u)
    // A subagent that comes back after leaving is still its parent's familiar.
    const parent = parents.get(id)
    if (parent) {
      u.familiar = true
      u.parent = parent
      unit(parent)
    }
    if (!parent && !resolving.has(id) && !ui.demo) {
      resolving.add(id)
      void options.resolve(id).then((info) => {
        if (!info) return
        if (info.created) u.createdAt = info.created
        if (info.parentID) adopt(u, info.parentID)
      })
    }
    return u
  }

  function adopt(u: Unit, parent: string) {
    parents.set(u.id, parent)
    if (u.familiar) return
    u.familiar = true
    u.parent = parent
    unit(parent)
  }

  function counts() {
    const active = [...units.values()].filter((u) => now() - u.lastActive < ACTIVE_MS)
    const shown = shownUnits()
    // Once the dungeon is cleared, the guild rests by the fire for good.
    setUi({ resting: position(state.damage).cleared || !active.some((u) => u.executing) })
  }

  /** The units on screen: the most recently active adventurers, each with its familiars. */
  function shownUnits() {
    // Recent activity picks who is shown when there are too many; the order on screen is the order they arrived in,
    // so two sessions working at once never swap places.
    const adventurers = activeAdventurers()
      .sort((a, b) => b.lastActive - a.lastActive)
      .slice(0, MAX_SHOWN)
      .sort((a, b) => a.joined - b.joined)
    const shown: Unit[] = []
    for (const a of adventurers) {
      shown.push(a)
      for (const f of units.values())
        if (f.familiar && f.parent === a.id && now() - f.lastActive < ACTIVE_MS && shown.length < MAX_SHOWN + 4)
          shown.push(f)
    }
    return shown
  }

  // ───────── Damage ─────────
  function context(u: Unit, kind: TokenKind) {
    return {
      kind,
      familiar: u.familiar,
      adventurers: Math.max(1, activeAdventurers().length),
      sessionAgeMs: now() - u.createdAt,
      phoenix: u.phoenixUntil > now(),
      tools: u.tools,
    }
  }
  const queue = (u: Unit, kind: TokenKind, tokens: number, big = false) => {
    if (tokens <= 0) return
    const dmg = tokens * WEIGHT[kind] * multiplier(state.talents, context(u, kind))
    if (big) u.queuedBig += dmg
    if (!big) u.queued += dmg
  }

  /** Deals damage to the current monster; returns whether it fell. */
  function hit(amount: number, big: boolean, color: string) {
    const before = position(state.damage)
    state.damage += amount
    const after = position(state.damage)
    const target = monsterOf(before.floor, before.room, before.boss)
    const mx = MONSTER_X
    const my = MONSTER_Y - 30 * target.scale - (target.def.hover ?? 0) * target.scale
    particles.push({
      kind: "number",
      text: shortNumber(amount),
      big,
      x: mx + (Math.random() - 0.5) * 24,
      y: my - 18 - (big ? 12 : 0),
      t0: now(),
      dur: big ? 1600 : 1100,
      color: big ? "#ffd86b" : "#f3e6cf",
    })
    for (let i = 0; i < (big ? 18 : 6); i++)
      particles.push({
        kind: "spark",
        x: mx - 8,
        y: my,
        vx: (Math.random() - 0.5) * 70,
        vy: -20 - Math.random() * 50,
        color,
        t0: now(),
        dur: 500,
      })
    if (big) shake = now() + 250
    flashUntil = now() + 110
    const fell = after.floor !== before.floor || after.room !== before.room
    if (fell) {
      const old = target
      dying = { def: old.def, scale: old.scale, crown: old.crown, filter: old.filter, t0: now() }
      for (let i = 0; i < 28; i++)
        particles.push({
          kind: "bit",
          x: mx,
          y: my,
          vx: (Math.random() - 0.5) * 100,
          vy: -30 - Math.random() * 60,
          color: i % 2 ? "#d8d0c0" : old.biome.light,
          t0: now(),
          dur: 900,
        })
    }
    refresh()
    persist()
    return fell
  }
  let flashUntil = 0

  // ───────── Agent events ─────────
  /** An agent event. The demo's own events come from `demo`; real ones wait while it plays, so they stay out of it. */
  function onEvent(e: TownEvent, source: "server" | "demo" = "server") {
    if (ui.demo !== (source === "demo")) return
    const d = (e.data ?? {}) as Record<string, unknown>
    const id = typeof d.sessionID === "string" ? d.sessionID : undefined
    if (!id) return
    if (e.type === "session.deleted") {
      units.delete(id)
      counts()
      return
    }
    const u = unit(id)
    u.lastActive = now()
    // A session waits without a word while its subagent works: the familiar's activity keeps its adventurer around.
    const owner = u.familiar && u.parent ? units.get(u.parent) : undefined
    if (owner) owner.lastActive = now()
    // Any sign of work means the session runs, even when its start happened before the app was open.
    if (e.type !== "session.created" && !/^session\.execution\.(succeeded|failed|interrupted)$/.test(e.type))
      u.executing = true
    switch (e.type) {
      case "session.created":
        if (typeof d.parentID === "string") adopt(u, d.parentID)
        break
      case "session.execution.started":
        u.executing = true
        u.tools = 0
        break
      case "session.step.started":
        u.charge = now()
        break
      // Tool input is model output too: a file the agent writes streams through it, sometimes for minutes.
      case "session.text.delta":
      case "session.tool.input.delta":
      case "session.reasoning.delta": {
        const kind = e.type === "session.reasoning.delta" ? "reasoning" : "output"
        const tokens = (typeof d.delta === "string" ? d.delta.length : 0) / CHARS_PER_TOKEN
        u.estimate[kind] += tokens
        queue(u, kind, tokens)
        if (kind === "reasoning" && !u.emote) u.emote = { icon: "thought", until: now() + 1200 }
        break
      }
      case "session.tool.input.started":
        u.emote = { icon: toolIcon(typeof d.name === "string" ? d.name : ""), until: now() + 2500 }
        break
      case "session.tool.success": {
        const exit = (d.metadata as Record<string, unknown> | undefined)?.exit
        if (typeof exit === "number" && exit !== 0) u.stumbleUntil = now() + 900
        if (!(typeof exit === "number" && exit !== 0)) u.tools += 1
        break
      }
      case "session.tool.failed":
        u.stumbleUntil = now() + 900
        u.emote = { icon: "rain", until: now() + 1800 }
        break
      case "session.step.ended": {
        const tk = (d.tokens ?? {}) as {
          input?: number
          output?: number
          reasoning?: number
          cache?: { read?: number; write?: number }
        }
        const output = tk.output ?? 0
        const reasoning = tk.reasoning ?? 0
        queue(u, "output", output - u.estimate.output)
        queue(u, "reasoning", reasoning - u.estimate.reasoning)
        // What only the step's end reveals: the context the model read. It lands as the charged attack.
        queue(u, "input", tk.input ?? 0, true)
        queue(u, "cacheRead", tk.cache?.read ?? 0, true)
        queue(u, "cacheWrite", tk.cache?.write ?? 0, true)
        u.estimate = { output: 0, reasoning: 0 }
        u.charge = undefined
        const step: Usage = {
          input: tk.input ?? 0,
          output,
          reasoning,
          cache: { read: tk.cache?.read ?? 0, write: tk.cache?.write ?? 0 },
        }
        state.tokens += rawTokens(step)
        state.seenTokens += rawTokens(step)
        state.seenWeighted += weightedTokens(step)
        break
      }
      case "session.compaction.ended": {
        u.phoenixUntil = now() + PHOENIX_MS
        const rank = state.talents.phoenix
        if (rank > 0 && now() - u.lastBurst > 10 * 60 * 1000) {
          u.lastBurst = now()
          u.queuedBig += floorCost(position(state.damage).floor) * 0.01 * rank
          for (let i = 0; i < 30; i++)
            particles.push({
              kind: "ember",
              x: u.x,
              y: u.y - 10,
              vx: (Math.random() - 0.5) * 50,
              vy: -20 - Math.random() * 40,
              color: "#ff8a3d",
              t0: now(),
              dur: 1200,
            })
        }
        u.emote = { icon: "broom", until: now() + 2500 }
        break
      }
      case "session.execution.succeeded":
      case "session.execution.failed":
      case "session.execution.interrupted":
        u.executing = false
        u.charge = undefined
        break
    }
    counts()
    persist()
  }

  /**
   * Sessions already running when the dungeon connects: their adventurers and familiars join at once, instead of
   * waiting for their next event. Parents come first, so each familiar finds its adventurer.
   */
  function seedRunning(sessions: { id: string; parentID?: string; created: number }[]) {
    if (ui.demo) return
    for (const s of [...sessions].sort((a, b) => Number(!!a.parentID) - Number(!!b.parentID))) {
      resolving.add(s.id)
      const u = unit(s.id)
      u.createdAt = s.created
      u.executing = true
      u.lastActive = now()
      if (s.parentID) adopt(u, s.parentID)
    }
    counts()
  }

  /** Lifetime totals from the server: the first reading marks where the guild starts; later ones catch up on what
   * the live events missed, such as work done while the app was closed. */
  function applyStats(s: LifetimeStats) {
    if (state !== real) return
    const seen = real.synced ? { tokens: real.seenTokens, weighted: real.seenWeighted } : undefined
    const { mark, damage, tokens } = settle(seen, s.tokens)
    if (!real.synced) real.startedAt = now()
    real.damage += damage
    real.tokens += tokens
    real.seenTokens = mark.tokens
    real.seenWeighted = mark.weighted
    real.synced = true
    refresh()
    persist()
  }

  // ───────── Simulation ─────────
  /** Advances the animation; `visible` is false when no panel shows the dungeon, so hits land at once. */
  function update(visible: boolean) {
    const at = now()
    const shown = new Set(shownUnits())
    for (const u of units.values()) {
      if (!u.familiar && at - u.lastActive > ACTIVE_MS) {
        recent = [u.look, ...recent.filter((l) => l !== u.look)].slice(0, 3)
        units.delete(u.id)
        for (const f of units.values()) if (f.parent === u.id) units.delete(f.id)
        counts()
        persist()
        continue
      }
      if (u.familiar && at - u.lastActive > ACTIVE_MS) {
        units.delete(u.id)
        continue
      }
      // Attacks: everything queued since the last swing lands together, on a steady rhythm.
      const pending = u.queued + u.queuedBig
      if (pending <= 0 || at < u.nextAttack) continue
      // A cleared dungeon has no one left to strike: the tokens still count, the blows go nowhere.
      if (ui.cleared) {
        u.queued = 0
        u.queuedBig = 0
        continue
      }
      const big = u.queuedBig > 0
      const amount = pending
      u.queued = 0
      u.queuedBig = 0
      u.nextAttack = at + 650 + Math.random() * 250
      if (!visible || !shown.has(u)) {
        hit(amount, big, "#ffd86b")
        continue
      }
      u.attackStart = at
      const ranged = !u.familiar && RANGED.includes(u.look.cls)
      const delay = ranged || u.familiar ? 380 : 180
      if (ranged || u.familiar)
        projectiles.push({
          x0: u.x + 14,
          y0: u.y - (u.familiar ? 16 : 30),
          t0: at,
          dur: delay,
          color: u.familiar ? u.pet.accent : u.look.cls === "archer" ? "#e8e2d0" : u.look.accent,
          big,
        })
      setTimeout(() => hit(amount, big, u.familiar ? u.pet.accent : u.look.accent), delay)
    }
    if (!visible) return
    for (const [u, target] of formation(shownUnits())) {
      u.x += (target.x - u.x) * 0.08
      u.y += (target.y - u.y) * 0.2
    }
    // Room changes scroll the background.
    const p = position(state.damage)
    const key = roomKey(p.floor, p.room)
    if (lastRoomKey && key !== lastRoomKey && !transition) transition = { from: lastRoomKey, t0: at }
    if (transition && at - transition.t0 > 1400) transition = undefined
    if (!transition) lastRoomKey = key
    particles = particles.filter((q) => at - q.t0 < q.dur)
    projectiles = projectiles.filter((q) => at - q.t0 < q.dur)
    if (dying && at - dying.t0 > 700) dying = undefined
  }

  /**
   * Where each shown unit stands. Each adventurer and its familiars form one block: the adventurer in front, its
   * familiars behind in pairs (one nearer row, one farther). Blocks line up without overlapping: towards the monster
   * while fighting, on both sides of the fire while resting. When the blocks do not fit, all spacing shrinks evenly.
   */
  /** Where the current monster stands and how wide it is: a wide boss slides left just enough to stay in frame. */
  function monsterBox() {
    const p = position(state.damage)
    const mon = monsterOf(p.floor, p.room, p.boss)
    const width = (spriteSize(mon.def.sprite)?.w ?? 0) * mon.scale
    const x = Math.min(MONSTER_X, W - width / 2 - 4)
    return { x, left: x - width / 2 }
  }

  function formation(list: Unit[]) {
    const targets = new Map<Unit, { x: number; y: number }>()
    const ADVENTURER = 46
    const FAMILIAR = 20
    const GAP = 12
    const groups = list
      .filter((u) => !u.familiar)
      .map((a) => {
        const pets = list.filter((f) => f.familiar && f.parent === a.id)
        return { a, pets, width: ADVENTURER + (pets.length ? 10 + Math.ceil(pets.length / 2) * FAMILIAR : 0) }
      })
    // Familiars whose adventurer is not shown stay near the front.
    for (const f of list)
      if (f.familiar && !groups.some((g) => g.a.id === f.parent)) targets.set(f, { x: 260, y: GROUND })

    // Lays blocks out from `start`, going `dir` (-1 left, 1 right), within `room` pixels.
    const lay = (blocks: typeof groups, start: number, dir: -1 | 1, room: number, rows: number) => {
      // Staggered rows overlap a little horizontally, so they take less room than side by side.
      const total = blocks.reduce((sum, g) => sum + g.width + GAP, 0) * (rows > 1 ? 0.7 : 1)
      const k = Math.min(1, room / Math.max(1, total))
      let cursor = start
      blocks.forEach((g, i) => {
        // Two depth rows on the floor: the farther one stands higher up and a little to the side.
        const y = GROUND + (rows > 1 ? (i % 2 ? -22 : 0) : 0) + (ui.resting ? 6 : 0)
        const ax = cursor + dir * (ADVENTURER / 2) * k
        targets.set(g.a, { x: ax, y })
        g.pets.forEach((f, n) => {
          const col = Math.floor(n / 2)
          targets.set(f, { x: ax + dir * (32 + col * FAMILIAR) * k, y: y + (n % 2 ? -8 : 6) })
        })
        cursor += dir * (g.width + GAP) * k * (rows > 1 ? 0.7 : 1)
      })
    }

    // The front line stops short of the monster, so a wide boss never stands on top of the party.
    const front = Math.min(318, monsterBox().left - 8)
    if (!ui.resting) lay(groups, front, -1, front - 18, 2)
    if (ui.resting) {
      // Alternate sides around the fire; each side faces the flames, its familiars on the far side.
      lay(
        groups.filter((_, i) => i % 2 === 0),
        FIRE_X - 22,
        -1,
        FIRE_X - 24,
        1,
      )
      lay(
        groups.filter((_, i) => i % 2 === 1),
        FIRE_X + 22,
        1,
        MONSTER_X - 60 - FIRE_X,
        1,
      )
    }
    return targets
  }

  const roomKey = (floor: number, room: number) => `${floor}:${room}`
  /** The background of a room: its biome's art, the room picked by its key. */
  function room(key: string) {
    const b = biome(biomeOf(Number(key.split(":")[0])))
    return background(b.art, hash(key), b.filter)
  }

  // ───────── Drawing ─────────
  function draw(c: CanvasRenderingContext2D, scale: number) {
    const at = now()
    const time = at / 1000
    const p = position(state.damage)
    const mon = monsterOf(p.floor, p.room, p.boss)
    const k = transition ? Math.min(1, (at - transition.t0) / 1400) : 1
    const ease = 1 - (1 - k) ** 3
    const offset = transition ? Math.round((1 - ease) * W) : 0
    const sx = shake > at ? Math.round((Math.random() - 0.5) * 4) : 0
    c.setTransform(scale, 0, 0, scale, sx * scale, 0)
    c.imageSmoothingEnabled = false

    // The room, and the one it slides away from; torches flicker over the painted flames.
    const rooms = transition
      ? [
          { r: room(transition.from), x: offset - W },
          { r: room(roomKey(p.floor, p.room)), x: offset },
        ]
      : [{ r: room(roomKey(p.floor, p.room)), x: 0 }]
    c.fillStyle = "#0b0a0e"
    c.fillRect(0, 0, W, H)
    for (const { r, x } of rooms) {
      if (r.canvas) c.drawImage(r.canvas, x, 0)
      for (const [tx, ty] of r.torches) torchGlow(c, tx + x, ty, time, mon.biome.light)
    }

    if (ui.resting) campfire(c, FIRE_X, GROUND + 4, time)
    if (!shownUnits().length)
      recent.forEach((look, i) => {
        const x = [FIRE_X - 34, FIRE_X + 34, FIRE_X - 6][i]!
        drawArt(c, `${look.cls}-sit`, x, GROUND + [4, 4, 22][i]!, { cloth: look.cloth, flip: x > FIRE_X })
      })

    // The monster, sliding in with its room; fliers hover and bob.
    const monsterAt = (def: MonsterDef, scale: number) =>
      MONSTER_Y - (def.hover ? (def.hover + Math.sin(time * 2.4) * 3) * scale : Math.round(Math.sin(time * 2) * 0.6))
    if (dying) {
      const dk = (at - dying.t0) / 700
      drawArt(c, dying.def.sprite, MONSTER_X, monsterAt(dying.def, dying.scale) + dk * 8, {
        scale: dying.scale,
        flash: dk < 0.3,
        filter: dying.filter,
        alpha: 1 - dk,
      })
    }
    if (!ui.cleared && (!dying || transition)) {
      const y = monsterAt(mon.def, mon.scale)
      // A wide boss slides left just enough to stay inside the frame.
      const mx = monsterBox().x
      const ring = orbiting(mon.def, mx + offset, y, time)
      if (ring.length) aura(c, mx + offset, y, mon.def, time, mon.biome.light)
      for (const o of ring) if (o.behind) drawArt(c, o.sprite, o.x, o.y, { alpha: 0.8 })
      const height = drawArt(c, mon.def.sprite, mx + offset, y, { scale: mon.scale, filter: mon.filter })
      for (const o of ring) if (!o.behind) drawArt(c, o.sprite, o.x, o.y)
      // A hit veils the monster in white for a moment; it stays visible underneath, so a big boss never blinks out.
      if (flashUntil > at && !transition)
        drawArt(c, mon.def.sprite, mx + offset, y, { scale: mon.scale, flash: true, alpha: 0.5 })
      // The crown keeps its own pixel size above a champion, bobbing a little out of step with it.
      if (mon.crown && height)
        drawArt(c, "crown", mx + offset, y - height - 2 + Math.round(Math.sin(time * 2 + 1) * 1.2))
    }

    // The party: idle, attacking or sitting by the fire, cloth in their own colours.
    const list = shownUnits().sort((a, b) => a.y - b.y)
    for (const u of list) {
      const attack = (at - u.attackStart) / 350
      const attacking = attack >= 0 && attack <= 1
      const sitting = ui.resting && !transition
      // By the fire, those on its right turn to face it.
      const flip = sitting && u.x > FIRE_X
      if (u.familiar) {
        const hover = HOVER[u.pet.species]
        const lift = hover ? hover + Math.round(Math.sin(time * 3 + u.phase) * 2) : 0
        const hop = attacking ? Math.round(Math.sin(attack * Math.PI) * 6) : 0
        drawArt(
          c,
          `${u.pet.species}-${attacking && attack > 0.1 && attack < 0.8 ? "attack" : "idle"}`,
          u.x + hop,
          u.y - lift,
          { flip },
        )
        continue
      }
      const melee = !RANGED.includes(u.look.cls)
      const lunge = attacking && melee ? Math.round(Math.sin(attack * Math.PI) * 10) : 0
      const walking = !!transition || Math.abs(u.x - Math.round(u.x)) > 0.3
      const bob = sitting
        ? 0
        : walking
          ? Math.floor(time * 8 + u.phase) % 2
          : Math.sin(time * 2 + u.phase) > 0.7
            ? 1
            : 0
      const stumble = u.stumbleUntil > at ? Math.round(Math.sin(at / 30) * 2) : 0
      const pose = sitting ? "sit" : attacking && attack > 0.15 && attack < 0.75 ? "attack" : "idle"
      drawArt(c, `${u.look.cls}-${pose}`, u.x + lunge + stumble, u.y - bob, { cloth: u.look.cloth, flip })
      if (u.charge !== undefined) chargeBar(c, u, at)
    }

    // Projectiles, sparks and damage numbers.
    const hitY = MONSTER_Y - 30 * mon.scale - (mon.def.hover ?? 0) * mon.scale
    for (const q of projectiles) {
      const f = (at - q.t0) / q.dur
      const x = q.x0 + (MONSTER_X - 14 - q.x0) * f
      const y = q.y0 + (hitY - q.y0) * f - Math.sin(f * Math.PI) * 14
      c.fillStyle = q.color
      c.fillRect(Math.round(x), Math.round(y), q.big ? 6 : 4, q.big ? 4 : 2)
    }
    for (const q of particles) {
      const f = (at - q.t0) / q.dur
      if (q.kind === "number") {
        c.globalAlpha = 1 - Math.max(0, f - 0.6) / 0.4
        const size = q.big ? 3 : 2
        c.save()
        c.translate(Math.round(q.x - (textWidth(q.text) * size) / 2), Math.round(q.y - f * 22))
        c.scale(size, size)
        drawText(c, q.text, 0, 0, q.color)
        c.restore()
        c.globalAlpha = 1
        continue
      }
      const dt = (at - q.t0) / 1000
      c.globalAlpha = 1 - f
      c.fillStyle = q.color
      const s = q.kind === "bit" ? 3 : 2
      c.fillRect(Math.round(q.x + q.vx * dt), Math.round(q.y + q.vy * dt + 80 * dt * dt), s, s)
      c.globalAlpha = 1
    }
    for (const u of list) if (u.emote && u.emote.until > at) bubble(c, u)
  }

  /** Where the pieces circling a monster are: a slow tilted ring around its middle, each piece bobbing on its own. */
  function orbiting(def: MonsterDef, x: number, y: number, time: number) {
    const size = spriteSize(def.sprite)
    if (!def.orbit || !size) return []
    const n = def.orbit.length
    return def.orbit.map((sprite, i) => {
      const a = time * 0.35 + (i / n) * Math.PI * 2
      return {
        sprite,
        x: x + Math.cos(a) * size.w * 0.5,
        y: y - size.h * 0.4 + Math.sin(a) * size.h * 0.14 + Math.round(Math.sin(time * 1.6 + i * 1.3) * 2),
        behind: Math.sin(a) < 0,
      }
    })
  }

  /** A slow, breathing light behind a monster of power. */
  function aura(c: CanvasRenderingContext2D, x: number, y: number, def: MonsterDef, time: number, light: string) {
    const size = spriteSize(def.sprite)
    if (!size) return
    const cy = y - size.h * 0.55
    const r = size.h * (0.75 + Math.sin(time * 1.2) * 0.06)
    const glow = c.createRadialGradient(x, cy, 4, x, cy, r)
    glow.addColorStop(0, `${light}${Math.round(70 + Math.sin(time * 1.2) * 20).toString(16)}`)
    glow.addColorStop(1, `${light}00`)
    c.globalCompositeOperation = "lighter"
    c.fillStyle = glow
    c.fillRect(x - r, cy - r, r * 2, r * 2)
    c.globalCompositeOperation = "source-over"
  }

  /** A soft, flickering glow over a painted torch flame. */
  function torchGlow(c: CanvasRenderingContext2D, x: number, y: number, time: number, light: string) {
    const flicker = 0.75 + Math.sin(time * 9 + x) * 0.12 + Math.sin(time * 23 + x * 0.3) * 0.08
    const glow = c.createRadialGradient(x, y, 2, x, y, 46)
    glow.addColorStop(
      0,
      `${light}${Math.round(flicker * 90)
        .toString(16)
        .padStart(2, "0")}`,
    )
    glow.addColorStop(1, `${light}00`)
    c.globalCompositeOperation = "lighter"
    c.fillStyle = glow
    c.fillRect(x - 46, y - 46, 92, 92)
    c.globalCompositeOperation = "source-over"
  }

  function chargeBar(c: CanvasRenderingContext2D, u: Unit, at: number) {
    const f = 1 - Math.exp(-(at - (u.charge ?? at)) / 9000)
    const x = Math.round(u.x) - 10
    const y = Math.round(u.y) - 58
    c.fillStyle = "#1d1a22"
    c.fillRect(x - 1, y - 1, 22, 5)
    c.fillStyle = f > 0.9 && Math.floor(at / 150) % 2 ? "#ffffff" : "#ffd86b"
    c.fillRect(x, y, Math.max(1, Math.round(20 * f)), 3)
  }

  function bubble(c: CanvasRenderingContext2D, u: Unit) {
    // An 8×8 icon at 2×, in a speech bubble above the head.
    const x = Math.round(u.x)
    const y = Math.round(u.y) - (u.familiar ? 34 : 62)
    c.fillStyle = "#2a1d14"
    c.fillRect(x - 11, y - 21, 22, 22)
    c.fillStyle = "#f3e6cf"
    c.fillRect(x - 10, y - 20, 20, 20)
    c.fillStyle = "#2a1d14"
    c.fillRect(x - 2, y + 1, 4, 2)
    c.save()
    c.translate(x - 8, y - 18)
    c.scale(2, 2)
    drawSprite(c, u.emote!.icon, 0, 0)
    c.restore()
  }

  /** The painted campfire, its four frames cycling, under a breathing warm glow. */
  function campfire(c: CanvasRenderingContext2D, x: number, y: number, time: number) {
    drawArt(c, `campfire-${Math.floor(time * 7) % 4}`, x, y)
    const flicker = 0.34 + Math.sin(time * 7.3) * 0.04 + Math.sin(time * 17) * 0.03
    const glow = c.createRadialGradient(x, y - 18, 4, x, y - 18, 96)
    glow.addColorStop(0, `rgba(255,170,80,${flicker.toFixed(3)})`)
    glow.addColorStop(1, "rgba(255,170,80,0)")
    c.globalCompositeOperation = "lighter"
    c.fillStyle = glow
    c.fillRect(x - 96, y - 114, 192, 192)
    c.globalCompositeOperation = "source-over"
    if (Math.random() < 0.06)
      particles.push({
        kind: "ember",
        x: x + (Math.random() - 0.5) * 8,
        y: y - 30,
        vx: (Math.random() - 0.5) * 10,
        vy: -20 - Math.random() * 12,
        color: "#ffb347",
        t0: now(),
        dur: 1500,
      })
  }

  // ───────── Demo ─────────
  async function simulate(run: number) {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const rnd = (n: number) => Math.floor(Math.random() * n)
    const emit = (type: string, data: Record<string, unknown>) => run === demoRun && onEvent({ type, data }, "demo")
    const party = Array.from({ length: 3 }, (_, i) => `demo-${run}-${i}-${rnd(1e6)}`)
    const agent = async (id: string, steps: number) => {
      emit("session.execution.started", { sessionID: id })
      for (let s = 0; s < steps && run === demoRun; s++) {
        emit("session.step.started", { sessionID: id })
        for (let k = 0; k < 10 && run === demoRun; k++) {
          emit(k < 4 && s % 2 ? "session.reasoning.delta" : "session.text.delta", {
            sessionID: id,
            delta: "x".repeat(200 + rnd(1600)),
          })
          await sleep(300 + rnd(300))
        }
        if (Math.random() < 0.6) {
          emit("session.tool.input.started", {
            sessionID: id,
            name: ["read", "edit", "shell", "grep", "webfetch"][rnd(5)],
          })
          await sleep(900)
          emit(Math.random() < 0.85 ? "session.tool.success" : "session.tool.failed", { sessionID: id })
        }
        emit("session.step.ended", {
          sessionID: id,
          tokens: {
            input: 8000 + rnd(30000),
            output: 0,
            reasoning: 0,
            cache: { read: 40000 + rnd(120000), write: rnd(6000) },
          },
        })
      }
      emit("session.execution.succeeded", { sessionID: id })
    }
    while (run === demoRun) {
      await Promise.all(
        party.map(async (id, i) => {
          await sleep(i * 1500)
          await agent(id, 2 + rnd(3))
          // Up to three subagents at once, the way a busy session fans out.
          await Promise.all(
            Array.from({ length: rnd(4) }, async () => {
              const sub = `${id}-sub-${rnd(1e6)}`
              emit("session.created", { sessionID: sub, parentID: id })
              await agent(sub, 2)
            }),
          )
        }),
      )
      await sleep(4000)
    }
  }

  function setDemo(on: boolean) {
    if (on === ui.demo) return
    demoRun += 1
    units.clear()
    particles = []
    projectiles = []
    transition = undefined
    lastRoomKey = ""
    if (on) {
      // The demo opens on the boss of a random biome that has its own art, then walks into the next one: a showcase
      // of what lies ahead.
      const showcase = BIOMES.filter((b) => b.art === b.key)
      const floor = (BIOMES.indexOf(showcase[Math.floor(Math.random() * showcase.length)]!) + 1) * 10
      state = { ...freshSave(), damage: costBefore(floor) + floorCost(floor) * 0.6 + 1000, tokens: costBefore(floor) }
      setUi({ demo: true, status: "demo" })
      void simulate(demoRun)
    }
    if (!on) {
      state = real
      setUi({ demo: false, status: "idle" })
    }
    refresh()
    counts()
  }

  function shareText() {
    const p = position(state.damage)
    const b = biome(biomeOf(p.floor))
    const top = BRANCHES.filter((br) => state.talents[br] > 0)
      .sort((a, b2) => state.talents[b2] - state.talents[a])
      .slice(0, 3)
      .map((br) => `${t(`branch.${br}`)} ${state.talents[br]}`)
    const days = Math.max(1, Math.round((state.clearedAt - state.startedAt) / 86_400_000))
    return [
      "Rogue Agents",
      p.cleared && state.startedAt && state.clearedAt
        ? t("share.cleared", { days })
        : p.cleared
          ? t("share.clearedPlain")
          : t("share.floor", { floor: p.floor, biome: t(`biome.${b.key}`) }),
      t("share.tokens", { tokens: formatTokens(state.tokens) }),
      ...(top.length ? [top.join(" / ")] : []),
    ].join(" · ")
  }

  refresh()
  counts()

  return {
    ui,
    update,
    draw,
    onEvent,
    seedRunning,
    applyStats,
    setTalent,
    resetTalents,
    setDemo,
    shareText,
    setStatus: (status: Status) => {
      if (!ui.demo) setUi("status", status)
    },
  }
}

export type Dungeon = ReturnType<typeof createDungeon>

export const formatTokens = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2)} G`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(1)} M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)} k`
        : String(Math.round(n))
