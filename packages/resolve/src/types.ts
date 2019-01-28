import { IFileSystemPath, IFileSystemSync } from '@file-services/types'

export interface IRequestResolverOptions {
    /**
     * File system to use when resolving requests.
     */
    fs: IResolutionFileSystem

    /**
     * Folders to use when searching for packages.
     *
     * @default ['node_modules']
     */
    packageRoots?: string[]

    /**
     * File extensions to try resolving the request with.
     *
     * @default ['.js', '.json']
     */
    extensions?: string[]

    /**
     * Whether to prefer the 'browser' field or 'main' field
     * in `package.json`.
     */
    target?: 'node' | 'browser'
}

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
export type RequestResolver = (contextPath: string, request: string) => IResolutionOutput | null

/**
 * Required fs APIs for request resolution.
 * Currently a subset of the sync base file system API.
 */
export interface IResolutionFileSystem {
    path: IFileSystemPath
    realpathSync: IFileSystemSync['realpathSync']
    fileExistsSync: IFileSystemSync['fileExistsSync']
    readFileSync: IFileSystemSync['readFileSync']
}
