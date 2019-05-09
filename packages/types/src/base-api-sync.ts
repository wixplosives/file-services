import {
    IFileSystemStats,
    BufferEncoding,
    WriteFileOptions,
    ReadFileOptions,
    IDirectoryEntry
} from './common-fs-types';
import { IFileSystemPath } from './path';
import { IWatchService } from './watch-api';

/**
 * SYNC-only base file system.
 * Contains a subset of `fs`, watch service, and path methods.
 */
export interface IBaseFileSystemSync extends IBaseFileSystemSyncActions {
    path: IFileSystemPath;
    watchService: IWatchService;
    caseSensitive: boolean;
}

export interface IBaseFileSystemSyncActions {
    /**
     * Get the current working directory.
     * Non-absolute calls to any file system method are resolved using this path.
     *
     * @returns absolute path to the current working directory.
     */
    cwd(): string;

    /**
     * Change the working directory.
     *
     * @directoryPath path to the new working directory.
     */
    chdir(directoryPath: string): void;

    /**
     * Copy `sourcePath` to `destinationPath`.
     * By default, if destination already exists, it will be overwritten.
     *
     * @param flags passing `FileSystemConstants.COPYFILE_EXCL` will cause operation to fail if destination exists.
     */
    copyFileSync(sourcePath: string, destinationPath: string, flags?: number): void;

    /**
     * Read the entire contents of a file.
     */
    readFileSync(path: string, options?: { encoding?: null; flag?: string } | null): Buffer;
    readFileSync(path: string, options: { encoding: BufferEncoding; flag?: string } | BufferEncoding): string;
    readFileSync(path: string, options: ReadFileOptions): string | Buffer;

    /**
     * Write data to a file, replacing the file if already exists.
     * `encoding` is used when a string `content` (not `Buffer`) was provided (with default 'utf8').
     */
    writeFileSync(path: string, data: string | Buffer, options?: WriteFileOptions): void;

    /**
     * Delete a name and possibly the file it refers to.
     */
    unlinkSync(filePath: string): void;

    /**
     * Read the names of items in a directory.
     */
    readdirSync(
        directoryPath: string,
        options?: { encoding?: BufferEncoding | null; withFileTypes?: false } | BufferEncoding | null
    ): string[];
    readdirSync(directoryPath: string, options: { withFileTypes: true }): IDirectoryEntry[];

    /**
     * Create a new directory.
     */
    mkdirSync(directoryPath: string): void;

    /**
     * Delete an existing directory.
     */
    rmdirSync(directoryPath: string): void;

    /**
     * Check if a path points to an existing file/directory/link.
     *
     * @param path possible file path.
     * @param statFn optional custom stat function (e.g. lstat to detect links).
     */
    existsSync(path: string): boolean;

    /**
     * Get path's `IFileSystemStats`.
     */
    statSync(path: string): IFileSystemStats;

    /**
     * Get path's `IFileSystemStats`. Does not dereference symbolic links.
     */
    lstatSync(path: string): IFileSystemStats;

    /**
     * Get the canonicalized absolute pathname.
     * If path is linked, returns the actual target path.
     */
    realpathSync(path: string): string;

    /**
     * Rename (move) a file or a directory
     */
    renameSync(sourcePath: string, destinationPath: string): void;

    /**
     * Read value of a symbolic link.
     */
    readlinkSync(path: string): string;
}
