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
}

export function createCachedFs(fs: IFileSystem): ICachedFileSystem {
    const getCanonicalPath = fs.caseSensitive ? identity : toLowerCase;
    const statsCache = new Map<string, IFileSystemStats>();

    const createCacheKey = (path: string) => getCanonicalPath(fs.resolve(path));

    return {
        ...createFileSystem({
            ...fs,
            statSync(path: string) {
                path = createCacheKey(path);
                const cachedStats = statsCache.get(path);
                if (cachedStats) {
                    return cachedStats;
                }
                const stats = fs.statSync(path);
                statsCache.set(path, stats);
                return stats;
            },
            stat(path: string, callback: CallbackFn<IFileSystemStats>) {
                path = createCacheKey(path);
                const cachedStats = statsCache.get(path);
                if (cachedStats) {
                    callback(undefined, cachedStats);
                    return;
                }
                fs.stat(path, (error: Error | null | undefined, stats: IFileSystemStats) => {
                    statsCache.set(path, stats);
                    callback(error, stats);
                    return;
                });
            }
        }),
        invalidate(path: string) {
            statsCache.delete(createCacheKey(path));
        }
    };
}
