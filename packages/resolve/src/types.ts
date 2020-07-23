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
   * Whether to prefer the 'browser' field or 'main' field
   * in `package.json`.
   */
  target?: 'node' | 'browser';

  /**
   * Cache for `realpathSync` results.
   * If not provided, resolver will create an internal Map (still caches).
   */
  realpathCache?: Map<string, string>;
}

export interface IResolutionOutput {
  resolvedFile?: string | false;
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
  dirname(path: string): string;
  join(...paths: string[]): string;
  resolve(...pathSegments: string[]): string;
  isAbsolute(path: string): boolean;
  fileExistsSync(path: string): boolean;
  directoryExistsSync(path: string): boolean;
  readFileSync(path: string, encoding: 'utf8'): string;
  realpathSync(path: string): string;
}
