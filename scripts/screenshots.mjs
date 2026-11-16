// The README's screenshots, for scripts/drive.mjs: ACT=scripts/screenshots.mjs node scripts/drive.mjs screenshots
// Writes docs/screenshots/{fight,talents}.png from the demo, so nothing depends on your own progress.
export default async function (page) {
  page.setDefaultTimeout(5000)
  const stage = page.locator(".ra-stage")
  const shot = (name) => stage.screenshot({ path: `docs/screenshots/${name}.png` })
  await page.getByRole("button", { name: /^(Demo|Démo)$/ }).click()
  await page.waitForTimeout(7000)
  await shot("fight")
  await page.getByRole("button", { name: /^Talents$/ }).click()
  await page.waitForTimeout(400)
  for (const [talent, ranks] of [
    [4, 2],
    [0, 3],
  ]) {
    await page.locator(".ra-talent").nth(talent).click()
    for (let i = 0; i < ranks; i++) await page.getByRole("button", { name: /Add a point|Ajouter un point/ }).click()
  }
  await page.waitForTimeout(600)
  await shot("talents")
  await page.locator(".ra-menu-close").click()
  await page.getByRole("button", { name: /^(Stop demo|Arrêter la démo)$/ }).click()
}
