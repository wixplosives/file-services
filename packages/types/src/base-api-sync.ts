import { IFileSystemStats } from './common-fs-types'
import { IFileSystemPath } from './path'
import { IWatchService } from './watch-api'

/**
 * SYNC-only base file system.
 * Contains a subset of `fs`, watch service, and path methods.
 */
export interface IBaseFileSystemSync {
    path: IFileSystemPath
    watchService: IWatchService
    caseSensitive: boolean

    /**
     * Get the current working directory.
     * Non-absolute calls to any file system method are resolved using this path.
     *
     * @returns absolute path to the current working directory.
     */
    cwd(): string

    /**
     * Change the working directory.
     *
     * @directoryPath path to the new working directory.
     */
    chdir(directoryPath: string): void

    /**
     * Copy `sourcePath` to `destinationPath`.
     * By default, if destination already exists, it will be overwritten.
     *
     * @param flags passing `FileSystemConstants.COPYFILE_EXCL` will cause operation to fail if destination exists.
     */
    copyFileSync(sourcePath: string, destinationPath: string, flags?: number): void

    /**
     * Read the entire contents of a file as a string.
     * If `encoding` isn't specified, 'utf8' is assumed.
     */
    readFileSync(filePath: string, encoding?: string): string

    /**
     * Read the entire contents of a file as a Buffer.
     */
    readFileRawSync(filePath: string): Buffer

    /**
     * Write data to a file, replacing the file if already exists.
     * `encoding` is used when a string `content` (not `Buffer`) was provided (with default 'utf8').
     */
    writeFileSync(filePath: string, content: string | Buffer, encoding?: string): void

    /**
     * Delete a name and possibly the file it refers to.
     */
    unlinkSync(filePath: string): void

    /**
     * Read the names of items in a directory.
     */
    readdirSync(directoryPath: string): string[]

    /**
     * Create a new directory.
     */
    mkdirSync(directoryPath: string): void

    /**
     * Delete an existing directory.
     */
    rmdirSync(directoryPath: string): void

    /**
     * Check if a path points to an existing file/directory/link.
     *
     * @param path possible file path.
     * @param statFn optional custom stat function (e.g. lstat to detect links).
     */
    existsSync(path: string): boolean

    /**
     * Get path's `IFileSystemStats`.
     */
    statSync(path: string): IFileSystemStats

    /**
     * Get path's `IFileSystemStats`. Does not dereference symbolic links.
     */
    lstatSync(path: string): IFileSystemStats

    /**
     * Get the canonicalized absolute pathname.
     * If path is linked, returns the actual target path.
     */
    realpathSync(path: string): string

    /**
     * Rename (move) a file or a directory
     */
    renameSync(sourcePath: string, destinationPath: string): void
}
