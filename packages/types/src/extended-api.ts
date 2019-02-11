import { IBaseFileSystemAsync, IBaseFileSystemSync, IFileSystemStats } from './base-api'

/**
 * SYNC and ASYNC file system.
 * Exposes all base fs APIs plus several higher level methods.
 */
export interface IFileSystem extends IFileSystemAsync, IFileSystemSync { }

/**
 * SYNC-only file system.
 * Exposes all base fs APIs plus several higher level methods.
 */
export interface IFileSystemSync extends IBaseFileSystemSync {
    /**
     * Check if a path points to an existing file.
     *
     * @param filePath possible file path.
     * @param statFn optional custom stat function (e.g. lstat to detect links).
     */
    fileExistsSync(filePath: string, statFn?: IBaseFileSystemSync['statSync']): boolean

    /**
     * Check if a path points to an existing directory.
     *
     * @param directoryPath possible directory path.
     * @param statFn optional custom stat function (e.g. lstatSync to detect links).
     */
    directoryExistsSync(directoryPath: string, statFn?: IBaseFileSystemSync['statSync']): boolean

    /**
     * Ensure that a directory and all its parent directories exist
     */
    ensureDirectorySync(directoryPath: string): void

    /**
     * Search for a specific file name in parent directory chain.
     * Useful for finding configuration or manifest files.
     *
     * @returns absolute path of first found file, or `null` if none found.
     */
    findClosestFileSync(initialDirectoryPath: string, fileName: string): string | null

    /**
     * Search for a specific file name in parent directory chain.
     * Useful for finding configuration or manifest files.
     *
     * @returns absolute paths of all found files (ordered from inner most directory and up).
     */
    findFilesInAncestorsSync(initialDirectory: string, fileName: string): string[]

    /**
     * Populates the provided directory with given contents.
     *
     * @returns absolute paths of written files.
     */
    populateDirectorySync(directoryPath: string, contents: IDirectoryContents): string[]

    /**
     * Recursively remove a path.
     */
    removeSync(path: string): void

    /**
     * Recursively walk over a directory and its contents.
     */
    // walkSync(rootDirectory: string, options?: IWalkOptions): IFileSystemDescriptor[]
}

/**
 * ASYNC-only file system.
 * Exposes all base fs APIs plus several higher level methods.
 */
export interface IFileSystemAsync extends IBaseFileSystemAsync {
    /**
     * Check if a path points to an existing file.
     *
     * @param filePath possible file path
     * @param statFn optional custom stat function (e.g. lstat to detect links)
     */
    fileExists(filePath: string, statFn?: IBaseFileSystemAsync['stat']): Promise<boolean>

    /**
     * Check if a path points to an existing directory.
     *
     * @param directoryPath possible directory path
     * @param statFn optional custom stat function (e.g. lstatSync to detect links)
     */
    directoryExists(directoryPath: string, statFn?: IBaseFileSystemAsync['stat']): Promise<boolean>

    /**
     * Ensure that a directory and all its parent directories exist
     */
    ensureDirectory(directoryPath: string): Promise<void>

    /**
     * Search for a specific file name in parent directory chain.
     * Useful for finding configuration or manifest files.
     *
     * @returns absolute path of first found file, or `null` if none found.
     */
    findClosestFile(initialDirectoryPath: string, fileName: string): Promise<string | null>

    /**
     * Search for a specific file name in parent chain.
     * Useful for finding configuration or manifest files.
     *
     * @returns absolute paths of all found files (ordered from inner most directory and up).
     */
    findFilesInAncestors(initialDirectory: string, fileName: string): Promise<string[]>

    /**
     * Populates the provided directory with given contents.
     *
     * @returns absolute paths of written files.
     */
    populateDirectory(directoryPath: string, contents: IDirectoryContents): Promise<string[]>

    /**
     * Recursively remove a path.
     */
    remove(path: string): Promise<void>

    /**
     * Recursively walk over a directory and its contents.
     */
    // walk(rootDirectory: string, options?: IWalkOptions): Promise<IFileSystemDescriptor[]>
}

/**
 * Descriptor object for an existing file system path.
 */
export interface IFileSystemDescriptor {
    /**
     * Base name of the file system node.
     *
     * @example 'package.json'
     */
    name: string

    /**
     * Absolute path to the file system node.
     *
     * @example '/path/to/package.json'
     */
    path: string

    /**
     * Stats for the path
     */
    stats: IFileSystemStats
}

/**
 * Walk method options
 */
export interface IWalkOptions {
    /**
     * Optional filter function that receives a descriptor and returns
     * whether it should be included in the result.
     *
     * Returning `false` for directories causes the walker to not read their children.
     */
    filter?(pathDesc: IFileSystemDescriptor): boolean
}

export interface IDirectoryContents {
    [nodeName: string]: string | IDirectoryContents
}
