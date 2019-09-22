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

export function createCachedFs(fs: IFileSystem): ICachedFileSystem {
    const getCanonicalPath = fs.caseSensitive ? identity : toLowerCase;
    const statsCache = new Map<string, IFileSystemStats | { error: Error }>();

    const createCacheKey = (path: string) => getCanonicalPath(fs.resolve(path));

    const isError = (e: IFileSystemStats | { error: Error }): e is { error: Error } => {
        return e.hasOwnProperty('stack');
    };

    return {
        ...createFileSystem({
            ...fs,
            statSync(path: string) {
                path = createCacheKey(path);
                const cachedStats = statsCache.get(path);
                if (cachedStats) {
                    if (isError(cachedStats)) {
                        throw cachedStats.error;
                    }
                    return cachedStats;
                }
                try {
                    const stats = fs.statSync(path);
                    statsCache.set(path, stats);
                    return stats;
                } catch (ex) {
                    statsCache.set(path, { error: ex });
                    throw ex;
                }
            },
            stat(path: string, callback: CallbackFn<IFileSystemStats>) {
                path = createCacheKey(path);
                const cachedStats = statsCache.get(path);
                if (cachedStats) {
                    if (isError(cachedStats)) {
                        throw cachedStats.error;
                    } else {
                        callback(undefined, cachedStats);
                    }
                    return;
                }
                fs.stat(path, (error, stats) => {
                    if (error) {
                        statsCache.set(path, { error });
                    } else if (stats) {
                        statsCache.set(path, stats);
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
                    if (isError(cachedStats)) {
                        throw cachedStats.error;
                    }
                    return cachedStats;
                }
                try {
                    const stats = await new Promise((res: (value: IFileSystemStats) => void, rej) =>
                        fs.stat(path, (error, value) => (error ? rej(error) : res(value)))
                    );
                    statsCache.set(path, stats);
                    return stats;
                } catch (ex) {
                    statsCache.set(path, { error: ex });
                    throw ex;
                }
            }
        }
    };
}
