import { defineConfig } from "vite"
import { gui } from "@opencode/plugin/gui/vite"

// Writes dist/gui-experimental.cjs from src/gui.tsx; the app provides solid-js, effect and the SDK.
export default defineConfig({
  plugins: [gui()],
  build: { minify: false, sourcemap: false },
})
