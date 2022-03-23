import type { IModuleSystemOptions } from './cjs-module-system';
import { IBaseModuleSystemOptions, createBaseCjsModuleSystem } from './base-cjs-module-system';
import type { ICommonJsModuleSystem, IModule } from './types';
import { createRequestResolver } from '@file-services/resolve';

export interface IManagedCommonJsModuleSystem extends ICommonJsModuleSystem {
  invalidateModule(modulePath: string): unknown;
}

export const createManagedCjsModuleSystem = (options: IModuleSystemOptions) => {
  const { fs, resolver = createRequestResolver({ fs }) } = options;
  const { dirname, readFileSync } = fs;

  return createManagedBaseCjsModuleSystem({
    resolveFrom: (contextPath, request, requestOrigin) => resolver(contextPath, request, requestOrigin).resolvedFile,
    readFileSync: (filePath) => readFileSync(filePath, 'utf8'),
    dirname,
    ...options,
  });
};

export const createManagedBaseCjsModuleSystem = (options: IBaseModuleSystemOptions): IManagedCommonJsModuleSystem => {
  const moduleSystem = createBaseCjsModuleSystem(options);

  const invalidateModule = (modulePath: string | false) => {
    if (!modulePath) {
      return {};
    }

    for (const { filename } of getModulesTree(modulePath, moduleSystem.loadedModules)) {
      moduleSystem.loadedModules.delete(filename);
      moduleSystem.requireModule(filename);
    }

    return moduleSystem.loadedModules.get(modulePath);
  };

  return { ...moduleSystem, invalidateModule };
};

function* getModulesTree(entryModulePath: string, moduleCache: Map<string, IModule>): Generator<IModule> {
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
