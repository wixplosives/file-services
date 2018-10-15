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
     * @default 1000
     */
    noMoreEventsTimeout?: number
}

export class WatchEventsValidator {
    // actual captured events from watch service
    private capturedEvents: IWatchEvent[] = []

    // resolved options (defaults + user overrides)
    private options: Required<IWatchEventValidatorOptions>

    constructor(private watchService: IWatchService, options?: IWatchEventValidatorOptions) {
        this.options = { singleEventTimeout: 5000, noMoreEventsTimeout: 1000, ...options }

        this.watchService.addListener(e => {
            this.capturedEvents.push(e)
        })
    }

    /**
     * Assert next event. Returns a promise that resolves or rejects,
     * depending on the incoming (or already captured) watch events.
     *
     * Has a timeout in no events came in to validate
     */
    public async nextEvent(expectedEvent: IWatchEvent): Promise<void> {
        const { capturedEvents } = this
        await waitFor(() => {
            expect(capturedEvents).to.have.length.gte(1)
            validateEqualEvents(expectedEvent, capturedEvents[capturedEvents.length - 1])
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

function validateEqualEvents(first: IWatchEvent, second: IWatchEvent): void {
    const { path: firstPath, stats: firstStats } = first
    const { path: secondPath, stats: secondStats } = second

    const fail = () => {
        throw new Error(`watch events are not equal:\n${watchEventToString(first)}\n ${watchEventToString(second)}`)
    }

    if (firstPath !== secondPath) {
        fail()
    } else if (firstStats && secondStats) {
        if (
            firstStats.mtime.getTime() !== secondStats.mtime.getTime() ||
            firstStats.birthtime.getTime() !== secondStats.birthtime.getTime()
        ) {
            fail()
        }
    } else if (firstStats !== secondStats) {
        fail()
    }
}

// internal watch events stringifiers, for useful failure messages
const statsToString = (stats: IFileSystemStats | null) =>
    stats ? `{ birthtime: ${stats.birthtime.getTime()}, mtime: ${stats.mtime.getTime()} }` : `null`

const watchEventToString = (watchEvent: IWatchEvent) =>
    `{ path: ${watchEvent.path}, stats: ${statsToString(watchEvent.stats)} } `
