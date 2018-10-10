import path from 'path'
import {
    lstat, lstatSync, mkdir, mkdirSync, readdir, readdirSync, readFile, readFileSync, realpath, realpathSync,
    rmdir, rmdirSync, stat, statSync, unlink, unlinkSync, writeFile, writeFileSync, isCaseSensitive
} from 'proper-fs'
import { IBaseFileSystem } from '@file-services/types'
import { NodeWatchService, INodeWatchServiceOptions } from './watch-service'

export interface ICreateNodeFsOptions {
    watchOptions?: INodeWatchServiceOptions
}

export function createBaseNodeFs(options?: ICreateNodeFsOptions): IBaseFileSystem {
    return {
        path,
        watchService: new NodeWatchService(options && options.watchOptions),
        isCaseSensitive,
        lstat,
        lstatSync,
        mkdir,
        mkdirSync,
        readdir,
        readdirSync,
        readFile(filePath) { return readFile(filePath, 'utf8') },
        readFileSync(filePath) { return readFileSync(filePath, 'utf8') },
        realpath,
        realpathSync,
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
