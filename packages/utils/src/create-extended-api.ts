import { IBaseFileSystemAsync, IBaseFileSystemSync, IFileSystemAsync, IFileSystemSync } from '@file-services/types'

export function createSyncFileSystem(baseFs: IBaseFileSystemSync): IFileSystemSync {
    function fileExistsSync(path: string, statFn = baseFs.statSync): boolean {
        try {
            return statFn(path).isFile()
        } catch {
            return false
        }
    }

    function directoryExistsSync(path: string, statFn = baseFs.statSync): boolean {
        try {
            return statFn(path).isDirectory()
        } catch {
            return false
        }
    }

    return {
        ...baseFs,
        fileExistsSync,
        directoryExistsSync
    }
}

export function createAsyncFileSystem(baseFs: IBaseFileSystemAsync): IFileSystemAsync {
    async function fileExists(path: string, statFn = baseFs.stat): Promise<boolean> {
        try {
            return (await statFn(path)).isFile()
        } catch {
            return false
        }
    }

    async function directoryExists(path: string, statFn = baseFs.stat): Promise<boolean> {
        try {
            return (await statFn(path)).isDirectory()
        } catch {
            return false
        }
    }

    return {
        ...baseFs,
        fileExists,
        directoryExists
    }
}
