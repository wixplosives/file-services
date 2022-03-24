import type { IModule } from './types';

export const invalidateModule = (modulePath: string | false, requireCache: Map<string, IModule>): void => {
  if (!modulePath) {
    return;
  }

  for (const { filename } of getModulesTree(modulePath, requireCache)) {
    requireCache.delete(filename);
  }
};

export function* getModulesTree(
  modulePath: string,
  moduleCache: Map<string, IModule>,
  visited = new Set<string>()
): Generator<IModule> {
  if (visited.has(modulePath)) {
    return;
  }
  visited.add(modulePath);
  const module = moduleCache.get(modulePath);

  if (!module) {
    return;
  }

  yield module;
  for (const [moduleFileName, cachedModule] of moduleCache) {
    if (cachedModule.children.includes(module)) {
      yield* getModulesTree(moduleFileName, moduleCache, visited);
    }
  }
}
