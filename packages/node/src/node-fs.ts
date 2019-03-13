import path from 'path'
import fs from 'fs'
import { promisify } from 'util'
import { chdir, cwd } from 'process'

import { createFileSystem } from '@file-services/utils'
import { IBaseFileSystem, IFileSystem } from '@file-services/types'
import { NodeWatchService, INodeWatchServiceOptions } from './watch-service'

const { promises, existsSync, exists } = fs

const caseSensitive = !existsSync(__filename.toUpperCase())

export interface ICreateNodeFsOptions {
    watchOptions?: INodeWatchServiceOptions
}

export function createNodeFs(options?: ICreateNodeFsOptions): IFileSystem {
    return createFileSystem(createBaseNodeFs(options))
}

export function createBaseNodeFs(options?: ICreateNodeFsOptions): IBaseFileSystem {
    return {
        path,
        chdir,
        cwd,
        watchService: new NodeWatchService(options && options.watchOptions),
        caseSensitive,
        ...fs,
        promises: {
            ...promises,
            exists: promisify(exists)
        }
    }
}

export const nodeFs: IFileSystem = createNodeFs()
