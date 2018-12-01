import { IBaseFileSystemSync, IBaseFileSystemAsync } from '@file-services/types'

export function syncToAsyncFs(syncFs: IBaseFileSystemSync): IBaseFileSystemAsync {
    return {
        path: syncFs.path,
        watchService: syncFs.watchService,
        caseSensitive: syncFs.caseSensitive,

        async readFile(filePath, encoding) {
            return syncFs.readFileSync(filePath, encoding)
        },

        async readFileRaw(filePath) {
            return syncFs.readFileRawSync(filePath)
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

        async stat(nodePath) {
            return syncFs.statSync(nodePath)
        },

        async lstat(nodePath) {
            return syncFs.lstatSync(nodePath)
        },

        async realpath(nodePath) {
            return syncFs.realpathSync(nodePath)
        }
    }
}
