import type { PackageJson } from 'type-fest';
import type {
  RequestResolver,
  IRequestResolverOptions,
  IResolvedPackageJson,
  IResolutionOutput,
  IRequestRuleMapper,
} from './types.js';

const defaultTarget = 'browser';
const defaultPackageRoots = ['node_modules'];
const defaultExtensions = ['.js', '.json'];
const isRelative = (request: string) =>
  request === '.' || request === '..' || request.startsWith('./') || request.startsWith('../');
const PACKAGE_JSON = 'package.json';
type IRequestMap = { alias: false | { exact: boolean; target: string }[]; name: string; exactMatch: boolean };

export function createRequestResolver(options: IRequestResolverOptions): RequestResolver {
  const {
    fs: { statSync, readFileSync, realpathSync, dirname, join, resolve, isAbsolute },
    packageRoots = defaultPackageRoots,
    extensions = defaultExtensions,
    target = defaultTarget,
    resolvedPacakgesCache = new Map<string, IResolvedPackageJson | undefined>(),
    alias = {},
    fallback = {},
  } = options;

  const loadPackageJsonFromCached = wrapWithCache(loadPackageJsonFrom, resolvedPacakgesCache);
  const normalizedAliases = normalizeRuleMapOption(alias);
  const normalizedFallbacks = normalizeRuleMapOption(fallback);

  return requestResolver;

  function requestResolver(contextPath: string, originalRequest: string): IResolutionOutput {
    for (const aliasedRequest of userMappedRequestPaths(originalRequest)) {
      let request: string | false = aliasedRequest;
      if (request === false) {
        return { resolvedFile: false };
      }
      if (target === 'browser') {
        const fromPackageJson = findUpPackageJson(contextPath);
        const remappedRequest = fromPackageJson?.browserMappings?.[originalRequest];
        if (remappedRequest !== undefined) {
          request = remappedRequest;
          if (request === false) {
            return { resolvedFile: request };
          }
        }
      }

      for (const resolvedFile of nodeRequestPaths(contextPath, request)) {
        if (!statSyncSafe(resolvedFile)?.isFile()) {
          continue;
        }
        if (target === 'browser') {
          const toPackageJson = findUpPackageJson(dirname(resolvedFile));
          const remappedFilePath = toPackageJson?.browserMappings?.[resolvedFile];
          if (remappedFilePath !== undefined) {
            return {
              resolvedFile: remappedFilePath,
              originalFilePath: resolvedFile,
            };
          }
        }
        return { resolvedFile: realpathSyncSafe(resolvedFile) };
      }
    }
    return { resolvedFile: undefined };
  }

  function* nodeRequestPaths(contextPath: string, request: string) {
    if (isRelative(request) || isAbsolute(request)) {
      const requestPath = resolve(contextPath, request);
      yield* fileRequestPaths(requestPath);
      yield* directoryRequestPaths(requestPath);
    } else {
      yield* packageRequestPaths(contextPath, request);
    }
  }

  /**
   * /path/to/target
   * /path/to/target.js
   * /path/to/target.json
   */
  function* fileRequestPaths(filePath: string) {
    yield filePath;
    for (const ext of extensions) {
      yield filePath + ext;
    }
  }

  /**
   * /path/to/target (+ext)
   * /path/to/target/index (+ext)
   */
  function* fileOrDirIndexRequestPaths(targetPath: string) {
    yield* fileRequestPaths(targetPath);
    yield* fileRequestPaths(join(targetPath, 'index'));
  }

  function* directoryRequestPaths(directoryPath: string) {
    if (!statSyncSafe(directoryPath)?.isDirectory()) {
      return;
    }
    const resolvedPackageJson = loadPackageJsonFromCached(directoryPath);
    const mainPath = resolvedPackageJson?.mainPath;

    if (mainPath !== undefined) {
      yield* fileOrDirIndexRequestPaths(join(directoryPath, mainPath));
    } else {
      yield* fileRequestPaths(join(directoryPath, 'index'));
    }
  }

  function* packageRequestPaths(initialPath: string, request: string) {
    for (const packagesPath of packageRootsToPaths(initialPath)) {
      if (!statSyncSafe(packagesPath)?.isDirectory()) {
        continue;
      }
      const requestInPackages = join(packagesPath, request);
      yield* fileRequestPaths(requestInPackages);
      yield* directoryRequestPaths(requestInPackages);
    }
  }

  function* packageRootsToPaths(initialPath: string) {
    for (const packageRoot of packageRoots) {
      for (const directoryPath of pathChainToRoot(initialPath)) {
        yield join(directoryPath, packageRoot);
      }
    }
  }

  /**
   *
   * @param request - the original request
   * The function generates all the possible aliased requests, and falls back to the original request if all else failed
   */
  function* mappedRequestPaths(request: string, map: IRequestMap[]) {
    for (const { name, alias, exactMatch } of map) {
      if (exactMatch) {
        if (request === name) {
          if (alias === false) {
            yield false;
          } else {
            for (const { target } of alias) {
              yield target;
            }
          }
        }
      } else if (request.startsWith(name)) {
        if (alias === false) {
          yield false;
        } else {
          for (const { exact, target } of alias) {
            if (request === name || exact) {
              yield target;
            } else {
              yield join(target, request.substr(name.length));
            }
          }
        }
      }
    }
    yield request;
  }

  function* userMappedRequestPaths(request: string) {
    yield* mappedRequestPaths(request, normalizedAliases);
    yield request;
    yield* mappedRequestPaths(request, normalizedFallbacks);
  }

  function findUpPackageJson(initialPath: string): IResolvedPackageJson | undefined {
    for (const directoryPath of pathChainToRoot(initialPath)) {
      const resolvedPackageJson = loadPackageJsonFromCached(directoryPath);
      if (resolvedPackageJson) {
        return resolvedPackageJson;
      }
    }
    return undefined;
  }

  function loadPackageJsonFrom(directoryPath: string): IResolvedPackageJson | undefined {
    const packageJsonPath = join(directoryPath, PACKAGE_JSON);
    const packageJson = readJsonFileSyncSafe(packageJsonPath) as PackageJson | null | undefined;
    if (typeof packageJson !== 'object' || packageJson === null) {
      return undefined;
    }
    const mainPath = packageJsonTarget(packageJson);

    const { browser } = packageJson;
    let browserMappings: Record<string, string | false> | undefined = undefined;
    if (target === 'browser' && typeof browser === 'object' && browser !== null) {
      browserMappings = Object.create(null) as Record<string, string | false>;
      for (const [from, to] of Object.entries(browser)) {
        const resolvedFrom = isRelative(from) ? resolveRelative(join(directoryPath, from)) : from;
        if (resolvedFrom) {
          const resolvedTo = resolveRemappedRequest(directoryPath, to);
          if (resolvedTo !== undefined) {
            browserMappings[resolvedFrom] = resolvedTo;
          }
        }
      }
    }

    return {
      filePath: packageJsonPath,
      directoryPath,
      mainPath,
      browserMappings,
    };
  }

  function resolveRemappedRequest(directoryPath: string, to: string | false): string | false | undefined {
    if (to === false) {
      return to;
    } else if (typeof to === 'string') {
      if (isRelative(to)) {
        return resolveRelative(join(directoryPath, to));
      } else {
        return to;
      }
    }
    return undefined;
  }

  function resolveRelative(request: string) {
    for (const filePath of fileOrDirIndexRequestPaths(request)) {
      if (statSyncSafe(filePath)?.isFile()) {
        return realpathSyncSafe(filePath);
      }
    }
    return undefined;
  }

  function realpathSyncSafe(itemPath: string): string {
    const { stackTraceLimit } = Error;
    try {
      Error.stackTraceLimit = 0;
      return realpathSync(itemPath);
    } catch {
      return itemPath;
    } finally {
      Error.stackTraceLimit = stackTraceLimit;
    }
  }

  function packageJsonTarget({ main, browser }: PackageJson): string | undefined {
    if (target === 'browser' && typeof browser === 'string') {
      return browser;
    } else {
      return typeof main === 'string' ? main : undefined;
    }
  }

  function* pathChainToRoot(currentPath: string) {
    let lastPath: string | undefined;
    while (lastPath !== currentPath) {
      yield currentPath;
      lastPath = currentPath;
      currentPath = dirname(currentPath);
    }
  }

  function readJsonFileSyncSafe(filePath: string): unknown {
    const { stackTraceLimit } = Error;
    try {
      Error.stackTraceLimit = 0;
      return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
    } catch {
      return undefined;
    } finally {
      Error.stackTraceLimit = stackTraceLimit;
    }
  }

  function statSyncSafe(path: string) {
    const { stackTraceLimit } = Error;
    try {
      Error.stackTraceLimit = 0;
      return statSync(path);
    } catch {
      return undefined;
    } finally {
      Error.stackTraceLimit = stackTraceLimit;
    }
  }
}

