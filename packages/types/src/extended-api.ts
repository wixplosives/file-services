import type { IFileSystemSync } from "./extended-api-sync";
import type { IFileSystemAsync } from "./extended-api-async";

export * from "./extended-api-sync";
export * from "./extended-api-async";

/**
 * SYNC and ASYNC file system.
 * Exposes all base fs APIs plus several higher level methods.
 */
export interface IFileSystem extends IFileSystemSync, IFileSystemAsync {}
