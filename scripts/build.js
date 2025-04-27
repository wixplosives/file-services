// @ts-check

import { build, context } from "esbuild";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const watch = process.argv.includes("-w") || process.argv.includes("--watch");
const ignoredPackages = new Set(["path"]);
const packagesURL = new URL(`../packages/`, import.meta.url);

for (const item of await fs.readdir(packagesURL, { withFileTypes: true })) {
  if (!item.isDirectory() || ignoredPackages.has(item.name)) {
    continue;
  }
  const packageURL = new URL(`${item.name}/`, packagesURL);
  const outPath = new URL(`dist/`, packageURL);
  await fs.rm(outPath, { recursive: true, force: true });
  await fs.mkdir(outPath, { recursive: true });

  /** @type {import('esbuild').BuildOptions} */
  const buildOptions = {
    entryPoints: [fileURLToPath(new URL("src/index.ts", packageURL))],
    bundle: true,
    target: "es2022",
    sourcemap: true,
    packages: "external",
    logLevel: "info",
    color: true,
    outfile: fileURLToPath(new URL(`fs-${item.name}.js`, outPath)),
    format: "esm",
  };

  if (watch) {
    const buildContext = await context(buildOptions);
    await buildContext.watch();
  } else {
    await build(buildOptions);
  }
}
