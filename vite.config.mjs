import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve("src"),
  base: "./",
  publicDir: false,
  plugins: [vue()],
  build: {
    outDir: resolve("dist/src"),
    emptyOutDir: false,
    assetsDir: "assets",
    rollupOptions: {
      input: {
        popup: resolve("src/popup/index.html"),
        dashboard: resolve("src/dashboard/index.html"),
        data_viewer: resolve("src/data-viewer/index.html"),
        seo_sort: resolve("src/tools/seo_sort/index.html"),
        xhs_comment_crawler: resolve("src/tools/xhs_comment_crawler/vue/index.html"),
        douyin_comment_crawler: resolve("src/tools/douyin_comment_crawler/vue/index.html"),
        dy_video_list_crawler: resolve("src/tools/dy_video_list_crawler/vue/index.html"),
        dy_video_crawler: resolve("src/tools/dy_video_crawler/vue/index.html"),
        dy_video_recorder: resolve("src/tools/dy_video_recorder/vue/index.html"),
        dy_video_download: resolve("src/tools/dy_video_download/vue/index.html")
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/element-plus")) {
            return "element-plus";
          }

          if (id.includes("node_modules/@element-plus")) {
            return "element-plus-icons";
          }

          if (id.includes("node_modules/vue")) {
            return "vue-vendor";
          }
        }
      }
    }
  }
});
