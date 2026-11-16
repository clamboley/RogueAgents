import { defineConfig } from "vitest/config"

// The tests cover the pure game math, so they run in plain Node, without the GUI build preset of vite.config.ts.
export default defineConfig({
  test: { environment: "node", include: ["test/**/*.test.ts"] },
})
