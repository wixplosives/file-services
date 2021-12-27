import type { PackageJson } from 'type-fest';
import type { RequestResolver, IRequestResolverOptions, IResolvedPackageJson, IResolutionOutput } from './types.js';

const defaultTarget = 'browser';
const defaultPackageRoots = ['node_modules'];
const defaultExtensions = ['.js', '.json'];
const isRelative = (request: string) =>
  request === '.' || request === '..' || request.startsWith('./') || request.startsWith('../');
const PACKAGE_JSON = 'package.json';
const statsNoThrowOptions = { throwIfNoEntry: false } as const;

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
  const [normalizedAliases, aliasHasTemplates] = remapRecordToMap(alias);
  const [normalizedFallbacks, fallbackHasTemplates] = remapRecordToMap(fallback);

  return requestResolver;

  function requestResolver(contextPath: string, originalRequest: string): IResolutionOutput {
    const visitedPaths = new Set<string>();
    for (const request of requestsToTry(contextPath, originalRequest, visitedPaths)) {
      if (request === false) {
        return { resolvedFile: request, visitedPaths };
      }

      for (const resolvedFilePath of nodeRequestPaths(contextPath, request)) {
        visitedPaths.add(resolvedFilePath);
        if (!statSyncSafe(resolvedFilePath)?.isFile()) {
          continue;
        }
        if (target === 'browser') {
          const toPackageJson = findUpPackageJson(dirname(resolvedFilePath));
          if (toPackageJson) {
            visitedPaths.add(toPackageJson.filePath);
            const remappedFilePath = toPackageJson.browserMappings?.[resolvedFilePath];
            if (remappedFilePath !== undefined) {
              if (remappedFilePath !== false) {
                visitedPaths.add(remappedFilePath);
              }
              return {
                resolvedFile: remappedFilePath,
                originalFilePath: resolvedFilePath,
                visitedPaths,
              };
            }
          }
        }
        const realResolvedFilePath = realpathSyncSafe(resolvedFilePath);
        visitedPaths.add(realResolvedFilePath);
        return { resolvedFile: realResolvedFilePath, visitedPaths };
      }
    }

    return { resolvedFile: undefined, visitedPaths };
  }

  function* requestsToTry(contextPath: string, request: string, visitedPaths: Set<string>) {
    const requestAlias = aliasHasTemplates
      ? getFromTemplateMap(normalizedAliases, request)
      : (normalizedAliases.get(request) as string | false | undefined);
    let emittedCandidate = false;
    if (requestAlias !== undefined) {
      emittedCandidate = true;
      yield requestAlias;
    }

    if (!emittedCandidate && target === 'browser') {
      const fromPackageJson = findUpPackageJson(contextPath);
      if (fromPackageJson) {
        visitedPaths.add(fromPackageJson.filePath);
        const remappedRequest = fromPackageJson.browserMappings?.[request];
        if (remappedRequest !== undefined) {
          emittedCandidate = true;
          yield remappedRequest;
        }
      }
    }

    if (!emittedCandidate) {
      yield request;
    }
    const requestFallback = fallbackHasTemplates
      ? getFromTemplateMap(normalizedFallbacks, request)
      : (normalizedFallbacks.get(request) as string | false | undefined);
    if (requestFallback !== undefined) {
      yield requestFallback;
    }
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

  function getFromTemplateMap(
    map: Map<string | { prefix: string }, string | { prefix: string } | false>,
    request: string
  ): string | false | undefined {
    for (const [key, value] of map) {
      const keyType = typeof key;
      if (keyType === 'string') {
        if (request === key) {
          return value as string | false;
        }
      } else if (keyType === 'object') {
        const { prefix: keyPrefix } = key as { prefix: string };
        if (request.startsWith(keyPrefix) && request.length > keyPrefix.length) {
          return typeof value === 'object' ? value.prefix + request.slice(keyPrefix.length) : value;
        }
      }
    }
    return undefined;
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

  function statSyncSafe(path: string) {
    const { stackTraceLimit } = Error;
    try {
      Error.stackTraceLimit = 0;
      return statSync(path, statsNoThrowOptions);
    } catch {
      return undefined;
    } finally {
      Error.stackTraceLimit = stackTraceLimit;
    }
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

/** converts to Map and parses "package/*" to { prefix: "package/" } */
function remapRecordToMap(record: Record<string, string | false>) {
  const map = new Map<string | { prefix: string }, string | false | { prefix: string }>();
  let hasTemplate = false;
  for (const [key, value] of Object.entries(record)) {
    let parsedKey: string | { prefix: string } = key;
    let parsedValue: string | false | { prefix: string } = value;
    if (key.endsWith('/*')) {
      hasTemplate = true;
      parsedKey = { prefix: key.slice(0, -1) };
      if (typeof value === 'string' && value.endsWith('/*')) {
        parsedValue = { prefix: value.slice(0, -1) };
      }
    }
    map.set(parsedKey, parsedValue);
  }

  return [map, hasTemplate] as const;
}

// to avoid having to include @types/node
interface TracedErrorConstructor extends ErrorConstructor {
  stackTraceLimit?: number;
}
declare let Error: TracedErrorConstructor;
