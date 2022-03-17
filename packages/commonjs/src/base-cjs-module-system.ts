import type { IModule, ICommonJsModuleSystem } from './types.js';
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

  wrapRequire?: (
    require: (modulePath: string | false) => unknown,
    loadedModules: Map<string, IModule>
  ) => (modulePath: string | false) => unknown;
}

export function createBaseCjsModuleSystem(options: IBaseModuleSystemOptions): ICommonJsModuleSystem {
  const { resolveFrom, dirname, readFileSync, globals = {}, wrapRequire } = options;

  const loadedModules = new Map<string, IModule>();

  const wrappedRequireModule = wrapRequire ? wrapRequire(requireModule, loadedModules) : requireModule;

  return {
    requireModule: wrappedRequireModule,
    requireFrom,
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

  function requireFrom(contextPath: string, request: string, requestOrigin?: string): unknown {
    const existingModule = loadedModules.get(request);
    if (existingModule) {
      return existingModule.exports;
    }

    return wrappedRequireModule(resolveThrow(contextPath, request, requestOrigin));
  }

  function requireModule(filePath: string | false): unknown {
    if (filePath === false) {
      return {};
    }

    const existingModule = loadedModules.get(filePath);
    if (existingModule) {
      return existingModule.exports;
    }

    const newModule: IModule = { exports: {}, filename: filePath, id: filePath };

    const contextPath = dirname(filePath);
    const fileContents = readFileSync(filePath);

    if (filePath.endsWith('.json')) {
      newModule.exports = JSON.parse(fileContents) as unknown;
      loadedModules.set(filePath, newModule);
      return newModule.exports;
    }
    const requireFromContext = (request: string) => requireFrom(contextPath, request, filePath);
    requireFromContext.resolve = (request: string) => resolveThrow(contextPath, request, filePath);

    const moduleBuiltins = {
      module: newModule,
      exports: newModule.exports,
      __filename: filePath,
      __dirname: contextPath,
      require: requireFromContext,
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

    return newModule.exports;
  }
}
