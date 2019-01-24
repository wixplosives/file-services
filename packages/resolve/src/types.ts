export interface IResolutionOutput {
    resolvedFile: string
}

/**
 * Resolves requests across modules, using the node
 * resolution algorithm.
 *
 * @param contextPath directory in which the request is being made
 * @param request actual request, relative or absolute
 */
export type RequestResolver = (
    contextPath: string,
    request: string
) => IResolutionOutput | null

/**
 * Required APIs for resolution.
 * Currently a subset of the sync base file system API.
 */
export interface IResolutionHost {
    path: {
        basename(path: string): string
        dirname(path: string): string
        join(...pathSegments: string[]): string
        resolve(...pathSegments: string[]): string
        isAbsolute(path: string): boolean
    }
    realpathSync(path: string): string
    fileExistsSync(filePath: string): boolean
    readFileSync(filePath: string): string
}
