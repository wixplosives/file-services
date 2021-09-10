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
  StatOptions,
} from '@file-services/types';
import { NodeWatchService, INodeWatchServiceOptions } from './watch-service.js';

const { promises: fsPromises } = fs;
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
    statSync,
    lstatSync,
    promises: {
      ...fs.promises,
      stat: statPromise,
      lstat: lstatPromise,
      exists: promisify(fs.exists),
    },
  };
}

function statSync(path: string, options?: StatOptions & { throwIfNoEntry?: true }): IFileSystemStats;
function statSync(path: string, options: StatOptions & { throwIfNoEntry: false }): IFileSystemStats | undefined;
function statSync(path: string, options?: StatOptions): IFileSystemStats | undefined {
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

function lstatSync(path: string, options?: StatOptions & { throwIfNoEntry?: true }): IFileSystemStats;
function lstatSync(path: string, options: StatOptions & { throwIfNoEntry: false }): IFileSystemStats | undefined;
function lstatSync(path: string, options?: StatOptions): IFileSystemStats | undefined {
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

async function statPromise(path: string, options?: StatOptions & { throwIfNoEntry?: true }): Promise<IFileSystemStats>;
async function statPromise(
  path: string,
  options: StatOptions & { throwIfNoEntry: false }
): Promise<IFileSystemStats | undefined>;
async function statPromise(path: string, options?: StatOptions): Promise<IFileSystemStats | undefined> {
  try {
    return await fsPromises.stat(path, options as fs.StatOptions);
  } catch (e) {
    const throwIfNoEntry = options?.throwIfNoEntry ?? true;
    if (throwIfNoEntry) {
      throw e;
    } else {
      return undefined;
    }
  }
}

async function lstatPromise(path: string, options?: StatOptions & { throwIfNoEntry?: true }): Promise<IFileSystemStats>;
async function lstatPromise(
  path: string,
  options: StatOptions & { throwIfNoEntry: false }
): Promise<IFileSystemStats | undefined>;
async function lstatPromise(path: string, options?: StatOptions): Promise<IFileSystemStats | undefined> {
  try {
    return await fsPromises.lstat(path, options as fs.StatOptions);
  } catch (e) {
    const throwIfNoEntry = options?.throwIfNoEntry ?? true;
    if (throwIfNoEntry) {
      throw e;
    } else {
      return undefined;
    }
  }
}
