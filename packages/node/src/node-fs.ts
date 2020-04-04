import path from 'path';
import { promisify } from 'util';
import { chdir, cwd } from 'process';
import fs, {
    copyFile,
    existsSync,
    exists,
    lstat,
    mkdir,
    readFile,
    readdir,
    readlink,
    realpath,
    rename,
    rmdir,
    stat,
    unlink,
    writeFile,
} from 'fs';

import { createFileSystem } from '@file-services/utils';
import { IBaseFileSystem, IFileSystem, IFileSystemPath } from '@file-services/types';
import { NodeWatchService, INodeWatchServiceOptions } from './watch-service';

const caseSensitive = !existsSync(__filename.toUpperCase());

export interface ICreateNodeFsOptions {
    watchOptions?: INodeWatchServiceOptions;
}

export function createNodeFs(options?: ICreateNodeFsOptions): IFileSystem {
    return createFileSystem(createBaseNodeFs(options));
}

export function createBaseNodeFs(options?: ICreateNodeFsOptions): IBaseFileSystem {
    return {
        ...(path as IFileSystemPath),
        chdir,
        cwd,
        watchService: new NodeWatchService(options && options.watchOptions),
        caseSensitive,
        ...fs,
        promises: {
            // TODO: replace with fs.promises once Node 12+
            copyFile: promisify(copyFile),
            lstat: promisify(lstat),
            mkdir: promisify(mkdir),
            readFile: promisify(readFile),
            readdir: promisify(readdir),
            readlink: promisify(readlink),
            realpath: promisify(realpath),
            rename: promisify(rename),
            rmdir: promisify(rmdir),
            stat: promisify(stat),
            unlink: promisify(unlink),
            writeFile: promisify(writeFile),
            exists: promisify(exists),
        },
    };
}
