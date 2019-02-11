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

    function populateDirectorySync(directoryPath: string, contents: IDirectoryContents): string[] {
        const filePaths: string[] = []
        ensureDirectorySync(directoryPath)
        for (const [nodeName, nodeValue] of Object.entries(contents)) {
            const nodePath = path.join(directoryPath, nodeName)
            if (typeof nodeValue === 'string') {
                ensureDirectorySync(path.dirname(nodePath))
                writeFileSync(nodePath, nodeValue)
                filePaths.push(nodePath)
            } else {
                populateDirectorySync(nodePath, nodeValue)
            }
        }
        return filePaths
    }

    function removeSync(entryPath: string): void {
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

    function searchClosestFileSync(initialDirectoryPath: string, fileName: string): string | null {
        let currentPath = initialDirectoryPath
        let lastPath: string | undefined

        while (currentPath !== lastPath) {
            const filePath = path.join(currentPath, fileName)
            if (fileExistsSync(filePath)) {
                return filePath
            }
            lastPath = currentPath
            currentPath = path.dirname(currentPath)
        }

        return null
    }

    function searchParentChainSync(initialDirectoryPath: string, fileName: string): string[] {
        const filePaths: string[] = []
        let currentPath = initialDirectoryPath
        let lastPath: string | undefined

        while (currentPath !== lastPath) {
            const filePath = path.join(currentPath, fileName)
            if (fileExistsSync(filePath)) {
                filePaths.push(filePath)
            }
            lastPath = currentPath
            currentPath = path.dirname(currentPath)
        }

        return filePaths
    }

    return {
        ...baseFs,
        fileExistsSync,
        directoryExistsSync,
        ensureDirectorySync,
        populateDirectorySync,
        removeSync,
        searchClosestFileSync,
        searchParentChainSync
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

    async function populateDirectory(directoryPath: string, contents: IDirectoryContents): Promise<string[]> {
        const filePaths: string[] = []
        await ensureDirectory(directoryPath)
        for (const [nodeName, nodeValue] of Object.entries(contents)) {
            const nodePath = path.join(directoryPath, nodeName)
            if (typeof nodeValue === 'string') {
                await ensureDirectory(path.dirname(nodePath))
                await writeFile(nodePath, nodeValue)
                filePaths.push(nodePath)
            } else {
                await populateDirectory(nodePath, nodeValue)
            }
        }
        return filePaths
    }

    async function remove(entryPath: string): Promise<void> {
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

    async function searchClosestFile(initialDirectoryPath: string, fileName: string): Promise<string | null> {
        let currentPath = initialDirectoryPath
        let lastPath: string | undefined

        while (currentPath !== lastPath) {
            const filePath = path.join(currentPath, fileName)
            if (await fileExists(filePath)) {
                return filePath
            }
            lastPath = currentPath
            currentPath = path.dirname(currentPath)
        }

        return null
    }

    async function searchParentChain(initialDirectoryPath: string, fileName: string): Promise<string[]> {
        const filePaths: string[] = []
        let currentPath = initialDirectoryPath
        let lastPath: string | undefined

        while (currentPath !== lastPath) {
            const filePath = path.join(currentPath, fileName)
            if (await fileExists(filePath)) {
                filePaths.push(filePath)
            }
            lastPath = currentPath
            currentPath = path.dirname(currentPath)
        }

        return filePaths
    }

    return {
        ...baseFs,
        fileExists,
        directoryExists,
        ensureDirectory,
        populateDirectory,
        remove,
        searchClosestFile,
        searchParentChain
    }
}
