import type { PackageJson } from 'type-fest';
import type { IRequestResolverOptions, IResolutionOutput, IResolvedPackageJson, RequestResolver } from './types.js';

const defaultPackageRoots = ['node_modules'];
const defaultExtensions = ['.js', '.json'];
const defaultConditions = ['browser', 'import', 'require'];
const isRelative = (request: string) =>
  request === '.' || request === '..' || request.startsWith('./') || request.startsWith('../');
const PACKAGE_JSON = 'package.json';
const statsNoThrowOptions = { throwIfNoEntry: false } as const;

export function createRequestResolver(options: IRequestResolverOptions): RequestResolver {
  const {
    fs: { statSync, readFileSync, realpathSync, dirname, join, resolve, isAbsolute },
    packageRoots = defaultPackageRoots,
    extensions = defaultExtensions,
    conditions = defaultConditions,
    resolvedPacakgesCache = new Map<string, IResolvedPackageJson | undefined>(),
    alias = {},
    fallback = {},
  } = options;

  const exportConditions = new Set(conditions);
  const targetsBrowser = exportConditions.has('browser');
  const targetsEsm = exportConditions.has('import');

  const loadPackageJsonFromCached = wrapWithCache(loadPackageJsonFrom, resolvedPacakgesCache);
  const remapUsingAlias = createRequestRemapper(alias);
  const remapUsingFallback = createRequestRemapper(fallback);

  return requestResolver;

  function requestResolver(contextPath: string, originalRequest: string): IResolutionOutput {
    const visitedPaths = new Set<string>();
    for (const request of requestsToTry(contextPath, originalRequest, visitedPaths)) {
      if (request === false) {
        return { resolvedFile: request, visitedPaths };
      }

      for (const resolvedFilePath of nodeRequestPaths(contextPath, request, visitedPaths)) {
        visitedPaths.add(resolvedFilePath);
        if (!statSyncSafe(resolvedFilePath)?.isFile()) {
          continue;
        }
        if (targetsBrowser) {
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
    const requestAlias = remapUsingAlias(request);
    let emittedCandidate = false;
    if (requestAlias !== undefined) {
      emittedCandidate = true;
      yield requestAlias;
    }

    if (!emittedCandidate && targetsBrowser) {
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
    const requestFallback = remapUsingFallback(request);
    if (requestFallback !== undefined) {
      yield requestFallback;
    }
  }

  function* nodeRequestPaths(contextPath: string, request: string, visitedPaths: Set<string>) {
    if (isRelative(request) || isAbsolute(request)) {
      const requestPath = resolve(contextPath, request);
      yield* fileRequestPaths(requestPath);
      yield* directoryRequestPaths(requestPath, visitedPaths);
    } else {
      yield* packageRequestPaths(contextPath, request, visitedPaths);
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

  function* directoryRequestPaths(directoryPath: string, visitedPaths: Set<string>) {
    if (!statSyncSafe(directoryPath)?.isDirectory()) {
      return;
    }
    const resolvedPackageJson = loadPackageJsonFromCached(directoryPath);
    if (resolvedPackageJson !== undefined) {
      visitedPaths.add(resolvedPackageJson.filePath);
    }

    const mainPath = resolvedPackageJson?.mainPath;

    if (mainPath !== undefined) {
      yield* fileOrDirIndexRequestPaths(join(directoryPath, mainPath));
    } else {
      yield* fileRequestPaths(join(directoryPath, 'index'));
    }
  }

  function* packageRequestPaths(initialPath: string, request: string, visitedPaths: Set<string>) {
    const [packageName, innerPath] = parsePackageSpecifier(request);
    if (!packageName.length || (packageName.startsWith('@') && !packageName.includes('/'))) {
      return;
    }

    const ownPackageJson = findUpPackageJson(initialPath);
    if (ownPackageJson !== undefined) {
      visitedPaths.add(ownPackageJson.filePath);
      if (ownPackageJson.name === packageName) {
        if (ownPackageJson.exports !== undefined) {
          yield* matchExportsField(
            ownPackageJson.directoryPath,
            ownPackageJson.exports,
            innerPath,
            ownPackageJson.hasPatternExports
          );
          return;
        }
      }
    }

    for (const packagesPath of packageRootsToPaths(initialPath)) {
      if (!statSyncSafe(packagesPath)?.isDirectory()) {
        continue;
      }
      const packageDirectoryPath = join(packagesPath, packageName);
      const resolvedPackageJson = loadPackageJsonFromCached(packageDirectoryPath);
      if (resolvedPackageJson !== undefined) {
        visitedPaths.add(resolvedPackageJson.filePath);
      }
      if (resolvedPackageJson?.exports !== undefined) {
        yield* matchExportsField(
          packageDirectoryPath,
          resolvedPackageJson.exports,
          innerPath,
          resolvedPackageJson.hasPatternExports
        );
        return;
      }
      const requestInPackages = join(packagesPath, request);
      yield* fileRequestPaths(requestInPackages);
      yield* directoryRequestPaths(requestInPackages, visitedPaths);
    }
  }

  function* matchExportsField(
    contextPath: string,
    exportConditions: PackageJson.ExportConditions,
    innerPath: string,
    hasPatternExports?: boolean
  ) {
    const exactMatchExports = exportConditions[innerPath];
    if (exactMatchExports !== undefined) {
      yield* resolveExportConditions(contextPath, exactMatchExports);
    } else if (hasPatternExports) {
      const matchedPattern = matchSubpathPatterns(exportConditions, innerPath);
      if (matchedPattern !== undefined) {
        yield join(contextPath, matchedPattern);
      }
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
    if (targetsBrowser && typeof browser === 'object' && browser !== null) {
      browserMappings = Object.create(null) as Record<string, string | false>;
      for (const [from, to] of Object.entries(browser)) {
        const resolvedFrom = isRelative(from) ? resolveRelative(join(directoryPath, from)) : from;
        if (resolvedFrom && to !== undefined) {
          const resolvedTo = resolveRemappedRequest(directoryPath, to);
          if (resolvedTo !== undefined) {
            browserMappings[resolvedFrom] = resolvedTo;
          }
        }
      }
    }

    const [desugerifiedExports, hasPatternExports] = desugarifyExportsField(packageJson.exports);

    return {
      name: packageJson.name,
      filePath: packageJsonPath,
      directoryPath,
      mainPath,
      browserMappings,
      exports: desugerifiedExports,
      hasPatternExports,
    };
  }

  function* resolveExportConditions(directoryPath: string, exportedValue: PackageJson.Exports): Generator<string> {
    if (exportedValue === null) {
      return;
    } else if (typeof exportedValue === 'string') {
      yield join(directoryPath, exportedValue);
    } else if (typeof exportedValue === 'object') {
      if (Array.isArray(exportedValue)) {
        for (const arrayItem of exportedValue) {
          yield* resolveExportConditions(directoryPath, arrayItem);
        }
      } else {
        for (const [key, value] of Object.entries(exportedValue)) {
          if (key === 'default' || exportConditions.has(key)) {
            yield* resolveExportConditions(directoryPath, value);
          }
        }
      }
    }
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

  function packageJsonTarget({ main, browser, module: moduleFieldValue }: PackageJson): string | undefined {
    if (targetsBrowser && typeof browser === 'string') {
      return browser;
    } else if (targetsEsm && typeof moduleFieldValue === 'string') {
      return moduleFieldValue;
    }
    return typeof main === 'string' ? main : undefined;
  }

  /**
   * Generates a path chain from the current path to the root directory.
   *
   * @param currentPath The current path to start the chain from.
   * @yields The current path and continues to yield the parent directory path until the root directory is reached.
   */
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

function matchSubpathPatterns(exportedSubpaths: PackageJson.ExportConditions, innerPath: string): string | undefined {
  let matchedPattern: string | undefined;
  for (const [patternKey, patternValue] of Object.entries(exportedSubpaths)) {
    const keyStarIdx = patternKey.indexOf('*');
    if (keyStarIdx === -1 || patternKey.indexOf('*', keyStarIdx + 1) !== -1) {
      continue;
    }
    const keyPrefix = patternKey.slice(0, keyStarIdx);
    if (!innerPath.startsWith(keyPrefix)) {
      continue;
    }
    const keySuffix = patternKey.slice(keyStarIdx + 1);
    if (keySuffix && !innerPath.endsWith(keySuffix)) {
      continue;
    }
    if (patternValue === null) {
      return undefined;
    } else if (typeof patternValue === 'string') {
      const keyStarValue = innerPath.slice(keyPrefix.length, -keySuffix.length);
      const valueStarIdx = patternValue.indexOf('*');
      if (valueStarIdx === -1 || patternValue.indexOf('*', valueStarIdx + 1) !== -1) {
        continue;
      }
      const valuePrefix = patternValue.slice(0, valueStarIdx);
      const valueSuffix = patternValue.slice(valueStarIdx + 1);
      matchedPattern = valuePrefix + keyStarValue + valueSuffix;
    }
  }
  return matchedPattern;
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

type ParsedTemplate = { prefix: string };

/**
 * Create a function that accepts a string and returns T | undefined.
 * The remapper supports paths ending with "/*", both in key and value.
 */
export function createRequestRemapper<T extends string | false>(
  mapping: Record<string, T>
): (request: string) => T | undefined {
  const parsedTemplateMap = new Map<string | ParsedTemplate, T | ParsedTemplate>();
  let hasTemplate = false;
  for (const [key, value] of Object.entries(mapping)) {
    let parsedKey: string | ParsedTemplate = key;
    let parsedValue: T | ParsedTemplate = value;
    if (key.endsWith('/*')) {
      hasTemplate = true;
      parsedKey = { prefix: key.slice(0, -1) };
      if (typeof value === 'string' && value.endsWith('/*')) {
        parsedValue = { prefix: value.slice(0, -1) };
      }
    }
    parsedTemplateMap.set(parsedKey, parsedValue);
  }

  return hasTemplate
    ? (request) => getFromParsedTemplateMap(parsedTemplateMap, request)
    : (request) => parsedTemplateMap.get(request) as T | undefined;
}

function getFromParsedTemplateMap<T extends string | false>(
  map: Map<string | ParsedTemplate, T | ParsedTemplate>,
  request: string
): T | undefined {
  for (const [key, value] of map) {
    const keyType = typeof key;
    if (keyType === 'string') {
      if (request === key) {
        return value as T;
      }
    } else if (keyType === 'object') {
      const { prefix: keyPrefix } = key as ParsedTemplate;
      if (request.startsWith(keyPrefix) && request.length > keyPrefix.length) {
        return typeof value === 'object' ? ((value.prefix + request.slice(keyPrefix.length)) as T) : value;
      }
    }
  }
  return undefined;
}

// to avoid having to include @types/node
interface TracedErrorConstructor extends ErrorConstructor {
  stackTraceLimit?: number;
}
declare let Error: TracedErrorConstructor;

/**
 * Parse a package specifier into a tuple of package name and path in package.
 * Handles both scoped and non-scoped package specifiers and returns a default path of '.' if no path is specified.
 *
 * @param specifier - The package specifier to parse.
 * @example parsePackageSpecifier('react-dom') === ['react-dom', "."]
 * @example parsePackageSpecifier('react-dom/client') === ['react-dom', './client']
 * @example parsePackageSpecifier('@stylable/core') === ['@stylable/core', "./core"]
 * @example parsePackageSpecifier('@stylable/core/dist/some-file') === ['@stylable/core', './dist/some-file']
 */
function parsePackageSpecifier(specifier: string): readonly [packageName: string, pathInPackage: string] {
  const firstSlashIdx = specifier.indexOf('/');
  if (firstSlashIdx === -1) {
    return [specifier, '.'];
  }
  const isScopedPackage = specifier.startsWith('@');
  if (isScopedPackage) {
    const secondSlashIdx = specifier.indexOf('/', firstSlashIdx + 1);
    return secondSlashIdx === -1
      ? [specifier, '.']
      : [specifier.slice(0, secondSlashIdx), '.' + specifier.slice(secondSlashIdx)];
  } else {
    return [specifier.slice(0, firstSlashIdx), '.' + specifier.slice(firstSlashIdx)];
  }
}

/**
 * Desugarify the `exports` field of a package.json file.
 *
 * If `exports` is a string or an array, it is converted to an object with a single key of `'.'`.
 * If `exports` is already an object and has a key of `'.'` or starts with `'./'`, it is returned as is.
 * Otherwise, `exports` is wrapped in an object with a single key of `'.'`.
 *
 * @param packageExports - The `exports` field of a package.json file.
 * @returns tuple containing the desugarified `exports` field, with a flag saying whether it includes pattern exports.
 */
function desugarifyExportsField(
  packageExports: PackageJson.Exports | undefined
): [PackageJson.ExportConditions | undefined, boolean] {
  let hasPatternExports = false;
  if (packageExports === undefined || packageExports === null) {
    packageExports = undefined;
  } else if (typeof packageExports === 'string' || Array.isArray(packageExports)) {
    packageExports = { '.': packageExports };
  } else {
    for (const key of Object.keys(packageExports)) {
      if (key.includes('*')) {
        hasPatternExports = true;
      }
      if (key !== '.' && !key.startsWith('./')) {
        packageExports = { '.': packageExports };
        hasPatternExports = false;
        break;
      }
    }
  }
  return [packageExports, hasPatternExports];
}
