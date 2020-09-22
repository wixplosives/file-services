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
  const { watchService, promises, join, relative } = fs;

  let workingDirectoryPath: string = posixPath.sep;

  function resolveScopedPath(...pathSegments: string[]): string {
    return posixPath.resolve(workingDirectoryPath, ...pathSegments);
  }

  function resolveFullPath(path: string): string {
    return join(directoryPath, resolveScopedPath(path));
  }

  /** Tries to scope `unscopedPath`. If outside `directoryPath`, returns `undefined`. */
  function scopePath(unscopedPath: string) {
    const relativePath = relative(directoryPath, unscopedPath);
    if (fs.isAbsolute(relativePath)) {
      // can happen on win32, where unscopedPath is on a different drive
      return undefined;
    }
    const relativePosixPath = relativePath.replace(/\\/g, '/');
    return !relativePosixPath.startsWith('../') ? resolveScopedPath(relativePosixPath) : undefined;
  }

  const scopedListeners: WeakMap<WatchEventListener, WatchEventListener> = new WeakMap();

  function createScopedListener(listener: WatchEventListener) {
    const scopedListener: WatchEventListener = (e) => {
      const scopedPath = scopePath(e.path);
      // we don't want to pass events outside of scoped directory
      if (scopedPath) {
        listener({
          stats: e.stats,
          path: scopedPath,
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
        const scopedOriginalPath = resolveScopedPath(path);
        const unscopedPath = join(directoryPath, scopedOriginalPath);
        const actualPath = await fs.promises.realpath(unscopedPath);
        return scopePath(actualPath) ?? scopedOriginalPath;
      },
      async readlink(path) {
        const scopedPath = resolveScopedPath(path);
        const unscopedPath = join(directoryPath, scopedPath);
        const target = await fs.promises.readlink(unscopedPath);
        return fs.isAbsolute(target) ? scopePath(target) ?? scopedPath : target;
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
      symlink(target, path, type) {
        return promises.symlink(
          posixPath.isAbsolute(target) ? resolveFullPath(target) : target,
          resolveFullPath(path),
          type
        );
      },
      unlink(path) {
        return promises.unlink(resolveFullPath(path));
      },
      writeFile(path, ...args) {
        return promises.writeFile(path === '' ? '' : resolveFullPath(path), ...args);
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
      const scopedOriginalPath = resolveScopedPath(path);
      const unscopedPath = join(directoryPath, scopedOriginalPath);
      const actualPath = fs.realpathSync(unscopedPath);
      return scopePath(actualPath) ?? scopedOriginalPath;
    },
    readlinkSync(path) {
      const scopedPath = resolveScopedPath(path);
      const unscopedPath = join(directoryPath, scopedPath);
      const target = fs.readlinkSync(unscopedPath);
      return fs.isAbsolute(target) ? scopePath(target) ?? scopedPath : target;
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
    symlinkSync(target, path, type) {
      return fs.symlinkSync(
        posixPath.isAbsolute(target) ? resolveFullPath(target) : target,
        resolveFullPath(path),
        type
      );
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
      const scopedOriginalPath = resolveScopedPath(path);
      const unscopedPath = join(directoryPath, scopedOriginalPath);

      fs.realpath(unscopedPath, (e, actualPath) => {
        if (e) {
          callback(e, actualPath);
        } else {
          callback(e, scopePath(actualPath) ?? scopedOriginalPath);
        }
      });
    },
    readlink(path, callback) {
      const scopedPath = resolveScopedPath(path);
      const unscopedPath = join(directoryPath, scopedPath);
      fs.readlink(unscopedPath, (e, target) => {
        if (e) {
          callback(e, target);
        } else {
          callback(e, fs.isAbsolute(target) ? scopePath(target) ?? scopedPath : target);
        }
      });
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
  };

  return createFileSystem(scopedBaseFs);
}
