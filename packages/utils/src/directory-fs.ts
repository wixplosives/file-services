import { IBaseFileSystem, IFileSystem, WatchEventListener, IWatchService } from '@file-services/types'
import pathMain from 'path'
import { createAsyncFileSystem, createSyncFileSystem } from './create-extended-api'

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
    const { watchService } = fs
    const { join, relative, sep } = fs.path

    function joinPath(path: string) {
        const joinedPath = join(directoryPath, path)
        const relativePath = relative(directoryPath, joinedPath)
        if (relativePath.startsWith(`..${sep}`)) {
            throw new Error(`path ${path} is outside of scoped directory`)
        }
        return joinedPath
    }

    const scopedListeners: WeakMap<WatchEventListener, WatchEventListener> = new WeakMap()

    function createScopedListener(listener: WatchEventListener) {
        const scopedListener: WatchEventListener = e => {
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
        scopedListeners.set(listener, scopedListener)
        return scopedListener
    }

    const scopedWatchService: IWatchService = {
        async watchPath(path, listener) {
            if (listener) {
                listener = scopedListeners.get(listener) || createScopedListener(listener)
            }
            return watchService.watchPath(joinPath(path), listener)
        },
        async unwatchPath(path, listener) {
            if (listener) {
                listener = scopedListeners.get(listener) || listener
            }
            return watchService.unwatchPath(joinPath(path), listener)
        },
        async unwatchAllPaths() {
            return watchService.unwatchAllPaths()
        },
        addGlobalListener(listener) {
            return watchService.addGlobalListener(scopedListeners.get(listener) || createScopedListener(listener))
        },
        removeGlobalListener(listener) {
            return watchService.removeGlobalListener(scopedListeners.get(listener) || listener)
        },
        clearGlobalListeners() {
            return watchService.clearGlobalListeners()
        }
    }

    const scopedBaseFs: IBaseFileSystem = {
        path: fs.path,
        caseSensitive: fs.caseSensitive,
        watchService: scopedWatchService,
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
        async rename(path, newPath) {
            return fs.rename(joinPath(path), joinPath(newPath))
        },
        renameSync(path, newPath) {
            return fs.renameSync(joinPath(path), joinPath(newPath))
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
        }
    }

    return {
        ...scopedBaseFs,
        ...createAsyncFileSystem(scopedBaseFs),
        ...createSyncFileSystem(scopedBaseFs)
    }
}
