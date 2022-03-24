import type { IModule, ICommonJsModuleSystem, LoadModule } from './types.js';
import { envGlobal } from './global-this.js';

export interface IBaseModuleSystemOptions {
  /**
   * Exposed to modules as globals.
   */
  globals?: Record<string, unknown>;

  /**
   * @returns textual contents of `filePath`.
   * @throws if file doesn't exist or other error.
   */
  readFileSync(filePath: string): string;

  /**
   * @returns parent directory of provided `path`.
   */
  dirname(path: string): string;

  /**
   * Resolve a module request from some context (directory path).
   *
   * @returns
   * `string` - absolute path to resolved file.
   * `false` - request should receive an empty object during runtime (mapped by `"browser"` field in `package.json`).
   * `undefined` - couldn't resolve request.
   */
  resolveFrom(contextPath: string, request: string, requestOrigin?: string): string | false | undefined;
  /**
   * Hook into file module evaluation.
   */
  loadModuleHook?: (loadModule: LoadModule) => LoadModule;
}

const falseModule = { exports: {}, filename: '', id: '', children: [] };

export function createBaseCjsModuleSystem(options: IBaseModuleSystemOptions): ICommonJsModuleSystem {
  const { resolveFrom, dirname, readFileSync, globals = {}, loadModuleHook } = options;
  const loadedModules = new Map<string, IModule>();

  const load = loadModuleHook ? loadModuleHook(loadModule) : loadModule;

  return {
    requireModule(filePath) {
      if (filePath === false) {
        return {};
      }
      const fileModule = loadedModules.get(filePath) ?? load(filePath);
      return fileModule.exports;
    },
    requireFrom(contextPath, request) {
      return loadFrom(contextPath, request).exports;
    },
    resolveFrom,
    loadedModules,
    globals,
  };

  function resolveThrow(contextPath: string, request: string, requestOrigin?: string): string | false {
    const resolvedRequest = resolveFrom(contextPath, request, requestOrigin);
    if (resolvedRequest === undefined) {
      throw new Error(`Cannot resolve "${request}" in ${requestOrigin || contextPath}`);
    }
    return resolvedRequest;
  }

  function loadFrom(contextPath: string, request: string, requestOrigin?: string): IModule {
    const existingRequestModule = loadedModules.get(request);
    if (existingRequestModule) {
      return existingRequestModule;
    }
    const resolvedPath = resolveThrow(contextPath, request, requestOrigin);
    if (resolvedPath === false) {
      return falseModule;
    }
    return loadedModules.get(resolvedPath) ?? load(resolvedPath);
  }

  function loadModule(filePath: string): IModule {
    const newModule: IModule = { exports: {}, filename: filePath, id: filePath, children: [] };

    const contextPath = dirname(filePath);
    const fileContents = readFileSync(filePath);

    if (filePath.endsWith('.json')) {
      newModule.exports = JSON.parse(fileContents) as unknown;
      loadedModules.set(filePath, newModule);
      return newModule;
    }
    const localRequire = (request: string) => {
      const childModule = loadFrom(contextPath, request, filePath);
      if (childModule === falseModule) {
        return {};
      }
      if (!newModule.children.includes(childModule)) {
        newModule.children.push(childModule);
      }
      return childModule.exports;
    };
    localRequire.resolve = (request: string) => resolveThrow(contextPath, request, filePath);

    const moduleBuiltins = {
      module: newModule,
      exports: newModule.exports,
      __filename: filePath,
      __dirname: contextPath,
      require: localRequire,
    };

    const injectedGlobals = {
      global: envGlobal,
      ...globals,
    };

    const fnArgs = Object.keys(moduleBuiltins).join(', ');
    const globalsArgs = Object.keys(injectedGlobals).join(', ');
    const moduleSource = `${fileContents}\n//# sourceURL=${filePath}\n`;
    const globalFn = eval(`(function (${globalsArgs}){ return (function (${fnArgs}){${moduleSource}}); })`) as (
      ...args: unknown[]
    ) => (...args: unknown[]) => void;

    loadedModules.set(filePath, newModule);

    try {
      const moduleFn = globalFn(...Object.values(injectedGlobals));
      moduleFn(...Object.values(moduleBuiltins));
    } catch (e) {
      loadedModules.delete(filePath);

      // switch to Error.cause once more places support it
      if (e instanceof Error && !(e as { filePath?: string }).filePath) {
        (e as { filePath?: string }).filePath = filePath;
      }

      throw e;
    }

    return newModule;
  }
}
