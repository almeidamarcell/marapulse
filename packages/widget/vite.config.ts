import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/widget.ts"),
      name: "Marapulse",
      formats: ["iife"],
      fileName: () => "widget.js",
    },
    outDir: "dist",
    minify: true,
  },
});
