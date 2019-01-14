import path from 'path'
import {
    lstat, lstatSync, mkdir, mkdirSync, readdir, readdirSync, readFile, readFileSync, realpath, realpathSync,
    rename, renameSync, rmdir, rmdirSync, stat, statSync, unlink, unlinkSync, writeFile, writeFileSync, isCaseSensitive
} from 'proper-fs'
import { createAsyncFileSystem, createSyncFileSystem } from '@file-services/utils'
import { IBaseFileSystem, IFileSystem } from '@file-services/types'
import { NodeWatchService, INodeWatchServiceOptions } from './watch-service'

export interface ICreateNodeFsOptions {
    watchOptions?: INodeWatchServiceOptions
}

export function createNodeFs(): IFileSystem {
    const baseFs = createBaseNodeFs()

    return {
        ...createSyncFileSystem(baseFs),
        ...createAsyncFileSystem(baseFs),
    }
}

export function createBaseNodeFs(options?: ICreateNodeFsOptions): IBaseFileSystem {
    return {
        path,
        watchService: new NodeWatchService(options && options.watchOptions),
        caseSensitive: isCaseSensitive,
        lstat,
        lstatSync,
        mkdir,
        mkdirSync,
        readdir,
        readdirSync,
        readFile(filePath, encoding = 'utf8') { return readFile(filePath, encoding) },
        readFileRaw(filePath) { return readFile(filePath) },
        readFileSync(filePath, encoding = 'utf8') { return readFileSync(filePath, encoding) },
        readFileRawSync(filePath) { return readFileSync(filePath) },
        realpath,
        realpathSync,
        rename,
        renameSync,
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

export const nodeFs: IFileSystem = createNodeFs()
