import { IBaseFileSystem, IFileSystem, WatchEventListener, IWatchService } from '@file-services/types'
import pathMain from 'path'
import { createAsyncFileSystem, createSyncFileSystem } from './create-extended-api'

// ugly workaround for webpack's polyfilled path not implementing posix
const posixPath = pathMain.posix as typeof pathMain || pathMain
const POSIX_ROOT = '/'

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

    let workingDirectoryPath: string = POSIX_ROOT

    function resolveScopedPath(...pathSegments: string[]): string {
        return posixPath.resolve(workingDirectoryPath, ...pathSegments)
    }

    function resolveFullPath(path: string): string {
        return join(directoryPath, resolveScopedPath(path))
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
                    path: posixPath.join(POSIX_ROOT, relativeEventPath)
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
            return watchService.watchPath(resolveFullPath(path), listener)
        },
        async unwatchPath(path, listener) {
            if (listener) {
                listener = scopedListeners.get(listener) || listener
            }
            return watchService.unwatchPath(resolveFullPath(path), listener)
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
        path: {
            ...fs.path,
            resolve: resolveScopedPath
        },
        caseSensitive: fs.caseSensitive,
        watchService: scopedWatchService,
        cwd() {
            return workingDirectoryPath
        },
        chdir(path) {
            workingDirectoryPath = resolveScopedPath(path)
        },
        async copyFile(src, dest, flags) {
            return fs.copyFile(resolveFullPath(src), resolveFullPath(dest), flags)
        },
        copyFileSync(src, dest, flags) {
            return fs.copyFileSync(resolveFullPath(src), resolveFullPath(dest), flags)
        },
        async lstat(path) {
            return fs.lstat(resolveFullPath(path))
        },
        lstatSync(path) {
            return fs.lstatSync(resolveFullPath(path))
        },
        async mkdir(path) {
            return fs.mkdir(resolveFullPath(path))
        },
        mkdirSync(path) {
            return fs.mkdirSync(resolveFullPath(path))
        },
        async readdir(path) {
            return fs.readdir(resolveFullPath(path))
        },
        readdirSync(path) {
            return fs.readdirSync(resolveFullPath(path))
        },
        async readFile(path, encoding) {
            return fs.readFile(resolveFullPath(path), encoding)
        },
        readFileSync(path, encoding) {
            return fs.readFileSync(resolveFullPath(path), encoding)
        },
        async readFileRaw(path) {
            return fs.readFileRaw(resolveFullPath(path))
        },
        readFileRawSync(path) {
            return fs.readFileRawSync(resolveFullPath(path))
        },
        async realpath(path) {
            return fs.realpath(resolveFullPath(path))
        },
        realpathSync(path) {
            return fs.realpathSync(resolveFullPath(path))
        },
        async rename(path, newPath) {
            return fs.rename(resolveFullPath(path), resolveFullPath(newPath))
        },
        renameSync(path, newPath) {
            return fs.renameSync(resolveFullPath(path), resolveFullPath(newPath))
        },
        async rmdir(path) {
            return fs.rmdir(resolveFullPath(path))
        },
        rmdirSync(path) {
            return fs.rmdirSync(resolveFullPath(path))
        },
        async exists(path) {
            return fs.exists(resolveFullPath(path))
        },
        existsSync(path) {
            return fs.existsSync(resolveFullPath(path))
        },
        async stat(path) {
            return fs.stat(resolveFullPath(path))
        },
        statSync(path) {
            return fs.statSync(resolveFullPath(path))
        },
        async unlink(path) {
            return fs.unlink(resolveFullPath(path))
        },
        unlinkSync(path) {
            return fs.unlinkSync(resolveFullPath(path))
        },
        async writeFile(path, content, encoding) {
            return fs.writeFile(resolveFullPath(path), content, encoding)
        },
        writeFileSync(path, content, encoding) {
            return fs.writeFileSync(resolveFullPath(path), content, encoding)
        }
    }

    return {
        ...scopedBaseFs,
        ...createAsyncFileSystem(scopedBaseFs),
        ...createSyncFileSystem(scopedBaseFs)
    }
}
