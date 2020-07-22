import type { PackageJson } from 'type-fest';
import type { RequestResolver, IRequestResolverOptions } from './types';

const defaultTarget = 'browser';
const defaultPackageRoots = ['node_modules'];
const defaultExtensions = ['.js', '.json'];
const isRelative = (request: string) => request.startsWith('./') || request.startsWith('../');

export function createRequestResolver(options: IRequestResolverOptions): RequestResolver {
  const {
    fs: { fileExistsSync, directoryExistsSync, readFileSync, realpathSync, dirname, join, resolve, isAbsolute },
    packageRoots = defaultPackageRoots,
    extensions = defaultExtensions,
    target = defaultTarget,
    realpathCache = new Map<string, string>(),
  } = options;

  return requestResolver;

  function requestResolver(contextPath: string, request: string) {
    for (const resolvedFile of nodeRequestPaths(contextPath, request)) {
      if (fileExistsSync(resolvedFile)) {
        return { resolvedFile: cachedRealpathSync(resolvedFile) };
      }
    }
    return undefined;
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

  function* fileRequestPaths(requestPath: string) {
    yield requestPath;
    for (const ext of extensions) {
      yield requestPath + ext;
    }
  }

  function* directoryRequestPaths(requestPath: string) {
    if (!directoryExistsSync(requestPath)) {
      return;
    }
    const packageJsonPath = join(requestPath, 'package.json');
    const packageJson = safeReadJsonFileSync(packageJsonPath) as PackageJson;
    const mainField = packageJson?.main;
    const browserField = packageJson?.browser;

    if (target === 'browser' && typeof browserField === 'string') {
      const targetPath = join(requestPath, browserField);
      yield* fileRequestPaths(targetPath);
      yield* fileRequestPaths(join(targetPath, 'index'));
    } else if (typeof mainField === 'string') {
      const targetPath = join(requestPath, mainField);
      yield* fileRequestPaths(targetPath);
      yield* fileRequestPaths(join(targetPath, 'index'));
    } else {
      yield* fileRequestPaths(join(requestPath, 'index'));
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
    for (const directoryPath of pathChainToRoot(initialPath)) {
      for (const packageRoot of packageRoots) {
        yield join(directoryPath, packageRoot);
      }
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

  /** @returns parsed json value, or `undefined` if read/parse fails */
  function safeReadJsonFileSync(filePath: string): unknown {
    try {
      return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
    } catch {
      return undefined;
    }
  }
}
