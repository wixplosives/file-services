import { createFileSystem, syncToAsyncFs, SetMultiMap } from '@file-services/utils';
import path from '@file-services/path';
import {
  IDirectoryContents,
  IFileSystemStats,
  IWatchEvent,
  WatchEventListener,
  FileSystemConstants,
  BufferEncoding,
  IDirectoryEntry,
  StatSyncOptions,
  RmOptions,
  ReadFileOptions,
} from '@file-services/types';
import { FsErrorCodes } from './error-codes.js';
import type {
  IMemFileSystem,
  IBaseMemFileSystem,
  IBaseMemFileSystemSync,
  IFsMemFileNode,
  IFsMemDirectoryNode,
  IFsMemNodeType,
  IFsMemSymlinkNode,
  IEncodingMap,
  IEncodingKeys,
} from './types.js';

const posixPath = path.posix;

/**
 * This is the main function to use, returning a sync/async
 * in-memory file system with extended API.
 *
 * @param rootContents optional data to populate / with
 */
export function createMemoryFs(rootContents?: IDirectoryContents<string | Uint8Array>): IMemFileSystem {
  const baseFs = createBaseMemoryFs();

  const fs: IMemFileSystem = {
    ...createFileSystem(baseFs),
    root: baseFs.root,
  };

  if (rootContents) {
    fs.populateDirectorySync(posixPath.sep, rootContents);
  }

  return fs;
}

/**
 * Utility function to create a *base* sync/async
 * in-memory file system (without the extended API).
 */
export function createBaseMemoryFs(): IBaseMemFileSystem {
  const syncMemFs = createBaseMemoryFsSync();
  return { ...syncMemFs, ...syncToAsyncFs(syncMemFs) };
}

/**
 * Utility function to create a *base* sync-only
 * in-memory file system (without the extended API).
 */
