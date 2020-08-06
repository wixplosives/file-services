import type { PackageJson } from 'type-fest';
import type { RequestResolver, IRequestResolverOptions } from './types';

const defaultTarget = 'browser';
const defaultPackageRoots = ['node_modules'];
const defaultExtensions = ['.js', '.json'];
const isRelative = (request: string) => request.startsWith('./') || request.startsWith('../');
const PACKAGE_JSON = 'package.json';

export interface IResolvedPackageJson {
  filePath: string;
  directoryPath: string;
  mainPath?: string;
  browserMappings?: {
    [from: string]: string | false;
  };
}

export function createRequestResolver(options: IRequestResolverOptions): RequestResolver {
  const {
    fs: { fileExistsSync, directoryExistsSync, readFileSync, realpathSync, dirname, join, resolve, isAbsolute },
    packageRoots = defaultPackageRoots,
    extensions = defaultExtensions,
    target = defaultTarget,
    realpathCache = new Map<string, string>(),
  } = options;

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
      if (fileExistsSync(resolvedFile)) {
        if (target === 'browser') {
          const toPackageJson = findUpPackageJson(dirname(resolvedFile));
          const remappedRequest = toPackageJson?.browserMappings?.[resolvedFile];
          if (remappedRequest !== undefined) {
            return {
              resolvedFile: remappedRequest === false ? remappedRequest : cachedRealpathSync(remappedRequest),
            };
          }
        }

        return { resolvedFile: cachedRealpathSync(resolvedFile) };
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

  function* fileRequestPaths(filePath: string) {
    yield filePath;
    for (const ext of extensions) {
      yield filePath + ext;
    }
  }

  function* fileOrDirIndexRequestPaths(targetPath: string) {
    yield* fileRequestPaths(targetPath);
    yield* fileRequestPaths(join(targetPath, 'index'));
  }

  function* directoryRequestPaths(directoryPath: string) {
    if (!directoryExistsSync(directoryPath)) {
      return;
    }
    const resolvedPackageJson = loadPackageJsonFrom(directoryPath);
    const mainPath = resolvedPackageJson?.mainPath;

    if (mainPath !== undefined) {
      yield* fileOrDirIndexRequestPaths(join(directoryPath, mainPath));
    } else {
      yield* fileRequestPaths(join(directoryPath, 'index'));
    }
  }

  function* packageRequestPaths(initialPath: string, request: string) {
    for (const packagesPath of packageRootsToPaths(initialPath)) {
      if (!directoryExistsSync(packagesPath)) {
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
      const resolvedPackageJson = loadPackageJsonFrom(directoryPath);
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
      if (fileExistsSync(filePath)) {
        return filePath;
      }
    }
    return undefined;
  }

  function cachedRealpathSync(itemPath: string): string {
    try {
      const cachedRealpath = realpathCache.get(itemPath);
      if (cachedRealpath !== undefined) {
        return cachedRealpath;
      } else {
        const actualPath = realpathSync(itemPath);
        realpathCache.set(itemPath, actualPath);
        return actualPath;
      }
    } catch {
      realpathCache.set(itemPath, itemPath);
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

  /** @returns parsed json value, or `undefined` if read/parse fails */
  function readJsonFileSyncSafe(filePath: string): unknown {
    try {
      return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
    } catch {
      return undefined;
    }
  }
}
