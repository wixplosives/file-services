export type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'latin1'
  | 'binary'
  | 'hex';

export type CallbackFn<T> = (error: Error | null, value: T) => void;
export type CallbackFnVoid = (error?: Error | null) => void;

export interface StatSyncOptions {
  /**
   * Whether an exception will be thrown if no file system entry exists, rather than returning `undefined`.
   * @default true
   */
  throwIfNoEntry?: boolean;
}

export type WriteFileOptions =
  | {
      encoding?: BufferEncoding | null;
      mode?: number | string;
      flag?: string;
    }
  | BufferEncoding
  | null;

export type ReadFileOptions =
  | {
      encoding?: BufferEncoding | null;
      flag?: string;
    }
  | BufferEncoding
  | null;

export enum FileSystemConstants {
  /**
   * When passed as a flag to `copyFile` or `copyFileSync`,
   * causes operation to fail if destination already exists.
   */
  COPYFILE_EXCL = 1,
}

export interface IDirectoryContents<T extends Uint8Array | string = string> {
  [nodeName: string]: T | IDirectoryContents<T>;
}

/**
 * Subset of the original `fs.Dirent` class.
 */
export interface IDirectoryEntry {
  /**
   * Base name of the entry.
   *
   * @example `package.json`
   */
  name: string;

  /**
   * Whether the entry points to a file.
   */
  isFile(): boolean;

  /**
   * Whether the entry points to a directory.
   */
  isDirectory(): boolean;

  /**
   * Whether the entry is a symbolic link.
   */
  isSymbolicLink(): boolean;
}

/**
 * Subset of the original `fs.Stats` interface
 */
export interface IFileSystemStats {
  /**
   * Creation time
   */
  birthtime: Date;

  /**
   * Modification time
   */
  mtime: Date;

  /**
   * is the path pointing to a file
   */
  isFile(): boolean;

  /**
   * is the path pointing to a directory
   */
  isDirectory(): boolean;

  /**
   * is the path pointing to a symbolic link
   */
  isSymbolicLink(): boolean;
}

/**
 * Descriptor object for an existing file system path.
 */
export interface IFileSystemDescriptor {
  /**
   * Base name of the file system node.
   *
   * @example 'package.json'
   */
  name: string;

  /**
   * Absolute path to the file system node.
   *
   * @example '/path/to/package.json'
   */
  path: string;
}

export interface IWalkOptions {
  /**
   * Optional file filtering function that receives a file descriptor and returns
   * whether it should be included in the result.
   *
   * @default true returned for all files.
   */
  filterFile?(pathDesc: IFileSystemDescriptor): boolean;

  /**
   * Optional directory filtering function that receives a directory descriptor and returns
   * whether it should be walked into.
   *
   * @default true returned for all directories.
   */
  filterDirectory?(pathDesc: IFileSystemDescriptor): boolean;
}

export interface RmOptions {
  /**
   * When `true`, exceptions will be ignored if `path` does not exist.
   * @default false
   */
  force?: boolean | undefined;

  /**
   * If `true`, perform a recursive directory removal.
   * @default false
   */
  recursive?: boolean | undefined;
}
