import { For, Show, createSignal, onCleanup } from "solid-js"
import { createKeyed, usePanel, usePlugin } from "@opencode/plugin/gui"
import { SPRITES } from "./assets/manifest"
import { H, W, formatTokens, type Dungeon } from "./game/dungeon"
import { BRANCHES, MAX_RANK, PER_RANK, spentPoints, type Branch } from "./game/progress"
import { spriteUrl, type SpriteName } from "./game/sprites"

/** A canvas the animation loop paints each frame while its panel is visible. */
export interface View {
  paint(): void
}

/** Fallback 8×8 icons, until the talent icon art exists. */
const BRANCH_ICONS: Record<Branch, SpriteName> = {
  swarm: "swarm",
  legion: "people",
  lone: "wolf",
  marathon: "hourglass",
  phoenix: "flame",
  scholar: "book",
  thrift: "coin",
  artisan: "hammer",
}
const branchIcon = (b: Branch) => SPRITES[`talent-${b}`]?.url ?? spriteUrl(BRANCH_ICONS[b])

/** The panel is the game screen and nothing else: the dungeon, fitted to the panel, with its HUD painted on top. */
export function DungeonPanel(props: { dungeon: Dungeon; register: (view: View) => () => void; share: () => void }) {
  const panel = usePanel()
  return (
    <div class="ra">
      <Stage dungeon={props.dungeon} register={props.register} visible={panel.visible} share={props.share} />
    </div>
  )
}

/** The canvas, rendered at a whole multiple of the world for crisp pixels, with the HUD and the talent menu over it.
 * The HUD is painted art (stone plaques, an iron bar, stone buttons) sized in cqi, so it scales with the world. */
function Stage(props: {
  dungeon: Dungeon
  register: (view: View) => () => void
  visible: () => boolean
  share: () => void
}) {
  const ctx = usePlugin()
  const d = props.dungeon
  const ui = d.ui
  const t = (key: string, params?: Record<string, string | number>) => ctx.t(key, params)
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>()
  const [menu, setMenu] = createSignal(false)

  // Paints into the canvas while the panel is visible; the loop stops when no panel shows the dungeon.
  createKeyed(
    () => props.visible() && canvas(),
    (el) => {
      const c = el.getContext("2d")
      if (!c) return
      let scale = 2
      const resize = () => {
        const shown = el.getBoundingClientRect().width * devicePixelRatio
        scale = Math.min(12, Math.max(2, Math.ceil((shown * 2) / W)))
        if (el.width !== W * scale) {
          el.width = W * scale
          el.height = H * scale
        }
      }
      const observer = new ResizeObserver(resize)
      observer.observe(el)
      resize()
      onCleanup(() => observer.disconnect())
      onCleanup(props.register({ paint: () => d.draw(c, scale) }))
    },
  )

  const left = () => Math.max(0, ui.hp - ui.dealt)
  const free = () => Math.max(0, ui.points - spentPoints(ui.talents))

  return (
    <div
      class="ra-stage"
      style={{ "--ra-plaque": `url(${art("hud-plaque")})`, "--ra-bar": `url(${art("hud-bar")})` }}
      onKeyDown={(e) => e.key === "Escape" && setMenu(false)}
    >
      <canvas ref={setCanvas} width={W * 2} height={H * 2} />

      {/* Where the guild stands, with the connection as a gem: the number colleagues compare. */}
      <div class="ra-plaque ra-where" title={t("hud.next", { tokens: formatTokens(Math.max(0, ui.nextFloorIn)) })}>
        <img
          class="ra-status-gem"
          data-status={ui.status}
          src={art(ui.status === "idle" ? "ui-socket" : "ui-gem")}
          alt={t(`status.${ui.status}`)}
          title={t(`status.${ui.status}`)}
        />
        <span class="ra-where-text">
          <strong>
            {t("hud.floor", { floor: ui.floor })} · {ui.boss ? t("hud.boss") : t("hud.room", { room: ui.room + 1 })}
          </strong>
          <span>{t("hud.tokens", { tokens: formatTokens(ui.tokens) })}</span>
        </span>
      </div>

      {/* The monster: its name on a plaque, its tokens left in an iron bar. */}
      <div class="ra-foe" data-boss={ui.boss || undefined}>
        <div class="ra-plaque ra-foe-name">
          <Show when={ui.boss}>
            <img class="ra-crown" src={art("crown")} alt="" />
          </Show>
          <span>{ui.monster}</span>
        </div>
        <div class="ra-bar">
          <span class="ra-bar-fill">
            <i style={{ width: `${(left() / ui.hp) * 100}%` }} />
          </span>
          <span class="ra-bar-text">{t("hud.hp", { left: formatTokens(left()), total: formatTokens(ui.hp) })}</span>
        </div>
      </div>

      {/* Talents is the button that matters; demo and share sit small beside it, one above the other. */}
      <div class="ra-actions">
        <span class="ra-talents-button">
          <ArtButton name="hud-talents" label={t("tab.talents")} onClick={() => setMenu(true)} />
          <Show when={free() > 0}>
            <span class="ra-medallion ra-badge" data-free style={{ "background-image": `url(${art("ui-medallion")})` }}>
              {free()}
            </span>
          </Show>
        </span>
        <span class="ra-small-buttons">
          <ArtButton
            name="hud-demo"
            label={ui.demo ? t("demo.off") : t("demo.on")}
            class={ui.demo ? "ra-on" : ""}
            onClick={() => d.setDemo(!ui.demo)}
          />
          <ArtButton name="hud-share" label={t("share")} onClick={props.share} />
        </span>
      </div>

      {/* Keyed on the floor change, so each new floor replays the banner. */}
      <Show when={ui.banner.at || undefined} keyed>
        <div class="ra-banner">
          <span class="ra-ribbon" style={{ "background-image": `url(${art("ui-banner")})` }}>
            {t("banner.floor", { floor: ui.banner.floor })}
          </span>
          <em>{ui.biome}</em>
        </div>
      </Show>
      <Show when={menu()}>
        <TalentMenu dungeon={d} close={() => setMenu(false)} />
      </Show>
    </div>
  )
}

