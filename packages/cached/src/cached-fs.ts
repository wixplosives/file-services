import { IFileSystem, IFileSystemStats, CallbackFn } from '@file-services/types';
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

export interface ICacheResult {
    kind: 'success' | 'failure';
}

export interface ISuccessCacheResult extends ICacheResult {
    kind: 'success';
    stats: IFileSystemStats;
}

export interface IFailureCacheResult extends ICacheResult {
    kind: 'failure';
    error: Error;
}

export const isSuccessResult = (result: ICacheResult): result is ISuccessCacheResult => {
    return result.kind === 'success';
};

export const isFailureResult = (result: ICacheResult): result is IFailureCacheResult => {
    return result.kind === 'failure';
};

export function createCachedFs(fs: IFileSystem): ICachedFileSystem {
    const getCanonicalPath = fs.caseSensitive ? identity : toLowerCase;
    const statsCache = new Map<string, ICacheResult>();

    const createCacheKey = (path: string) => getCanonicalPath(fs.resolve(path));

    return {
        ...createFileSystem({
            ...fs,
            statSync(path: string) {
                path = createCacheKey(path);
                const cachedStats = statsCache.get(path);
                if (cachedStats) {
                    if (isFailureResult(cachedStats)) {
                        throw cachedStats.error;
                    }
                    return (cachedStats as ISuccessCacheResult).stats;
                }
                try {
                    const stats = fs.statSync(path);
                    statsCache.set(path, { kind: 'success', stats } as ISuccessCacheResult);
                    return stats;
                } catch (ex) {
                    statsCache.set(path, { kind: 'failure', error: ex } as IFailureCacheResult);
                    throw ex;
                }
            },
            stat(path: string, callback: CallbackFn<IFileSystemStats>) {
                path = createCacheKey(path);
                const cachedStats = statsCache.get(path);
                if (cachedStats) {
                    if (isFailureResult(cachedStats)) {
                        callback(cachedStats.error, undefined as any);
                    } else if (isSuccessResult(cachedStats)) {
                        callback(undefined, cachedStats.stats);
                    }
                    return;
                }
                fs.stat(path, (error, stats) => {
                    if (error) {
                        statsCache.set(path, { kind: 'failure', error } as IFailureCacheResult);
                    } else if (stats) {
                        statsCache.set(path, { kind: 'success', stats } as ISuccessCacheResult);
                    }

                    callback(error, stats);
                    return;
                });
            }
        }),
        invalidate(path: string) {
            statsCache.delete(createCacheKey(path));
        },
        invalidateAll() {
            statsCache.clear();
        },
        promises: {
            ...fs.promises,
            async stat(path: string) {
                path = createCacheKey(path);
                const cachedStats = statsCache.get(path);
                if (cachedStats) {
                    if (isFailureResult(cachedStats)) {
                        throw cachedStats.error;
                    }
                    return (cachedStats as ISuccessCacheResult).stats;
                }
                try {
                    const stats = await new Promise((res: (value: IFileSystemStats) => void, rej) =>
                        fs.stat(path, (error, value) => (error ? rej(error) : res(value)))
                    );
                    statsCache.set(path, { kind: 'success', stats } as ISuccessCacheResult);
                    return stats;
                } catch (ex) {
                    statsCache.set(path, { kind: 'failure', error: ex } as IFailureCacheResult);
                    throw ex;
                }
            }
        }
    };
}
