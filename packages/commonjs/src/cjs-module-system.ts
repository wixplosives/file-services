import type { IFileSystemSync } from '@file-services/types';
import { createRequestResolver, RequestResolver } from '@file-services/resolve';
import type { ICommonJsModuleSystem } from './types';
import { createBaseCjsModuleSystem } from './base-cjs-module-system';

export interface IModuleSystemOptions {
  /**
   * Exposed to modules as `process.env`.
   *
   * @default { NODE_ENV: 'development' }
   */
  processEnv?: Record<string, string | undefined>;

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
}

export function createCjsModuleSystem(options: IModuleSystemOptions): ICommonJsModuleSystem {
  const { fs, processEnv = { NODE_ENV: 'development' } } = options;
  const { dirname, readFileSync } = fs;

  const { resolver = createRequestResolver({ fs }) } = options;

  return createBaseCjsModuleSystem({
    processEnv,
    resolveFrom: (contextPath, request, requestOrigin) => resolver(contextPath, request, requestOrigin).resolvedFile,
    dirname,
    readFileSync: (filePath) => readFileSync(filePath, 'utf8'),
  });
}
