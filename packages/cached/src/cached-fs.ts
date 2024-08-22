import type { IFileSystem, IFileSystemStats } from "@file-services/types";
import { createFileSystem } from "@file-services/utils";

const identity = (val: string) => val;
const toLowerCase = (val: string) => val.toLowerCase();

export interface ICachedFileSystem extends IFileSystem {
  /**
   *
   * @param path the file path to clear from the cache
   */
  invalidate(path: string, deep?: boolean): void;
  /**
   * invalidates all files
   */
  invalidateAll(): void;
}

interface ISuccessCacheResult<T> {
  kind: "success";
  value: T;
}

interface IFailureCacheResult {
  kind: "failure";
  error: Error;
}

export function createCachedFs(fs: IFileSystem): ICachedFileSystem {
  const getCanonicalPath = fs.caseSensitive ? identity : toLowerCase;
  const statsCache = new Map<string, ISuccessCacheResult<IFileSystemStats | undefined> | IFailureCacheResult>();
  const realpathCache = new Map<string, string>();
  const realpathNativeCache = new Map<string, string>();
  const { promises, delimiter } = fs;

  const suffixTrue = delimiter + "true";
  const suffixFalse = delimiter + "false";

  const invalidateAbsolute = (absolutePath: string) => {
    const cachePath = getCanonicalPath(absolutePath);
    realpathCache.delete(cachePath);
    realpathNativeCache.delete(cachePath);
    statsCache.delete(cachePath + suffixTrue);
    statsCache.delete(cachePath + suffixFalse);
  };
  const invalidateAbsoluteByPrefix = (absolutePath: string) => {
    const prefix = getCanonicalPath(absolutePath);
    for (const key of realpathCache.keys()) {
      if (key.startsWith(prefix)) {
        realpathCache.delete(key);
      }
    }
    for (const key of realpathNativeCache.keys()) {
      if (key.startsWith(prefix)) {
        realpathNativeCache.delete(key);
      }
    }
    for (const key of statsCache.keys()) {
      if (key.startsWith(prefix)) {
        statsCache.delete(key);
      }
    }
  };

  function realpathSync(path: string): string {
    path = fs.resolve(path);
    const cacheKey = getCanonicalPath(path);
    const cachedActualPath = realpathCache.get(cacheKey);
    if (cachedActualPath !== undefined) {
      return cachedActualPath;
    }
    const actualPath = fs.realpathSync(path);
    realpathCache.set(cacheKey, actualPath);
    return actualPath;
  }

  realpathSync.native = function realpathSyncNative(path: string): string {
    path = fs.resolve(path);
    const cacheKey = getCanonicalPath(path);
    const cachedActualPath = realpathNativeCache.get(cacheKey);
    if (cachedActualPath !== undefined) {
      return cachedActualPath;
    }
    const actualPath = fs.realpathSync.native(path);
    realpathNativeCache.set(cacheKey, actualPath);
    return actualPath;
  };

  return {
    ...createFileSystem({
      ...fs,
      copyFileSync(sourcePath, destinationPath, ...args) {
        destinationPath = fs.resolve(destinationPath);
        invalidateAbsolute(destinationPath);
        return fs.copyFileSync(sourcePath, destinationPath, ...args);
      },
      mkdirSync(directoryPath, ...args) {
        directoryPath = fs.resolve(directoryPath);
        invalidateAbsolute(directoryPath);
        return fs.mkdirSync(directoryPath, ...args);
      },

      renameSync(sourcePath, destinationPath) {
        sourcePath = fs.resolve(sourcePath);
        destinationPath = fs.resolve(destinationPath);
        invalidateAbsolute(sourcePath);
        invalidateAbsolute(destinationPath);
        return fs.renameSync(sourcePath, destinationPath);
      },

      rmdirSync(directoryPath) {
        directoryPath = fs.resolve(directoryPath);
        invalidateAbsolute(directoryPath);
        return fs.rmdirSync(directoryPath);
      },
      rmSync(targetPath, options) {
        targetPath = fs.resolve(targetPath);
        invalidateAbsolute(targetPath);
        return fs.rmSync(targetPath, options);
      },
      symlinkSync(target, path, type) {
        path = fs.resolve(path);
        invalidateAbsolute(path);
        return fs.symlinkSync(target, path, type);
      },

      unlinkSync(filePath) {
        filePath = fs.resolve(filePath);
        invalidateAbsolute(filePath);
        return fs.unlinkSync(filePath);
      },

      writeFileSync(filePath, ...args) {
        if (filePath) {
          filePath = fs.resolve(filePath);
          invalidateAbsolute(filePath);
        }
        return fs.writeFileSync(filePath, ...args);
      },
      statSync(path, options) {
        path = fs.resolve(path);
        const throwIfNoEntry = options?.throwIfNoEntry ?? true;
        const cacheKey = getCanonicalPath(path) + (throwIfNoEntry ? suffixTrue : suffixFalse);
        const cachedStats = statsCache.get(cacheKey);
        if (cachedStats) {
          if (cachedStats.kind === "failure") {
            throw cachedStats.error;
          }
          return cachedStats.value as IFileSystemStats;
        }
        try {
          const stats = fs.statSync(path, options);
          statsCache.set(cacheKey, { kind: "success", value: stats });
          return stats as IFileSystemStats;
        } catch (e) {
          statsCache.set(cacheKey, { kind: "failure", error: e as Error });
          throw e;
        }
      },

      realpathSync,
    }),
    invalidate(path, deep = false) {
      const pathToInvalidate = fs.resolve(path);
      if (deep) {
        invalidateAbsoluteByPrefix(fs.join(pathToInvalidate, fs.sep));
      }
      return invalidateAbsolute(pathToInvalidate);
    },
    invalidateAll() {
      statsCache.clear();
    },
    promises: {
      ...promises,
      async realpath(path) {
        path = fs.resolve(path);
        const cacheKey = getCanonicalPath(path);
        const cachedActualPath = realpathCache.get(cacheKey);
        if (cachedActualPath !== undefined) {
          return cachedActualPath;
        }
        const actualPath = await promises.realpath(path);
        realpathCache.set(cacheKey, actualPath);
        return actualPath;
      },
      copyFile(sourcePath, destinationPath, ...args) {
        destinationPath = fs.resolve(destinationPath);
        invalidateAbsolute(destinationPath);
        return promises.copyFile(sourcePath, destinationPath, ...args);
      },
      mkdir(directoryPath, ...args) {
        directoryPath = fs.resolve(directoryPath);
        invalidateAbsolute(directoryPath);
        return promises.mkdir(directoryPath, ...args);
      },
      rename(sourcePath, destinationPath) {
        sourcePath = fs.resolve(sourcePath);
        destinationPath = fs.resolve(destinationPath);
        invalidateAbsolute(sourcePath);
        invalidateAbsolute(destinationPath);
        return promises.rename(sourcePath, destinationPath);
      },
      rmdir(directoryPath) {
        directoryPath = fs.resolve(directoryPath);
        invalidateAbsolute(directoryPath);
        return promises.rmdir(directoryPath);
      },
      rm(targetPath, options) {
        targetPath = fs.resolve(targetPath);
        invalidateAbsolute(targetPath);
        return promises.rm(targetPath, options);
      },
      unlink(filePath) {
        filePath = fs.resolve(filePath);
        invalidateAbsolute(filePath);
        return promises.unlink(filePath);
      },
      writeFile(filePath, ...args) {
        if (filePath) {
          filePath = fs.resolve(filePath);
          invalidateAbsolute(filePath);
        }
        return promises.writeFile(filePath, ...args);
      },
      async stat(path) {
        path = fs.resolve(path);
        // force throwIfNoEntry, as this function doesn't support it
        const cacheKey = getCanonicalPath(path) + suffixTrue;
        const cachedStats = statsCache.get(cacheKey);
        if (cachedStats) {
          if (cachedStats.kind === "failure") {
            throw cachedStats.error;
          }
          return cachedStats.value as IFileSystemStats;
        }
        try {
          const stats = await promises.stat(path);
          statsCache.set(cacheKey, { kind: "success", value: stats });
          return stats;
        } catch (e) {
          statsCache.set(cacheKey, { kind: "failure", error: e as Error });
          throw e;
        }
      },
      symlink(target, path, type) {
        path = fs.resolve(path);
        invalidateAbsolute(path);
        return promises.symlink(target, path, type);
      },
    },
  };
}
