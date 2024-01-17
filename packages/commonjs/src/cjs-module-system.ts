import type { IFileSystemSync } from "@file-services/types";
import { createRequestResolver, RequestResolver } from "@file-services/resolve";
import type { ICommonJsModuleSystem, LoadModule } from "./types";
import { createBaseCjsModuleSystem } from "./base-cjs-module-system";

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

  /**
   * Hook into file module evaluation.
   */
  loadModuleHook?: (loadModule: LoadModule) => LoadModule;
}

export function createCjsModuleSystem(options: IModuleSystemOptions): ICommonJsModuleSystem {
  const { fs, globals } = options;
  const { dirname, readFileSync } = fs;

  const { resolver = createRequestResolver({ fs }), loadModuleHook } = options;

  return createBaseCjsModuleSystem({
    resolveFrom: (contextPath, request, requestOrigin) => resolver(contextPath, request, requestOrigin).resolvedFile,
    readFileSync: (filePath) => readFileSync(filePath, "utf8"),
    dirname,
    globals,
    loadModuleHook,
  });
}
