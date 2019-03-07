import { IBaseFileSystemSync, IBaseFileSystemAsync } from '@file-services/types'

export function syncToAsyncFs(syncFs: IBaseFileSystemSync): IBaseFileSystemAsync {
    return {
        path: syncFs.path,
        watchService: syncFs.watchService,
        caseSensitive: syncFs.caseSensitive,

        async readFile(filePath: string, encoding?: string) {
            return syncFs.readFileSync(filePath, encoding!)
        },

        async writeFile(filePath, content, encoding) {
            return syncFs.writeFileSync(filePath, content, encoding)
        },

        async unlink(filePath) {
            return syncFs.unlinkSync(filePath)
        },

        async readdir(directoryPath) {
            return syncFs.readdirSync(directoryPath)
        },

        async mkdir(directoryPath) {
            return syncFs.mkdirSync(directoryPath)
        },

        async rmdir(directoryPath) {
            return syncFs.rmdirSync(directoryPath)
        },

        async exists(nodePath) {
            return syncFs.existsSync(nodePath)
        },

        async stat(nodePath) {
            return syncFs.statSync(nodePath)
        },

        async lstat(nodePath) {
            return syncFs.lstatSync(nodePath)
        },

        async realpath(nodePath) {
            return syncFs.realpathSync(nodePath)
        },

        async rename(path, newPath) {
            return syncFs.renameSync(path, newPath)
        },

        async copyFile(src, dest, flags) {
            return syncFs.copyFileSync(src, dest, flags)
        }
    }
}
