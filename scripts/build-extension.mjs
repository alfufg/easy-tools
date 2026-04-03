import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const rootDir = resolve(".");
const distDir = resolve(rootDir, "dist");

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

const copyTargets = [
  ["manifest.json", "manifest.json"],
  ["src/background.js", "src/background.js"],
  ["src/tools", "src/tools"],
  ["src/libs", "src/libs"],
  ["src/assets", "src/assets"]
];

for (const [source, target] of copyTargets) {
  const sourcePath = resolve(rootDir, source);
  const targetPath = resolve(distDir, target);

  if (!existsSync(sourcePath)) {
    continue;
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath, { recursive: true });
}

const distManifestPath = resolve(distDir, "manifest.json");
const distManifest = JSON.parse(readFileSync(distManifestPath, "utf8"));

if (distManifest.side_panel?.default_path) {
  distManifest.side_panel.default_path = "./src/popup/index.html";
}

if (distManifest.options_ui?.page) {
  distManifest.options_ui.page = "./src/dashboard/index.html";
}

writeFileSync(distManifestPath, `${JSON.stringify(distManifest, null, 2)}\n`);
