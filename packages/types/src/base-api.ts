import { IWatchService } from './watch-api'
import { IFileSystemPath } from './path'

/**
 * SYNC and ASYNC file system containing
 * Contains a subset of `fs`, watch service, and path methods
 */
export interface IBaseFileSystem extends IBaseFileSystemAsync, IBaseFileSystemSync { }

/**
 * SYNC-only, base file system
 * Contains a subset of `fs`, watch service, and path methods
 */
export interface IBaseFileSystemSync {
    path: IFileSystemPath
    watchService: IWatchService
    caseSensitive: boolean

    /**
     * Reads the entire contents of a file.
     */
    readFileSync(filePath: string): string

    /**
     * Writes data to a file, replacing the file if already exists.
     */
    writeFileSync(filePath: string, content: string): void

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
     * Get path's stats.
     */
    statSync(path: string): IFileSystemStats

    /**
     * Get path's stats. Does not dereference symbolic links.
     */
    lstatSync(path: string): IFileSystemStats

    /**
     * Returns the canonicalized absolute pathname.
     * If path is linked, returns the actual target path.
     */
    realpathSync(path: string): string
}

/**
 * ASYNC-only, base file system
 * Contains a subset of `fs`, watch service, and path methods
 */
export interface IBaseFileSystemAsync {
    path: IFileSystemPath
    watchService: IWatchService
    caseSensitive: boolean

    /**
     * Reads the entire contents of a file.
     */
    readFile(filePath: string): Promise<string>

    /**
     * Writes data to a file, replacing the file if it already exists.
     */
    writeFile(filePath: string, content: string): Promise<void>

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
     * Get path's stats.
     */
    stat(path: string): Promise<IFileSystemStats>

    /**
     * Get path's stats. Does not dereference symbolic links.
     */
    lstat(path: string): Promise<IFileSystemStats>

    /**
     * Returns the canonicalized absolute pathname.
     * If path is linked, returns the actual target path.
     */
    realpath(path: string): Promise<string>
}

/**
 * Subset of the original `fs.Stats` interface
 */
export interface IFileSystemStats {
    /**
     * Creation time
     */
    birthtime: Date

    /**
     * Modification time
     */
    mtime: Date

    /**
     * is the path pointing to a file
     */
    isFile(): boolean

    /**
     * is the path pointing to a directory
     */
    isDirectory(): boolean

    /**
     * is the path pointing to a symbolic link
     */
    isSymbolicLink(): boolean
}
