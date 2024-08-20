import type {
  BufferEncoding,
  IDirectoryEntry,
  IFileSystemStats,
  ReadFileOptions,
  RmOptions,
  WriteFileOptions,
} from "./common-fs-types";
import type { IFileSystemPath } from "./path";

/**
 * ASYNC-only base file system.
 * Contains a subset of `fs`, watch service, and path methods.
 */
export interface IBaseFileSystemAsync extends IFileSystemPath {
  caseSensitive: boolean;

  promises: IBaseFileSystemPromiseActions;
}

export interface IBaseFileSystemPromiseActions {
  /**
   * Copy `sourcePath` to `destinationPath`.
   * By default, if destination already exists, it will be overwritten.
   *
   * @param flags passing `FileSystemConstants.COPYFILE_EXCL` will cause operation to fail if destination exists.
   */
  copyFile(sourcePath: string, destinationPath: string, flags?: number): Promise<void>;

  /**
   * Read the entire contents of a file.
   */
  readFile(path: string, options?: { encoding?: null; flag?: string } | null): Promise<Uint8Array>;
  readFile(path: string, options: { encoding: BufferEncoding; flag?: string } | BufferEncoding): Promise<string>;
  readFile(path: string, options?: ReadFileOptions): Promise<string | Uint8Array>;

  /**
   * Write data to a file, replacing the file if already exists.
   * `encoding` is used when a string `content` (not `Uint8Array`) was provided (with default 'utf8').
   */
  writeFile(path: string, data: string | Uint8Array, options?: WriteFileOptions): Promise<void>;

  /**
   * Delete a name and possibly the file it refers to.
   */
  unlink(filePath: string): Promise<void>;

  /**
   * Read the names of items in a directory.
   */
  readdir(
    directoryPath: string,
    options?: { encoding?: BufferEncoding | null; withFileTypes?: false } | BufferEncoding | null,
  ): Promise<string[]>;
  readdir(directoryPath: string, options: { withFileTypes: true }): Promise<IDirectoryEntry[]>;

  /**
   * Create a directory.
   */
  mkdir(directoryPath: string, options?: { recursive?: boolean }): Promise<string | undefined>;

  /**
   * Delete a directory.
   */
  rmdir(directoryPath: string): Promise<void>;

  /**
   * Check if a path points to an existing file/directory/link.
   *
   * @param path possible file path.
   * @param statFn optional custom stat function (e.g. lstat to detect links).
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get path's `IFileSystemStats`.
   */
  stat(path: string): Promise<IFileSystemStats>;

  /**
   * Get path's `IFileSystemStats`. Does not dereference symbolic links.
   */
  lstat(path: string): Promise<IFileSystemStats>;

  /**
   * Gets the canonicalized absolute pathname.
   * If path is linked, returns the actual target path.
   */
  realpath(path: string): Promise<string>;

  /**
   * Rename (move) a file or a directory
   */
  rename(sourcePath: string, destinationPath: string): Promise<void>;

  /**
   * Read value of a symbolic link.
   */
  readlink(path: string): Promise<string>;

  /**
   * Creates a symbolic link for `target` at `path`. default type is 'file'.
   */
  symlink(target: string, path: string, type?: "dir" | "file" | "junction"): Promise<void>;

  /**
   * Removes files and directories.
   */
  rm(path: string, options?: RmOptions): Promise<void>;

  /**
   * Changes the permissions of a file.
   */
  chmod(path: string, mode: number | string): Promise<void>;
}
