export type IRequestRuleMapper = Record<string, string | false | string[]>;

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
   * Cache for resolved packages. Map keys are directoryPaths.
   * If not provided, resolver will create an internal Map (still caches).
   */
  resolvedPacakgesCache?: Map<string, IResolvedPackageJson | undefined>;

  /**
   * Resolution aliases
   * Map either a request prefix or an exact request (by adding $ at the end of it), to another request/prefix
   *
   * ex.
   * { xyz: '/abc/path/to/file.js' } -> import 'xyz' // output /abc/path/to/file.js
   *
   * Aliases take precedence over other module resolutions.
   */
  aliases?: IRequestRuleMapper;

  /**
   * Resolution fallback
   * Map either a request prefix or an exact request (by adding $ at the end of it), to another request/prefix
   *
   * ex.
   * { xyz: '/abc/path/to/file.js' } -> import 'xyz' // output /abc/path/to/file.js
   *
   * fallack take place if normal resolution failed.
   */
  fallback?: IRequestRuleMapper;
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
  statSync(path: string): { isFile(): boolean; isDirectory(): boolean; birthtime: Date; mtime: Date };
  readFileSync(path: string, encoding: 'utf8'): string;
  realpathSync(path: string): string;

  dirname(path: string): string;
  join(...paths: string[]): string;
  resolve(...pathSegments: string[]): string;
  isAbsolute(path: string): boolean;
}

export interface IResolvedPackageJson {
  filePath: string;
  directoryPath: string;
  mainPath?: string;
  browserMappings?: {
    [from: string]: string | false;
  };
}
