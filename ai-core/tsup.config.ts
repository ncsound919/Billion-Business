import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  dts: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  bundle: true,
  skipNodeModulesBundle: true,
  external: ["@google/genai", "openai"],
})
