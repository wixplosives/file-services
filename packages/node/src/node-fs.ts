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
  RmOptions,
  StatSyncOptions,
} from '@file-services/types';
import { NodeWatchService, INodeWatchServiceOptions } from './watch-service.js';

const nodeMajor = parseInt(process.versions.node, 10);
const needsStatPolyfill = nodeMajor < 14;
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
    statSync: needsStatPolyfill ? statSync : fs.statSync,
    lstatSync: needsStatPolyfill ? lstatSync : fs.lstatSync,
    rmSync: fs.rmSync ?? rmSync, // node 12 fallback
    promises: {
      ...fs.promises,
      rm: fs.promises.rm ?? rm, // node 12 fallback
      exists: fsPromisesExists,
    },
  };
}

function statSync(path: string, options?: StatSyncOptions & { throwIfNoEntry?: true }): IFileSystemStats;
function statSync(path: string, options: StatSyncOptions & { throwIfNoEntry: false }): IFileSystemStats | undefined;
function statSync(path: string, options?: StatSyncOptions): IFileSystemStats | undefined {
  try {
    return fs.statSync(path, options);
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
    return fs.lstatSync(path, options);
  } catch (e) {
    const throwIfNoEntry = options?.throwIfNoEntry ?? true;
    if (throwIfNoEntry) {
      throw e;
    } else {
      return undefined;
    }
  }
}

function rmSync(path: string, { force, recursive }: RmOptions = {}): void {
  if (recursive) {
    // when recursive is specified, we want to be able to delete both files and directories
    // we use rmdirSync in that case, as we know it exists and handles both cases in recursive mode
    if (!force) {
      // when force isn't specified, we want this function to throw if the path doesn't exist
      // since recursive rmdirSync never throws, we call statSync that throws ENOENT if path doesn't exist
      fs.statSync(path);
    }
    fs.rmdirSync(path, { recursive });
  } else if (!force || fs.existsSync(path)) {
    // we check force or existance of path to match error throwing behavior
    fs.unlinkSync(path);
  }
}

async function rm(path: string, { force, recursive }: RmOptions = {}): Promise<void> {
  if (recursive) {
    // when recursive is specified, we want to be able to delete both files and directories
    // we use rmdir in that case, as we know it exists and handles both cases in recursive mode
    if (!force) {
      // when force isn't specified, we want this function to reject if the path doesn't exist
      // since recursive rmdir never rejects, we call stat that rejects ENOENT if path doesn't exist
      await fs.promises.stat(path);
    }
    await fs.promises.rmdir(path, { recursive });
  } else if (!force || (await fsPromisesExists(path))) {
    // we check force or existance of path to match error rejection behavior
    await fs.promises.unlink(path);
  }
}
