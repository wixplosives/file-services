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
    caseSensitive: false,
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
    const fileNode = getNode(resolvedPath);

    if (!fileNode) {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.NO_FILE}`, 'ENOENT');
    } else if (fileNode.type === 'dir') {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.PATH_IS_DIRECTORY}`, 'EISDIR');
    }

    return fileNode.contents;
  }

  function writeFileSync(filePath: string, fileContent: string): void {
    if (filePath === '') {
      throw createFsError(`${filePath} ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`, 'ENOENT');
    }

    const resolvedPath = resolvePath(filePath);
    if (resolvedPath === '/') {
      throw createFsError(`${filePath} ${FsErrorCodes.PATH_IS_DIRECTORY}`, 'EISDIR');
    }

    const parentPath = posixPath.dirname(resolvedPath);
    const parentNode = getNode(parentPath);

    if (!parentNode || parentNode.type !== 'dir') {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`, 'ENOENT');
    }

    const fileName = posixPath.basename(resolvedPath);
    const lowerCaseFileName = fileName.toLowerCase();
    const fileNode = parentNode.contents.get(lowerCaseFileName);

    if (!fileNode) {
      const currentDate = new Date();
      const newFileNode: IFsMemFileNode = {
        type: 'file',
        name: fileName,
        birthtime: currentDate,
        mtime: currentDate,
        contents: fileContent,
      };
      parentNode.contents.set(lowerCaseFileName, newFileNode);
      emitWatchEvent({ path: resolvedPath, stats: createStatsFromNode(newFileNode) });
    } else if (fileNode.type === 'file') {
      fileNode.mtime = new Date();
      fileNode.contents = fileContent;
      emitWatchEvent({ path: resolvedPath, stats: createStatsFromNode(fileNode) });
    } else {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.PATH_IS_DIRECTORY}`, 'EISDIR');
    }
  }

  function unlinkSync(filePath: string): void {
    const resolvedPath = resolvePath(filePath);
    const parentPath = posixPath.dirname(resolvedPath);
    const parentNode = getNode(parentPath);

    if (!parentNode || parentNode.type !== 'dir') {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.NO_FILE}`, 'ENOENT');
    }

    const fileName = posixPath.basename(resolvedPath);
    const lowerCaseFileName = fileName.toLowerCase();
    const fileNode = parentNode.contents.get(lowerCaseFileName);

    if (!fileNode) {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.NO_FILE}`, 'ENOENT');
    } else if (fileNode.type === 'dir') {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.PATH_IS_DIRECTORY}`, 'EISDIR');
    }

    parentNode.contents.delete(lowerCaseFileName);
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
      throw createFsError(`${resolvedPath} ${FsErrorCodes.NO_DIRECTORY}`, 'ENOENT');
    } else if (directoryNode.type === 'file') {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.PATH_IS_FILE}`, 'ENOTDIR');
    }
    const childNodes = Array.from(directoryNode.contents.values());

    return !!options && typeof options === 'object' && options.withFileTypes
      ? childNodes.map((node) => ({ name: node.name, ...createStatsFromNode(node) }))
      : childNodes.map(({ name }) => name);
  }

  function mkdirSync(directoryPath: string): void {
    const resolvedPath = resolvePath(directoryPath);
    const parentPath = posixPath.dirname(resolvedPath);
    const parentNode = getNode(parentPath);

    if (!parentNode || parentNode.type !== 'dir') {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`, 'ENOENT');
    } else if (parentPath === resolvedPath) {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.PATH_ALREADY_EXISTS}`, 'EEXIST');
    }

    const directoryName = posixPath.basename(resolvedPath);
    const lowerCaseDirectoryName = directoryName.toLowerCase();
    const currentNode = parentNode.contents.get(lowerCaseDirectoryName);

    if (currentNode) {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.PATH_ALREADY_EXISTS}`, 'EEXIST');
    }

    const newDirNode: IFsMemDirectoryNode = createMemDirectory(directoryName);
    parentNode.contents.set(lowerCaseDirectoryName, newDirNode);

    emitWatchEvent({ path: resolvedPath, stats: createStatsFromNode(newDirNode) });
  }

  function rmdirSync(directoryPath: string): void {
    const resolvedPath = resolvePath(directoryPath);
    const parentPath = posixPath.dirname(resolvedPath);
    const parentNode = getNode(parentPath);

    if (!parentNode || parentNode.type !== 'dir') {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.NO_DIRECTORY}`, 'ENOENT');
    }

    const directoryName = posixPath.basename(resolvedPath);
    const lowerCaseDirectoryName = directoryName.toLowerCase();
    const directoryNode = parentNode.contents.get(lowerCaseDirectoryName);

    if (!directoryNode || directoryNode.type !== 'dir') {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.NO_DIRECTORY}`, 'ENOENT');
    } else if (directoryNode.contents.size > 0) {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.DIRECTORY_NOT_EMPTY}`, 'ENOTEMPTY');
    }

    parentNode.contents.delete(lowerCaseDirectoryName);
    emitWatchEvent({ path: resolvedPath, stats: null });
  }

  function existsSync(nodePath: string): boolean {
    return !!getNode(resolvePath(nodePath));
  }

  function statSync(nodePath: string): IFileSystemStats {
    const resolvedPath = resolvePath(nodePath);
    const node = getNode(resolvedPath);
    if (!node) {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`, 'ENOENT');
    }
    const { birthtime, mtime } = node;
    const isFile = node.type === 'file' ? returnsTrue : returnsFalse;
    const isDirectory = node.type === 'dir' ? returnsTrue : returnsFalse;
    const isSymbolicLink = returnsFalse;

    return { isFile, isDirectory, isSymbolicLink, birthtime, mtime };
  }

  function realpathSync(nodePath: string): string {
    const resolvedPath = resolvePath(nodePath);
    const node = getNode(resolvedPath);
    if (!node) {
      throw createFsError(`${resolvedPath} ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`, 'ENOENT');
    }
    return resolvedPath;
  }

  function renameSync(sourcePath: string, destinationPath: string): void {
    const resolvedSourcePath = resolvePath(sourcePath);
    const resolvedDestinationPath = resolvePath(destinationPath);
    const sourceParentPath = posixPath.dirname(resolvedSourcePath);
    const sourceParentNode = getNode(sourceParentPath);

    if (!sourceParentNode || sourceParentNode.type !== 'dir') {
      throw createFsError(`${resolvedSourcePath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`, 'ENOENT');
    }

    const sourceName = posixPath.basename(resolvedSourcePath);
    const lowerCaseSourceName = sourceName.toLowerCase();
    const sourceNode = sourceParentNode.contents.get(lowerCaseSourceName);

    if (!sourceNode) {
      throw createFsError(`${resolvedSourcePath} ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`, 'ENOENT');
    }

    const destinationParentPath = posixPath.dirname(resolvedDestinationPath);
    const destinationParentNode = getNode(destinationParentPath);

    if (!destinationParentNode || destinationParentNode.type !== 'dir') {
      throw createFsError(`${resolvedDestinationPath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`, 'ENOENT');
    }

    const destinationName = posixPath.basename(resolvedDestinationPath);
    const lowerCaseDestinationName = destinationName.toLowerCase();
    const destinationNode = destinationParentNode.contents.get(lowerCaseDestinationName);

    if (destinationNode) {
      if (destinationNode.type === 'dir') {
        if (destinationNode.contents.size > 0) {
          throw createFsError(`${resolvedDestinationPath} ${FsErrorCodes.DIRECTORY_NOT_EMPTY}`, 'ENOTEMPTY');
        }
      } else {
        throw createFsError(`${resolvedDestinationPath} ${FsErrorCodes.PATH_ALREADY_EXISTS}`, 'EEXIST');
      }
    }

    sourceParentNode.contents.delete(lowerCaseSourceName);
    sourceNode.name = destinationName;
    sourceNode.mtime = new Date();
    destinationParentNode.contents.set(lowerCaseDestinationName, sourceNode);

    emitWatchEvent({ path: resolvedSourcePath, stats: null });
    emitWatchEvent({ path: resolvedDestinationPath, stats: createStatsFromNode(sourceNode) });
  }

  function copyFileSync(sourcePath: string, destinationPath: string, flags = 0): void {
    const resolvedSourcePath = resolvePath(sourcePath);
    const resolvedDestinationPath = resolvePath(destinationPath);
    const sourceFileNode = getNode(resolvedSourcePath);

    if (!sourceFileNode) {
      throw createFsError(`${resolvedSourcePath} ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`, 'ENOENT');
    }

    if (sourceFileNode.type !== 'file') {
      throw createFsError(`${resolvedSourcePath} ${FsErrorCodes.PATH_IS_DIRECTORY}`, 'EISDIR');
    }

    const destParentPath = posixPath.dirname(resolvedDestinationPath);
    const destParentNode = getNode(destParentPath);

    if (!destParentNode || destParentNode.type !== 'dir') {
      throw createFsError(`${resolvedDestinationPath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`, 'ENOENT');
    }

    const targetName = posixPath.basename(resolvedDestinationPath);
    const lowerCaseTargetName = targetName.toLowerCase();
    const destinationFileNode = destParentNode.contents.get(lowerCaseTargetName);

    if (destinationFileNode) {
      const shouldOverride = !(flags & FileSystemConstants.COPYFILE_EXCL);

      if (!shouldOverride) {
        throw createFsError(`${resolvedDestinationPath} ${FsErrorCodes.PATH_ALREADY_EXISTS}`, 'EEXIST');
      }

      if (destinationFileNode.type !== 'file') {
        throw createFsError(`${resolvedDestinationPath} ${FsErrorCodes.PATH_IS_DIRECTORY}`, 'EISDIR');
      }
    }

    const newFileNode: IFsMemFileNode = { ...sourceFileNode, name: targetName, mtime: new Date() };
    destParentNode.contents.set(lowerCaseTargetName, newFileNode);

    emitWatchEvent({ path: resolvedDestinationPath, stats: createStatsFromNode(newFileNode) });
  }

  function getNode(resolvedPath: string): IFsMemFileNode | IFsMemDirectoryNode | null {
    const splitPath = resolvedPath.split(posixPath.sep);

    return splitPath.reduce((fsNode: IFsMemDirectoryNode | IFsMemFileNode | null, depthName: string) => {
      return depthName === ''
        ? fsNode
        : (fsNode && fsNode.type === 'dir' && fsNode.contents.get(depthName.toLowerCase())) || null;
    }, root);
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

function createFsError(message: string, code: 'ENOENT' | 'EEXIST' | 'EISDIR' | 'ENOTDIR' | 'ENOTEMPTY'): Error {
  const error = new Error(message);
  (error as Error & { code: string }).code = code;
  throw error;
}
