import {IBaseFileSystem} from '@file-services/types'

type fsAsyncMethod<T> = (path: string) => Promise<T>
type fsSyncMethod<T> = (path: string) => T
type fsWriteAsyncMethod<T> = (path: string, c: string) => Promise<T>
type fsWriteSyncMethod<T> = (path: string, c: string) => T

export function createDirectoryFs(fs: IBaseFileSystem, basePath = '/'): IBaseFileSystem {
    const pathFinder = (path: string) => fs.path.join(basePath, path)
    const asyncWrapper: <T>(f: fsAsyncMethod<T>) => fsAsyncMethod<T> = f => {
        return (path: string) => {
            return f(pathFinder(path))
        }
    }
    const syncWrapper: <T>(f: fsSyncMethod<T>) => fsSyncMethod<T> = f => {
        return (path: string) => {
            return f(pathFinder(path))
        }
    }
    const asyncWriteWrapper: <T>(f: fsWriteAsyncMethod<T>) => fsWriteAsyncMethod<T> = f => {
        return (path: string, content: string) => {
            return f(pathFinder(path), content)
        }
    }
    const syncWriteWrapper: <T>(f: fsWriteSyncMethod<T>) => fsWriteSyncMethod<T> = f => {
        return (path: string, content: string) => {
            return f(pathFinder(path), content)
        }
    }
    return {
        readFile: asyncWrapper(fs.readFile),
        stat: asyncWrapper(fs.stat),
        path: fs.path,
        watchService: fs.watchService,
        caseSensitive: fs.caseSensitive,
        lstat: asyncWrapper(fs.lstat),
        lstatSync: syncWrapper(fs.lstatSync),
        mkdir: asyncWrapper(fs.mkdir),
        mkdirSync: syncWrapper(fs.mkdirSync),
        readdir: asyncWrapper(fs.readdir),
        readdirSync: syncWrapper(fs.readdirSync),
        readFileSync: syncWrapper(fs.readFileSync),
        realpath: asyncWrapper(fs.realpath),
        realpathSync: syncWrapper(fs.realpathSync),
        rmdir: asyncWrapper(fs.rmdir),
        rmdirSync: syncWrapper(fs.rmdirSync),
        statSync: syncWrapper(fs.statSync),
        unlink: asyncWrapper(fs.unlink),
        unlinkSync: syncWrapper(fs.unlinkSync),
        writeFile: asyncWriteWrapper(fs.writeFile),
        writeFileSync: syncWriteWrapper(fs.writeFileSync)
    }
}
