import { IBaseFileSystem, IFileSystem, WatchEventListener } from '@file-services/types'
import pathMain from 'path'
import {createAsyncFileSystem, createSyncFileSystem} from './create-extended-api'

// ugly workaround for webpack's polyfilled path not implementing posix
const posixPath = pathMain.posix as typeof pathMain || pathMain

/**
 * Creates a wrapped `IFileSystem` which scopes the provided `fs`
 * to the provided `directoryPath`.
 *
 * @param fs the file system to scope
 * @param directoryPath the directory path to scope to
 */
export function createDirectoryFs(fs: IFileSystem, directoryPath: string): IFileSystem {
    const { join, relative, sep } = fs.path

    const joinPath = (path: string) => {
        const joinedPath = join(directoryPath, path)
        const relativePath = relative(directoryPath, joinedPath)
        if (relativePath.startsWith(`..${sep}`)) {
            throw new Error(`path ${path} is outside of scoped directory`)
        }
        return joinedPath
    }
    const watchListeners: Map<WatchEventListener, WatchEventListener> = new Map()

    const scopedBaseFs: IBaseFileSystem = {
        path: fs.path,
        caseSensitive: fs.caseSensitive,
        async lstat(path) {
            return fs.lstat(joinPath(path))
        },
        lstatSync(path) {
            return fs.lstatSync(joinPath(path))
        },
        async mkdir(path) {
            return fs.mkdir(joinPath(path))
        },
        mkdirSync(path) {
            return fs.mkdirSync(joinPath(path))
        },
        async readdir(path) {
            return fs.readdir(joinPath(path))
        },
        readdirSync(path) {
            return fs.readdirSync(joinPath(path))
        },
        async readFile(path, encoding) {
            return fs.readFile(joinPath(path), encoding)
        },
        readFileSync(path, encoding) {
            return fs.readFileSync(joinPath(path), encoding)
        },
        async readFileRaw(path) {
            return fs.readFileRaw(joinPath(path))
        },
        readFileRawSync(path) {
            return fs.readFileRawSync(joinPath(path))
        },
        async realpath(path) {
            return fs.realpath(joinPath(path))
        },
        realpathSync(path) {
            return fs.realpathSync(joinPath(path))
        },
        async rmdir(path) {
            return fs.rmdir(joinPath(path))
        },
        rmdirSync(path) {
            return fs.rmdirSync(joinPath(path))
        },
        async stat(path) {
            return fs.stat(joinPath(path))
        },
        statSync(path) {
            return fs.statSync(joinPath(path))
        },
        async unlink(path) {
            return fs.unlink(joinPath(path))
        },
        unlinkSync(path) {
            return fs.unlinkSync(joinPath(path))
        },
        async writeFile(path, content, encoding) {
            return fs.writeFile(joinPath(path), content, encoding)
        },
        writeFileSync(path, content, encoding) {
            return fs.writeFileSync(joinPath(path), content, encoding)
        },
        watchService: {
            async watchPath(path) {
                return fs.watchService.watchPath(joinPath(path))
            },
            addListener: listener => {
                const relativePathListener: WatchEventListener = e => {
                    const relativeEventPath = relative(directoryPath, e.path)
                    // we don't want to pass events outside of scoped directory
                    if (!relativeEventPath.startsWith(`..${sep}`)) {
                        listener({
                            stats: e.stats,
                            // use posixPath to ensure we give posix-style paths back
                            path: posixPath.join('/', relativeEventPath)
                        })
                    }
                }
                watchListeners.set(listener, relativePathListener)
                fs.watchService.addListener(relativePathListener)
            },
            removeListener(listener) {
                const relativePathListener = watchListeners.get(listener)
                if (relativePathListener) {
                    fs.watchService.removeListener(relativePathListener)
                    watchListeners.delete(listener)
                }
            },
            removeAllListeners() {
                watchListeners.clear()
                fs.watchService.removeAllListeners()
            },
            unwatchAll: fs.watchService.unwatchAll
        }
    }

    return {
        ...scopedBaseFs,
        ...createAsyncFileSystem(scopedBaseFs),
        ...createSyncFileSystem(scopedBaseFs)
    }
}
