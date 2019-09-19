import { IFileSystem } from '@file-services/types';

export interface ICachedFileSystem extends IFileSystem {
    invalidate(path: string): void;
}

export function createCachedFs(fs: IFileSystem): ICachedFileSystem {
    return { ...fs, invalidate(path) {} };
}
