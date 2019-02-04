import { IFileSystem, IFileSystemStats, IBaseFileSystem } from '@file-services/types'
import { FsErrorCodes } from '@file-services/memory'
import { createAsyncFileSystem, createSyncFileSystem } from '@file-services/utils'

export function createOverlayFs(originFs: IFileSystem, overlayFs: IFileSystem): IFileSystem {
    const baseFileSystem: IBaseFileSystem = {
        path: overlayFs.path,
        caseSensitive: overlayFs.caseSensitive,
        watchService: overlayFs.watchService,
        async readFile(path: string, encoding?: string): Promise<string> {
            try {
                return await overlayFs.readFile(path, encoding)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return await originFs.readFile(path, encoding)
                } else {
                    throw e
                }
            }
        },
        readFileSync(path: string, encoding?: string): string {
            try {
                return overlayFs.readFileSync(path, encoding)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.readFileSync(path, encoding)
                } else {
                    throw e
                }
            }
        },
        async readFileRaw(path: string): Promise<Buffer> {
            try {
                return await overlayFs.readFileRaw(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.readFileRaw(path)
                } else {
                    throw e
                }
            }
        },
        readFileRawSync(path: string): Buffer {
            try {
                return overlayFs.readFileRawSync(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.readFileRawSync(path)
                } else {
                    throw e
                }
            }
        },
        async copyFile(path: string, destinationPath: string, flags?: number): Promise<void> {
            try {
                return await overlayFs.copyFile(path, destinationPath, flags)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.copyFile(path, destinationPath, flags)
                } else {
                    throw e
                }
            }
        },
        copyFileSync(path: string, destinationPath: string, flags?: number): void {
            try {
                return overlayFs.copyFileSync(path, destinationPath, flags)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.copyFileSync(path, destinationPath, flags)
                } else {
                    throw e
                }
            }
        },
        async mkdir(path: string): Promise<void> {
            try {
                return overlayFs.mkdir(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.mkdir(path)
                } else {
                    throw e
                }
            }
        },
        mkdirSync(path: string): void {
            try {
                return overlayFs.mkdirSync(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.mkdirSync(path)
                } else {
                    throw e
                }
            }
        },
        async readdir(path: string): Promise<string[]> {
            try {
                return await overlayFs.readdir(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.readdir(path)
                } else {
                    throw e
                }
            }
        },
        readdirSync(path: string): string[] {
            try {
                return overlayFs.readdirSync(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.readdirSync(path)
                } else {
                    throw e
                }
            }
        },
        async lstat(path: string): Promise<IFileSystemStats> {
            try {
                return await overlayFs.lstat(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.lstat(path)
                } else {
                    throw e
                }
            }
        },
        lstatSync(path: string): IFileSystemStats {
            try {
                return overlayFs.lstatSync(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.lstatSync(path)
                } else {
                    throw e
                }
            }
        },
        async rename(path: string, destination: string): Promise<void> {
            try {
                return await overlayFs.rename(path, destination)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.rename(path, destination)
                } else {
                    throw e
                }
            }
        },
        renameSync(path: string, destination: string): void {
            try {
                return overlayFs.renameSync(path, destination)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.renameSync(path, destination)
                } else {
                    throw e
                }
            }
        },
        async rmdir(path: string): Promise<void> {
            try {
                return await overlayFs.rmdir(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.rmdir(path)
                } else {
                    throw e
                }
            }
        },
        rmdirSync(path: string): void {
            try {
                return overlayFs.rmdirSync(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.rmdirSync(path)
                } else {
                    throw e
                }
            }
        },
        async stat(path: string): Promise<IFileSystemStats> {
            try {
                return await overlayFs.stat(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.stat(path)
                } else {
                    throw e
                }
            }
        },
        statSync(path: string): IFileSystemStats {
            try {
                return overlayFs.statSync(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.statSync(path)
                } else {
                    throw e
                }
            }
        },
        async unlink(path: string): Promise<void> {
            try {
                return await overlayFs.unlink(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.unlink(path)
                } else {
                    throw e
                }
            }
        },
        unlinkSync(path: string): void {
            try {
                return overlayFs.unlinkSync(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.unlinkSync(path)
                } else {
                    throw e
                }
            }
        },
        async writeFile(filePath: string, content: string, encoding?: string): Promise<void> {
            try {
                return await overlayFs.writeFile(filePath, content, encoding)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.writeFile(filePath, content, encoding)
                } else {
                    throw e
                }
            }
        },
        writeFileSync(filePath: string, content: string, encoding?: string): void {
            try {
                return overlayFs.writeFileSync(filePath, content, encoding)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.writeFileSync(filePath, content, encoding)
                } else {
                    throw e
                }
            }
        },
        async realpath(path: string): Promise<string> {
            try {
                return await overlayFs.realpath(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.realpath(path)
                } else {
                    throw e
                }
            }
        },
        realpathSync(path: string): string {
            try {
                return overlayFs.realpathSync(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    return originFs.realpathSync(path)
                } else {
                    throw e
                }
            }
        }
    }

    return {
        ...baseFileSystem,
        ...createAsyncFileSystem(baseFileSystem),
        ...createSyncFileSystem(baseFileSystem)
    }
}

function isFileOrDirectoryMissingError(error: Error): boolean {
    const isFileOrDirectoryMissing = error.message.includes(FsErrorCodes.NO_FILE_OR_DIRECTORY)
    const isFileMissing = error.message.includes(FsErrorCodes.NO_FILE)
    const isDirectoryMissing = error.message.includes(FsErrorCodes.NO_DIRECTORY)

    return isFileMissing || isDirectoryMissing || isFileOrDirectoryMissing
}