export function createBaseMemoryFsSync(): IBaseMemFileSystemSync {
  const root: IFsMemDirectoryNode = createMemDirectory('memory-fs-root');
  const pathListeners = new SetMultiMap<string, WatchEventListener>();
  const globalListeners = new Set<WatchEventListener>();
  const textEncoder = new TextEncoder();
  realpathSync.native = realpathSync;

  let workingDirectoryPath: string = posixPath.sep;
  return {
    root,
    ...posixPath,
    resolve: resolvePath,
    watchService: {
      async watchPath(path, listener) {
        const resolvedPath = resolvePath(path);
        if (listener) {
          pathListeners.add(resolvedPath, listener);
        }
      },
      async unwatchPath(path, listener) {
        const resolvedPath = resolvePath(path);
        if (listener) {
          pathListeners.delete(resolvedPath, listener);
        } else {
          pathListeners.deleteKey(resolvedPath);
        }
      },
      async unwatchAllPaths() {
        pathListeners.clear();
      },
      addGlobalListener(listener) {
        globalListeners.add(listener);
      },
      removeGlobalListener(listener) {
        globalListeners.delete(listener);
      },
      clearGlobalListeners() {
        globalListeners.clear();
      },
    },
    caseSensitive: true,
    cwd,
    chdir,
    copyFileSync,
    existsSync,
    lstatSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    realpathSync,
    readlinkSync,
    renameSync,
    rmdirSync,
    rmSync,
    statSync,
    symlinkSync,
    unlinkSync,
    writeFileSync,
    chmodSync: () => undefined,
  };

  function resolvePath(...pathSegments: string[]): string {
    return posixPath.resolve(workingDirectoryPath, ...pathSegments);
  }

  function cwd(): string {
    return workingDirectoryPath;
  }

  function chdir(directoryPath: string): void {
    workingDirectoryPath = resolvePath(directoryPath);
  }

  function readFileSync(filePath: string, options?: { encoding?: null; flag?: string } | null): Uint8Array;
  function readFileSync(
    filePath: string,
    options: { encoding: BufferEncoding; flag?: string } | BufferEncoding
  ): string;
  function readFileSync(filePath: string, options?: ReadFileOptions): string | Uint8Array {
    const resolvedPath = resolvePath(filePath);
    const fileNode = getNode(resolvedPath);

    if (!fileNode) {
      throw createFsError(resolvedPath, FsErrorCodes.NO_FILE, 'ENOENT');
    } else if (fileNode.type === 'dir') {
      throw createFsError(resolvedPath, FsErrorCodes.PATH_IS_DIRECTORY, 'EISDIR');
    }

    const encoding = normalizeEncoding(options);
    const content = fileNode.contents.get(encoding);
    const isBinary = encoding === 'binary';

    // fast return if we have the content in the requested encoding
    if (content !== undefined) {
      return isBinary ? content.slice() : content;
    }

    // try to decode from binary
    const binary = fileNode.contents.get('binary');
    if (binary instanceof Uint8Array) {
      return decodeCache(encoding, binary, fileNode);
    }

    // try to decode from utf8 keep the binary cache
    const raw = fileNode.contents.get('utf8');
    if (typeof raw === 'string') {
      const encoded = textEncoder.encode(raw);
      fileNode.contents.set('binary', encoded);
      return isBinary ? encoded : decodeCache(encoding, encoded, fileNode);
    }

    // no content found
    throw createFsError(resolvedPath, FsErrorCodes.NO_FILE, 'ENOENT');
  }

  function writeFileSync(filePath: string, fileContent: string | Uint8Array): void {
    if (filePath === '') {
      throw createFsError(filePath, FsErrorCodes.NO_FILE_OR_DIRECTORY, 'ENOENT');
    }

    const resolvedPath = resolvePath(filePath);
    const existingNode = getNode(resolvedPath);

    const contents: IEncodingMap = new Map();
    if (typeof fileContent === 'string') {
      contents.set('utf8', fileContent);
    } else {
      contents.set('binary', fileContent.slice());
    }

    if (existingNode) {
      if (existingNode.type === 'dir') {
        throw createFsError(resolvedPath, FsErrorCodes.PATH_IS_DIRECTORY, 'EISDIR');
      }
      existingNode.entry = { ...existingNode.entry, mtime: new Date() };
      existingNode.contents = contents;
      emitWatchEvent({ path: resolvedPath, stats: existingNode.entry });
    } else {
      const parentPath = posixPath.dirname(resolvedPath);
      const parentNode = getNode(parentPath);

      if (!parentNode || parentNode.type !== 'dir') {
        throw createFsError(resolvedPath, FsErrorCodes.CONTAINING_NOT_EXISTS, 'ENOENT');
      }
      const fileName = posixPath.basename(resolvedPath);
      const currentDate = new Date();
      const newFileNode: IFsMemFileNode = {
        type: 'file',
        entry: {
          name: fileName,
          birthtime: currentDate,
          mtime: currentDate,
          isFile: returnsTrue,
          isDirectory: returnsFalse,
          isSymbolicLink: returnsFalse,
        },
        contents,
      };
      parentNode.contents.set(fileName, newFileNode);
      emitWatchEvent({ path: resolvedPath, stats: newFileNode.entry });
    }
  }

  function unlinkSync(filePath: string): void {
    const resolvedPath = resolvePath(filePath);
    const parentPath = posixPath.dirname(resolvedPath);
    const parentNode = getNode(parentPath);

    if (!parentNode || parentNode.type !== 'dir') {
      throw createFsError(resolvedPath, FsErrorCodes.NO_FILE, 'ENOENT');
    }

    const fileName = posixPath.basename(resolvedPath);
    const fileNode = parentNode.contents.get(fileName);

    if (!fileNode) {
      throw createFsError(resolvedPath, FsErrorCodes.NO_FILE, 'ENOENT');
    } else if (fileNode.type === 'dir') {
      throw createFsError(resolvedPath, FsErrorCodes.PATH_IS_DIRECTORY, 'EISDIR');
    }

    parentNode.contents.delete(fileName);
    emitWatchEvent({ path: resolvedPath, stats: null });
  }

  function readdirSync(
    directoryPath: string,
    options?: { encoding?: BufferEncoding | null; withFileTypes?: false } | BufferEncoding | null
  ): string[];
  function readdirSync(
    directoryPath: string,
    options?: { encoding?: BufferEncoding | null; withFileTypes?: true } | BufferEncoding | null
  ): IDirectoryEntry[];
  function readdirSync(
    directoryPath: string,
    options?: { encoding?: BufferEncoding | null; withFileTypes?: boolean } | BufferEncoding | null
  ): string[] | IDirectoryEntry[] {
    const resolvedPath = resolvePath(directoryPath);
    const directoryNode = getNode(resolvedPath);

    if (!directoryNode) {
      throw createFsError(resolvedPath, FsErrorCodes.NO_DIRECTORY, 'ENOENT');
    } else if (directoryNode.type === 'file') {
      throw createFsError(resolvedPath, FsErrorCodes.PATH_IS_FILE, 'ENOTDIR');
    }

    return !!options && typeof options === 'object' && options.withFileTypes
      ? Array.from(directoryNode.contents.values(), ({ entry }) => entry)
      : Array.from(directoryNode.contents.keys());
  }

  function mkdirSync(directoryPath: string, options?: { recursive?: boolean }): string | undefined {
    const resolvedPath = resolvePath(directoryPath);
    const parentPath = posixPath.dirname(resolvedPath);
    let parentNode = getNode(parentPath);
    const recursive = options?.recursive;

    if (!parentNode) {
      if (recursive) {
        mkdirSync(parentPath, options);
        parentNode = getNode(parentPath) as IFsMemDirectoryNode;
      } else {
        throw createFsError(resolvedPath, FsErrorCodes.CONTAINING_NOT_EXISTS, 'ENOENT');
      }
    } else if (parentNode.type !== 'dir') {
      throw createFsError(resolvedPath, FsErrorCodes.PATH_IS_FILE, 'ENOTDIR');
    } else if (parentPath === resolvedPath) {
      if (recursive) {
        return;
      } else {
        throw createFsError(resolvedPath, FsErrorCodes.PATH_ALREADY_EXISTS, 'EEXIST');
      }
    }

    const directoryName = posixPath.basename(resolvedPath);
    const existingNode = parentNode.contents.get(directoryName);

    if (existingNode) {
      if (recursive && existingNode.type === 'dir') {
        return;
      }
      throw createFsError(resolvedPath, FsErrorCodes.PATH_ALREADY_EXISTS, 'EEXIST');
    }

    const newDirNode: IFsMemDirectoryNode = createMemDirectory(directoryName);
    parentNode.contents.set(directoryName, newDirNode);
    emitWatchEvent({ path: resolvedPath, stats: newDirNode.entry });
    return;
  }

  function rmdirSync(directoryPath: string): void {
    const resolvedPath = resolvePath(directoryPath);
    const parentPath = posixPath.dirname(resolvedPath);
    const parentNode = getNode(parentPath);

    if (!parentNode || parentNode.type !== 'dir') {
      throw createFsError(resolvedPath, FsErrorCodes.NO_DIRECTORY, 'ENOENT');
    }

    const directoryName = posixPath.basename(resolvedPath);
    const directoryNode = parentNode.contents.get(directoryName);

    if (!directoryNode || directoryNode.type !== 'dir') {
      throw createFsError(resolvedPath, FsErrorCodes.NO_DIRECTORY, 'ENOENT');
    } else if (directoryNode.contents.size > 0) {
      throw createFsError(resolvedPath, FsErrorCodes.DIRECTORY_NOT_EMPTY, 'ENOTEMPTY');
    }

    parentNode.contents.delete(directoryName);
    emitWatchEvent({ path: resolvedPath, stats: null });
  }

  function rmSync(targetPath: string, { force, recursive }: RmOptions = {}): void {
    const resolvedPath = resolvePath(targetPath);
    const parentPath = posixPath.dirname(resolvedPath);
    const parentNode = getNode(parentPath);

    if (!parentNode || parentNode.type !== 'dir') {
      if (force) {
        return;
      } else {
        throw createFsError(resolvedPath, FsErrorCodes.NO_DIRECTORY, 'ENOENT');
      }
    }

    const targetName = posixPath.basename(resolvedPath);
    const targetNode = parentNode.contents.get(targetName);

    if (!targetNode) {
      if (force) {
        return;
      } else {
        throw createFsError(resolvedPath, FsErrorCodes.NO_DIRECTORY, 'ENOENT');
      }
    }
    if (targetNode.type === 'dir' && !recursive) {
      throw createFsError(resolvedPath, FsErrorCodes.PATH_IS_DIRECTORY, 'EISDIR');
    }

    parentNode.contents.delete(targetName);
    emitWatchEvent({ path: resolvedPath, stats: null });
  }

  function existsSync(nodePath: string): boolean {
    return !!getNode(resolvePath(nodePath));
  }

  function statSync(nodePath: string, options?: StatSyncOptions & { throwIfNoEntry?: true }): IFileSystemStats;
  function statSync(
    nodePath: string,
    options: StatSyncOptions & { throwIfNoEntry: false }
  ): IFileSystemStats | undefined;
  function statSync(nodePath: string, options?: StatSyncOptions): IFileSystemStats | undefined {
    const resolvedPath = resolvePath(nodePath);
    const node = getNode(resolvedPath);
    if (!node) {
      const throwIfNoEntry = options?.throwIfNoEntry ?? true;
      if (throwIfNoEntry) {
        throw createFsError(resolvedPath, FsErrorCodes.NO_FILE_OR_DIRECTORY, 'ENOENT');
      } else {
        return undefined;
      }
    }
    return node.entry;
  }

  function lstatSync(nodePath: string, options?: StatSyncOptions & { throwIfNoEntry?: true }): IFileSystemStats;
  function lstatSync(
    nodePath: string,
    options: StatSyncOptions & { throwIfNoEntry: false }
  ): IFileSystemStats | undefined;
  function lstatSync(nodePath: string, options?: StatSyncOptions): IFileSystemStats | undefined {
    const resolvedPath = resolvePath(nodePath);
    const node = getRawNode(resolvedPath);
    if (!node) {
      const throwIfNoEntry = options?.throwIfNoEntry ?? true;
      if (throwIfNoEntry) {
        throw createFsError(resolvedPath, FsErrorCodes.NO_FILE_OR_DIRECTORY, 'ENOENT');
      } else {
        return undefined;
      }
    }
    return node.entry;
  }

  function realpathSync(nodePath: string): string {
    const resolvedPath = resolvePath(nodePath);
    let currentPath = '/';
    let node: IFsMemNodeType | undefined = root;
    for (const depthName of resolvedPath.split(posixPath.sep)) {
      if (!node) {
        break;
      }
      if (depthName === '') {
        continue;
      }
      if (node.type === 'dir') {
        node = node.contents.get(depthName);
        currentPath = posixPath.join(currentPath, depthName);
        while (node?.type === 'symlink') {
          currentPath = posixPath.resolve(posixPath.dirname(currentPath), node.target);
          node = getRawNode(currentPath);
        }
      } else {
        node = undefined;
      }
    }
    if (!node) {
      throw createFsError(resolvedPath, FsErrorCodes.NO_FILE_OR_DIRECTORY, 'ENOENT');
    }
    return currentPath;
  }

  function readlinkSync(nodePath: string): string {
    const resolvedPath = resolvePath(nodePath);
    const node = getRawNode(resolvedPath);
    if (!node) {
      throw createFsError(resolvedPath, FsErrorCodes.NO_FILE_OR_DIRECTORY, 'ENOENT');
    } else if (node.type !== 'symlink') {
      throw createFsError(resolvedPath, FsErrorCodes.PATH_IS_INVALID, 'EINVAL');
    }
    return node.target;
  }

  function renameSync(sourcePath: string, destinationPath: string): void {
    const resolvedSourcePath = resolvePath(sourcePath);
    const resolvedDestinationPath = resolvePath(destinationPath);
    const sourceParentPath = posixPath.dirname(resolvedSourcePath);
    const sourceParentNode = getNode(sourceParentPath);

    if (!sourceParentNode || sourceParentNode.type !== 'dir') {
      throw createFsError(resolvedSourcePath, FsErrorCodes.CONTAINING_NOT_EXISTS, 'ENOENT');
    }

    const sourceName = posixPath.basename(resolvedSourcePath);
    const sourceNode = sourceParentNode.contents.get(sourceName);

    if (!sourceNode) {
      throw createFsError(resolvedSourcePath, FsErrorCodes.NO_FILE_OR_DIRECTORY, 'ENOENT');
    }

    const destinationParentPath = posixPath.dirname(resolvedDestinationPath);
    const destinationParentNode = getNode(destinationParentPath);

    if (!destinationParentNode || destinationParentNode.type !== 'dir') {
      throw createFsError(resolvedDestinationPath, FsErrorCodes.CONTAINING_NOT_EXISTS, 'ENOENT');
    }

    const destinationName = posixPath.basename(resolvedDestinationPath);
    const destinationNode = destinationParentNode.contents.get(destinationName);

    if (destinationNode) {
      if (destinationNode.type === 'dir') {
        if (destinationNode.contents.size > 0) {
          throw createFsError(resolvedDestinationPath, FsErrorCodes.DIRECTORY_NOT_EMPTY, 'ENOTEMPTY');
        }
      } else {
        throw createFsError(resolvedDestinationPath, FsErrorCodes.PATH_ALREADY_EXISTS, 'EEXIST');
      }
    }

    sourceParentNode.contents.delete(sourceName);
    sourceNode.entry = { ...sourceNode.entry, name: destinationName, mtime: new Date() };
    destinationParentNode.contents.set(destinationName, sourceNode);

    emitWatchEvent({ path: resolvedSourcePath, stats: null });
    emitWatchEvent({ path: resolvedDestinationPath, stats: sourceNode.entry });
  }

  function copyFileSync(sourcePath: string, destinationPath: string, flags = 0): void {
    const resolvedSourcePath = resolvePath(sourcePath);
    const resolvedDestinationPath = resolvePath(destinationPath);
    const sourceFileNode = getNode(resolvedSourcePath);

    if (!sourceFileNode) {
      throw createFsError(resolvedSourcePath, FsErrorCodes.NO_FILE_OR_DIRECTORY, 'ENOENT');
    }

    if (sourceFileNode.type !== 'file') {
      throw createFsError(resolvedSourcePath, FsErrorCodes.PATH_IS_DIRECTORY, 'EISDIR');
    }

    const destParentPath = posixPath.dirname(resolvedDestinationPath);
    const destParentNode = getNode(destParentPath);

    if (!destParentNode || destParentNode.type !== 'dir') {
      throw createFsError(resolvedDestinationPath, FsErrorCodes.CONTAINING_NOT_EXISTS, 'ENOENT');
    }

    const targetName = posixPath.basename(resolvedDestinationPath);
    const destinationFileNode = destParentNode.contents.get(targetName);

    if (destinationFileNode) {
      const shouldOverride = !(flags & FileSystemConstants.COPYFILE_EXCL);

      if (!shouldOverride) {
        throw createFsError(resolvedDestinationPath, FsErrorCodes.PATH_ALREADY_EXISTS, 'EEXIST');
      }

      if (destinationFileNode.type !== 'file') {
        throw createFsError(resolvedDestinationPath, FsErrorCodes.PATH_IS_DIRECTORY, 'EISDIR');
      }
    }

    const newFileNode: IFsMemFileNode = {
      ...sourceFileNode,
      entry: { ...sourceFileNode.entry, name: targetName, mtime: new Date() },
    };
    destParentNode.contents.set(targetName, newFileNode);

    emitWatchEvent({ path: resolvedDestinationPath, stats: newFileNode.entry });
  }

  function symlinkSync(target: string, linkPath: string) {
    const resolvedLinkPath = resolvePath(linkPath);
    if (getNode(resolvedLinkPath)) {
      throw createFsError(resolvedLinkPath, FsErrorCodes.PATH_ALREADY_EXISTS, 'EEXIST');
    }

    const parentLinkPath = posixPath.dirname(resolvedLinkPath);
    const parentNode = getNode(parentLinkPath);
    if (!parentNode) {
      throw createFsError(resolvedLinkPath, FsErrorCodes.NO_FILE, 'ENOENT');
    }
    if (parentNode.type === 'file') {
      throw createFsError(resolvedLinkPath, FsErrorCodes.PATH_IS_FILE, 'ENOTDIR');
    }

    const currentDate = new Date(Date.now());
    const fileName = posixPath.basename(resolvedLinkPath);
    const symlinkNode: IFsMemSymlinkNode = {
      type: 'symlink',
      entry: {
        name: fileName,
        birthtime: currentDate,
        mtime: currentDate,
        isFile: returnsFalse,
        isDirectory: returnsFalse,
        isSymbolicLink: returnsTrue,
      },
      target,
    };

    parentNode.contents.set(fileName, symlinkNode);
    emitWatchEvent({ path: resolvedLinkPath, stats: symlinkNode.entry });
  }

  function getNode(nodePath: string): IFsMemFileNode | IFsMemDirectoryNode | undefined {
    let node = getRawNode(nodePath);
    while (node?.type === 'symlink') {
      nodePath = posixPath.resolve(posixPath.dirname(nodePath), node.target);
      node = getRawNode(nodePath);
    }
    return node;
  }

  function getRawNode(nodePath: string): IFsMemNodeType | undefined {
    let currentPath = '/';
    let node: IFsMemNodeType | undefined = root;
    for (const depthName of nodePath.split(posixPath.sep)) {
      if (!node) {
        break;
      }
      if (depthName === '') {
        continue;
      }
      while (node?.type === 'symlink') {
        currentPath = posixPath.resolve(posixPath.dirname(currentPath), node.target);
        node = getRawNode(currentPath);
      }
      if (node?.type === 'dir') {
        node = node.contents.get(depthName);
        currentPath = posixPath.join(currentPath, depthName);
      } else {
        node = undefined;
      }
    }

    return node;
  }

  function emitWatchEvent(watchEvent: IWatchEvent): void {
    for (const listener of globalListeners) {
      listener(watchEvent);
    }
    const listeners = pathListeners.get(watchEvent.path);
    if (listeners) {
      for (const listener of listeners) {
        listener(watchEvent);
      }
    }
  }
}

