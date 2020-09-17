import type {
  IBaseFileSystem,
  IFileSystem,
  WatchEventListener,
  IWatchService,
  CallbackFn,
  CallbackFnVoid,
  IBaseFileSystemSyncActions,
  IBaseFileSystemCallbackActions,
  IBaseFileSystemPromiseActions,
  ReadFileOptions,
  WriteFileOptions,
} from '@file-services/types';
import path from '@file-services/path';
import { createFileSystem } from '@file-services/utils';

const posixPath = path.posix;

/**
 * Creates a wrapped `IFileSystem` which scopes the provided `fs`
 * to the provided `directoryPath`.
 *
 * @param fs the file system to scope
 * @param directoryPath the directory path to scope to
 */
export function createDirectoryFs(fs: IFileSystem, directoryPath: string): IFileSystem {
  const { watchService, promises, join, relative, sep } = fs;

  let workingDirectoryPath: string = posixPath.sep;

  function resolveScopedPath(...pathSegments: string[]): string {
    return posixPath.resolve(workingDirectoryPath, ...pathSegments);
  }

  function resolveFullPath(path: string): string {
    return join(directoryPath, resolveScopedPath(path));
  }

  const scopedListeners: WeakMap<WatchEventListener, WatchEventListener> = new WeakMap();

  function createScopedListener(listener: WatchEventListener) {
    const scopedListener: WatchEventListener = (e) => {
      const relativeEventPath = relative(directoryPath, e.path);
      // we don't want to pass events outside of scoped directory
      if (!relativeEventPath.startsWith(`..${sep}`)) {
        listener({
          stats: e.stats,
          // use posixPath to ensure we give posix-style paths back
          path: posixPath.join(posixPath.sep, relativeEventPath.replace(/\\/g, '/')),
        });
      }
    };
    scopedListeners.set(listener, scopedListener);
    return scopedListener;
  }

  const scopedWatchService: IWatchService = {
    async watchPath(path, listener) {
      if (listener) {
        listener = scopedListeners.get(listener) || createScopedListener(listener);
      }
      return watchService.watchPath(resolveFullPath(path), listener);
    },
    async unwatchPath(path, listener) {
      if (listener) {
        listener = scopedListeners.get(listener) || listener;
      }
      return watchService.unwatchPath(resolveFullPath(path), listener);
    },
    async unwatchAllPaths() {
      return watchService.unwatchAllPaths();
    },
    addGlobalListener(listener) {
      return watchService.addGlobalListener(scopedListeners.get(listener) || createScopedListener(listener));
    },
    removeGlobalListener(listener) {
      return watchService.removeGlobalListener(scopedListeners.get(listener) || listener);
    },
    clearGlobalListeners() {
      return watchService.clearGlobalListeners();
    },
  };

  const scopedBaseFs: IBaseFileSystem = {
    ...posixPath,
    resolve: resolveScopedPath,
    caseSensitive: fs.caseSensitive,
    watchService: scopedWatchService,
    cwd() {
      return workingDirectoryPath;
    },
    chdir(path) {
      workingDirectoryPath = resolveScopedPath(path);
    },
    promises: {
      copyFile(srcPath, destPath, ...args) {
        return promises.copyFile(resolveFullPath(srcPath), resolveFullPath(destPath), ...args);
      },
      lstat(path) {
        return promises.lstat(resolveFullPath(path));
      },
      mkdir(path, ...args) {
        return promises.mkdir(resolveFullPath(path), ...args);
      },
      readdir: function readdir(path: string, ...args: [{ withFileTypes: true }]) {
        return promises.readdir(resolveFullPath(path), ...args);
      } as IBaseFileSystemPromiseActions['readdir'],
      readFile: function readFile(path: string, ...args: [ReadFileOptions]) {
        return promises.readFile(resolveFullPath(path), ...args);
      } as IBaseFileSystemPromiseActions['readFile'],
      async realpath(path) {
        const actualPath = await fs.promises.realpath(resolveFullPath(path));
        const relativePath = relative(directoryPath, actualPath).replace(/\\/g, '/');
        return relativePath.startsWith('../') ? relativePath : resolveScopedPath(relativePath);
      },
      rename(srcPath, destPath) {
        return promises.rename(resolveFullPath(srcPath), resolveFullPath(destPath));
      },
      rmdir(path) {
        return promises.rmdir(resolveFullPath(path));
      },
      exists(path) {
        return promises.exists(resolveFullPath(path));
      },
      stat(path) {
        return promises.stat(resolveFullPath(path));
      },
      unlink(path) {
        return promises.unlink(resolveFullPath(path));
      },
      writeFile(path, ...args) {
        return promises.writeFile(path === '' ? '' : resolveFullPath(path), ...args);
      },
      async readlink(path) {
        const resolvedLinkPath = posixPath.resolve(path);
        const unscopedLinkPath = resolveFullPath(path);
        const relativeUnscopedTarget = await promises.readlink(unscopedLinkPath);
        const scopedTargetPath = relative(unscopedLinkPath, relativeUnscopedTarget);
        const absoluteScopedTargetPath = resolveScopedPath(scopedTargetPath);
        const relativeScopedTargetPath = relative(posixPath.dirname(resolvedLinkPath), absoluteScopedTargetPath);
        return relativeScopedTargetPath.startsWith('../')
          ? relativeScopedTargetPath
          : resolveScopedPath(relativeScopedTargetPath);
      },
      symlink(target, path, type) {
        return promises.symlink(resolveFullPath(target), resolveFullPath(path), type);
      },
    },
    copyFileSync(src, dest, ...args) {
      return fs.copyFileSync(resolveFullPath(src), resolveFullPath(dest), ...args);
    },
    lstatSync(path) {
      return fs.lstatSync(resolveFullPath(path));
    },
    mkdirSync(path, ...args) {
      return fs.mkdirSync(resolveFullPath(path), ...args);
    },
    readdirSync: function readdirSync(path: string, ...args: []) {
      return fs.readdirSync(resolveFullPath(path), ...args);
    } as IBaseFileSystemSyncActions['readdirSync'],
    readFileSync: function readFileSync(path: string, ...args: [ReadFileOptions]) {
      return fs.readFileSync(resolveFullPath(path), ...args);
    } as IBaseFileSystemSyncActions['readFileSync'],
    realpathSync(path) {
      const actualPath = fs.realpathSync(resolveFullPath(path));
      const relativePath = relative(directoryPath, actualPath).replace(/\\/g, '/');
      return relativePath.startsWith('../') ? relativePath : resolveScopedPath(relativePath);
    },
    readlinkSync(path) {
      const resolvedLinkPath = posixPath.resolve(path);
      const unscopedLinkPath = resolveFullPath(path);
      const relativeUnscopedTarget = fs.readlinkSync(unscopedLinkPath);
      const scopedTargetPath = relative(unscopedLinkPath, relativeUnscopedTarget);
      const absoluteScopedTargetPath = resolveScopedPath(scopedTargetPath);
      const relativeScopedTargetPath = relative(posixPath.dirname(resolvedLinkPath), absoluteScopedTargetPath);
      return relativeScopedTargetPath.startsWith('../')
        ? relativeScopedTargetPath
        : resolveScopedPath(relativeScopedTargetPath);
    },
    renameSync(srcPath, destPath) {
      return fs.renameSync(resolveFullPath(srcPath), resolveFullPath(destPath));
    },
    rmdirSync(path) {
      return fs.rmdirSync(resolveFullPath(path));
    },
    existsSync(path) {
      return fs.existsSync(resolveFullPath(path));
    },
    statSync(path) {
      return fs.statSync(resolveFullPath(path));
    },
    unlinkSync(path) {
      return fs.unlinkSync(resolveFullPath(path));
    },
    writeFileSync(path, ...args: [string, WriteFileOptions]) {
      return fs.writeFileSync(path === '' ? '' : resolveFullPath(path), ...args);
    },
    copyFile: function copyFile(srcPath: string, destPath: string, ...args: [CallbackFnVoid]) {
      fs.copyFile(resolveFullPath(srcPath), resolveFullPath(destPath), ...args);
    } as IBaseFileSystemCallbackActions['copyFile'],
    lstat(path, callback) {
      fs.lstat(resolveFullPath(path), callback);
    },
    mkdir: function mkdir(path: string, ...args: [CallbackFnVoid]) {
      fs.mkdir(resolveFullPath(path), ...args);
    } as IBaseFileSystemCallbackActions['mkdir'],
    readdir: function readdir(path: string, ...args: [CallbackFn<string[]>]) {
      return fs.readdir(resolveFullPath(path), ...args);
    } as IBaseFileSystemCallbackActions['readdir'],
    readFile: function readFile(path: string, ...args: [string, CallbackFn<string | Buffer>]) {
      return fs.readFile(resolveFullPath(path), ...args);
    } as IBaseFileSystemCallbackActions['readFile'],
    realpath(path, callback) {
      return fs.realpath(resolveFullPath(path), callback);
    },
    rename(path, newPath, callback) {
      return fs.rename(resolveFullPath(path), resolveFullPath(newPath), callback);
    },
    rmdir(path, callback) {
      return fs.rmdir(resolveFullPath(path), callback);
    },
    exists(path, callback) {
      return fs.exists(resolveFullPath(path), callback);
    },
    stat(path, callback) {
      return fs.stat(resolveFullPath(path), callback);
    },
    unlink(path, callback) {
      return fs.unlink(resolveFullPath(path), callback);
    },
    writeFile: function writeFile(path: string, ...args: [string, CallbackFnVoid]) {
      return fs.writeFile(path === '' ? '' : resolveFullPath(path), ...args);
    } as IBaseFileSystemCallbackActions['writeFile'],
    readlink(path, callback) {
      const unscopedLinkPath = resolveFullPath(path);
      return fs.readlink(unscopedLinkPath, function (e, relativeUnscopedTarget) {
        const resolvedLinkPath = posixPath.resolve(path);
        const scopedTargetPath = relative(unscopedLinkPath, relativeUnscopedTarget);
        const absoluteScopedTargetPath = resolveScopedPath(scopedTargetPath);
        const relativeScopedTargetPath = relative(posixPath.dirname(resolvedLinkPath), absoluteScopedTargetPath);
        const resolvedPath = relativeScopedTargetPath.startsWith('../')
          ? relativeScopedTargetPath
          : resolveScopedPath(relativeScopedTargetPath);
        callback(e, resolvedPath);
      });
    },
    symlink(target, path, type, callback) {
      return fs.symlink(resolveFullPath(target), resolveFullPath(path), type, callback);
    },
    symlinkSync(target, path, type) {
      return fs.symlinkSync(resolveFullPath(target), resolveFullPath(path), type);
    },
  };

  return createFileSystem(scopedBaseFs);
}
