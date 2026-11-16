// Drives a running OpenCode desktop app over CDP, for manual checks: a screenshot, and the page's recent console.
//
// Start the app with remote debugging (it is single-instance: close your usual window first), for example headless:
//   <path-to-app>/ai.opencode --no-sandbox --ozone-platform=headless --remote-debugging-port=9333
// Then:
//   node scripts/drive.mjs <name> [js-to-eval-in-page]      writes out/<name>.png
//   ACT=scripts/tour.mjs node scripts/drive.mjs tour         runs a scripted tour first (see tour.mjs)
import { chromium } from "playwright-core"
import { mkdirSync } from "node:fs"

const [name = "shot", script] = process.argv.slice(2)
const browser = await chromium.connectOverCDP("http://127.0.0.1:9333", { noDefaults: true })
const page = browser
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().startsWith("oc://renderer"))
if (!page) throw new Error("no renderer page")

const logs = []
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`))

// The headless window is 1x1; this instance is a throwaway test window, so emulating a size is fine.
if (page.viewportSize()?.width !== 1500) await page.setViewportSize({ width: 1500, height: 950 })

// ACT=path/to/actions.mjs runs its default export with the page before the screenshot.
if (process.env.ACT) await (await import(new URL(process.env.ACT, `file://${process.cwd()}/`).href)).default(page)

if (script) {
  const result = await page.evaluate(script)
  if (result !== undefined) console.log("eval:", typeof result === "string" ? result : JSON.stringify(result, null, 2))
}
await page.waitForTimeout(Number(process.env.WAIT ?? 1500))
mkdirSync("out", { recursive: true })
await page.screenshot({ path: `out/${name}.png` })
console.log(`screenshot: out/${name}.png`)
for (const line of logs.filter((l) => !/\[debug\]/.test(l)).slice(-40)) console.log(line)
await browser.close()