function decodeCache(encoding: IEncodingKeys, binary: Uint8Array, fileNode: IFsMemFileNode) {
  const decoded = new TextDecoder(encoding).decode(binary);
  fileNode.contents.set(encoding, decoded);
  return decoded;
}

function normalizeEncoding(
  options:
    | BufferEncoding
    | { encoding?: BufferEncoding | null | undefined; flag?: string | undefined }
    | null
    | undefined
): IEncodingKeys {
  const encoding = typeof options === 'string' ? options : options?.encoding || 'binary';
  return encoding === 'utf-8' ? 'utf8' : encoding === 'ucs-2' ? 'ucs2' : encoding;
}

function createMemDirectory(name: string): IFsMemDirectoryNode {
  const currentDate = new Date();
  return {
    type: 'dir',
    contents: new Map<string, IFsMemNodeType>(),
    entry: {
      name,
      birthtime: currentDate,
      mtime: currentDate,
      isFile: returnsFalse,
      isDirectory: returnsTrue,
      isSymbolicLink: returnsFalse,
    },
  };
}

const returnsTrue = () => true;
const returnsFalse = () => false;

function createFsError(
  path: string,
  message: FsErrorCodes,
  code: 'ENOENT' | 'EEXIST' | 'EISDIR' | 'ENOTDIR' | 'ENOTEMPTY' | 'EINVAL'
): Error {
  const error = new Error(`${path} ${message}`);
  (error as Error & { path: string }).path = path;
  (error as Error & { code: string }).code = code;
  throw error;
}
