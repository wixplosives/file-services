import type { IModule } from './types';

export const invalidateModule = (modulePath: string | false, requireCache: Map<string, IModule>): void => {
  if (!modulePath) {
    return;
  }

  for (const { filename } of getModulesTree(modulePath, requireCache)) {
    requireCache.delete(filename);
  }
};

export function* getModulesTree(entryModulePath: string, moduleCache: Map<string, IModule>): Generator<IModule> {
  const entryModule = moduleCache.get(entryModulePath);
  if (!entryModule) {
    return;
  }
  const visited = new Set<string>();
  const importingModules: Array<IModule> = [entryModule];
  while (importingModules.length) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const importingModule = importingModules.shift()!;
    if (!visited.has(importingModule.filename)) {
      visited.add(importingModule.filename);
      yield importingModule;
      for (const module of moduleCache.values()) {
        if (module.children.includes(importingModule)) {
          importingModules.push(module);
        }
      }
    }
  }
}
