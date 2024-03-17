import { PackageJson } from "type-fest";

export interface IRequestResolverOptions {
  /**
   * File system to use when resolving requests.
   */
  fs: IResolutionFileSystem;

  /**
   * Folders to use when searching for packages.
   *
   * @default ['node_modules']
   */
  packageRoots?: string[];

  /**
   * File extensions to try resolving the request with.
   *
   * @default ['.js', '.json']
   */
  extensions?: string[];

  /**
   * Package export conditions to try resolving the request with.
   *
   * @default ['browser', 'import', 'require']
   * @see https://nodejs.org/api/packages.html#conditional-exports
   */
  conditions?: string[];

  /**
   * Cache for resolved packages. Map keys are directoryPaths.
   * If not provided, resolver will create an internal Map (still caches).
   */
  resolvedPacakgesCache?: Map<string, IResolvedPackageJson | undefined>;

  /**
   * Aliases for package requests.
   * Record key is the request to be mapped, value is the new target.
   * Alias is attempted before original request.
   */
  alias?: Record<string, string | false>;

  /**
   * Fallback for package requests.
   * Record key is the request to be mapped, value is the new target.
   * Original request is attempted before fallback.
   */
  fallback?: Record<string, string | false>;
}

export interface IResolutionOutput {
  /**
   * `string` - absolute path to resolved file.
   * `false` - request should receive an empty object during runtime (mapped by `"browser"` field in `package.json`).
   * `undefined` - couldn't resolve request.
   */
  resolvedFile?: string | false;

  /**
   * When an internal package request is re-mapped to `false`, this will point to the original
   * filePath this request pointed to.
   */
  originalFilePath?: string;

  /**
   * All paths resolver visited before getting to `resolvedFile`.
   */
  visitedPaths: Set<string>;
}

/**
 * Resolves requests across modules, using the node resolution algorithm.
 *
 * @param contextPath directory in which the request is being made
 * @param request actual request, relative or absolute
 */
export type RequestResolver = (contextPath: string, request: string) => IResolutionOutput;

/**
 * Required fs APIs for request resolution.
 * Currently a subset of the sync base file system API.
 */
export interface IResolutionFileSystem {
  statSync(
    path: string,
    options?: { throwIfNoEntry?: false },
  ): { isFile(): boolean; isDirectory(): boolean } | undefined;
  readFileSync(path: string, encoding: "utf8"): string;
  realpathSync(path: string): string;

  dirname(path: string): string;
  join(...paths: string[]): string;
  resolve(...pathSegments: string[]): string;
  isAbsolute(path: string): boolean;
}

export interface IResolvedPackageJson {
  filePath: string;
  directoryPath: string;
  name?: string;
  main?: string;
  module?: string;
  browser?: string;
  browserMappings?: {
    [from: string]: string | false;
  };
  exports?: PackageJson.ExportConditions;
  imports?: PackageJson.Imports;
  hasPatternExports?: boolean;
  hasPatternImports?: boolean;
}
