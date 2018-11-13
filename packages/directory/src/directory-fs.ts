import {IBaseFileSystem} from '@file-services/types'

export function createDirectoryFs(fs: IBaseFileSystem, basePath = '/'): IBaseFileSystem {
    const pathFinder = (path: string) => fs.path.join(basePath, path)

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

    return {
        path: fs.path,
        watchService: fs.watchService,
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
