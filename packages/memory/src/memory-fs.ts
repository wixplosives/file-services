import pathMain from 'path'
import { syncToAsyncFs, createSyncFileSystem, createAsyncFileSystem } from '@file-services/utils'
import {
    IBaseFileSystemSync,
    IFileSystemStats,
    WatchEventListener,
    IWatchEvent,
    IBaseFileSystem,
    IFileSystem
} from '@file-services/types'
import { FsErrorCodes } from './error-codes'
import { IFsMemDirectoryNode, IFsMemFileNode } from './types'

export function createMemoryFs(): IFileSystem {
    const baseFs = createBaseMemoryFs()

    return {
        ...createSyncFileSystem(baseFs),
        ...createAsyncFileSystem(baseFs),
    }
}

export function createBaseMemoryFs(): IBaseFileSystem {
    const syncMemFs = createBaseMemoryFsSync()
    return { ...syncMemFs, ...syncToAsyncFs(syncMemFs) }
}

// ugly workaround for webpack's polyfilled path
const path = pathMain.posix as typeof pathMain || pathMain

export function createBaseMemoryFsSync(): IBaseFileSystemSync {
    const root: IFsMemDirectoryNode = createMemDirectory('memory-fs-root')
    const watchListeners: Set<WatchEventListener> = new Set()

    return {
        path,
        watchService: {
            addListener: listener => { watchListeners.add(listener) },
            removeListener: listener => watchListeners.delete(listener),
            removeAllListeners: () => watchListeners.clear(),
            async watchPath() { /* in-mem, so events are free */ },
            async unwatchAll() { /* in-mem, so events are free */ }
        },
        caseSensitive: false,
        lstatSync: statSync, // TODO: implement links
        mkdirSync,
        readdirSync,
        readFileSync,
        realpathSync: p => p, // TODO: implement links
        rmdirSync,
        statSync,
        unlinkSync,
        writeFileSync
    }

    function readFileSync(filePath: string): string {
        const fileNode = getNode(filePath)

        if (!fileNode) {
            throw new Error(`${filePath} ${FsErrorCodes.NO_FILE}`)
        } else if (fileNode.type === 'dir') {
            throw new Error(`${filePath} ${FsErrorCodes.PATH_IS_DIRECTORY}`)
        }

        return fileNode.contents
    }

    function writeFileSync(filePath: string, fileContent: string): void {
        const parentPath = path.dirname(filePath)
        const parentNode = getNode(parentPath)

        if (!parentNode || parentNode.type !== 'dir') {
            throw new Error(`${filePath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`)
        }

        const fileName = path.basename(filePath)
        const lowerCaseFileName = fileName.toLowerCase()
        const fileNode = parentNode.contents[lowerCaseFileName]

        if (!fileNode) {
            const currentDate = new Date()

            const newFileNode: IFsMemFileNode = {
                type: 'file',
                name: fileName,
                birthtime: currentDate,
                mtime: currentDate,
                contents: fileContent
            }

            parentNode.contents[lowerCaseFileName] = newFileNode
            emitWatchEvent({ path: filePath, stats: createStatsFromNode(newFileNode) })

        } else if (fileNode.type === 'file') {
            fileNode.mtime = new Date()
            fileNode.contents = fileContent
            emitWatchEvent({ path: filePath, stats: createStatsFromNode(fileNode) })

        } else {
            throw new Error(`${filePath} EISDIR ${FsErrorCodes.PATH_IS_DIRECTORY}`)
        }
    }

    function unlinkSync(filePath: string): void {
        const parentPath = path.dirname(filePath)
        const parentNode = getNode(parentPath)

        if (!parentNode || parentNode.type !== 'dir') {
            throw new Error(`${filePath} ${FsErrorCodes.NO_FILE}`)
        }

        const fileName = path.basename(filePath)
        const lowerCaseFileName = fileName.toLowerCase()
        const fileNode = parentNode.contents[lowerCaseFileName]

        if (!fileNode) {
            throw new Error(`${filePath} ${FsErrorCodes.NO_FILE}`)
        } else if (fileNode.type === 'dir') {
            throw new Error(`${filePath} ${FsErrorCodes.PATH_IS_DIRECTORY}`)
        }

        delete parentNode.contents[lowerCaseFileName]
        emitWatchEvent({ path: filePath, stats: null })
    }

    function readdirSync(directoryPath: string): string[] {
        const directoryNode = getNode(directoryPath)

        if (!directoryNode) {
            throw new Error(`${directoryPath} ${FsErrorCodes.NO_DIRECTORY}`)
        } else if (directoryNode.type === 'file') {
            throw new Error(`${directoryPath} ${FsErrorCodes.PATH_IS_FILE}`)
        }

        return Object.keys(directoryNode.contents).map(lowerCaseName => directoryNode.contents[lowerCaseName].name)
    }

    function mkdirSync(directoryPath: string): void {
        const parentPath = path.dirname(directoryPath)
        const parentNode = getNode(parentPath)

        if (!parentNode || parentNode.type !== 'dir') {
            throw new Error(`${directoryPath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`)
        }

        const directoryName = path.basename(directoryPath)
        const lowerCaseDirectoryName = directoryName.toLowerCase()
        const currentNode = parentNode.contents[lowerCaseDirectoryName]

        if (currentNode) {
            throw new Error(`${directoryPath} ${FsErrorCodes.PATH_ALREADY_EXISTS}`)
        }

        const newDirNode: IFsMemDirectoryNode = createMemDirectory(directoryName, parentNode)
        parentNode.contents[lowerCaseDirectoryName] = newDirNode

        emitWatchEvent({ path: directoryPath, stats: createStatsFromNode(newDirNode) })
    }

    function rmdirSync(directoryPath: string): void {
        const parentPath = path.dirname(directoryPath)
        const parentNode = getNode(parentPath)

        if (!parentNode || parentNode.type !== 'dir') {
            throw new Error(`${directoryPath} ${FsErrorCodes.NO_DIRECTORY}`)
        }

        const directoryName = path.basename(directoryPath)
        const lowerCaseDirectoryName = directoryName.toLowerCase()
        const directoryNode = parentNode.contents[lowerCaseDirectoryName]

        if (!directoryNode || directoryNode.type !== 'dir') {
            throw new Error(`${directoryPath} ${FsErrorCodes.NO_DIRECTORY}`)
        } else if (Object.keys(directoryNode.contents).length > 0) {
            throw new Error(`${directoryPath} ${FsErrorCodes.DIRECTORY_NOT_EMPTY}`)
        }

        delete parentNode.contents[lowerCaseDirectoryName]
        emitWatchEvent({ path: directoryPath, stats: null })
    }

    function statSync(nodePath: string): IFileSystemStats {
        const node = getNode(nodePath)
        if (!node) {
            throw new Error(`${nodePath} ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`)
        }
        const { birthtime, mtime } = node
        const isFile = node.type === 'file' ? returnsTrue : returnsFalse
        const isDirectory = node.type === 'dir' ? returnsTrue : returnsFalse
        const isSymbolicLink = returnsFalse

        return { isFile, isDirectory, isSymbolicLink, birthtime, mtime }
    }

    function getNode(nodePath: string): IFsMemFileNode | IFsMemDirectoryNode | null {
        const normalizedPath = path.normalize(nodePath)
        const splitPath = normalizedPath.split(path.sep)

        return splitPath.reduce((prevNode: IFsMemDirectoryNode | IFsMemFileNode | null, depthName: string) => {
            return (prevNode && prevNode.type === 'dir' &&
                prevNode.contents[depthName.toLowerCase()]) || null
        }, root)
    }

    function emitWatchEvent(watchEvent: IWatchEvent): void {
        for (const listener of watchListeners) {
            listener(watchEvent)
        }
    }
}

function createMemDirectory(name: string, parent?: IFsMemDirectoryNode): IFsMemDirectoryNode {
    const shadowEntries = Object.create(null)
    const actualEntries = Object.create(shadowEntries)
    const currentDate = new Date()
    const memDirectory: IFsMemDirectoryNode = {
        type: 'dir',
        name,
        contents: actualEntries,
        birthtime: currentDate,
        mtime: currentDate
    }

    shadowEntries['.'] = shadowEntries[''] = memDirectory
    if (parent) {
        shadowEntries['..'] = parent
    }
    return memDirectory
}

const returnsTrue = () => true
const returnsFalse = () => false

function createStatsFromNode(node: IFsMemFileNode | IFsMemDirectoryNode): IFileSystemStats {
    return {
        birthtime: node.birthtime,
        mtime: node.mtime,
        isFile: node.type === 'file' ? returnsTrue : returnsFalse,
        isDirectory: node.type === 'dir' ? returnsTrue : returnsFalse,
        isSymbolicLink: returnsFalse
    }
}
