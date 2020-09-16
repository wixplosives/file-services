import type { IModule, ModuleEvalFn, ICommonJsModuleSystem } from './types';
import { envGlobal } from './global-this';

export interface IBaseModuleSystemOptions {
  /**
   * Exposed to modules as `process.env`.
   *
   * @default { NODE_ENV: 'development' }
   */
  processEnv?: Record<string, string | undefined>;

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
}

export function createBaseCjsModuleSystem(options: IBaseModuleSystemOptions): ICommonJsModuleSystem {
  const { resolveFrom, dirname, readFileSync, processEnv = { NODE_ENV: 'development' } } = options;

  const loadedModules = new Map<string, IModule>();
  const globalProcess = { env: processEnv };

  return {
    requireModule,
    requireFrom,
    resolveFrom,
    loadedModules,
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

    return requireModule(resolveThrow(contextPath, request, requestOrigin));
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

    const moduleFn = eval(
      `(function (module, exports, __filename, __dirname, process, require, global){${fileContents}\n})`
    ) as ModuleEvalFn;

    loadedModules.set(filePath, newModule);
    const requireFromContext = (request: string) => requireFrom(contextPath, request, filePath);
    requireFromContext.resolve = (request: string) => resolveThrow(contextPath, request, filePath);

    try {
      moduleFn(newModule, newModule.exports, filePath, contextPath, globalProcess, requireFromContext, envGlobal);
    } catch (e) {
      loadedModules.delete(filePath);
      throw e;
    }

    return newModule.exports;
  }
}
