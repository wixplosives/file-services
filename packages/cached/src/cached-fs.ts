import { IFileSystem, IFileSystemStats, CallbackFn } from '@file-services/types';
import { createFileSystem } from '@file-services/utils';

export interface ICachedFileSystem extends IFileSystem {
    invalidate(path: string): void;
}

export function createCachedFs(fs: IFileSystem): ICachedFileSystem {
    const statsCache = new Map<string, IFileSystemStats>();
    return {
        ...createFileSystem({
            ...fs,
            statSync(path: string) {
                const cachedStats = statsCache.get(path);
                if (cachedStats) {
                    return cachedStats;
                }
                const stats = fs.statSync(path);
                statsCache.set(path, stats);
                return stats;
            },
            stat(path: string, callback: CallbackFn<IFileSystemStats>) {
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
            statsCache.delete(path);
        }
    };
}
