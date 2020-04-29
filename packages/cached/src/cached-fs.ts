import { IFileSystem, IFileSystemStats, CallbackFnVoid } from '@file-services/types';
import { createFileSystem } from '@file-services/utils';

const identity = (val: string) => val;
const toLowerCase = (val: string) => val.toLowerCase();

export interface ICachedFileSystem extends IFileSystem {
  /**
   *
   * @param path the file path to clear from the cache
   */
  invalidate(path: string): void;
  /**
   * invalidates all files
   */
  invalidateAll(): void;
}

export interface ISuccessCacheResult {
  kind: 'success';
  stats: IFileSystemStats;
}

export interface IFailureCacheResult {
  kind: 'failure';
  error: Error;
}

export function createCachedFs(fs: IFileSystem): ICachedFileSystem {
  const getCanonicalPath = fs.caseSensitive ? identity : toLowerCase;
  const statsCache = new Map<string, ISuccessCacheResult | IFailureCacheResult>();
  const { promises } = fs;
  const invalidateAbsolute = (absolutePath: string) => statsCache.delete(getCanonicalPath(absolutePath));

  return {
    ...createFileSystem({
      ...fs,
      copyFile: function copyFile(sourcePath: string, destinationPath: string, ...args: [CallbackFnVoid]) {
        destinationPath = fs.resolve(destinationPath);
        invalidateAbsolute(destinationPath);
        return fs.copyFile(sourcePath, destinationPath, ...args);
      } as IFileSystem['copyFile'],
      copyFileSync(sourcePath, destinationPath, ...args) {
        destinationPath = fs.resolve(destinationPath);
        invalidateAbsolute(destinationPath);
        return fs.copyFileSync(sourcePath, destinationPath, ...args);
      },
      mkdir(directoryPath, callback) {
        directoryPath = fs.resolve(directoryPath);
        invalidateAbsolute(directoryPath);
        return fs.mkdir(directoryPath, callback);
      },
      mkdirSync(directoryPath) {
        directoryPath = fs.resolve(directoryPath);
        invalidateAbsolute(directoryPath);
        return fs.mkdirSync(directoryPath);
      },
      rename(sourcePath, destinationPath, callback) {
        sourcePath = fs.resolve(sourcePath);
        destinationPath = fs.resolve(destinationPath);
        invalidateAbsolute(sourcePath);
        invalidateAbsolute(destinationPath);
        return fs.rename(sourcePath, destinationPath, callback);
      },
      renameSync(sourcePath, destinationPath) {
        sourcePath = fs.resolve(sourcePath);
        destinationPath = fs.resolve(destinationPath);
        invalidateAbsolute(sourcePath);
        invalidateAbsolute(destinationPath);
        return fs.renameSync(sourcePath, destinationPath);
      },
      rmdir(directoryPath, callback) {
        directoryPath = fs.resolve(directoryPath);
        invalidateAbsolute(directoryPath);
        return fs.rmdir(directoryPath, callback);
      },
      rmdirSync(directoryPath) {
        directoryPath = fs.resolve(directoryPath);
        invalidateAbsolute(directoryPath);
        return fs.rmdirSync(directoryPath);
      },
      unlink(filePath, callback) {
        filePath = fs.resolve(filePath);
        invalidateAbsolute(filePath);
        return fs.unlink(filePath, callback);
      },
      unlinkSync(filePath) {
        filePath = fs.resolve(filePath);
        invalidateAbsolute(filePath);
        return fs.unlinkSync(filePath);
      },
      writeFile: function writeFile(filePath: string, ...args: [string, CallbackFnVoid]) {
        filePath = fs.resolve(filePath);
        invalidateAbsolute(filePath);
        return fs.writeFile(filePath, ...args);
      } as IFileSystem['writeFile'],
      writeFileSync(filePath, ...args) {
        filePath = fs.resolve(filePath);
        invalidateAbsolute(filePath);
        return fs.writeFileSync(filePath, ...args);
      },
      statSync(path) {
        path = fs.resolve(path);
        const cacheKey = getCanonicalPath(path);
        const cachedStats = statsCache.get(cacheKey);
        if (cachedStats) {
          if (cachedStats.kind === 'failure') {
            throw cachedStats.error;
          }
          return cachedStats.stats;
        }
        try {
          const stats = fs.statSync(path);
          statsCache.set(cacheKey, { kind: 'success', stats });
          return stats;
        } catch (ex) {
          statsCache.set(cacheKey, { kind: 'failure', error: ex });
          throw ex;
        }
      },
      stat(path, callback) {
        path = fs.resolve(path);
        const cacheKey = getCanonicalPath(path);
        const cachedStats = statsCache.get(cacheKey);
        if (cachedStats) {
          if (cachedStats.kind === 'failure') {
            (callback as (e: Error) => void)(cachedStats.error);
          } else if (cachedStats.kind === 'success') {
            callback(undefined, cachedStats.stats);
          }
          return;
        }
        fs.stat(path, (error, stats) => {
          if (error) {
            statsCache.set(cacheKey, { kind: 'failure', error });
          } else if (stats) {
            statsCache.set(cacheKey, { kind: 'success', stats });
          }

          callback(error, stats);
          return;
        });
      },
    }),
    invalidate(path) {
      return invalidateAbsolute(fs.resolve(path));
    },
    invalidateAll() {
      statsCache.clear();
    },
    promises: {
      ...promises,
      copyFile(sourcePath, destinationPath, ...args) {
        destinationPath = fs.resolve(destinationPath);
        invalidateAbsolute(destinationPath);
        return promises.copyFile(sourcePath, destinationPath, ...args);
      },
      mkdir(directoryPath) {
        directoryPath = fs.resolve(directoryPath);
        invalidateAbsolute(directoryPath);
        return promises.mkdir(directoryPath);
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
      unlink(filePath) {
        filePath = fs.resolve(filePath);
        invalidateAbsolute(filePath);
        return promises.unlink(filePath);
      },
      writeFile(filePath, ...args) {
        filePath = fs.resolve(filePath);
        invalidateAbsolute(filePath);
        return promises.writeFile(filePath, ...args);
      },
      async stat(path: string) {
        path = fs.resolve(path);
        const cacheKey = getCanonicalPath(path);
        const cachedStats = statsCache.get(cacheKey);
        if (cachedStats) {
          if (cachedStats.kind === 'failure') {
            throw cachedStats.error;
          }
          return cachedStats.stats;
        }
        try {
          const stats = await promises.stat(path);
          statsCache.set(cacheKey, { kind: 'success', stats });
          return stats;
        } catch (ex) {
          statsCache.set(cacheKey, { kind: 'failure', error: ex });
          throw ex;
        }
      },
    },
  };
}
