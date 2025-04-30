import type { IModule } from "./types.js";

/**
 * Removes module and it's deep importers from the module cache
 */
export const invalidateModule = (modulePath: string, moduleCache: Map<string, IModule>): void => {
  for (const { filename } of getModulesTree(modulePath, moduleCache)) {
    moduleCache.delete(filename);
  }
};

/**
 * A generator which given a module path and a require cache will yield all files which deeply depend on given module
 */
export function* getModulesTree(
  modulePath: string,
  moduleCache: Map<string, IModule>,
  visited = new Set<string>(),
): Generator<IModule> {
  if (visited.has(modulePath)) {
    return;
  }
  visited.add(modulePath);
  const fileModule = moduleCache.get(modulePath);

  if (!fileModule) {
    return;
  }

  yield fileModule;
  for (const [moduleFileName, cachedModule] of moduleCache) {
    if (cachedModule.children.includes(fileModule)) {
      yield* getModulesTree(moduleFileName, moduleCache, visited);
    }
  }
}
