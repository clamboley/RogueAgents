import { Schema } from "effect"
import { onCleanup } from "solid-js"
import {
  Command,
  MenuItem,
  Panel,
  Plugin,
  Store,
  Style,
  createKeyed,
  type PanelTab,
  type ServerRef,
} from "@opencode/plugin/gui"
import { createDungeon, freshSave, type Dungeon } from "./game/dungeon"
import { spriteUrl } from "./game/sprites"
import en from "./i18n/en"
import fr from "./i18n/fr"
import { DungeonPanel, type View } from "./panel"
import cinzel from "./fonts/Cinzel-Variable.ttf"
import jersey from "./fonts/Jersey10-Regular.ttf"
import css from "./styles.css?inline"

/** Two fonts (SIL Open Font License, see src/fonts): Cinzel's carved capitals for titles, a sturdy pixel face for the text. */
const fonts = [
  `@font-face { font-family: "RogueAgents Title"; src: url(${cinzel}) format("truetype"); font-weight: 400 900; font-display: block; }`,
  `@font-face { font-family: "RogueAgents Text"; src: url(${jersey}) format("truetype"); font-display: block; }`,
].join("\n")

const N = Schema.Number

/** The saved guild. A field that fails to decode falls back to its initial value. */
const Guild = Schema.Struct({
  damage: N,
  tokens: N,
  talents: Schema.Struct({ swarm: N, legion: N, lone: N, marathon: N, phoenix: N, scholar: N, thrift: N, artisan: N }),
  synced: Schema.Boolean,
  seenTokens: N,
  seenWeighted: N,
  startedAt: N,
  clearedAt: N,
})

// Server events the dungeon reacts to; everything else stays off the wire.
const EVENTS = [
  "session.created",
  "session.deleted",
  "session.execution.started",
  "session.execution.succeeded",
  "session.execution.failed",
  "session.execution.interrupted",
  "session.step.started",
  "session.step.ended",
  "session.reasoning.delta",
  "session.text.delta",
  "session.tool.input.started",
  "session.tool.input.delta",
  "session.tool.success",
  "session.tool.failed",
  "session.compaction.ended",
] as const

