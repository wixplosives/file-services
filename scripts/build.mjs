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

  const esmBundleURL = new URL(`fs-${item.name}.mjs`, outPath);
  const cjsBundleURL = new URL(`fs-${item.name}.cjs`, outPath);
  const entryURL = new URL("src/index.ts", packageURL);

  /** @type {import('esbuild').BuildOptions} */
  const commonBuildOptions = {
    entryPoints: [fileURLToPath(entryURL)],
    bundle: true,
    target: "es2022",
    sourcemap: true,
    packages: "external",
    logLevel: "info",
    color: true,
  };
  /** @type {import('esbuild').BuildOptions} */
  const esmBuildOptions = {
    ...commonBuildOptions,
    outfile: fileURLToPath(esmBundleURL),
    format: "esm",
  };
  /** @type {import('esbuild').BuildOptions} */
  const cjsBuildOptions = {
    ...commonBuildOptions,
    outfile: fileURLToPath(cjsBundleURL),
    format: "cjs",
  };
  if (watch) {
    const [esmCtx, cjsCtx] = await Promise.all([context(esmBuildOptions), context(cjsBuildOptions)]);
    await Promise.all([esmCtx.watch(), cjsCtx.watch()]);
  } else {
    await Promise.all([build(esmBuildOptions), build(cjsBuildOptions)]);
  }
}
