import {IBaseFileSystem, WatchEventListener} from '@file-services/types'

export function createDirectoryFs(fs: IBaseFileSystem, basePath: string): IBaseFileSystem {
    const joinPath = (path: string) => {
        const joinedPath = fs.path.join(basePath, path)
        const relative = fs.path.relative(basePath, joinedPath)
        if (relative.includes('..')) {
            throw new Error(`path ${path} is outside of home directory`)
        }
        return joinedPath
    }
    const watchListeners: Map<WatchEventListener, WatchEventListener> = new Map()

    return {
        caseSensitive: fs.caseSensitive,
        lstat: async path => fs.lstat(joinPath(path)),
        lstatSync: path => fs.lstatSync(joinPath(path)),
        mkdir: async path => fs.mkdir(joinPath(path)),
        mkdirSync: path => fs.mkdirSync(joinPath(path)),
        path: fs.path,
        readdir: async path => fs.readdir(joinPath(path)),
        readdirSync: path => fs.readdirSync(joinPath(path)),
        readFile: async path => fs.readFile(joinPath(path)),
        readFileSync: path => fs.readFileSync(joinPath(path)),
        realpath: async path => fs.realpath(joinPath(path)),
        realpathSync: path => fs.realpathSync(joinPath(path)),
        rmdir: async path => fs.rmdir(joinPath(path)),
        rmdirSync: path => fs.rmdirSync(joinPath(path)),
        stat: async path => fs.stat(joinPath(path)),
        statSync: path => fs.statSync(joinPath(path)),
        unlink: async path => fs.unlink(joinPath(path)),
        unlinkSync: path => fs.unlinkSync(joinPath(path)),
        writeFile: async (path, content) => fs.writeFile(joinPath(path), content),
        writeFileSync: (path, content) => fs.writeFileSync(joinPath(path), content),
        watchService: {
            addListener: listener => {
                const relativePathListener: WatchEventListener = e => listener({
                    stats: e.stats,
                    path: fs.path.relative(basePath, e.path)
                })
                watchListeners.set(listener, relativePathListener)
                fs.watchService.addListener(relativePathListener)
            },
            removeListener: listener => {
                const relativePathListener = watchListeners.get(listener)
                if (relativePathListener) {
                    fs.watchService.removeListener(relativePathListener)
                    watchListeners.delete(listener)
                }
            },
            removeAllListeners: () => {
                watchListeners.clear()
                fs.watchService.removeAllListeners()
            },
            async watchPath(path: string) { fs.watchService.watchPath(joinPath(path)) },
            unwatchAll: fs.watchService.unwatchAll
        }
    }
}
