import { IBaseFileSystemSync, IBaseFileSystemAsync, IFileSystemStats } from '@file-services/types'

export function syncToAsyncFs(syncFs: IBaseFileSystemSync): IBaseFileSystemAsync {
    async function readFile(filePath: string): Promise<string> {
        return syncFs.readFileSync(filePath)
    }

    async function writeFile(filePath: string, content: string): Promise<void> {
        return syncFs.writeFileSync(filePath, content)
    }

    async function unlink(filePath: string): Promise<void> {
        return syncFs.unlinkSync(filePath)
    }

    async function readdir(directoryPath: string): Promise<string[]> {
        return syncFs.readdirSync(directoryPath)
    }

    async function mkdir(directoryPath: string): Promise<void> {
        return syncFs.mkdirSync(directoryPath)
    }

    async function rmdir(directoryPath: string): Promise<void> {
        return syncFs.rmdirSync(directoryPath)
    }

    async function stat(nodePath: string): Promise<IFileSystemStats> {
        return syncFs.statSync(nodePath)
    }

    async function lstat(nodePath: string): Promise<IFileSystemStats> {
        return syncFs.lstatSync(nodePath)
    }

    async function realpath(nodePath: string): Promise<string> {
        return syncFs.realpathSync(nodePath)
    }

    return {
        path: syncFs.path,
        watcher: syncFs.watcher,
        isCaseSensitive: syncFs.isCaseSensitive,

        readFile,
        writeFile,
        unlink,

        readdir,
        mkdir,
        rmdir,

        stat,
        lstat,
        realpath
    }
}
