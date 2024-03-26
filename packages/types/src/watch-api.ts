import type { IFileSystemStats } from "./common-fs-types";

/**
 * File watching service.
 * Emits naive watch events containing path and latest stats.
 * @deprecated use `fs.watch()` instead.
 */
export interface IWatchService {
  /**
   * Start watching `path` (file or directory).
   * if `listener` is provided, it will receive watch events for `path`.
   * Any global listeners will also receive events for path.
   */
  watchPath(path: string, listener?: WatchEventListener): Promise<void>;

  /**
   * Stop watching `path` (file or directory).
   * if `listener` is provided, it will stop receiving watch events for `path`.
   * if `listener is not provided, path will be unwatched with its listeners cleared.
   */
  unwatchPath(path: string, listener?: WatchEventListener): Promise<void>;

  /**
   * Unwatch all watched paths.
   */
  unwatchAllPaths(): Promise<void>;

  /**
   * Add a global watch event listener.
   * It will receive watch events for all watched paths.
   */
  addGlobalListener(listener: WatchEventListener): void;

  /**
   * Remove a global watch event listener.
   */
  removeGlobalListener(listener: WatchEventListener): void;

  /**
   * Clears all registered global watch event listeners.
   */
  clearGlobalListeners(): void;
}

/**
 * Watch event. Emitted when a file system change
 * happens on a path.
 */
export interface IWatchEvent {
  path: string;
  stats: IFileSystemStats | null;
}

/**
 * Watch events listener function
 */
export type WatchEventListener = (watchEvent: IWatchEvent) => void;
