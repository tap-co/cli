import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  bundle: true,
  clean: true,
  dts: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
  // Bundle internal packages if needed
  // noExternal: ['@tap/some-internal-package'],
})
