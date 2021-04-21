import type { IBaseFileSystemSync } from './base-api-sync.js';
import type { IBaseFileSystemAsync } from './base-api-async.js';

export * from './base-api-sync.js';
export * from './base-api-async.js';

/**
 * SYNC and ASYNC base file system.
 * Contains a subset of `fs`, watch service, and path methods.
 */
export interface IBaseFileSystem extends IBaseFileSystemSync, IBaseFileSystemAsync {}
