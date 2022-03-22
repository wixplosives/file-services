import type { IModuleSystemOptions } from './cjs-module-system';
import { IBaseModuleSystemOptions, createBaseCjsModuleSystem } from './base-cjs-module-system';
import type { ICommonJsModuleSystem } from './types';
import { createRequestResolver } from '@file-services/resolve';

export interface IManagedCommonJsModuleSystem extends ICommonJsModuleSystem {
  invalidateModule(modulePath: string): unknown;
}

export const createManagedCjsModuleSystem = (options: IModuleSystemOptions) => {
  const { fs, globals } = options;
  const { dirname, readFileSync } = fs;

  const { resolver = createRequestResolver({ fs }), wrapRequire } = options;

  return createManagedBaseCjsModuleSystem({
    resolveFrom: (contextPath, request, requestOrigin) => resolver(contextPath, request, requestOrigin).resolvedFile,
    readFileSync: (filePath) => readFileSync(filePath, 'utf8'),
    dirname,
    globals,
    wrapRequire,
  });
};

export const createManagedBaseCjsModuleSystem = ({
  dirname,
  readFileSync,
  resolveFrom,
  globals,
  wrapRequire = (req) => (path) => req(path),
}: IBaseModuleSystemOptions): IManagedCommonJsModuleSystem => {
  const moduleGraph = new Map<
    string,
    {
      dependencies: string[];
      importers: string[];
    }
  >();

  const moduleSystem = createBaseCjsModuleSystem({
    resolveFrom: (contextPath, request, origin) => {
      const resolvedFile = resolveFrom(contextPath, request);
      if (origin && resolvedFile) {
        moduleGraph.get(origin)?.dependencies.push(resolvedFile);
        let graphNode = moduleGraph.get(resolvedFile);
        if (!graphNode) {
          graphNode = {
            dependencies: [],
            importers: [],
          };
          moduleGraph.set(resolvedFile, graphNode);
        }
        graphNode.importers.push(origin);
      }

      return resolvedFile;
    },
    dirname,
    readFileSync,
    wrapRequire: (requireCall, loadedModules) => {
      const wrappedRequireCall = wrapRequire(requireCall, loadedModules);
      return (modulePath) => {
        if (modulePath && !moduleGraph.has(modulePath)) {
          moduleGraph.set(modulePath, {
            dependencies: [],
            importers: [],
          });
        }
        return wrappedRequireCall(modulePath);
      };
    },
    globals,
  });

  const { resolveFrom: msResolveFrom, requireModule: msRequireModule, loadedModules } = moduleSystem;

  const populateModuleGraph = (modulePath: string, visited = new Set<string>()) => {
    if (visited.has(modulePath)) {
      return;
    }
    visited.add(modulePath);
    let moduleNode = moduleGraph.get(modulePath);
    if (!moduleNode) {
      moduleNode = {
        dependencies: [],
        importers: [],
      };
      moduleGraph.set(modulePath, moduleNode);
    }
    for (const [moduleId, node] of moduleGraph) {
      if (node.dependencies.includes(modulePath)) {
        moduleNode.importers.push(moduleId);
        populateModuleGraph(moduleId, visited);
      }
    }
  };

  const requireModule = (modulePath: string | false) => {
    const requiredModule = msRequireModule(modulePath);
    if (modulePath) {
      populateModuleGraph(modulePath);
    }
    return requiredModule;
  };

  const requireFrom: ICommonJsModuleSystem['requireFrom'] = (contextPath, request) => {
    const resolvedRequest = msResolveFrom(contextPath, request);
    if (resolvedRequest === undefined) {
      throw new Error(`Cannot resolve "${request}" in ${contextPath}`);
    }

    return requireModule(resolvedRequest);
  };

  const invalidateModule = (modulePath: string | false, visited = new Set<string>()) => {
    if (!modulePath) {
      return {};
    }
    if (visited.has(modulePath)) {
      return loadedModules.get(modulePath);
    }

    visited.add(modulePath);

    const { importers } = moduleGraph.get(modulePath) ?? { importers: [] };

    loadedModules.delete(modulePath);
    moduleGraph.delete(modulePath);

    const moduleExports = requireModule(modulePath);
    for (const importer of importers) {
      invalidateModule(importer, visited);
    }
    return moduleExports;
  };

  return { ...moduleSystem, requireFrom, requireModule, invalidateModule };
};
