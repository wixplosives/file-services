import {
    IBaseFileSystem,
    IFileSystem,
    WatchEventListener,
    IWatchService,
    IFileSystemPath,
    POSIX_ROOT,
    BufferEncoding,
    CallbackFn,
    CallbackFnVoid
} from '@file-services/types'
import { createAsyncFileSystem, createSyncFileSystem } from './create-extended-api'

type CbParams<T1, T2, T3 = T2> = [T1, T2] | [T3]

/**
 * Creates a wrapped `IFileSystem` which scopes the provided `fs`
 * to the provided `directoryPath`.
 *
 * @param fs the file system to scope
 * @param directoryPath the directory path to scope to
 */
export function createDirectoryFs(fs: IFileSystem, directoryPath: string): IFileSystem {
    const { watchService, promises } = fs
    const { join, relative, sep } = fs.path
    const posixPath = ((fs.path as any).posix as IFileSystemPath) || fs.path

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
        promises: {
            async copyFile(src, dest, flags) {
                return promises.copyFile(resolveFullPath(src), resolveFullPath(dest), flags)
            },
            async lstat(path) {
                return promises.lstat(resolveFullPath(path))
            },
            async mkdir(path) {
                return promises.mkdir(resolveFullPath(path))
            },
            async readdir(path) {
                return promises.readdir(resolveFullPath(path))
            },
            async readFile(path: string, encoding?: BufferEncoding) {
                return promises.readFile(resolveFullPath(path), encoding!)
            },
            async realpath(path) {
                return promises.realpath(resolveFullPath(path))
            },
            async rename(path, newPath) {
                return promises.rename(resolveFullPath(path), resolveFullPath(newPath))
            },
            async rmdir(path) {
                return promises.rmdir(resolveFullPath(path))
            },
            async exists(path) {
                return promises.exists(resolveFullPath(path))
            },
            async stat(path) {
                return promises.stat(resolveFullPath(path))
            },
            async unlink(path) {
                return promises.unlink(resolveFullPath(path))
            },
            async writeFile(path, content, encoding) {
                return promises.writeFile(resolveFullPath(path), content, encoding)
            },
            async readlink(path) {
                return promises.readlink(resolveFullPath(path))
            }
        },
        copyFileSync(src, dest, flags) {
            return fs.copyFileSync(resolveFullPath(src), resolveFullPath(dest), flags)
        },
        lstatSync(path) {
            return fs.lstatSync(resolveFullPath(path))
        },
        mkdirSync(path) {
            return fs.mkdirSync(resolveFullPath(path))
        },
        readdirSync(path) {
            return fs.readdirSync(resolveFullPath(path))
        },
        readFileSync(path: string, encoding?: BufferEncoding) {
            return fs.readFileSync(resolveFullPath(path), encoding!)
        },
        realpathSync(path) {
            return fs.realpathSync(resolveFullPath(path))
        },
        readlinkSync(path) {
            return fs.readlinkSync(resolveFullPath(path))
        },
        renameSync(path, newPath) {
            return fs.renameSync(resolveFullPath(path), resolveFullPath(newPath))
        },
        rmdirSync(path) {
            return fs.rmdirSync(resolveFullPath(path))
        },
        existsSync(path) {
            return fs.existsSync(resolveFullPath(path))
        },
        statSync(path) {
            return fs.statSync(resolveFullPath(path))
        },
        unlinkSync(path) {
            return fs.unlinkSync(resolveFullPath(path))
        },
        writeFileSync(path, content, encoding) {
            return fs.writeFileSync(resolveFullPath(path), content, encoding)
        },
        copyFile(src: string, dest: string, ...restArgs: CbParams<number, CallbackFnVoid>) {
            fs.copyFile(resolveFullPath(src), resolveFullPath(dest), ...(restArgs as [CallbackFnVoid]))
        },
        lstat(path, callback) {
            fs.lstat(resolveFullPath(path), callback)
        },
        mkdir(path, callback) {
            fs.mkdir(resolveFullPath(path), callback)
        },
        readdir(path, callback) {
            return fs.readdir(resolveFullPath(path), callback)
        },
        readFile(path: string, ...restArgs: CbParams<BufferEncoding, CallbackFn<string>, CallbackFn<Buffer>>) {
            return fs.readFile(resolveFullPath(path), ...(restArgs as [CallbackFn<Buffer>]))
        },
        realpath(path, callback) {
            return fs.realpath(resolveFullPath(path), callback)
        },
        rename(path, newPath, callback) {
            return fs.rename(resolveFullPath(path), resolveFullPath(newPath), callback)
        },
        rmdir(path, callback) {
            return fs.rmdir(resolveFullPath(path), callback)
        },
        exists(path, callback) {
            return fs.exists(resolveFullPath(path), callback)
        },
        stat(path, callback) {
            return fs.stat(resolveFullPath(path), callback)
        },
        unlink(path, callback) {
            return fs.unlink(resolveFullPath(path), callback)
        },
        writeFile(path: string, contents: string | Buffer, ...restArgs: CbParams<BufferEncoding, CallbackFnVoid>) {
            return fs.writeFile(resolveFullPath(path), contents, ...(restArgs as [CallbackFnVoid]))
        },
        readlink(path, callback) {
            return fs.readlink(resolveFullPath(path), callback)
        }
    }

    return {
        ...scopedBaseFs,
        ...createAsyncFileSystem(scopedBaseFs),
        ...createSyncFileSystem(scopedBaseFs)
    }
}
