import pathMain from 'path'
import { syncToAsyncFs, createSyncFileSystem, createAsyncFileSystem, SetMultiMap } from '@file-services/utils'
import {
    IBaseFileSystem,
    IDirectoryContents,
    IFileSystem,
    IFileSystemStats,
    IWatchEvent,
    WatchEventListener,
} from '@file-services/types'
import { FsErrorCodes } from './error-codes'
import { IFsMemDirectoryNode, IFsMemFileNode, IBaseMemFileSystemSync } from './types'

/**
 * This is the main function to use, returning a sync/async
 * in-memory file system with extended API.
 *
 * @param rootContents optional data to populate / with
 */
export function createMemoryFs(rootContents?: IDirectoryContents): IFileSystem {
    const baseFs = createBaseMemoryFs()

    const fs: IFileSystem = { ...createSyncFileSystem(baseFs), ...createAsyncFileSystem(baseFs) }

    if (rootContents) {
        fs.populateDirectorySync('/', rootContents)
    }

    return fs
}

/**
 * Utility function to create a *base* sync/async
 * in-memory file system (without the extended API).
 */
export function createBaseMemoryFs(): IBaseFileSystem {
    const syncMemFs = createBaseMemoryFsSync()
    return { ...syncMemFs, ...syncToAsyncFs(syncMemFs) }
}

// ugly workaround for webpack's polyfilled path not implementing posix
// TODO: inline path-posix implementation taked from latest node's source (faster!)
const posixPath = pathMain.posix as typeof pathMain || pathMain

/**
 * Utility function to create a *base* sync-only
 * in-memory file system (without the extended API).
 */
