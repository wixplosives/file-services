import { IBaseFileSystemSync, IBaseFileSystemAsync, BufferEncoding } from '@file-services/types';
import { callbackify } from './callbackify';

export function syncToAsyncFs(syncFs: IBaseFileSystemSync): IBaseFileSystemAsync {
    return {
        path: syncFs.path,
        watchService: syncFs.watchService,
        caseSensitive: syncFs.caseSensitive,

        promises: {
            async readFile(filePath: string, encoding?: BufferEncoding) {
                return syncFs.readFileSync(filePath, encoding!);
            },

            async writeFile(filePath, content, encoding) {
                return syncFs.writeFileSync(filePath, content, encoding);
            },

            async unlink(filePath) {
                return syncFs.unlinkSync(filePath);
            },

            async readdir(directoryPath) {
                return syncFs.readdirSync(directoryPath);
            },

            async mkdir(directoryPath) {
                return syncFs.mkdirSync(directoryPath);
            },

            async rmdir(directoryPath) {
                return syncFs.rmdirSync(directoryPath);
            },

            async exists(nodePath) {
                return syncFs.existsSync(nodePath);
            },

            async stat(nodePath) {
                return syncFs.statSync(nodePath);
            },

            async lstat(nodePath) {
                return syncFs.lstatSync(nodePath);
            },

            async realpath(nodePath) {
                return syncFs.realpathSync(nodePath);
            },

            async rename(path, newPath) {
                return syncFs.renameSync(path, newPath);
            },

            async copyFile(src, dest, flags) {
                return syncFs.copyFileSync(src, dest, flags);
            },

            async readlink(path) {
                return syncFs.readlinkSync(path);
            }
        },

        exists(nodePath, callback) {
            callback(syncFs.existsSync(nodePath));
        },
        readFile: callbackify(syncFs.readFileSync) as IBaseFileSystemAsync['readFile'],
        writeFile: callbackify(syncFs.writeFileSync) as IBaseFileSystemAsync['writeFile'],
        unlink: callbackify(syncFs.unlinkSync),
        readdir: callbackify(syncFs.readdirSync),
        mkdir: callbackify(syncFs.mkdirSync),
        rmdir: callbackify(syncFs.rmdirSync),
        stat: callbackify(syncFs.statSync),
        lstat: callbackify(syncFs.lstatSync),
        realpath: callbackify(syncFs.realpathSync),
        rename: callbackify(syncFs.renameSync),
        copyFile: callbackify(syncFs.copyFileSync) as IBaseFileSystemAsync['copyFile'],
        readlink: callbackify(syncFs.readlinkSync)
    };
}
