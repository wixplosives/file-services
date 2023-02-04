import type {
  IFileSystem,
  IBaseFileSystemSyncActions,
  IBaseFileSystemPromiseActions,
  IBaseFileSystemCallbackActions,
  CallbackFn,
  ReadFileOptions,
  IDirectoryEntry,
  BufferEncoding,
  IWatchService,
  WatchEventListener,
} from '@file-services/types';
import { createFileSystem } from '@file-services/utils';

const getEntryName = (item: IDirectoryEntry) => item.name;

export function createOverlayFs(
  lowerFs: IFileSystem,
  upperFs: IFileSystem,
  baseDirectoryPath = lowerFs.cwd()
): IFileSystem {
  const { promises: lowerPromises } = lowerFs;
  const { promises: upperPromises } = upperFs;
  const lowerFsRelativeUp = `..${lowerFs.sep}`;

  // ensure base Directory is absolute
  baseDirectoryPath = lowerFs.resolve(baseDirectoryPath);

  function resolvePaths(path: string): { resolvedLowerPath: string; resolvedUpperPath?: string } {
    const resolvedLowerPath = lowerFs.resolve(path);
    const relativeToBase = lowerFs.relative(baseDirectoryPath, resolvedLowerPath);

    if (
      relativeToBase !== '..' &&
      !relativeToBase.startsWith(lowerFsRelativeUp) &&
      !lowerFs.isAbsolute(lowerFsRelativeUp)
    ) {
      return { resolvedLowerPath, resolvedUpperPath: relativeToBase.replace(/\\/g, '/') };
    } else {
      return { resolvedLowerPath };
    }
  }

  function realpathSync(path: string) {
    const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
    if (resolvedUpperPath !== undefined && upperFs.existsSync(resolvedUpperPath)) {
      const { stackTraceLimit } = Error;
      try {
        Error.stackTraceLimit = 0;
        return lowerFs.join(baseDirectoryPath, upperFs.realpathSync(resolvedUpperPath));
      } catch {
        /**/
      } finally {
        Error.stackTraceLimit = stackTraceLimit;
      }
    }
    return lowerFs.realpathSync(resolvedLowerPath);
  }

  realpathSync.native = function realpathSyncNative(path: string) {
    const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
    if (resolvedUpperPath !== undefined && upperFs.existsSync(resolvedUpperPath)) {
      const { stackTraceLimit } = Error;
      try {
        Error.stackTraceLimit = 0;
        return lowerFs.join(baseDirectoryPath, upperFs.realpathSync.native(resolvedUpperPath));
      } catch {
        /**/
      } finally {
        Error.stackTraceLimit = stackTraceLimit;
      }
    }
    return lowerFs.realpathSync.native(resolvedLowerPath);
  };

  const baseSyncActions: Partial<IBaseFileSystemSyncActions> = {
    existsSync(path) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined) {
        return upperFs.existsSync(resolvedUpperPath) || lowerFs.existsSync(resolvedLowerPath);
      } else {
        return lowerFs.existsSync(resolvedLowerPath);
      }
    },
    readFileSync: function readFileSync(path, ...args) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined && upperFs.existsSync(resolvedUpperPath)) {
        const { stackTraceLimit } = Error;
        try {
          Error.stackTraceLimit = 0;
          return upperFs.readFileSync(resolvedUpperPath, ...args);
        } catch {
          /**/
        } finally {
          Error.stackTraceLimit = stackTraceLimit;
        }
      }
      return lowerFs.readFileSync(resolvedLowerPath, ...args);
    } as IBaseFileSystemSyncActions['readFileSync'],
    statSync: function (path: string, ...args: []) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined && upperFs.existsSync(resolvedUpperPath)) {
        try {
          const stats = upperFs.statSync(resolvedUpperPath, ...args);
          if (stats) {
            return stats;
          }
        } catch {
          /**/
        }
      }
      return lowerFs.statSync(resolvedLowerPath, ...args);
    } as IBaseFileSystemSyncActions['statSync'],
    lstatSync: function lstatSync(path: string, ...args: []) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined && upperFs.existsSync(resolvedUpperPath)) {
        try {
          const stats = upperFs.lstatSync(resolvedUpperPath, ...args);
          if (stats) {
            return stats;
          }
        } catch {
          /**/
        }
      }
      return lowerFs.lstatSync(resolvedLowerPath, ...args);
    } as IBaseFileSystemSyncActions['lstatSync'],
    realpathSync,
    readlinkSync(path) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined && upperFs.existsSync(resolvedUpperPath)) {
        const { stackTraceLimit } = Error;
        try {
          Error.stackTraceLimit = 0;
          return upperFs.readlinkSync(resolvedUpperPath);
        } catch {
          /**/
        } finally {
          Error.stackTraceLimit = stackTraceLimit;
        }
      }
      return lowerFs.readlinkSync(resolvedLowerPath);
    },
    readdirSync: ((path, options: { withFileTypes: true }) => {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined && upperFs.existsSync(resolvedUpperPath)) {
        const { stackTraceLimit } = Error;
        try {
          Error.stackTraceLimit = 0;
          const resInUpper = upperFs.readdirSync(resolvedUpperPath, options);
          try {
            const resInLower = lowerFs.readdirSync(resolvedLowerPath, options);
            if (options !== null && typeof options === 'object' && options.withFileTypes) {
              const namesInUpper = new Set<string>(resInUpper.map(getEntryName));
              return [...resInLower.filter((item) => !namesInUpper.has(item.name)), ...resInUpper];
            }
            return Array.from(new Set([...resInLower, ...resInUpper]));
          } catch {
            return resInUpper;
          }
        } catch {
          /**/
        } finally {
          Error.stackTraceLimit = stackTraceLimit;
        }
      }
      return lowerFs.readdirSync(resolvedLowerPath, options);
    }) as IBaseFileSystemSyncActions['readdirSync'],
  };

  const basePromiseActions: Partial<IBaseFileSystemPromiseActions> = {
    async exists(path) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined) {
        return (await upperPromises.exists(resolvedUpperPath)) || (await lowerPromises.exists(resolvedLowerPath));
      } else {
        return lowerPromises.exists(resolvedLowerPath);
      }
    },
    readFile: async function readFile(path: string, ...args: [ReadFileOptions]) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined && upperFs.existsSync(resolvedUpperPath)) {
        try {
          return await upperPromises.readFile(resolvedUpperPath, ...args);
        } catch {
          /**/
        }
      }
      return lowerPromises.readFile(resolvedLowerPath, ...args);
    } as IBaseFileSystemPromiseActions['readFile'],
    async stat(path) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined && upperFs.existsSync(resolvedUpperPath)) {
        try {
          return await upperPromises.stat(resolvedUpperPath);
        } catch {
          /**/
        }
      }
      return lowerPromises.stat(resolvedLowerPath);
    },
    async lstat(path) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined && upperFs.existsSync(resolvedUpperPath)) {
        try {
          return await upperPromises.lstat(resolvedUpperPath);
        } catch {
          /**/
        }
      }
      return lowerPromises.lstat(resolvedLowerPath);
    },
    async realpath(path) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined && upperFs.existsSync(resolvedUpperPath)) {
        try {
          return lowerFs.join(baseDirectoryPath, await upperPromises.realpath(resolvedUpperPath));
        } catch {
          /**/
        }
      }
      return lowerPromises.realpath(resolvedLowerPath);
    },
    async readlink(path) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined && upperFs.existsSync(resolvedUpperPath)) {
        try {
          return await upperPromises.readlink(resolvedUpperPath);
        } catch {
          /**/
        }
      }
      return lowerPromises.readlink(resolvedLowerPath);
    },
    readdir: async function readdir(path: string, options: { withFileTypes: true }) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined && upperFs.existsSync(resolvedUpperPath)) {
        try {
          const resInUpper = await upperPromises.readdir(resolvedUpperPath, options);
          try {
            const resInLower = await lowerPromises.readdir(resolvedLowerPath, options);
            if (options !== null && typeof options === 'object' && options.withFileTypes) {
              const namesInUpper = new Set<string>(resInUpper.map(getEntryName));
              return [...resInLower.filter((item) => !namesInUpper.has(item.name)), ...resInUpper];
            }
            return Array.from(new Set([...resInLower, ...resInUpper]));
          } catch {
            /**/
          }
          return resInUpper;
        } catch {
          /**/
        }
      }
      return lowerPromises.readdir(resolvedLowerPath, options);
    } as IBaseFileSystemPromiseActions['readdir'],
  };

  const baseCallbackActions: Partial<IBaseFileSystemCallbackActions> = {
    exists(path, callback) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined) {
        upperFs.exists(resolvedUpperPath, (pathExists) => {
          if (pathExists) {
            callback(pathExists);
          } else {
            lowerFs.exists(resolvedLowerPath, callback);
          }
        });
      } else {
        lowerFs.exists(resolvedLowerPath, callback);
      }
    },
    readFile(
      path: string,
      options?: ReadFileOptions | CallbackFn<Buffer>,
      callback?: CallbackFn<string> | CallbackFn<Buffer> | CallbackFn<string | Buffer>
    ): void {
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      } else if (typeof callback !== 'function') {
        throw new Error(`callback is not a function.`);
      }
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined) {
        upperFs.readFile(resolvedUpperPath, options, (upperError, upperValue) => {
          if (upperError) {
            lowerFs.readFile(resolvedLowerPath, options as BufferEncoding, callback as CallbackFn<string | Buffer>);
          } else {
            (callback as CallbackFn<string | Buffer>)(upperError, upperValue);
          }
        });
      } else {
        lowerFs.readFile(resolvedLowerPath, options, callback as CallbackFn<string | Buffer>);
      }
    },
    stat(path, callback) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined) {
        upperFs.stat(resolvedUpperPath, (e, stats) => {
          if (e) {
            lowerFs.stat(resolvedLowerPath, callback);
          } else {
            callback(e, stats);
          }
        });
      } else {
        lowerFs.stat(resolvedLowerPath, callback);
      }
    },
    lstat(path, callback) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined) {
        upperFs.lstat(resolvedUpperPath, (e, stats) => {
          if (e) {
            lowerFs.lstat(resolvedLowerPath, callback);
          } else {
            callback(e, stats);
          }
        });
      } else {
        lowerFs.lstat(resolvedLowerPath, callback);
      }
    },
    realpath(path, callback) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined) {
        upperFs.realpath(resolvedUpperPath, (e, realPath) => {
          if (e) {
            lowerFs.realpath(resolvedLowerPath, callback);
          } else {
            callback(e, lowerFs.join(baseDirectoryPath, realPath));
          }
        });
      } else {
        lowerFs.realpath(resolvedLowerPath, callback);
      }
    },
    readlink(path, callback) {
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined) {
        upperFs.readlink(resolvedUpperPath, (e, linkPath) => {
          if (e) {
            lowerFs.readlink(resolvedLowerPath, callback);
          } else {
            callback(e, linkPath);
          }
        });
      } else {
        lowerFs.readlink(resolvedLowerPath, callback);
      }
    },
    readdir(
      path: string,
      options: string | { withFileTypes?: boolean } | undefined | null | CallbackFn<string[]>,
      callback?: CallbackFn<string[]> | CallbackFn<IDirectoryEntry[]>
    ) {
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      } else if (typeof callback !== 'function') {
        throw new Error(`callback is not a function.`);
      }
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath !== undefined) {
        upperFs.readdir(resolvedUpperPath, options as { withFileTypes: true }, (upperError, resInUpper) => {
          if (upperError) {
            lowerFs.readdir(
              resolvedLowerPath,
              options as { withFileTypes: true },
              callback as CallbackFn<IDirectoryEntry[]>
            );
          } else {
            lowerFs.readdir(resolvedLowerPath, options as { withFileTypes: true }, (lowerError, resInLower) => {
              if (lowerError) {
                (callback as CallbackFn<IDirectoryEntry[]>)(upperError, resInUpper);
              } else {
                if (options !== null && typeof options === 'object' && options.withFileTypes) {
                  const namesInUpper = new Set<string>(resInUpper.map(getEntryName));
                  const combined = [...resInLower.filter((item) => !namesInUpper.has(item.name)), ...resInUpper];
                  (callback as CallbackFn<IDirectoryEntry[]>)(upperError, combined);
                } else {
                  const combined = Array.from(new Set([...resInLower, ...resInUpper]));
                  (callback as CallbackFn<IDirectoryEntry[]>)(upperError, combined);
                }
              }
            });
          }
        });
      } else {
        lowerFs.readdir(
          resolvedLowerPath,
          options as { withFileTypes: true },
          callback as CallbackFn<IDirectoryEntry[]>
        );
      }
    },
  };

  const pathProxyListeners = new Map<string, Map<WatchEventListener, WatchEventListener>>();
  const globalProxyListeners = new Map<WatchEventListener, WatchEventListener>();

  const watchServiceProxy: IWatchService = {
    async watchPath(path, listener) {
      await lowerFs.watchService.watchPath(path, listener);
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
      if (resolvedUpperPath) {
        let proxyListener: WatchEventListener | undefined;

        if (listener) {
          proxyListener = (higherEvent) => {
            listener({
              ...higherEvent,
              path: lowerFs.join(baseDirectoryPath, higherEvent.path),
            });
          };

          const pathMap =
            pathProxyListeners.get(resolvedLowerPath) ?? new Map<WatchEventListener, WatchEventListener>();

          pathMap.set(listener, proxyListener);
          pathProxyListeners.set(resolvedLowerPath, pathMap);
        }

        await upperFs.watchService.watchPath(resolvedUpperPath, proxyListener ?? listener);
      }
    },
    async unwatchPath(path, listener) {
      await lowerFs.watchService.unwatchPath(path, listener);
      const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);

      if (resolvedUpperPath) {
        let proxyListener: WatchEventListener | undefined;

        if (listener) {
          const pathMap = pathProxyListeners.get(resolvedLowerPath);

          if (pathMap) {
            proxyListener = pathMap.get(listener);
            pathMap.delete(listener);
          }
        } else {
          pathProxyListeners.delete(resolvedLowerPath);
        }

        await upperFs.watchService.unwatchPath(resolvedUpperPath, proxyListener ?? listener);
      }
    },
    async unwatchAllPaths() {
      await lowerFs.watchService.unwatchAllPaths();
      await upperFs.watchService.unwatchAllPaths();
      pathProxyListeners.clear();
    },
    addGlobalListener(listener) {
      lowerFs.watchService.addGlobalListener(listener);

      let proxyListener: WatchEventListener | undefined;

      if (listener) {
        proxyListener = (higherEvent) => {
          listener({
            ...higherEvent,
            path: lowerFs.join(baseDirectoryPath, higherEvent.path),
          });
        };

        globalProxyListeners.set(listener, proxyListener);
      }

      upperFs.watchService.addGlobalListener(proxyListener ?? listener);
    },
    removeGlobalListener(listener) {
      lowerFs.watchService.removeGlobalListener(listener);
      const proxyListener = globalProxyListeners.get(listener);

      if (proxyListener) {
        upperFs.watchService.removeGlobalListener(proxyListener);
        globalProxyListeners.delete(proxyListener);
      }
    },
    clearGlobalListeners() {
      lowerFs.watchService.clearGlobalListeners();
      upperFs.watchService.clearGlobalListeners();
      globalProxyListeners.clear();
    },
  };

  return createFileSystem({
    ...lowerFs,
    watchService: watchServiceProxy,
    ...baseSyncActions,
    ...baseCallbackActions,
    promises: { ...lowerPromises, ...basePromiseActions },
  });
}

// to avoid having to include @types/node
interface TracedErrorConstructor extends ErrorConstructor {
  stackTraceLimit?: number;
}
declare let Error: TracedErrorConstructor;