export default Plugin.define({
  i18n: { en, fr },
  // `guild2`: saves from before the guild started on floor 1 (it used to import the whole history) are left behind.
  stores: { guild2: Store.global(Guild, freshSave()) },
  setup(ctx) {
    const stored = ctx.stores.guild2.value
    // The client of the app's own server while connected; sessions the dungeon has not seen start are looked up there.
    let client: ServerRef["client"] | undefined
    const dungeon = createDungeon({
      t: (key, params) => ctx.t(key, params),
      saved: {
        damage: stored.damage,
        tokens: stored.tokens,
        talents: { ...stored.talents },
        synced: stored.synced,
        seenTokens: stored.seenTokens,
        seenWeighted: stored.seenWeighted,
        startedAt: stored.startedAt,
        clearedAt: stored.clearedAt,
      },
      save: (saved) => void ctx.stores.guild2.set(saved),
      resolve: async (sessionID) => {
        const info = await client?.session.get({ sessionID }).catch(() => undefined)
        return info ? { parentID: info.parentID, created: info.time.created } : undefined
      },
    })

    ctx.add(Style, `${fonts}\n${css}`)
    startLoop(dungeon)
    connect(dungeon)

    const tab: PanelTab = {
      id: "dungeon",
      get title() {
        return ctx.t("title")
      },
      label: () => (
        <span class="ra-tab">
          <img src={spriteUrl("sword")} alt="" />
          {ctx.t("title")}
        </span>
      ),
    }
    ctx.add(Panel, {
      id: "dungeon",
      region: "side",
      list: (input) => (input.open.includes("dungeon") ? [tab] : []),
      render: () => (
        <DungeonPanel
          dungeon={dungeon}
          register={register}
          share={() => {
            void ctx.system
              .copy(dungeon.shareText())
              .then(() => ctx.toast.show({ title: ctx.t("share.done"), variant: "success" }))
          }}
        />
      ),
    })

    const open = () => {
      const session = ctx.sessions.current()
      if (session) ctx.layout.open(`${ctx.id}:dungeon`, session, { tab: "select" })
    }
    ctx.add(Command, () => ({
      id: "open",
      title: ctx.t("command.open"),
      description: ctx.t("command.description"),
      keywords: "dungeon game tokens pixel donjon jeu",
      enabled: !!ctx.sessions.current(),
      run: open,
    }))
    ctx.add(MenuItem, (): MenuItem => ({
      id: "open",
      menu: "session.panel",
      title: ctx.t("menu.open"),
      icon: "dot-grid",
      run: open,
    }))

    // ───────── Animation: one loop for every visible panel ─────────
    const views = new Set<View>()
    let frame = 0
    function register(view: View) {
      views.add(view)
      if (!frame) frame = requestAnimationFrame(tick)
      return () => views.delete(view)
    }
    function tick() {
      dungeon.update(true)
      views.forEach((view) => view.paint())
      frame = views.size ? requestAnimationFrame(tick) : 0
    }
    function startLoop(dungeon: Dungeon) {
      // Hits still land while no panel animates the dungeon.
      const second = setInterval(() => {
        if (!views.size) dungeon.update(false)
      }, 1000)
      onCleanup(() => {
        clearInterval(second)
        cancelAnimationFrame(frame)
      })
    }

    // ───────── The app's own server: live events and stats ─────────
    function builtin(): ServerRef | undefined {
      for (const id of ctx.servers.list()) {
        const server = ctx.servers.get(id)
        if (server?.builtin) return server
      }
      return undefined
    }
    function connect(dungeon: Dungeon) {
      // One run per client: a restarted or re-authenticated server brings a new client, and the old run ends with it.
      createKeyed(
        () => builtin()?.client,
        (next) => {
          const abort = new AbortController()
          client = next
          onCleanup(() => {
            abort.abort()
            if (client === next) client = undefined
          })
          void follow(next, abort.signal)
        },
        { otherwise: () => dungeon.setStatus("idle") },
      )
    }
    async function follow(client: ServerRef["client"], signal: AbortSignal) {
      let backoff = 1000
      let sync: ReturnType<typeof setTimeout> | undefined
      signal.addEventListener("abort", () => clearTimeout(sync))
      const stats = async () => {
        const life = await client.experimental.session
          .stats({ from: 0, tools: "none" }, { signal })
          .catch(() => undefined)
        if (life && !signal.aborted) dungeon.applyStats(life)
      }
      // A session runs while its last `busy` is newer than its last `idle`.
      const running = async () => {
        const list = await client.session.list({ limit: 50, order: "desc" }, { signal }).catch(() => undefined)
        if (!list || signal.aborted) return
        dungeon.seedRunning(
          list.data
            .filter((s) => s.time.busy !== undefined && (s.time.idle === undefined || s.time.busy > s.time.idle))
            .map((s) => ({ id: s.id, parentID: s.parentID, created: s.time.created })),
        )
      }
      while (!signal.aborted) {
        dungeon.setStatus("connecting")
        try {
          for await (const event of client.event.subscribe({ types: [...EVENTS], signal })) {
            if (event.type === "server.connected") {
              dungeon.setStatus("live")
              backoff = 1000
              void running()
              void stats()
              continue
            }
            dungeon.onEvent(event)
            // A finished run settles the server's totals; read them again so nothing is missed.
            if (event.type.startsWith("session.execution.") && event.type !== "session.execution.started") {
              clearTimeout(sync)
              sync = setTimeout(() => void stats(), 2000)
            }
          }
        } catch {
          // The stream failed; the status below says so and the loop retries.
        }
        if (signal.aborted) return
        dungeon.setStatus("offline")
        await new Promise((resolve) => setTimeout(resolve, backoff))
        backoff = Math.min(backoff * 2, 15000)
      }
    }
  },
})
