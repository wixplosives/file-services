import { IFileSystemStats } from './common-fs-types'
import { IFileSystemPath } from './path'
import { IWatchService } from './watch-api'

/**
 * ASYNC-only base file system.
 * Contains a subset of `fs`, watch service, and path methods.
 */
export interface IBaseFileSystemAsync {
    path: IFileSystemPath
    watchService: IWatchService
    caseSensitive: boolean

    /**
     * Copy `sourcePath` to `destinationPath`.
     * By default, if destination already exists, it will be overwritten.
     *
     * @param flags passing `FileSystemConstants.COPYFILE_EXCL` will cause operation to fail if destination exists.
     */
    copyFile(sourcePath: string, destinationPath: string, flags?: number): Promise<void>

    /**
     * Read the entire contents of a file as a string.
     * If `encoding` isn't specified, 'utf8' is assumed.
     */
    readFile(filePath: string, encoding?: string): Promise<string>

    /**
     * Read the entire contents of a file as a Buffer.
     */
    readFileRaw(filePath: string): Promise<Buffer>

    /**
     * Write data to a file, replacing the file if already exists.
     * `encoding` is used when a string `content` (not `Buffer`) was provided (with default 'utf8').
     */
    writeFile(filePath: string, content: string | Buffer, encoding?: string): Promise<void>

    /**
     * Delete a name and possibly the file it refers to.
     */
    unlink(filePath: string): Promise<void>

    /**
     * Read the names of items in a directory.
     */
    readdir(directoryPath: string): Promise<string[]>

    /**
     * Create a directory.
     */
    mkdir(directoryPath: string): Promise<void>

    /**
     * Delete a directory.
     */
    rmdir(directoryPath: string): Promise<void>

    /**
     * Check if a path points to an existing file/directory/link.
     *
     * @param path possible file path.
     * @param statFn optional custom stat function (e.g. lstat to detect links).
     */
    exists(path: string): Promise<boolean>

    /**
     * Get path's `IFileSystemStats`.
     */
    stat(path: string): Promise<IFileSystemStats>

    /**
     * Get path's `IFileSystemStats`. Does not dereference symbolic links.
     */
    lstat(path: string): Promise<IFileSystemStats>

    /**
     * Gets the canonicalized absolute pathname.
     * If path is linked, returns the actual target path.
     */
    realpath(path: string): Promise<string>

    /**
     * Rename (move) a file or a directory
     */
    rename(sourcePath: string, destinationPath: string): Promise<void>
}
