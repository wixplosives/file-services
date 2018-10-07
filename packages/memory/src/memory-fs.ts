import pathMain from 'path'
import { IBaseFileSystem, IBaseFileSystemSync, IFileSystemStats } from '@file-services/types'
import { syncToAsyncFs } from '@file-services/utils'
import { FsErrorCodes } from './error-codes'

export interface IFsMemNode {
    type: 'file' | 'dir'
    name: string
    birthtime: Date
    mtime: Date
}

export interface IFsMemFileNode extends IFsMemNode {
    type: 'file'
    contents: string
}

export interface IFsMemDirectoryNode extends IFsMemNode {
    type: 'dir'
    contents: { [nodeName: string]: IFsMemDirectoryNode | IFsMemFileNode }
}

// ugly workaround for webpack's polyfilled path
const path = pathMain.posix as typeof pathMain || pathMain

export function createBaseMemoryFs(): IBaseFileSystem {
    const syncMemFs = createBaseMemoryFsSync()
    return { ...syncMemFs, ...syncToAsyncFs(syncMemFs) }
}

export function createBaseMemoryFsSync(): IBaseFileSystemSync {
    const root: IFsMemDirectoryNode = createMemDirectory('memory-fs-root')

    return {
        path,
        watcher: {} as any, // TODO: implement watcher
        isCaseSensitive: false,
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
            parentNode.contents[lowerCaseFileName] = {
                type: 'file',
                name: fileName,
                birthtime: currentDate,
                mtime: currentDate,
                contents: fileContent
            }
        } else if (fileNode.type === 'file') {
            fileNode.mtime = new Date()
            fileNode.contents = fileContent
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

        parentNode.contents[lowerCaseDirectoryName] = createMemDirectory(directoryName, parentNode)
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

function returnsTrue() {
    return true
}

function returnsFalse() {
    return false
}