function wrapWithCache<K, T>(fn: (key: K) => T, cache = new Map<K, T>()): (key: K) => T {
  return (key: K) => {
    if (cache.has(key)) {
      return cache.get(key) as T;
    } else {
      const result = fn(key);
      cache.set(key, result);
      return result;
    }
  };
}

function normalizeRuleMapOption(aliases: IRequestRuleMapper | undefined): IRequestMap[] {
  if (aliases === undefined) {
    return [];
  }
  return Object.entries(aliases).map(([aliasedFrom, aliasedTo]) => {
    // Aliases that end with $ denote exact match (without the $ obviously)
    const prefixMatch = aliasedFrom.endsWith('/*');
    return {
      alias:
        aliasedTo === false
          ? false
          : Array.isArray(aliasedTo)
          ? aliasedTo.map((option) =>
              option.endsWith('/*') ? { exact: false, target: option.slice(0, -2) } : { exact: true, target: option }
            )
          : [
              aliasedTo.endsWith('/*')
                ? { exact: false, target: aliasedTo.slice(0, -2) }
                : { exact: true, target: aliasedTo },
            ],
      name: prefixMatch ? aliasedFrom.slice(0, -2) : aliasedFrom,
      exactMatch: !prefixMatch,
    };
  });
}

// to avoid having to include @types/node
interface TracedErrorConstructor extends ErrorConstructor {
  stackTraceLimit?: number;
}
declare let Error: TracedErrorConstructor;
