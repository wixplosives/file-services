import { IFileSystemStats } from './base-api'

/**
 * File watching service.
 * Emits naive watch events containing path and latest stats.
 */
export interface IWatchService {
    /**
     * Start watching a path (file or directory).
     */
    watchPath(path: string): Promise<void>

    /**
     * Unwatch all watched paths.
     */
    unwatchAll(): Promise<void>

    /**
     * Add a listener function.
     * It will start receiving watch events for all watched paths.
     */
    addListener(listener: WatchEventListener): void

    /**
     * Remove a listener function.
     * It will stop receiving watch events.
     */
    removeListener(listener: WatchEventListener): void

    /**
     * Remove all existing listeners.
     */
    removeAllListeners(): void
}

/**
 * Watch event. Emitted when a file system change
 * happens on a path.
 */
export interface IWatchEvent {
    path: string
    stats: IFileSystemStats | null
}

/**
 * Watch events listener function
 */
export type WatchEventListener = (watchEvent: IWatchEvent) => void
