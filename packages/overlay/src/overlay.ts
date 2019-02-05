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
                    const containingDirectory = overlayFs.path.dirname(path)
                    const isDirectoryExistsInOrigin = await originFs.directoryExists(containingDirectory)

                    if (isDirectoryExistsInOrigin) {
                        await overlayFs.ensureDirectory(containingDirectory)
                        return overlayFs.copyFile(path, destinationPath, flags)
                    } else {
                        throw e
                    }
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
                    const containingDirectory = overlayFs.path.dirname(path)
                    const isDirectoryExistsInOrigin = originFs.directoryExistsSync(containingDirectory)

                    if (isDirectoryExistsInOrigin) {
                        overlayFs.ensureDirectorySync(containingDirectory)
                        return overlayFs.copyFileSync(path, destinationPath, flags)
                    } else {
                        throw e
                    }
                } else {
                    throw e
                }
            }
        },
        async mkdir(path: string): Promise<void> {
            try {
                return await overlayFs.mkdir(path)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    const containingDirectory = overlayFs.path.dirname(path)
                    const isDirectoryExistsInOrigin = await originFs.directoryExists(containingDirectory)

                    if (isDirectoryExistsInOrigin) {
                        await overlayFs.ensureDirectory(containingDirectory)
                        return overlayFs.mkdir(path)
                    } else {
                        throw e
                    }
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
                    const containingDirectory = overlayFs.path.dirname(path)
                    const isDirectoryExistsInOrigin = originFs.directoryExistsSync(containingDirectory)

                    if (isDirectoryExistsInOrigin) {
                        overlayFs.ensureDirectorySync(containingDirectory)
                        return overlayFs.mkdirSync(path)
                    } else {
                        throw e
                    }
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
            return overlayFs.rename(path, destination)
        },
        renameSync(path: string, destination: string): void {
            return overlayFs.renameSync(path, destination)
        },
        async rmdir(path: string): Promise<void> {
            return overlayFs.rmdir(path)
        },
        rmdirSync(path: string): void {
            return overlayFs.rmdirSync(path)
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
            return overlayFs.unlink(path)
        },
        unlinkSync(path: string): void {
            return overlayFs.unlinkSync(path)
        },
        async writeFile(filePath: string, content: string, encoding?: string): Promise<void> {
            try {
                return await overlayFs.writeFile(filePath, content, encoding)
            } catch (e) {
                if (isFileOrDirectoryMissingError(e)) {
                    const containingDirectory = overlayFs.path.dirname(filePath)
                    const isDirectoryExistsInOrigin = await originFs.directoryExists(containingDirectory)

                    if (isDirectoryExistsInOrigin) {
                        await overlayFs.ensureDirectory(containingDirectory)
                        return overlayFs.writeFile(filePath, content, encoding)
                    } else {
                        throw e
                    }
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
                    const containingDirectory = overlayFs.path.dirname(filePath)
                    const isDirectoryExistsInOrigin = originFs.directoryExistsSync(containingDirectory)

                    if (isDirectoryExistsInOrigin) {
                        overlayFs.ensureDirectorySync(containingDirectory)
                        return originFs.writeFileSync(filePath, content, encoding)
                    } else {
                        throw e
                    }
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
    return !!Object.values(FsErrorCodes).find(value => {
        return error.message.includes(value)
    })
}
