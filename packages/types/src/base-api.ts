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

    renameSync(filePath: string, newFilePath: string): void
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
