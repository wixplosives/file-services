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

    const createCacheKey = (path: string) => getCanonicalPath(fs.resolve(path));

    return {
        ...createFileSystem({
            ...fs,
            statSync(path: string) {
                path = createCacheKey(path);
                const cachedStats = statsCache.get(path);
                if (cachedStats) {
                    if (cachedStats.kind === 'failure') {
                        throw cachedStats.error;
                    }
                    return cachedStats.stats;
                }
                try {
                    const stats = fs.statSync(path);
                    statsCache.set(path, { kind: 'success', stats });
                    return stats;
                } catch (ex) {
                    statsCache.set(path, { kind: 'failure', error: ex });
                    throw ex;
                }
            },
            stat(path: string, callback: CallbackFn<IFileSystemStats>) {
                path = createCacheKey(path);
                const cachedStats = statsCache.get(path);
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
                        statsCache.set(path, { kind: 'failure', error });
                    } else if (stats) {
                        statsCache.set(path, { kind: 'success', stats });
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
                    if (cachedStats.kind === 'failure') {
                        throw cachedStats.error;
                    }
                    return cachedStats.stats;
                }
                try {
                    const stats = await new Promise((res: (value: IFileSystemStats) => void, rej) =>
                        fs.stat(path, (error, value) => (error ? rej(error) : res(value)))
                    );
                    statsCache.set(path, { kind: 'success', stats });
                    return stats;
                } catch (ex) {
                    statsCache.set(path, { kind: 'failure', error: ex });
                    throw ex;
                }
            }
        }
    };
}
