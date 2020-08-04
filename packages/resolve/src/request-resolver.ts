import type { PackageJson } from 'type-fest';
import type { RequestResolver, IRequestResolverOptions, IResolvedPackageJson } from './types';

const defaultTarget = 'browser';
const defaultPackageRoots = ['node_modules'];
const defaultExtensions = ['.js', '.json'];
const isRelative = (request: string) => request.startsWith('./') || request.startsWith('../');
const PACKAGE_JSON = 'package.json';

export function createRequestResolver(options: IRequestResolverOptions): RequestResolver {
  const {
    fs: { statSync, readFileSync, realpathSync, dirname, join, resolve, isAbsolute },
    packageRoots = defaultPackageRoots,
    extensions = defaultExtensions,
    target = defaultTarget,
    realpathCache = new Map<string, string>(),
    resolvedPacakgesCache = new Map<string, IResolvedPackageJson | undefined>(),
  } = options;

  const realpathSyncSafeCached = createCachedFn(realpathSyncSafe, realpathCache);
  const loadPackageJsonFromCached = createCachedFn(loadPackageJsonFrom, resolvedPacakgesCache);

  return requestResolver;

  function requestResolver(contextPath: string, originalRequest: string) {
    let request: string | false = originalRequest;
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
          };
        }
      }
      return { resolvedFile: realpathSyncSafeCached(resolvedFile) };
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
        return realpathSyncSafeCached(filePath);
      }
    }
    return undefined;
  }

  function realpathSyncSafe(itemPath: string): string {
    try {
      return realpathSync(itemPath);
    } catch {
      return itemPath;
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
    try {
      return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
    } catch {
      return undefined;
    }
  }

  function statSyncSafe(path: string) {
    try {
      return statSync(path);
    } catch {
      return undefined;
    }
  }
}

function createCachedFn<K, T>(fn: (key: K) => T, cache = new Map<K, T>()) {
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
