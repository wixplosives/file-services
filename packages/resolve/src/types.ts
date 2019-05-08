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
}

export interface IResolutionOutput {
    resolvedFile: string;
}

/**
 * Resolves requests across modules, using the node resolution algorithm.
 *
 * @param contextPath directory in which the request is being made
 * @param request actual request, relative or absolute
 */
export type RequestResolver = (contextPath: string, request: string) => IResolutionOutput | undefined;

/**
 * Required fs APIs for request resolution.
 * Currently a subset of the sync base file system API.
 */
export interface IResolutionFileSystem {
    path: {
        dirname(path: string): string;
        join(...paths: string[]): string;
        resolve(...pathSegments: string[]): string;
        isAbsolute(path: string): boolean;
        basename(path: string): string;
    };
    fileExistsSync(path: string): boolean;
    readFileSync(path: string, encoding: 'utf8'): string;
}
