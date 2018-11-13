import {IBaseFileSystem} from '@file-services/types'

type fsAsyncMethod<T> = (path: string) => Promise<T>

export function createDirectoryFs(fs: IBaseFileSystem, basePath = '/'): IBaseFileSystem {
    const pathFinder = (path: string) => fs.path.join(basePath, path)
    const wrapper: <T>(f: fsAsyncMethod<T>) => fsAsyncMethod<T> = f => {
        return (path: string) => {
            return f(pathFinder(path))
        }
    }
    return {
        readFile: wrapper(fs.readFile),
        stat: wrapper(fs.stat),
        path: fs.path,
        watchService: fs.watchService,
        caseSensitive: fs.caseSensitive,
        lstat: fs.lstat,
        lstatSync: fs.lstatSync,
        mkdir: fs.mkdir,
        mkdirSync: fs.mkdirSync,
        readdir: fs.readdir,
        readdirSync: fs.readdirSync,
        readFileSync: fs.readFileSync,
        realpath: fs.realpath,
        realpathSync: fs.realpathSync,
        rmdir: fs.rmdir,
        rmdirSync: fs.rmdirSync,
        statSync: fs.statSync,
        unlink: fs.unlink,
        unlinkSync: fs.unlinkSync,
        writeFile: fs.writeFile,
        writeFileSync: fs.writeFileSync
    }
}
