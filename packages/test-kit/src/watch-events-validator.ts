import { expect } from 'chai'
import { sleep, waitFor } from 'promise-assist'
import { IWatchEvent, IWatchService, IFileSystemStats } from '@file-services/types'

export interface IWatchEventValidatorOptions {
    /**
     * Timeout (in ms) to wait for each event.
     *
     * @default 5000
     */
    singleEventTimeout?: number

    /**
     * Timeout (in ms) to wait before checking for no additional events.
     *
     * @default 500
     */
    noMoreEventsTimeout?: number
}

export class WatchEventsValidator {
    // actual captured events from watch service
    private capturedEvents: IWatchEvent[] = []

    // resolved options (defaults + user overrides)
    private options: Required<IWatchEventValidatorOptions>

    constructor(private watchService: IWatchService, options?: IWatchEventValidatorOptions) {
        this.options = { singleEventTimeout: 5000, noMoreEventsTimeout: 500, ...options }

        this.watchService.addGlobalListener(e => this.capturedEvents.push(e))
    }

    /**
     * Resolves or rejects depending whether last captured watch event
     * equals `expectedEvent`
     */
    public async lastEvent(expectedEvent: IWatchEvent): Promise<void> {
        const { capturedEvents } = this

        await waitFor(() => {
            expect(capturedEvents).to.have.length.gte(1)
            expect(stringifyEvent(expectedEvent)).to.equal(stringifyEvent(capturedEvents[capturedEvents.length - 1]))
        }, { timeout: this.options.singleEventTimeout, delay: 100 })

        this.capturedEvents.length = 0
    }

    /**
     * Assert no additional watch events came in, expect for validated ones.
     */
    public async noMoreEvents(): Promise<void> {
        await sleep(this.options.noMoreEventsTimeout)
        expect(this.capturedEvents).to.have.lengthOf(0)
    }
}

// internal watch events stringifiers, for useful failure messages
const statsToString = (stats: IFileSystemStats | null) =>
    stats ? `{ birthtime: ${stats.birthtime.getTime()}, mtime: ${stats.mtime.getTime()} }` : `null`

const stringifyEvent = (watchEvent: IWatchEvent) =>
    `{ path: ${watchEvent.path}, stats: ${statsToString(watchEvent.stats)} } `
