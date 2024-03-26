import type {
  BufferEncoding,
  FSWatcher,
  IDirectoryEntry,
  IFileSystemStats,
  ReadFileOptions,
  RmOptions,
  StatSyncOptions,
  WatchOptions,
  WriteFileOptions,
} from "./common-fs-types";
import type { IFileSystemPath } from "./path";
import type { IWatchService } from "./watch-api";

/**
 * SYNC-only base file system.
 * Contains a subset of `fs`, watch service, and path methods.
 */
export interface IBaseFileSystemSync extends IBaseFileSystemSyncActions, IFileSystemPath {
  /** @deprecated use `fs.watch()` instead. */
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
  readFileSync(path: string, options?: { encoding?: null; flag?: string } | null): Uint8Array;
  readFileSync(path: string, options: { encoding: BufferEncoding; flag?: string } | BufferEncoding): string;
  readFileSync(path: string, options?: ReadFileOptions): string | Uint8Array;

  /**
   * Write data to a file, replacing the file if already exists.
   * `encoding` is used when a string `content` (not `Uint8Array`) was provided (with default 'utf8').
   */
  writeFileSync(path: string, data: string | Uint8Array, options?: WriteFileOptions): void;

  /**
   * Delete a name and possibly the file it refers to.
   */
  unlinkSync(filePath: string): void;

  /**
   * Read the names of items in a directory.
   */
  readdirSync(
    directoryPath: string,
    options?: { encoding: BufferEncoding | null; withFileTypes?: false } | BufferEncoding | null,
  ): string[];
  readdirSync(directoryPath: string, options: { withFileTypes: true }): IDirectoryEntry[];

  /**
   * Create a new directory.
   */
  mkdirSync(directoryPath: string, options?: { recursive?: boolean }): string | undefined;

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
  statSync(path: string, options?: StatSyncOptions & { throwIfNoEntry?: true }): IFileSystemStats;
  statSync(path: string, options: StatSyncOptions & { throwIfNoEntry: false }): IFileSystemStats | undefined;
  statSync(path: string, options?: StatSyncOptions): IFileSystemStats | undefined;

  /**
   * Get path's `IFileSystemStats`. Does not dereference symbolic links.
   */
  lstatSync(path: string, options?: StatSyncOptions & { throwIfNoEntry?: true }): IFileSystemStats;
  lstatSync(path: string, options: StatSyncOptions & { throwIfNoEntry: false }): IFileSystemStats | undefined;
  lstatSync(path: string, options?: StatSyncOptions): IFileSystemStats | undefined;

  /**
   * Get the canonicalized absolute pathname.
   * If path is linked, returns the actual target path.
   */
  realpathSync: {
    (path: string): string;
    native(path: string): string;
  };

  /**
   * Rename (move) a file or a directory
   */
  renameSync(sourcePath: string, destinationPath: string): void;

  /**
   * Read value of a symbolic link.
   */
  readlinkSync(path: string): string;

  /**
   * Creates a symbolic link for `target` at `path`. default type is 'file'.
   */
  symlinkSync(target: string, path: string, type?: "dir" | "file" | "junction"): void;

  /**
   * Removes files and directories.
   */
  rmSync(path: string, options?: RmOptions): void;

  /**
   * Changes the permissions of a file.
   */
  chmodSync(path: string, mode: number | string): void;

  /** Watch a file or a directory (optionally recursively). */
  watch(path: string, options?: WatchOptions): FSWatcher;
}
