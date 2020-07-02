import type { RequestResolver, IRequestResolverOptions } from './types';

const defaultTarget = 'browser';
const defaultPackageRoots = ['node_modules'];
const defaultExtensions = ['.js', '.json'];
const isRelative = (request: string) => request.startsWith('./') || request.startsWith('../');

export function createRequestResolver(options: IRequestResolverOptions): RequestResolver {
  const {
    fs: { fileExistsSync, directoryExistsSync, readFileSync, dirname, join, resolve, isAbsolute },
    packageRoots = defaultPackageRoots,
    extensions = defaultExtensions,
    target = defaultTarget,
  } = options;

  return (contextPath, request) => {
    for (const resolvedFile of requestCandidates(contextPath, request)) {
      if (fileExistsSync(resolvedFile)) {
        return { resolvedFile };
      }
    }
    return undefined;
  };

  function* requestCandidates(contextPath: string, request: string) {
    if (isRelative(request) || isAbsolute(request)) {
      const requestPath = resolve(contextPath, request);
      yield* resolveAsFile(requestPath);
      yield* resolveAsDirectory(requestPath);
    } else {
      yield* resolveAsPackage(contextPath, request);
    }
  }

  function* resolveAsFile(requestPath: string) {
    yield requestPath;
    for (const ext of extensions) {
      yield requestPath + ext;
    }
  }

  function* resolveAsDirectory(requestPath: string) {
    const packageJsonPath = join(requestPath, 'package.json');
    const packageJson = safeReadJsonFileSync(packageJsonPath) as Record<string, unknown> | undefined;
    const mainField = packageJson?.main;
    const browserField = packageJson?.browser;

    if (target === 'browser' && typeof browserField === 'string') {
      const targetPath = join(requestPath, browserField);
      yield* resolveAsFile(targetPath);
      yield* resolveAsFile(join(targetPath, 'index'));
    } else if (typeof mainField === 'string') {
      const targetPath = join(requestPath, mainField);
      yield* resolveAsFile(targetPath);
      yield* resolveAsFile(join(targetPath, 'index'));
    }
    yield* resolveAsFile(join(requestPath, 'index'));
  }

  function* resolveAsPackage(initialPath: string, request: string) {
    for (const packagesPath of packageRootsToPaths(initialPath)) {
      if (!directoryExistsSync(packagesPath)) {
        continue;
      }
      const requestInPackages = join(packagesPath, request);
      yield* resolveAsFile(requestInPackages);
      yield* resolveAsDirectory(requestInPackages);
    }
  }

  function* packageRootsToPaths(initialPath: string) {
    for (const directoryPath of pathChainToTopLevel(initialPath)) {
      for (const packageRoot of packageRoots) {
        yield join(directoryPath, packageRoot);
      }
    }
  }

  function* pathChainToTopLevel(currentPath: string) {
    let lastPath: string | undefined;
    while (lastPath !== currentPath) {
      yield currentPath;
      lastPath = currentPath;
      currentPath = dirname(currentPath);
    }
  }

  function safeReadJsonFileSync(filePath: string): unknown {
    try {
      return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
    } catch (e) {
      return undefined;
    }
  }
}
