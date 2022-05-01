import fs from 'fs';
import path from 'path';
import { chdir, cwd } from 'process';
import { promisify } from 'util';

import { createFileSystem } from '@file-services/utils';
import type { IBaseFileSystem, IFileSystem, IFileSystemPath } from '@file-services/types';
import { NodeWatchService, INodeWatchServiceOptions } from './watch-service.js';

const caseSensitive = !fs.existsSync(__filename.toUpperCase());
const fsPromisesExists = promisify(fs.exists);

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
      ...fs.promises,
      exists: fsPromisesExists,
    },
  };
}
