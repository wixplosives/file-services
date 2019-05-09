export type BufferEncoding = 'ascii' | 'utf8' | 'utf16le' | 'ucs2' | 'base64' | 'latin1' | 'binary' | 'hex';

// use global augmentation so that users without @types/node will have a partial Buffer interface
declare global {
    // tslint:disable-next-line
    interface Buffer {
        toString(ecoding?: BufferEncoding): string;
    }
}

export type CallbackFn<T> = (error: Error | null | undefined, value: T) => void;
export type CallbackFnVoid = (error?: Error | null) => void;
export type ErrorCallbackFn = (error: Error) => void;

export type WriteFileOptions =
    | { encoding?: string | null; mode?: number | string; flag?: string }
    | string
    | null
    | undefined;

export type ReadFileOptions = { encoding?: string | null; flag?: string } | string | null | undefined;

export enum FileSystemConstants {
    /**
     * When passed as a flag to `copyFile` or `copyFileSync`,
     * causes operation to fail if destination already exists.
     */
    COPYFILE_EXCL = 1
}

export interface IDirectoryContents {
    [nodeName: string]: string | IDirectoryContents;
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

    /**
     * Stats for the path
     */
    stats: IFileSystemStats;
}

export interface IWalkOptions {
    /**
     * Print errors using `console.error` when the walking operation
     * encounters such.
     *
     * @default false
     */
    printErrors?: boolean;

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
