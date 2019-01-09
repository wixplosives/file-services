import {
    IBaseFileSystemAsync,
    IBaseFileSystemSync,
    IFileSystemAsync,
    IFileSystemSync,
    IDirectoryContents
} from '@file-services/types'

export function createSyncFileSystem(baseFs: IBaseFileSystemSync): IFileSystemSync {
    const { statSync, path, mkdirSync, writeFileSync, unlinkSync, rmdirSync, lstatSync, readdirSync } = baseFs

    function fileExistsSync(filePath: string, statFn = statSync): boolean {
        try {
            return statFn(filePath).isFile()
        } catch {
            return false
        }
    }

    function directoryExistsSync(directoryPath: string, statFn = statSync): boolean {
        try {
            return statFn(directoryPath).isDirectory()
        } catch {
            return false
        }
    }

    function ensureDirectorySync(directoryPath: string): void {
        if (directoryExistsSync(directoryPath)) {
            return
        }
        try {
            mkdirSync(directoryPath)
        } catch (e) {
            const parentPath = path.dirname(directoryPath)
            if (parentPath === directoryPath) {
                throw e
            }
            ensureDirectorySync(parentPath)
            mkdirSync(directoryPath)
        }
    }

    function populateDirectorySync(directoryPath: string, contents: IDirectoryContents): void {
        ensureDirectorySync(directoryPath)
        for (const [nodeName, nodeValue] of Object.entries(contents)) {
            const nodePath = path.join(directoryPath, nodeName)
            if (typeof nodeValue === 'string') {
                ensureDirectorySync(path.dirname(nodePath))
                writeFileSync(nodePath, nodeValue)
            } else {
                populateDirectorySync(nodePath, nodeValue)
            }
        }
    }

    function removeSync(entryPath: string) {
        const stats = lstatSync(entryPath)
        if (stats.isDirectory()) {
            const directoryItems = readdirSync(entryPath)
            for (const entryName of directoryItems) {
                removeSync(path.join(entryPath, entryName))
            }
            rmdirSync(entryPath)
        } else if (stats.isFile() || stats.isSymbolicLink()) {
            unlinkSync(entryPath)
        } else {
            throw new Error(`unknown node type, cannot delete ${entryPath}`)
        }
    }

    return {
        ...baseFs,
        fileExistsSync,
        directoryExistsSync,
        ensureDirectorySync,
        populateDirectorySync,
        removeSync
    }
}

export function createAsyncFileSystem(baseFs: IBaseFileSystemAsync): IFileSystemAsync {
    const { stat, path, mkdir, writeFile, lstat, rmdir, unlink, readdir } = baseFs

    async function fileExists(filePath: string, statFn = stat): Promise<boolean> {
        try {
            return (await statFn(filePath)).isFile()
        } catch {
            return false
        }
    }

    async function directoryExists(directoryPath: string, statFn = stat): Promise<boolean> {
        try {
            return (await statFn(directoryPath)).isDirectory()
        } catch {
            return false
        }
    }

    async function ensureDirectory(directoryPath: string): Promise<void> {
        if (await directoryExists(directoryPath)) {
            return
        }
        try {
            await mkdir(directoryPath)
        } catch (e) {
            const parentPath = path.dirname(directoryPath)
            if (parentPath === directoryPath) {
                throw e
            }
            await ensureDirectory(parentPath)
            await mkdir(directoryPath)
        }
    }

    async function populateDirectory(directoryPath: string, contents: IDirectoryContents): Promise<void> {
        await ensureDirectory(directoryPath)
        for (const [nodeName, nodeValue] of Object.entries(contents)) {
            const nodePath = path.join(directoryPath, nodeName)
            if (typeof nodeValue === 'string') {
                await ensureDirectory(path.dirname(nodePath))
                await writeFile(nodePath, nodeValue)
            } else {
                await populateDirectory(nodePath, nodeValue)
            }
        }
    }

    async function remove(entryPath: string) {
        const stats = await lstat(entryPath)
        if (stats.isDirectory()) {
            const directoryItems = await readdir(entryPath)
            await Promise.all(directoryItems.map(entryName => remove(path.join(entryPath, entryName))))
            await rmdir(entryPath)
        } else if (stats.isFile() || stats.isSymbolicLink()) {
            await unlink(entryPath)
        } else {
            throw new Error(`unknown node type, cannot delete ${entryPath}`)
        }
    }

    return {
        ...baseFs,
        fileExists,
        directoryExists,
        ensureDirectory,
        populateDirectory,
        remove
    }
}
