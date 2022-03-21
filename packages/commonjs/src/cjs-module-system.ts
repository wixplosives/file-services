import type { IFileSystemSync } from '@file-services/types';
import { createRequestResolver, RequestResolver } from '@file-services/resolve';
import type { ICommonJsModuleSystem, IModule } from './types.js';
import { createBaseCjsModuleSystem, RequireCall } from './base-cjs-module-system.js';

export interface IModuleSystemOptions {
  /**
   * Exposed to modules as globals.
   */
  globals?: Record<string, unknown>;

  /**
   * Sync file system to use when reading files
   * or resolving requests.
   */
  fs: IFileSystemSync;

  /**
   * Resolver to use for `require(...)` calls.
   *
   * @param contextPath absolute path to the context directory of the request.
   * @param request request to resolve.
   * @param requestOrigin original requesting file path.
   *
   * @default createRequestResolver of `@file-services/resolve`
   */
  resolver?(contextPath: string, request: string, requestOrigin?: string): ReturnType<RequestResolver>;

  wrapRequire?: (require: RequireCall, loadedModules: Map<string, IModule>) => RequireCall;
}

export function createCjsModuleSystem(options: IModuleSystemOptions): ICommonJsModuleSystem {
  const { fs, globals } = options;
  const { dirname, readFileSync } = fs;

  const { resolver = createRequestResolver({ fs }), wrapRequire } = options;

  return createBaseCjsModuleSystem({
    resolveFrom: (contextPath, request, requestOrigin) => resolver(contextPath, request, requestOrigin).resolvedFile,
    readFileSync: (filePath) => readFileSync(filePath, 'utf8'),
    dirname,
    globals,
    wrapRequire,
  });
}
