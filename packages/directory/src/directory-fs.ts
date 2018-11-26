import {IBaseFileSystem, IWatchService, WatchEventListener} from '@file-services/types'

export function createDirectoryFs(fs: IBaseFileSystem, basePath: string): IBaseFileSystem {
    const pathFinder = (path: string) => {
        const joinedPath = fs.path.join(basePath, path)
        const relative = fs.path.relative(basePath, joinedPath)
        if (relative.includes('..')) {
            throw new Error(`path ${path} is outside of home directory`)
        }
        return joinedPath
    }

    async function lstat(path: string) {
        return fs.lstat(pathFinder(path))
    }

    function lstatSync(path: string) {
        return fs.lstatSync(pathFinder(path))
    }

    async function mkdir(path: string) {
        return fs.mkdir(pathFinder(path))
    }

    function mkdirSync(path: string) {
        return fs.mkdirSync(pathFinder(path))
    }

    async function readdir(path: string) {
        return fs.readdir(pathFinder(path))
    }

    function readdirSync(path: string) {
        return fs.readdirSync(pathFinder(path))
    }

    async function readFile(path: string) {
        return fs.readFile(pathFinder(path))
    }

    function readFileSync(path: string) {
        return fs.readFileSync(pathFinder(path))
    }

    async function realpath(path: string) {
        return fs.realpath(pathFinder(path))
    }

    function realpathSync(path: string) {
        return fs.realpathSync(pathFinder(path))
    }

    async function rmdir(path: string) {
        return fs.rmdir(pathFinder(path))
    }

    function rmdirSync(path: string) {
        return fs.rmdirSync(pathFinder(path))
    }

    async function stat(path: string) {
        return fs.stat(pathFinder(path))
    }

    function statSync(path: string) {
        return fs.statSync(pathFinder(path))
    }

    async function unlink(path: string) {
        return fs.unlink(pathFinder(path))
    }

    function unlinkSync(path: string) {
        return fs.unlinkSync(pathFinder(path))
    }

    async function writeFile(path: string, content: string) {
        return fs.writeFile(pathFinder(path), content)
    }

    function writeFileSync(path: string, content: string) {
        return fs.writeFileSync(pathFinder(path), content)
    }

    // const systemPath: IFileSystemPath = {
    //     basename: (path, ext) => fs.path.basename(pathFinder(path), ext),
    //     dirname: path => fs.path.dirname(pathFinder(path)),
    //     extname: path => fs.path.extname(pathFinder(path)),
    //     join: (...paths) => fs.path.join(pathFinder(paths[0]), ...paths.slice(1)),
    //     normalize: path => fs.path.normalize(pathFinder(path)),
    //     resolve: (...paths) => fs.path.resolve(...paths.map(p => pathFinder(p))),
    //     relative: (from, to) => fs.path.relative(pathFinder(from), pathFinder(to)),
    //     isAbsolute: fs.path.isAbsolute
    // }
    const watchListeners: Map<WatchEventListener, WatchEventListener> = new Map()
    const watchService: IWatchService = {
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
        async watchPath(path: string) { fs.watchService.watchPath(pathFinder(path)) },
        unwatchAll: fs.watchService.unwatchAll
    }

    return {
        path: fs.path,
        watchService,
        caseSensitive: fs.caseSensitive,
        lstat,
        lstatSync,
        mkdir,
        mkdirSync,
        readdir,
        readdirSync,
        readFile,
        readFileSync,
        realpath,
        realpathSync,
        rmdir,
        rmdirSync,
        stat,
        statSync,
        unlink,
        unlinkSync,
        writeFile,
        writeFileSync
    }
}
