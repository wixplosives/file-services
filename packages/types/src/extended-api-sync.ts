import { IWalkOptions, IDirectoryContents } from './common-fs-types'
import { IBaseFileSystemSync } from './base-api-sync'

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
     * Search for files inside `rootDirectory`.
     *
     * @returns absolute paths of all found files.
     */
    findFilesSync(rootDirectory: string, options?: IWalkOptions): string[]

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
