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
  IBaseFileSystemSyncActions,
} from '@file-services/types';
import { FsErrorCodes } from './error-codes';
import type {
  IMemFileSystem,
  IBaseMemFileSystem,
  IBaseMemFileSystemSync,
  IFsMemFileNode,
  IFsMemDirectoryNode,
} from './types';

const posixPath = path.posix;

/**
 * This is the main function to use, returning a sync/async
 * in-memory file system with extended API.
 *
 * @param rootContents optional data to populate / with
 */
export function createMemoryFs(rootContents?: IDirectoryContents): IMemFileSystem {
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
  const nodeMap = new Map<string, IFsMemFileNode | IFsMemDirectoryNode | undefined>();
  nodeMap.set(posixPath.sep, root);

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
    lstatSync: statSync, // links are not implemented yet
    mkdirSync,
    readdirSync,
    readFileSync: readFileSync as IBaseFileSystemSyncActions['readFileSync'],
    realpathSync,
    readlinkSync: () => {
      throw new Error('links are not implemented yet');
    },
    renameSync,
    rmdirSync,
    statSync,
    unlinkSync,
    writeFileSync,
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

  function readFileSync(filePath: string, _options: { encoding: 'utf8' }): string {
    const resolvedPath = resolvePath(filePath);
    const fileNode = nodeMap.get(resolvedPath);

    if (!fileNode) {
      throw createFsError(resolvedPath, FsErrorCodes.NO_FILE, 'ENOENT');
    } else if (fileNode.type === 'dir') {
      throw createFsError(resolvedPath, FsErrorCodes.PATH_IS_DIRECTORY, 'EISDIR');
    }

    return fileNode.contents;
  }

  function writeFileSync(filePath: string, fileContent: string): void {
    if (filePath === '') {
      throw createFsError(filePath, FsErrorCodes.NO_FILE_OR_DIRECTORY, 'ENOENT');
    }

    const resolvedPath = resolvePath(filePath);
    const existingNode = nodeMap.get(resolvedPath);
    if (existingNode) {
      if (existingNode.type === 'dir') {
        throw createFsError(resolvedPath, FsErrorCodes.PATH_IS_DIRECTORY, 'EISDIR');
      }
      existingNode.mtime = new Date();
      existingNode.contents = fileContent;
      emitWatchEvent({ path: resolvedPath, stats: createStatsFromNode(existingNode) });
    } else {
      const parentPath = posixPath.dirname(resolvedPath);
      const parentNode = nodeMap.get(parentPath);

      if (!parentNode || parentNode.type !== 'dir') {
        throw createFsError(resolvedPath, FsErrorCodes.CONTAINING_NOT_EXISTS, 'ENOENT');
      }

      const fileName = posixPath.basename(resolvedPath);
      const currentDate = new Date();
      const newFileNode: IFsMemFileNode = {
        type: 'file',
        name: fileName,
        birthtime: currentDate,
        mtime: currentDate,
        contents: fileContent,
      };
      parentNode.contents.set(fileName, newFileNode);
      nodeMap.set(resolvedPath, newFileNode);
      emitWatchEvent({ path: resolvedPath, stats: createStatsFromNode(newFileNode) });
    }
  }

  function unlinkSync(filePath: string): void {
    const resolvedPath = resolvePath(filePath);
    const parentPath = posixPath.dirname(resolvedPath);
    const parentNode = nodeMap.get(parentPath);

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
    nodeMap.delete(resolvedPath);
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
    const directoryNode = nodeMap.get(resolvedPath);

    if (!directoryNode) {
      throw createFsError(resolvedPath, FsErrorCodes.NO_DIRECTORY, 'ENOENT');
    } else if (directoryNode.type === 'file') {
      throw createFsError(resolvedPath, FsErrorCodes.PATH_IS_FILE, 'ENOTDIR');
    }
    const childNodes = Array.from(directoryNode.contents.values());

    return !!options && typeof options === 'object' && options.withFileTypes
      ? childNodes.map((node) => ({ name: node.name, ...createStatsFromNode(node) }))
      : childNodes.map(({ name }) => name);
  }

  function mkdirSync(directoryPath: string, options?: { recursive?: boolean }): void {
    const resolvedPath = resolvePath(directoryPath);
    const parentPath = posixPath.dirname(resolvedPath);
    let parentNode = nodeMap.get(parentPath);
    const recursive = options?.recursive;

    if (!parentNode) {
      if (recursive) {
        mkdirSync(parentPath, options);
        parentNode = nodeMap.get(parentPath) as IFsMemDirectoryNode;
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
    const currentNode = parentNode.contents.get(directoryName);

    if (currentNode) {
      if (recursive && currentNode.type === 'dir') {
        return;
      }
      throw createFsError(resolvedPath, FsErrorCodes.PATH_ALREADY_EXISTS, 'EEXIST');
    }

    const newDirNode: IFsMemDirectoryNode = createMemDirectory(directoryName);
    parentNode.contents.set(directoryName, newDirNode);
    nodeMap.set(resolvedPath, newDirNode);
    emitWatchEvent({ path: resolvedPath, stats: createStatsFromNode(newDirNode) });
  }

  function rmdirSync(directoryPath: string): void {
    const resolvedPath = resolvePath(directoryPath);
    const parentPath = posixPath.dirname(resolvedPath);
    const parentNode = nodeMap.get(parentPath);

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
    nodeMap.delete(resolvedPath);
    emitWatchEvent({ path: resolvedPath, stats: null });
  }

  function existsSync(nodePath: string): boolean {
    return !!nodeMap.get(resolvePath(nodePath));
  }

  function statSync(nodePath: string): IFileSystemStats {
    const resolvedPath = resolvePath(nodePath);
    const node = nodeMap.get(resolvedPath);
    if (!node) {
      throw createFsError(resolvedPath, FsErrorCodes.NO_FILE_OR_DIRECTORY, 'ENOENT');
    }
    const { birthtime, mtime } = node;
    const isFile = node.type === 'file' ? returnsTrue : returnsFalse;
    const isDirectory = node.type === 'dir' ? returnsTrue : returnsFalse;
    const isSymbolicLink = returnsFalse;

    return { isFile, isDirectory, isSymbolicLink, birthtime, mtime };
  }

  function realpathSync(nodePath: string): string {
    const resolvedPath = resolvePath(nodePath);
    const node = nodeMap.get(resolvedPath);
    if (!node) {
      throw createFsError(resolvedPath, FsErrorCodes.NO_FILE_OR_DIRECTORY, 'ENOENT');
    }
    return resolvedPath;
  }

  function renameSync(sourcePath: string, destinationPath: string): void {
    const resolvedSourcePath = resolvePath(sourcePath);
    const resolvedDestinationPath = resolvePath(destinationPath);
    const sourceParentPath = posixPath.dirname(resolvedSourcePath);
    const sourceParentNode = nodeMap.get(sourceParentPath);

    if (!sourceParentNode || sourceParentNode.type !== 'dir') {
      throw createFsError(resolvedSourcePath, FsErrorCodes.CONTAINING_NOT_EXISTS, 'ENOENT');
    }

    const sourceName = posixPath.basename(resolvedSourcePath);
    const sourceNode = sourceParentNode.contents.get(sourceName);

    if (!sourceNode) {
      throw createFsError(resolvedSourcePath, FsErrorCodes.NO_FILE_OR_DIRECTORY, 'ENOENT');
    }

    const destinationParentPath = posixPath.dirname(resolvedDestinationPath);
    const destinationParentNode = nodeMap.get(destinationParentPath);

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

    sourceParentNode.contents.delete(destinationName);
    nodeMap.delete(resolvedSourcePath);
    sourceNode.name = destinationName;
    sourceNode.mtime = new Date();
    destinationParentNode.contents.set(destinationName, sourceNode);
    nodeMap.set(resolvedDestinationPath, sourceNode);
    if (sourceNode.type === 'dir') {
      remapDirectoryPaths(resolvedSourcePath, resolvedDestinationPath, sourceNode);
    }

    emitWatchEvent({ path: resolvedSourcePath, stats: null });
    emitWatchEvent({ path: resolvedDestinationPath, stats: createStatsFromNode(sourceNode) });
  }

  function remapDirectoryPaths(sourcePath: string, destinationPath: string, { contents }: IFsMemDirectoryNode): void {
    for (const [itemName, itemNode] of contents) {
      const sourceItemPath = posixPath.join(sourcePath, itemName);
      const destinationItemPath = posixPath.join(destinationPath, itemName);
      nodeMap.delete(sourceItemPath);
      nodeMap.set(destinationItemPath, itemNode);
      if (itemNode.type === 'dir') {
        remapDirectoryPaths(sourceItemPath, destinationItemPath, itemNode);
      }
    }
  }

  function copyFileSync(sourcePath: string, destinationPath: string, flags = 0): void {
    const resolvedSourcePath = resolvePath(sourcePath);
    const resolvedDestinationPath = resolvePath(destinationPath);
    const sourceFileNode = nodeMap.get(resolvedSourcePath);

    if (!sourceFileNode) {
      throw createFsError(resolvedSourcePath, FsErrorCodes.NO_FILE_OR_DIRECTORY, 'ENOENT');
    }

    if (sourceFileNode.type !== 'file') {
      throw createFsError(resolvedSourcePath, FsErrorCodes.PATH_IS_DIRECTORY, 'EISDIR');
    }

    const destParentPath = posixPath.dirname(resolvedDestinationPath);
    const destParentNode = nodeMap.get(destParentPath);

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

    const newFileNode: IFsMemFileNode = { ...sourceFileNode, name: targetName, mtime: new Date() };
    destParentNode.contents.set(targetName, newFileNode);
    nodeMap.set(resolvedDestinationPath, newFileNode);

    emitWatchEvent({ path: resolvedDestinationPath, stats: createStatsFromNode(newFileNode) });
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

function createMemDirectory(name: string): IFsMemDirectoryNode {
  const currentDate = new Date();
  return {
    type: 'dir',
    name,
    contents: new Map<string, IFsMemDirectoryNode | IFsMemFileNode>(),
    birthtime: currentDate,
    mtime: currentDate,
  };
}

const returnsTrue = () => true;
const returnsFalse = () => false;

function createStatsFromNode(node: IFsMemFileNode | IFsMemDirectoryNode): IFileSystemStats {
  return {
    birthtime: node.birthtime,
    mtime: node.mtime,
    isFile: node.type === 'file' ? returnsTrue : returnsFalse,
    isDirectory: node.type === 'dir' ? returnsTrue : returnsFalse,
    isSymbolicLink: returnsFalse,
  };
}

function createFsError(
  path: string,
  message: FsErrorCodes,
  code: 'ENOENT' | 'EEXIST' | 'EISDIR' | 'ENOTDIR' | 'ENOTEMPTY'
): Error {
  const error = new Error(`${path} ${message}`);
  (error as Error & { path: string }).path = path;
  (error as Error & { code: string }).code = code;
  throw error;
}
