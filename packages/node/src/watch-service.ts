import { join } from 'path'
import { promises, watch, FSWatcher } from 'fs'
import { IWatchService, WatchEventListener, IWatchEvent, IFileSystemStats } from '@file-services/types'
import { SetMultiMap } from '@file-services/utils'

const { stat } = promises

export interface INodeWatchServiceOptions {
    /**
     * Should fs watchers be persistent and keep the process open
     * (until someone calls `unwatchAllPaths()`)
     *
     * @default true
     */
    persistent?: boolean

    /**
     * How much time (in ms) to wait for next native watch event before
     * emitting a service watch event
     *
     * @default 200
     */
    debounceWait?: number
}

interface IPendingEvent {
    /* whether one of the raw fs events was 'rename' */
    renamed: boolean

    /* id of the setTimeout call, for debouncing */
    timerId: ReturnType<typeof setTimeout>
}

export class NodeWatchService implements IWatchService {
    /** user's subsribed global listeners */
    private globalListeners: Set<WatchEventListener> = new Set()

    /** resolved options (default + user) */
    private options: Required<INodeWatchServiceOptions>

    /** all watched paths (including files inside watched directories) */
    private watchedPaths = new SetMultiMap<string, WatchEventListener>()

    /** path to actual FSWatcher instance opened for it */
    private fsWatchers: Map<string, FSWatcher> = new Map()

    /** path to its pending event (debounced watch event) */
    private pendingEvents: Map<string, IPendingEvent> = new Map()

    /**
     * Construct a new Node file system watch service
     */
    constructor(options?: INodeWatchServiceOptions) {
        this.options = { persistent: true, debounceWait: 200, ...options }
    }

    public async watchPath(path: string, listener?: WatchEventListener): Promise<void> {
        if (listener) {
            this.watchedPaths.add(path, listener)
        }
        await this.ensureFsWatcher(path)
    }

    public async unwatchPath(path: string, listener?: WatchEventListener): Promise<void> {
        if (listener) {
            this.watchedPaths.delete(path, listener)
        } else {
            this.watchedPaths.deleteKey(path)
        }

        if (!this.watchedPaths.hasKey(path)) {
            const fsWatcher = this.fsWatchers.get(path)
            if (fsWatcher) {
                fsWatcher.close()
                this.fsWatchers.delete(path)
            }
        }
    }

    public async unwatchAllPaths(): Promise<void> {
        for (const watcher of this.fsWatchers.values()) {
            watcher.close()
        }
        this.fsWatchers.clear()
        this.watchedPaths.clear()
    }

    public addGlobalListener(listener: WatchEventListener): void {
        this.globalListeners.add(listener)
    }

    public removeGlobalListener(listener: WatchEventListener): void {
        this.globalListeners.delete(listener)
    }

    public clearGlobalListeners() {
        this.globalListeners.clear()
    }

    /**
     * Debounces watch events while retaining whether one of
     * them was a 'rename' event
     */
    private onPathEvent(eventType: string, eventPath: string) {
        const pendingEvent = this.pendingEvents.get(eventPath)
        const timerId = setTimeout(() => this.emitEvent(eventPath), this.options.debounceWait)
        if (pendingEvent) {
            clearTimeout(pendingEvent.timerId)
            pendingEvent.renamed = pendingEvent.renamed || eventType === 'rename'
            pendingEvent.timerId = timerId
        } else {
            this.pendingEvents.set(eventPath, { renamed: eventType === 'rename', timerId })
        }
    }

    private async emitEvent(path: string): Promise<void> {
        const pendingEvent = this.pendingEvents.get(path)
        if (!pendingEvent) {
            return
        }
        this.pendingEvents.delete(path)

        const stats = await this.statSafe(path)

        if (pendingEvent!.renamed) {
            // if one of the bounced events was a rename, make sure to unwatch,
            // as the underlying native inode is now different, and our watcher
            // is not receiving events for the new one
            const existingWatcher = this.fsWatchers.get(path)
            if (existingWatcher) {
                existingWatcher.close()
                this.fsWatchers.delete(path)
            }

            // rewatch if path points to a new inode
            if (stats) {
                await this.ensureFsWatcher(path, stats)
            }
        }

        const watchEvent: IWatchEvent = { path, stats }

        // inform global listeners
        for (const listener of this.globalListeners) {
            listener(watchEvent)
        }

        // inform path listeners
        const listeners = this.watchedPaths.get(path)
        if (listeners) {
            for (const listener of listeners) {
                listener({ path, stats })
            }
        }
    }

    private async ensureFsWatcher(path: string, stats?: IFileSystemStats) {
        if (this.fsWatchers.has(path)) {
            return
        }

        // accepting the optional stats saves us getting the stats ourselves
        const pathStats = stats || (await this.statSafe(path))
        if (!pathStats) {
            throw new Error(`cannot watch non-existing path: ${path}`)
        }

        // open fsWatcher
        const watchOptions = { persistent: this.options.persistent }
        if (pathStats.isFile()) {
            this.fsWatchers.set(path, watch(path, watchOptions, type => this.onPathEvent(type, path)))
        } else if (pathStats.isDirectory()) {
            this.fsWatchers.set(
                path,
                watch(path, watchOptions, (type, fileName) => this.onDirectoryEvent(type, path, fileName))
            )
        } else {
            throw new Error(`${path} does not point to a file or a directory`)
        }
    }

    private async onDirectoryEvent(eventType: string, directoryPath: string, fileName: string) {
        // we must stats the directory, as the raw event gives us no indication
        // whether an inner file or the directory itself was removed.
        // Upon removal of the directory itself, the fileName parameter is just the directory name,
        // which can also be interpreted as an inner file with that name being removed.
        const directoryStats = await this.statSafe(directoryPath)
        await this.onPathEvent(eventType, directoryStats ? join(directoryPath, fileName) : directoryPath)
    }

    private async statSafe(nodePath: string): Promise<IFileSystemStats | null> {
        try {
            return await stat(nodePath)
        } catch {
            return null
        }
    }
}
