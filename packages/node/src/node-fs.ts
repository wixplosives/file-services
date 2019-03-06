import path from 'path'
import { chdir, cwd } from 'process'
import fs from 'fs'

import { createAsyncFileSystem, createSyncFileSystem } from '@file-services/utils'
import { IBaseFileSystem, IFileSystem } from '@file-services/types'
import { NodeWatchService, INodeWatchServiceOptions } from './watch-service'

const { promises, existsSync } = fs

const caseSensitive = !existsSync(__filename.toUpperCase())

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
        caseSensitive,
        ...fs,
        ...promises
    }
}

export const nodeFs: IFileSystem = createNodeFs()
