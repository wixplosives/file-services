import path from 'path'
import { chdir, cwd } from 'process'
import {
    lstat,
    lstatSync,
    mkdir,
    mkdirSync,
    readdir,
    readdirSync,
    readFile,
    readFileSync,
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
    writeFileSync,
    isCaseSensitive,
    copyFile,
    copyFileSync,
    exists,
    existsSync
} from 'proper-fs'
import { createAsyncFileSystem, createSyncFileSystem } from '@file-services/utils'
import { IBaseFileSystem, IFileSystem } from '@file-services/types'
import { NodeWatchService, INodeWatchServiceOptions } from './watch-service'

export interface ICreateNodeFsOptions {
    watchOptions?: INodeWatchServiceOptions
}

export function createNodeFs(options?: ICreateNodeFsOptions): IFileSystem {
    const baseFs = createBaseNodeFs(options)

    return {
        ...createSyncFileSystem(baseFs),
        ...createAsyncFileSystem(baseFs)
    }
}

export function createBaseNodeFs(options?: ICreateNodeFsOptions): IBaseFileSystem {
    return {
        path,
        watchService: new NodeWatchService(options && options.watchOptions),
        chdir,
        cwd,
        caseSensitive: isCaseSensitive,
        copyFile,
        copyFileSync,
        exists,
        existsSync,
        lstat,
        lstatSync,
        mkdir,
        mkdirSync,
        readdir,
        readdirSync,
        readFile,
        readFileSync,
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
