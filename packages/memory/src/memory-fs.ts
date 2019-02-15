import pathMain from 'path'
import { syncToAsyncFs, createSyncFileSystem, createAsyncFileSystem, SetMultiMap } from '@file-services/utils'
import {
    IDirectoryContents,
    IFileSystemStats,
    IWatchEvent,
    WatchEventListener,
    FileSystemConstants
} from '@file-services/types'
import { FsErrorCodes } from './error-codes'
import {
    IMemFileSystem,
    IBaseMemFileSystem,
    IBaseMemFileSystemSync,
    IFsMemFileNode,
    IFsMemDirectoryNode,
} from './types'

// ugly workaround for webpack's polyfilled path not implementing `.posix` field
// TODO: inline path-posix implementation taked from latest node's source (faster!)
const posixPath = pathMain.posix as typeof pathMain || pathMain
const POSIX_ROOT = '/'

/**
 * This is the main function to use, returning a sync/async
 * in-memory file system with extended API.
 *
 * @param rootContents optional data to populate / with
 */
export function createMemoryFs(rootContents?: IDirectoryContents): IMemFileSystem {
    const baseFs = createBaseMemoryFs()

    const fs: IMemFileSystem = {
        root: baseFs.root,
        ...createSyncFileSystem(baseFs),
        ...createAsyncFileSystem(baseFs)
    }

    if (rootContents) {
        fs.populateDirectorySync(POSIX_ROOT, rootContents)
    }

    return fs
}

/**
 * Utility function to create a *base* sync/async
 * in-memory file system (without the extended API).
 */
export function createBaseMemoryFs(): IBaseMemFileSystem {
    const syncMemFs = createBaseMemoryFsSync()
    return { ...syncMemFs, ...syncToAsyncFs(syncMemFs) }
}

/**
 * Utility function to create a *base* sync-only
 * in-memory file system (without the extended API).
 */
