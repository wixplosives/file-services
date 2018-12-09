import { join } from 'path'
import { FSWatcher, watch, stat, Stats, readdir } from 'proper-fs'
import { IWatchService, WatchEventListener } from '@file-services/types'

type RawWatchEventType = 'rename' | 'change'

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
    timerId: NodeJS.Timer
}

export class NodeWatchService implements IWatchService {
    /** user's subsribed global listeners */
    private globalListeners: Set<WatchEventListener> = new Set()

    /** resolved options (default + user) */
    private options: Required<INodeWatchServiceOptions>

    /** all watched paths (including files inside watched directories) */
    private watchedPaths: Set<string> = new Set()

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

    /**
     * Begin watching a path and emitting events for it
     *
     * @param path absolute path to watch
     * @param stats optional stats, if already queried on user code
     */
    public async watchPath(path: string): Promise<void> {
        if (this.watchedPaths.has(path)) {
            // path is already being watched directly (fs watcher on its path)
            // or indirectly (fs watcher on its containing directory)
            return
        }

        const pathStats = await getStats(path)
        if (!pathStats) {
            return
        }

        if (pathStats.isFile()) {
            const fsWatcher = watch(
                path,
                { persistent: this.options.persistent },
                eventType => this.onPathEvent(path, eventType as RawWatchEventType)
            ).on('error', e => this.onWatchError(e))
            this.fsWatchers.set(path, fsWatcher)
            this.watchedPaths.add(path)
        } else if (pathStats.isDirectory()) {
            // directories require a special handler,
            // as you also receive events for files inside that directory
            const fsWatcher = watch(
                path,
                { persistent: this.options.persistent },
                (eventType, fileName) => this.onDirectoryEvent(path, eventType as RawWatchEventType, fileName)
            ).on('error', e => this.onWatchError(e))
            this.fsWatchers.set(path, fsWatcher)
            this.watchedPaths.add(path) // mark the directory itself as being watched

            // mark directory files as being watched as well
            const directoryContents = await readdir(path)
            for (const subNodePath of directoryContents.map(nodeName => join(path, nodeName))) {
                const subStats = await getStats(subNodePath)
                if (subStats && subStats.isFile()) {
                    // close existing fs watcher, if any, to save file handles
                    // the directory watcher covers these paths as well
                    this.unwatchPath(subNodePath)

                    // mark the file as being watched, even though it has no watcher on its own
                    this.watchedPaths.add(subNodePath)
                }
            }
        }
    }

    public async unwatchPath(path: string): Promise<void> {
        const existingWatcher = this.fsWatchers.get(path)

        // path has a direct watcher, so we can close it and unwatch,
        // otherwise, it might still be watched by a parent directory watcher
        if (existingWatcher) {
            existingWatcher.close()
            this.watchedPaths.delete(path)
            this.fsWatchers.delete(path)
        }
    }

    public async unwatchAllPaths(): Promise<void> {
        for (const watcher of this.fsWatchers.values()) {
            watcher.close()
        }
        this.fsWatchers.clear()
        this.watchedPaths.clear()
    }

    public addGlobalListener(eventCb: WatchEventListener): void {
        this.globalListeners.add(eventCb)
    }

    public removeGlobalListener(eventCb: WatchEventListener): void {
        this.globalListeners.delete(eventCb)
    }

    public clearGlobalListeners(): void {
        this.globalListeners.clear()
    }

    // private helpers

    /**
     * Helper to debounce watch events while retaining
     * whether one of those events was a 'rename' event
     */
    private async onPathEvent(path: string, eventType: RawWatchEventType) {
        const pendingEvent = this.pendingEvents.get(path)
        const timerId = setTimeout(() => this.emitEvent(path), this.options.debounceWait)
        if (pendingEvent) {
            clearTimeout(pendingEvent.timerId)
            pendingEvent.renamed = pendingEvent.renamed || eventType === 'rename'
            pendingEvent.timerId = timerId
        } else {
            this.pendingEvents.set(path, { renamed: eventType === 'rename', timerId })
        }
    }

    private async emitEvent(path: string) {
        const pendingEvent = this.pendingEvents.get(path)
        this.pendingEvents.delete(path)
        const stats = await getStats(path)
        if (pendingEvent!.renamed) {
            // if one of the bounced events was a rename, make sure to unwatch,
            // as the underlying native inode is now different, and our watcher
            // is not receiving events for the new one
            this.unwatchPath(path)

            // if the path was recreated since, rewatch it
            if (stats) {
                this.watchPath(path)
            }
        }

        // inform listeners of the event
        for (const listener of this.globalListeners) {
            listener({ path, stats })
        }
    }

    private async onDirectoryEvent(directoryPath: string, eventType: RawWatchEventType, fileName: string) {
        // we must stats the directory, as the raw event gives us no indication
        // whether an inner file or the directory itself was removed.
        // Upon removal of the directory itself, the fileName parameter is just the directory name,
        // which can also be interpreted as an inner file with that name being removed.
        const directoryStats = await getStats(directoryPath)
        await this.onPathEvent(directoryStats ? join(directoryPath, fileName) : directoryPath, eventType)
    }

    private onWatchError(_e: Error) {
        // TODO
    }
}

async function getStats(nodePath: string): Promise<Stats | null> {
    try {
        return await stat(nodePath)
    } catch {
        return null
    }
}