export function createBaseMemoryFsSync(): IBaseMemFileSystemSync {
    const root: IFsMemDirectoryNode = createMemDirectory('memory-fs-root')
    const pathListeners = new SetMultiMap<string, WatchEventListener>()
    const globalListeners: Set<WatchEventListener> = new Set()

    return {
        root,
        path: posixPath,
        watchService: {
            async watchPath(path, listener) {
                if (listener) {
                    pathListeners.add(path, listener)
                }
            },
            async unwatchPath(path, listener) {
                if (listener) {
                    pathListeners.delete(path, listener)
                } else {
                    pathListeners.deleteKey(path)
                }
            },
            async unwatchAllPaths() { pathListeners.clear() },
            addGlobalListener(listener) { globalListeners.add(listener) },
            removeGlobalListener(listener) { globalListeners.delete(listener) },
            clearGlobalListeners() { globalListeners.clear() }
        },
        caseSensitive: false,
        lstatSync: statSync, // TODO: implement links
        mkdirSync,
        readdirSync,
        readFileSync,
        readFileRawSync,
        realpathSync: p => p, // TODO: implement links
        renameSync,
        rmdirSync,
        statSync,
        unlinkSync,
        writeFileSync
    }

    function readFileSync(filePath: string, encoding?: string): string {
        const fileNode = getNode(filePath)

        if (!fileNode) {
            throw new Error(`${filePath} ${FsErrorCodes.NO_FILE}`)
        } else if (fileNode.type === 'dir') {
            throw new Error(`${filePath} ${FsErrorCodes.PATH_IS_DIRECTORY}`)
        }

        const { contents, rawContents } = fileNode
        if (!encoding && contents) {
            return contents
        } else {
            return rawContents.toString(encoding)
        }
    }

    function readFileRawSync(filePath: string): Buffer {
        const fileNode = getNode(filePath)

        if (!fileNode) {
            throw new Error(`${filePath} ${FsErrorCodes.NO_FILE}`)
        } else if (fileNode.type === 'dir') {
            throw new Error(`${filePath} ${FsErrorCodes.PATH_IS_DIRECTORY}`)
        }

        return fileNode.rawContents
    }

    function writeFileSync(filePath: string, fileContent: string | Buffer, encoding?: string): void {
        const parentPath = posixPath.dirname(filePath)
        const parentNode = getNode(parentPath)

        if (!parentNode || parentNode.type !== 'dir') {
            throw new Error(`${filePath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`)
        }

        const fileName = posixPath.basename(filePath)
        const lowerCaseFileName = fileName.toLowerCase()
        const fileNode = parentNode.contents[lowerCaseFileName]

        if (!fileNode) {
            const currentDate = new Date()

            const partialNode = {
                type: 'file' as 'file',
                name: fileName,
                birthtime: currentDate,
                mtime: currentDate,
            }

            const newFileNode: IFsMemFileNode = typeof fileContent === 'string' ?
                { ...partialNode, contents: fileContent, rawContents: Buffer.from(fileContent, encoding) } :
                { ...partialNode, rawContents: fileContent }

            parentNode.contents[lowerCaseFileName] = newFileNode
            emitWatchEvent({ path: filePath, stats: createStatsFromNode(newFileNode) })

        } else if (fileNode.type === 'file') {
            fileNode.mtime = new Date()
            if (typeof fileContent === 'string') {
                fileNode.contents = fileContent
                fileNode.rawContents = Buffer.from(fileContent, encoding)
            } else {
                delete fileNode.contents
                fileNode.rawContents = fileContent
            }
            emitWatchEvent({ path: filePath, stats: createStatsFromNode(fileNode) })

        } else {
            throw new Error(`${filePath} EISDIR ${FsErrorCodes.PATH_IS_DIRECTORY}`)
        }
    }

    function unlinkSync(filePath: string): void {
        const parentPath = posixPath.dirname(filePath)
        const parentNode = getNode(parentPath)

        if (!parentNode || parentNode.type !== 'dir') {
            throw new Error(`${filePath} ${FsErrorCodes.NO_FILE}`)
        }

        const fileName = posixPath.basename(filePath)
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
        const parentPath = posixPath.dirname(directoryPath)
        const parentNode = getNode(parentPath)

        if (!parentNode || parentNode.type !== 'dir') {
            throw new Error(`${directoryPath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`)
        }

        const directoryName = posixPath.basename(directoryPath)
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
        const parentPath = posixPath.dirname(directoryPath)
        const parentNode = getNode(parentPath)

        if (!parentNode || parentNode.type !== 'dir') {
            throw new Error(`${directoryPath} ${FsErrorCodes.NO_DIRECTORY}`)
        }

        const directoryName = posixPath.basename(directoryPath)
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
        const normalizedPath = posixPath.normalize(nodePath)
        const splitPath = normalizedPath.split(posixPath.sep)

        return splitPath.reduce((prevNode: IFsMemDirectoryNode | IFsMemFileNode | null, depthName: string) => {
            return (prevNode && prevNode.type === 'dir' &&
                prevNode.contents[depthName.toLowerCase()]) || null
        }, root)
    }

    function emitWatchEvent(watchEvent: IWatchEvent): void {
        for (const listener of globalListeners) {
            listener(watchEvent)
        }
        const listeners = pathListeners.get(watchEvent.path)
        if (listeners) {
            for (const listener of listeners) {
                listener(watchEvent)
            }
        }
    }

    function renameSync(sourcePath: string, targetPath: string): void {
        const sourceParentPath = posixPath.dirname(sourcePath)
        const sourceParentNode = getNode(sourceParentPath)

        if (!sourceParentNode || sourceParentNode.type !== 'dir') {
            throw new Error(`${sourcePath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`)
        }

        const sourceName = posixPath.basename(sourcePath)
        const lowerCaseSourceName = sourceName.toLowerCase()
        const sourceNode = sourceParentNode.contents[lowerCaseSourceName]

        if (!sourceNode) {
            throw new Error(`${sourcePath} ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`)
        }

        const targetParentPath = posixPath.dirname(targetPath)
        const targetParentNode = getNode(targetParentPath)

        if (!targetParentNode || targetParentNode.type !== 'dir') {
            throw new Error(`${targetPath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`)
        }

        const targetName = posixPath.basename(targetPath)
        const lowerCaseTargetName = targetName.toLowerCase()
        const targetNode = targetParentNode.contents[lowerCaseTargetName]

        if (targetNode) {
            if (targetNode.type === 'dir') {
                if (Object.keys(targetNode.contents).length > 0) {
                    throw new Error(`${targetPath} ${FsErrorCodes.DIRECTORY_NOT_EMPTY}`)
                }
            } else {
                throw new Error(`${targetPath} ${FsErrorCodes.PATH_ALREADY_EXISTS}`)
            }
        }

        delete sourceParentNode.contents[lowerCaseSourceName]
        sourceNode.name = targetName
        sourceNode.mtime = new Date()
        if (sourceNode.type === 'dir') {
            Object.getPrototypeOf(sourceNode.contents)['..'] = targetParentNode
        }
        targetParentNode.contents[lowerCaseTargetName] = sourceNode

        emitWatchEvent({ path: sourcePath, stats: null })
        emitWatchEvent({ path: targetPath, stats: createStatsFromNode(sourceNode) })
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
