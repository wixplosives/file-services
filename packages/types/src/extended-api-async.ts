import type { IDirectoryContents, IWalkOptions, BufferEncoding } from "./common-fs-types";
import type { IBaseFileSystemAsync, IBaseFileSystemPromiseActions } from "./base-api-async";

/**
 * ASYNC-only file system.
 * Exposes all base fs APIs plus several higher level methods.
 */
export interface IFileSystemAsync extends IBaseFileSystemAsync {
  promises: IFileSystemPromiseActions;
}

export interface IFileSystemPromiseActions extends IBaseFileSystemPromiseActions, IFileSystemExtendedPromiseActions {}

export interface IFileSystemExtendedPromiseActions {
  /**
   * Check if a path points to an existing file.
   *
   * @param filePath possible file path
   * @param statFn optional custom stat function (e.g. lstat to detect links)
   */
  fileExists(filePath: string, statFn?: IBaseFileSystemPromiseActions["stat"]): Promise<boolean>;

  /**
   * Check if a path points to an existing directory.
   *
   * @param directoryPath possible directory path
   * @param statFn optional custom stat function (e.g. lstatSync to detect links)
   */
  directoryExists(directoryPath: string, statFn?: IBaseFileSystemPromiseActions["stat"]): Promise<boolean>;

  /**
   * Ensure that a directory and all its parent directories exist
   */
  ensureDirectory(directoryPath: string): Promise<void>;

  /**
   * Search for files inside `rootDirectory`.
   *
   * @returns absolute paths of all found files.
   */
  findFiles(rootDirectory: string, options?: IWalkOptions): Promise<string[]>;

  /**
   * Search for a specific file name in parent directory chain.
   * Useful for finding configuration or manifest files.
   *
   * @returns absolute path of first found file, or `undefined` if none found.
   */
  findClosestFile(initialDirectoryPath: string, fileName: string): Promise<string | undefined>;

  /**
   * Search for a specific file name in parent chain.
   * Useful for finding configuration or manifest files.
   *
   * @returns absolute paths of all found files (ordered from inner most directory and up).
   */
  findFilesInAncestors(initialDirectory: string, fileName: string): Promise<string[]>;

  /**
   * Populates the provided directory with given contents.
   *
   * @returns absolute paths of written files.
   */
  populateDirectory(directoryPath: string, contents: IDirectoryContents<string | Uint8Array>): Promise<string[]>;

  /**
   * Read a file and parse it using `JSON.parse`.
   *
   * @param filePath path pointing to a `json` file.
   * @param options text encoding to decode file with (defaults to `utf8`).
   * @rejects if there is a reading or parsing error.
   */
  readJsonFile(filePath: string, options?: BufferEncoding | { encoding: BufferEncoding } | null): Promise<unknown>;

  /**
   * Recursively copy a directory and its contents.
   */
  copyDirectory(sourcePath: string, destinationPath: string): Promise<void>;

  /**
   * Recursively walk over a directory and its contents.
   */
  // walk(rootDirectory: string, options?: IWalkOptions): Promise<IFileSystemDescriptor[]>
}
