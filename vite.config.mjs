import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve("src/popup"),
  base: "./",
  publicDir: false,
  plugins: [vue()],
  build: {
    outDir: resolve("dist/src/popup"),
    emptyOutDir: false,
    assetsDir: "assets",
    rollupOptions: {
      input: resolve("src/popup/index.html")
    }
  }
});
