import type {
  IFileSystemStats,
  BufferEncoding,
  CallbackFnVoid,
  CallbackFn,
  WriteFileOptions,
  ReadFileOptions,
  IDirectoryEntry,
} from './common-fs-types';
import type { IFileSystemPath } from './path';
import type { IWatchService } from './watch-api';

/**
 * ASYNC-only base file system.
 * Contains a subset of `fs`, watch service, and path methods.
 */
export interface IBaseFileSystemAsync extends IBaseFileSystemCallbackActions, IFileSystemPath {
  watchService: IWatchService;
  caseSensitive: boolean;

  promises: IBaseFileSystemPromiseActions;
}

export interface IBaseFileSystemCallbackActions {
  /**
   * Copy `sourcePath` to `destinationPath`.
   * By default, if destination already exists, it will be overwritten.
   *
   * @param flags passing `FileSystemConstants.COPYFILE_EXCL` will cause operation to fail if destination exists.
   */
  copyFile(sourcePath: string, destinationPath: string, callback: CallbackFnVoid): void;
  copyFile(sourcePath: string, destinationPath: string, flags: number, callback: CallbackFnVoid): void;

  /**
   * Read the entire contents of a file.
   */
  readFile(
    path: string,
    options: { encoding?: null; flag?: string } | undefined | null,
    callback: CallbackFn<Buffer>
  ): void;
  readFile(
    path: string,
    options: { encoding: BufferEncoding; flag?: string } | BufferEncoding,
    callback: CallbackFn<string>
  ): void;
  readFile(path: string, options: ReadFileOptions, callback: CallbackFn<string | Buffer>): void;
  readFile(path: string, callback: CallbackFn<Buffer>): void;

  /**
   * Write data to a file, replacing the file if already exists.
   * `encoding` is used when a string `content` (not `Buffer`) was provided (with default 'utf8').
   */
  writeFile(path: string, data: string | Buffer, options: WriteFileOptions, callback: CallbackFnVoid): void;
  writeFile(path: string, data: string | Buffer, callback: CallbackFnVoid): void;

  /**
   * Delete a name and possibly the file it refers to.
   */
  unlink(filePath: string, callback: CallbackFnVoid): void;

  /**
   * Read the names of items in a directory.
   */
  readdir(directoryPath: string, callback: CallbackFn<string[]>): void;
  readdir(
    directoryPath: string,
    options: { encoding?: BufferEncoding | null; withFileTypes?: false } | BufferEncoding | null | undefined,
    callback: CallbackFn<string[]>
  ): void;
  readdir(directoryPath: string, options: { withFileTypes: true }, callback: CallbackFn<IDirectoryEntry[]>): void;

  /**
   * Create a directory.
   */
  mkdir(filePath: string, callback: CallbackFnVoid): void;

  /**
   * Delete a directory.
   */
  rmdir(filePath: string, callback: CallbackFnVoid): void;

  /**
   * Check if a path points to an existing file/directory/link.
   *
   * @param path possible file path.
   * @param statFn optional custom stat function (e.g. lstat to detect links).
   */
  exists(path: string, callback: (exists: boolean) => void): void;

  /**
   * Get path's `IFileSystemStats`.
   */
  stat(path: string, callback: CallbackFn<IFileSystemStats>): void;

  /**
   * Get path's `IFileSystemStats`. Does not dereference symbolic links.
   */
  lstat(path: string, callback: CallbackFn<IFileSystemStats>): void;

  /**
   * Gets the canonicalized absolute pathname.
   * If path is linked, returns the actual target path.
   */
  realpath(path: string, callback: CallbackFn<string>): void;

  /**
   * Rename (move) a file or a directory
   */
  rename(sourcePath: string, destinationPath: string, callback: CallbackFnVoid): void;

  /**
   * Read value of a symbolic link.
   */
  readlink(path: string, callback: CallbackFn<string>): void;
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
  readFile(path: string, options?: { encoding?: null; flag?: string } | null): Promise<Buffer>;
  readFile(path: string, options: { encoding: BufferEncoding; flag?: string } | BufferEncoding): Promise<string>;
  readFile(path: string, options: ReadFileOptions): Promise<string | Buffer>;

  /**
   * Write data to a file, replacing the file if already exists.
   * `encoding` is used when a string `content` (not `Buffer`) was provided (with default 'utf8').
   */
  writeFile(path: string, data: string | Buffer, options?: WriteFileOptions): Promise<void>;

  /**
   * Delete a name and possibly the file it refers to.
   */
  unlink(filePath: string): Promise<void>;

  /**
   * Read the names of items in a directory.
   */
  readdir(
    directoryPath: string,
    options?: { encoding?: BufferEncoding | null; withFileTypes?: false } | BufferEncoding | null
  ): Promise<string[]>;
  readdir(directoryPath: string, options: { withFileTypes: true }): Promise<IDirectoryEntry[]>;

  /**
   * Create a directory.
   */
  mkdir(directoryPath: string): Promise<void>;

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
}
