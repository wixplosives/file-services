import type { IFileSystemSync } from './extended-api-sync.js';
import type { IFileSystemAsync } from './extended-api-async.js';

export * from './extended-api-sync.js';
export * from './extended-api-async.js';

/**
 * SYNC and ASYNC file system.
 * Exposes all base fs APIs plus several higher level methods.
 */
export interface IFileSystem extends IFileSystemSync, IFileSystemAsync {}
