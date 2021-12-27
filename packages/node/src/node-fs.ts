import fs from 'fs';
import path from 'path';
import { chdir, cwd } from 'process';
import { promisify } from 'util';

import { createFileSystem } from '@file-services/utils';
import type {
  IBaseFileSystem,
  IFileSystem,
  IFileSystemPath,
  IFileSystemStats,
  StatSyncOptions,
} from '@file-services/types';
import { NodeWatchService, INodeWatchServiceOptions } from './watch-service.js';

const nodeMajor = parseInt(process.versions.node, 10);
const needsStatPolyfill = nodeMajor < 14;
const caseSensitive = !fs.existsSync(__filename.toUpperCase());

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
    statSync: needsStatPolyfill ? statSync : fs.statSync,
    lstatSync: needsStatPolyfill ? lstatSync : fs.lstatSync,
    promises: {
      ...fs.promises,
      exists: promisify(fs.exists),
    },
  };
}

function statSync(path: string, options?: StatSyncOptions & { throwIfNoEntry?: true }): IFileSystemStats;
function statSync(path: string, options: StatSyncOptions & { throwIfNoEntry: false }): IFileSystemStats | undefined;
function statSync(path: string, options?: StatSyncOptions): IFileSystemStats | undefined {
  try {
    return fs.statSync(path, options as fs.StatOptions);
  } catch (e) {
    const throwIfNoEntry = options?.throwIfNoEntry ?? true;
    if (throwIfNoEntry) {
      throw e;
    } else {
      return undefined;
    }
  }
}

function lstatSync(path: string, options?: StatSyncOptions & { throwIfNoEntry?: true }): IFileSystemStats;
function lstatSync(path: string, options: StatSyncOptions & { throwIfNoEntry: false }): IFileSystemStats | undefined;
function lstatSync(path: string, options?: StatSyncOptions): IFileSystemStats | undefined {
  try {
    return fs.lstatSync(path, options as fs.StatOptions);
  } catch (e) {
    const throwIfNoEntry = options?.throwIfNoEntry ?? true;
    if (throwIfNoEntry) {
      throw e;
    } else {
      return undefined;
    }
  }
}