/** A UI image from the art pass. */
const art = (name: string) => SPRITES[name]?.url ?? ""

/** A stone-and-gold button from the art pass, its symbol painted in. */
function ArtButton(props: { name: string; label: string; disabled?: boolean; class?: string; onClick: () => void }) {
  return (
    <button
      class={`ra-art-button ${props.class ?? ""}`}
      onClick={() => props.onClick()}
      disabled={props.disabled}
      aria-label={props.label}
      title={props.label}
    >
      <img src={art(props.name)} alt="" draggable={false} />
    </button>
  )
}

/** The guild's talents, over the dungeon: a stone frame with a banner on top, the eight branches, and a scroll that
 * describes the chosen one. Everything is painted art; the text is set in the two pixel fonts. */
function TalentMenu(props: { dungeon: Dungeon; close: () => void }) {
  const ctx = usePlugin()
  const ui = props.dungeon.ui
  const t = (key: string, params?: Record<string, string | number>) => ctx.t(key, params)
  const [chosen, setChosen] = createSignal<Branch>("swarm")
  const free = () => Math.max(0, ui.points - spentPoints(ui.talents))
  const rank = (b: Branch) => ui.talents[b]
  const effect = (b: Branch, r: number) =>
    t(`branch.${b}.effect`, { value: +(Math.max(1, r) * PER_RANK[b]).toFixed(1) })

  return (
    <div
      class="ra-menu"
      role="dialog"
      aria-label={t("talents.title")}
      style={{ "background-image": `url(${art("talent-menu")})` }}
    >
      <header class="ra-menu-head">
        <span
          class="ra-medallion"
          data-free={free() > 0 || undefined}
          style={{ "background-image": `url(${art("ui-medallion")})` }}
          title={t("talents.available", { free: free(), total: ui.points })}
        >
          {free()}
        </span>
        <h2 class="ra-ribbon" style={{ "background-image": `url(${art("ui-banner")})` }}>
          {t("talents.banner")}
        </h2>
        <ArtButton name="ui-close" label={t("talents.close")} class="ra-menu-close" onClick={props.close} />
      </header>
      <div class="ra-menu-grid">
        <For each={BRANCHES}>
          {(b) => (
            <button
              class="ra-talent"
              data-chosen={chosen() === b || undefined}
              data-active={rank(b) > 0 || undefined}
              aria-label={t(`branch.${b}`)}
              title={t(`branch.${b}`)}
              onClick={() => setChosen(b)}
              onDblClick={() => props.dungeon.setTalent(b, 1)}
            >
              <img src={branchIcon(b)} alt="" draggable={false} />
              <span class="ra-gems">
                <For each={Array.from({ length: MAX_RANK }, (_, i) => i)}>
                  {(i) => <img src={art(i < rank(b) ? "ui-gem" : "ui-socket")} alt="" draggable={false} />}
                </For>
              </span>
            </button>
          )}
        </For>
      </div>
      <footer class="ra-scroll" style={{ "background-image": `url(${art("ui-scroll")})` }}>
        <div class="ra-scroll-text">
          <div class="ra-scroll-title">
            <strong>{t(`branch.${chosen()}`)}</strong>
            <em>{t(`branch.${chosen()}.style`)}</em>
          </div>
          <span data-preview={rank(chosen()) === 0 || undefined}>
            {rank(chosen()) > 0 ? t("talents.rank", { rank: rank(chosen()), max: MAX_RANK }) : t("talents.first")}{" "}
            {effect(chosen(), rank(chosen()))}
          </span>
        </div>
        <div class="ra-scroll-buttons">
          <ArtButton
            name="ui-reset"
            label={t("talents.reset")}
            disabled={spentPoints(ui.talents) === 0}
            onClick={() => props.dungeon.resetTalents()}
          />
          <ArtButton
            name="ui-minus"
            label={t("talents.remove")}
            disabled={rank(chosen()) <= 0}
            onClick={() => props.dungeon.setTalent(chosen(), -1)}
          />
          <ArtButton
            name="ui-plus"
            label={t("talents.add")}
            disabled={rank(chosen()) >= MAX_RANK || free() <= 0}
            onClick={() => props.dungeon.setTalent(chosen(), 1)}
          />
        </div>
      </footer>
    </div>
  )
}