export function createBaseMemoryFsSync(): IBaseMemFileSystemSync {
    const root: IFsMemDirectoryNode = createMemDirectory('memory-fs-root')
    const pathListeners = new SetMultiMap<string, WatchEventListener>()
    const globalListeners = new Set<WatchEventListener>()
    let workingDirectoryPath: string = POSIX_ROOT
    return {
        root,
        path: { ...posixPath, resolve: resolvePath },
        watchService: {
            async watchPath(path, listener) {
                const resolvedPath = resolvePath(path)
                if (listener) {
                    pathListeners.add(resolvedPath, listener)
                }
            },
            async unwatchPath(path, listener) {
                const resolvedPath = resolvePath(path)
                if (listener) {
                    pathListeners.delete(resolvedPath, listener)
                } else {
                    pathListeners.deleteKey(resolvedPath)
                }
            },
            async unwatchAllPaths() { pathListeners.clear() },
            addGlobalListener(listener) { globalListeners.add(listener) },
            removeGlobalListener(listener) { globalListeners.delete(listener) },
            clearGlobalListeners() { globalListeners.clear() }
        },
        caseSensitive: false,
        cwd,
        chdir,
        copyFileSync,
        existsSync,
        lstatSync: statSync, // links are not implemented yet
        mkdirSync,
        readdirSync,
        readFileSync,
        readFileRawSync,
        realpathSync: p => p, // links are not implemented yet
        renameSync,
        rmdirSync,
        statSync,
        unlinkSync,
        writeFileSync,
    }

    function resolvePath(...pathSegments: string[]): string {
        return posixPath.resolve(workingDirectoryPath, ...pathSegments)
    }

    function cwd(): string {
        return workingDirectoryPath
    }

    function chdir(directoryPath: string): void {
        workingDirectoryPath = resolvePath(directoryPath)
    }

    function readFileSync(filePath: string, encoding?: string): string {
        const resolvedPath = resolvePath(filePath)
        const fileNode = getNode(resolvedPath)

        if (!fileNode) {
            throw new Error(`${resolvedPath} ${FsErrorCodes.NO_FILE}`)
        } else if (fileNode.type === 'dir') {
            throw new Error(`${resolvedPath} ${FsErrorCodes.PATH_IS_DIRECTORY}`)
        }

        const { contents, rawContents } = fileNode
        if (!encoding && contents) {
            return contents
        } else {
            return rawContents.toString(encoding)
        }
    }

    function readFileRawSync(filePath: string): Buffer {
        const resolvedPath = resolvePath(filePath)
        const fileNode = getNode(resolvedPath)

        if (!fileNode) {
            throw new Error(`${resolvedPath} ${FsErrorCodes.NO_FILE}`)
        } else if (fileNode.type === 'dir') {
            throw new Error(`${resolvedPath} ${FsErrorCodes.PATH_IS_DIRECTORY}`)
        }

        return fileNode.rawContents
    }

    function writeFileSync(filePath: string, fileContent: string | Buffer, encoding?: string): void {
        const resolvedPath = resolvePath(filePath)
        const parentPath = posixPath.dirname(resolvedPath)
        const parentNode = getNode(parentPath)

        if (!parentNode || parentNode.type !== 'dir') {
            throw new Error(`${resolvedPath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`)
        }

        const fileName = posixPath.basename(resolvedPath)
        const lowerCaseFileName = fileName.toLowerCase()
        const fileNode = parentNode.contents.get(lowerCaseFileName)

        if (!fileNode) {
            const newFileNode = createMemFile(fileName, fileContent, encoding)
            parentNode.contents.set(lowerCaseFileName, newFileNode)
            emitWatchEvent({ path: resolvedPath, stats: createStatsFromNode(newFileNode) })
        } else if (fileNode.type === 'file') {
            updateMemFile(fileNode, fileContent, encoding)
            emitWatchEvent({ path: resolvedPath, stats: createStatsFromNode(fileNode) })
        } else {
            throw new Error(`${resolvedPath} EISDIR ${FsErrorCodes.PATH_IS_DIRECTORY}`)
        }
    }

    function unlinkSync(filePath: string): void {
        const resolvedPath = resolvePath(filePath)
        const parentPath = posixPath.dirname(resolvedPath)
        const parentNode = getNode(parentPath)

        if (!parentNode || parentNode.type !== 'dir') {
            throw new Error(`${resolvedPath} ${FsErrorCodes.NO_FILE}`)
        }

        const fileName = posixPath.basename(resolvedPath)
        const lowerCaseFileName = fileName.toLowerCase()
        const fileNode = parentNode.contents.get(lowerCaseFileName)

        if (!fileNode) {
            throw new Error(`${resolvedPath} ${FsErrorCodes.NO_FILE}`)
        } else if (fileNode.type === 'dir') {
            throw new Error(`${resolvedPath} ${FsErrorCodes.PATH_IS_DIRECTORY}`)
        }

        parentNode.contents.delete(lowerCaseFileName)
        emitWatchEvent({ path: resolvedPath, stats: null })
    }

    function readdirSync(directoryPath: string): string[] {
        const resolvedPath = resolvePath(directoryPath)
        const directoryNode = getNode(resolvedPath)

        if (!directoryNode) {
            throw new Error(`${resolvedPath} ${FsErrorCodes.NO_DIRECTORY}`)
        } else if (directoryNode.type === 'file') {
            throw new Error(`${resolvedPath} ${FsErrorCodes.PATH_IS_FILE}`)
        }

        return Array.from(directoryNode.contents.values()).map(({ name }) => name)
    }

    function mkdirSync(directoryPath: string): void {
        const resolvedPath = resolvePath(directoryPath)
        const parentPath = posixPath.dirname(resolvedPath)
        const parentNode = getNode(parentPath)

        if (!parentNode || parentNode.type !== 'dir') {
            throw new Error(`${resolvedPath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`)
        }

        const directoryName = posixPath.basename(resolvedPath)
        const lowerCaseDirectoryName = directoryName.toLowerCase()
        const currentNode = parentNode.contents.get(lowerCaseDirectoryName)

        if (currentNode) {
            throw new Error(`${resolvedPath} ${FsErrorCodes.PATH_ALREADY_EXISTS}`)
        }

        const newDirNode: IFsMemDirectoryNode = createMemDirectory(directoryName)
        parentNode.contents.set(lowerCaseDirectoryName, newDirNode)

        emitWatchEvent({ path: resolvedPath, stats: createStatsFromNode(newDirNode) })
    }

    function rmdirSync(directoryPath: string): void {
        const resolvedPath = resolvePath(directoryPath)
        const parentPath = posixPath.dirname(resolvedPath)
        const parentNode = getNode(parentPath)

        if (!parentNode || parentNode.type !== 'dir') {
            throw new Error(`${resolvedPath} ${FsErrorCodes.NO_DIRECTORY}`)
        }

        const directoryName = posixPath.basename(resolvedPath)
        const lowerCaseDirectoryName = directoryName.toLowerCase()
        const directoryNode = parentNode.contents.get(lowerCaseDirectoryName)

        if (!directoryNode || directoryNode.type !== 'dir') {
            throw new Error(`${resolvedPath} ${FsErrorCodes.NO_DIRECTORY}`)
        } else if (directoryNode.contents.size > 0) {
            throw new Error(`${resolvedPath} ${FsErrorCodes.DIRECTORY_NOT_EMPTY}`)
        }

        parentNode.contents.delete(lowerCaseDirectoryName)
        emitWatchEvent({ path: resolvedPath, stats: null })
    }

    function existsSync(nodePath: string): boolean {
        return !!getNode(resolvePath(nodePath))
    }

    function statSync(nodePath: string): IFileSystemStats {
        const resolvedPath = resolvePath(nodePath)
        const node = getNode(resolvedPath)
        if (!node) {
            throw new Error(`${resolvedPath} ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`)
        }
        const { birthtime, mtime } = node
        const isFile = node.type === 'file' ? returnsTrue : returnsFalse
        const isDirectory = node.type === 'dir' ? returnsTrue : returnsFalse
        const isSymbolicLink = returnsFalse

        return { isFile, isDirectory, isSymbolicLink, birthtime, mtime }
    }

    function renameSync(sourcePath: string, destinationPath: string): void {
        const resolvedSourcePath = resolvePath(sourcePath)
        const resolvedDestinationPath = resolvePath(destinationPath)
        const sourceParentPath = posixPath.dirname(resolvedSourcePath)
        const sourceParentNode = getNode(sourceParentPath)

        if (!sourceParentNode || sourceParentNode.type !== 'dir') {
            throw new Error(`${resolvedSourcePath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`)
        }

        const sourceName = posixPath.basename(resolvedSourcePath)
        const lowerCaseSourceName = sourceName.toLowerCase()
        const sourceNode = sourceParentNode.contents.get(lowerCaseSourceName)

        if (!sourceNode) {
            throw new Error(`${resolvedSourcePath} ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`)
        }

        const destinationParentPath = posixPath.dirname(resolvedDestinationPath)
        const destinationParentNode = getNode(destinationParentPath)

        if (!destinationParentNode || destinationParentNode.type !== 'dir') {
            throw new Error(`${resolvedDestinationPath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`)
        }

        const destinationName = posixPath.basename(resolvedDestinationPath)
        const lowerCaseDestinationName = destinationName.toLowerCase()
        const destinationNode = destinationParentNode.contents.get(lowerCaseDestinationName)

        if (destinationNode) {
            if (destinationNode.type === 'dir') {
                if (destinationNode.contents.size > 0) {
                    throw new Error(`${resolvedDestinationPath} ${FsErrorCodes.DIRECTORY_NOT_EMPTY}`)
                }
            } else {
                throw new Error(`${resolvedDestinationPath} ${FsErrorCodes.PATH_ALREADY_EXISTS}`)
            }
        }

        sourceParentNode.contents.delete(lowerCaseSourceName)
        sourceNode.name = destinationName
        sourceNode.mtime = new Date()
        destinationParentNode.contents.set(lowerCaseDestinationName, sourceNode)

        emitWatchEvent({ path: resolvedSourcePath, stats: null })
        emitWatchEvent({ path: resolvedDestinationPath, stats: createStatsFromNode(sourceNode) })
    }

    function copyFileSync(sourcePath: string, destinationPath: string, flags: number = 0): void {
        const resolvedSourcePath = resolvePath(sourcePath)
        const resolvedDestinationPath = resolvePath(destinationPath)
        const sourceFileNode = getNode(resolvedSourcePath)

        if (!sourceFileNode) {
            throw new Error(`${resolvedSourcePath} ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`)
        }

        if (sourceFileNode.type !== 'file') {
            throw new Error(`${resolvedSourcePath} ${FsErrorCodes.PATH_IS_DIRECTORY}`)
        }

        const destParentPath = posixPath.dirname(resolvedDestinationPath)
        const destParentNode = getNode(destParentPath)

        if (!destParentNode || destParentNode.type !== 'dir') {
            throw new Error(`${resolvedDestinationPath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`)
        }

        const targetName = posixPath.basename(resolvedDestinationPath)
        const lowerCaseTargetName = targetName.toLowerCase()
        const destinationFileNode = destParentNode.contents.get(lowerCaseTargetName)

        if (destinationFileNode) {
            const shouldOverride = !(flags & FileSystemConstants.COPYFILE_EXCL) // tslint:disable-line no-bitwise

            if (!shouldOverride) {
                throw new Error(`${resolvedDestinationPath} ${FsErrorCodes.PATH_ALREADY_EXISTS}`)
            }

            if (destinationFileNode.type !== 'file') {
                throw new Error(`${resolvedDestinationPath} ${FsErrorCodes.PATH_IS_DIRECTORY}`)
            }
        }

        const newFileNode: IFsMemFileNode = { ...sourceFileNode, name: targetName, mtime: new Date() }
        destParentNode.contents.set(lowerCaseTargetName, newFileNode)

        emitWatchEvent({ path: resolvedDestinationPath, stats: createStatsFromNode(newFileNode) })
    }

    function getNode(resolvedPath: string): IFsMemFileNode | IFsMemDirectoryNode | null {
        const splitPath = resolvedPath.split(posixPath.sep)

        return splitPath.reduce((fsNode: IFsMemDirectoryNode | IFsMemFileNode | null, depthName: string) => {
            return depthName === '' ?
                fsNode :
                (fsNode && fsNode.type === 'dir' && fsNode.contents.get(depthName.toLowerCase())) || null
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
}

function createMemDirectory(name: string): IFsMemDirectoryNode {
    const currentDate = new Date()
    return {
        type: 'dir',
        name,
        contents: new Map(),
        birthtime: currentDate,
        mtime: currentDate
    }
}

function createMemFile(name: string, content: string | Buffer, encoding?: string): IFsMemFileNode {
    const currentDate = new Date()

    const partialNode = {
        type: 'file' as 'file',
        name,
        birthtime: currentDate,
        mtime: currentDate
    }

    return typeof content === 'string' ?
        { ...partialNode, contents: content, rawContents: Buffer.from(content, encoding) } :
        { ...partialNode, rawContents: content }
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
