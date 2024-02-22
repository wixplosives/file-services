import type { IWalkOptions, IDirectoryContents, BufferEncoding } from "./common-fs-types";
import type { IBaseFileSystemSync } from "./base-api-sync";

/**
 * SYNC-only file system.
 * Exposes all base fs APIs plus several higher level methods.
 */
export interface IFileSystemSync extends IBaseFileSystemSync, IFileSystemExtendedSyncActions {}

export interface IFileSystemExtendedSyncActions {
  /**
   * Check if a path points to an existing file.
   *
   * @param filePath possible file path.
   * @param statFn optional custom stat function (e.g. lstat to detect links).
   */
  fileExistsSync(filePath: string, statFn?: IBaseFileSystemSync["statSync"]): boolean;

  /**
   * Check if a path points to an existing directory.
   *
   * @param directoryPath possible directory path.
   * @param statFn optional custom stat function (e.g. lstatSync to detect links).
   */
  directoryExistsSync(directoryPath: string, statFn?: IBaseFileSystemSync["statSync"]): boolean;

  /**
   * Ensure that a directory and all its parent directories exist
   */
  ensureDirectorySync(directoryPath: string): void;

  /**
   * Search for files inside `rootDirectory`.
   *
   * @returns absolute paths of all found files.
   */
  findFilesSync(rootDirectory: string, options?: IWalkOptions): string[];

  /**
   * Search for a specific file name in parent directory chain.
   * Useful for finding configuration or manifest files.
   *
   * @returns absolute path of first found file, or `undefined` if none found.
   */
  findClosestFileSync(initialDirectoryPath: string, fileName: string): string | undefined;

  /**
   * Search for a specific file name in parent directory chain.
   * Useful for finding configuration or manifest files.
   *
   * @returns absolute paths of all found files (ordered from inner most directory and up).
   */
  findFilesInAncestorsSync(initialDirectory: string, fileName: string): string[];

  /**
   * Populates the provided directory with given contents.
   *
   * @returns absolute paths of written files.
   */
  populateDirectorySync(directoryPath: string, contents: IDirectoryContents<string | Uint8Array>): string[];

  /**
   * Read a file and parse it using `JSON.parse`.
   *
   * @param filePath path pointing to a `json` file.
   * @param options text encoding to decode file with (defaults to `utf8`).
   * @throws if there is a reading or parsing error.
   */
  readJsonFileSync(filePath: string, options?: BufferEncoding | { encoding: BufferEncoding } | null): unknown;

  /**
   * Recursively copy a directory and its contents.
   */
  copyDirectorySync(sourcePath: string, destinationPath: string): void;

  /**
   * Recursively walk over a directory and its contents.
   */
  // walkSync(rootDirectory: string, options?: IWalkOptions): IFileSystemDescriptor[]
}
