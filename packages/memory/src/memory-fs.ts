import pathMain from 'path'
import { syncToAsyncFs, createSyncFileSystem, createAsyncFileSystem, SetMultiMap } from '@file-services/utils'
import {
    IBaseFileSystem,
    IDirectoryContents,
    IFileSystem,
    IFileSystemStats,
    IWatchEvent,
    WatchEventListener,
    FileSystemConstants
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
        writeFileSync,
        copyFileSync
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
            const newFileNode = createMemFile(fileName, fileContent, encoding)
            parentNode.contents[lowerCaseFileName] = newFileNode
            emitWatchEvent({ path: filePath, stats: createStatsFromNode(newFileNode) })
        } else if (fileNode.type === 'file') {
            updateMemFile(fileNode, fileContent, encoding)
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

    function renameSync(sourcePath: string, destinationPath: string): void {
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

        const destinationParentPath = posixPath.dirname(destinationPath)
        const destinationParentNode = getNode(destinationParentPath)

        if (!destinationParentNode || destinationParentNode.type !== 'dir') {
            throw new Error(`${destinationPath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`)
        }

        const destinationName = posixPath.basename(destinationPath)
        const lowerCaseDestinationName = destinationName.toLowerCase()
        const destinationNode = destinationParentNode.contents[lowerCaseDestinationName]

        if (destinationNode) {
            if (destinationNode.type === 'dir') {
                if (Object.keys(destinationNode.contents).length > 0) {
                    throw new Error(`${destinationPath} ${FsErrorCodes.DIRECTORY_NOT_EMPTY}`)
                }
            } else {
                throw new Error(`${destinationPath} ${FsErrorCodes.PATH_ALREADY_EXISTS}`)
            }
        }

        delete sourceParentNode.contents[lowerCaseSourceName]
        sourceNode.name = destinationName
        sourceNode.mtime = new Date()
        if (sourceNode.type === 'dir') {
            // Shadow (non-listed) entries such as ".." reside in directory nodes' prototypes
            Object.getPrototypeOf(sourceNode.contents)['..'] = destinationParentNode
        }
        destinationParentNode.contents[lowerCaseDestinationName] = sourceNode

        emitWatchEvent({ path: sourcePath, stats: null })
        emitWatchEvent({ path: destinationPath, stats: createStatsFromNode(sourceNode) })
    }

    function copyFileSync(sourcePath: string, destinationPath: string, flags: number = 0): void {
        const sourceFileNode = getNode(sourcePath)

        if (!sourceFileNode) {
            throw new Error(`${sourcePath} ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`)
        }

        if (sourceFileNode.type !== 'file') {
            throw new Error(`${sourcePath} ${FsErrorCodes.PATH_IS_DIRECTORY}`)
        }

        const destParentPath = posixPath.dirname(destinationPath)
        const destParentNode = getNode(destParentPath)

        if (!destParentNode || destParentNode.type !== 'dir') {
            throw new Error(`${destinationPath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`)
        }

        const targetName = posixPath.basename(destinationPath)
        const lowerCaseTargetName = targetName.toLowerCase()
        const destinationFileNode = destParentNode.contents[lowerCaseTargetName]

        if (destinationFileNode) {
            const shouldOverride = !(flags & FileSystemConstants.COPYFILE_EXCL) // tslint:disable-line no-bitwise

            if (!shouldOverride) {
                throw new Error(`${destinationPath} ${FsErrorCodes.PATH_ALREADY_EXISTS}`)
            }

            if (destinationFileNode.type !== 'file') {
                throw new Error(`${sourcePath} ${FsErrorCodes.PATH_IS_DIRECTORY}`)
            }
        }

        const newFileNode = {...sourceFileNode, name : targetName, mtime: new Date()}
        destParentNode.contents[lowerCaseTargetName] = newFileNode
        emitWatchEvent({ path: destinationPath, stats: createStatsFromNode(newFileNode) })
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

function createMemFile(name: string, content: string | Buffer, encoding?: string): IFsMemFileNode {
    const currentDate = new Date()

    const partialNode = {
        type: 'file' as 'file',
        name,
        birthtime: currentDate,
        mtime: currentDate
    }

    const newFileNode: IFsMemFileNode = typeof content === 'string' ?
        { ...partialNode, contents: content, rawContents: Buffer.from(content, encoding) } :
        { ...partialNode, rawContents: content }

    return newFileNode
}

function updateMemFile(fileNode: IFsMemFileNode, content: string | Buffer, encoding?: string): void {
    fileNode.mtime = new Date()

    if (typeof content === 'string') {
        fileNode.contents = content
        fileNode.rawContents = Buffer.from(content, encoding)
    } else {
        delete fileNode.contents
        fileNode.rawContents = content
    }
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
