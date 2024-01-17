import type { IBaseFileSystemSync } from "./base-api-sync";
import type { IBaseFileSystemAsync } from "./base-api-async";

export * from "./base-api-sync";
export * from "./base-api-async";

/**
 * SYNC and ASYNC base file system.
 * Contains a subset of `fs`, watch service, and path methods.
 */
export interface IBaseFileSystem extends IBaseFileSystemSync, IBaseFileSystemAsync {}
