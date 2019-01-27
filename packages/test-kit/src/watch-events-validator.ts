import { expect } from 'chai'
import { sleep, waitFor } from 'promise-assist'
import { IWatchEvent, IWatchService } from '@file-services/types'

export interface IWatchEventValidatorOptions {
    /**
     * Timeout (in ms) for each `validateEvents` call.
     *
     * @default 5000
     */
    validateTimeout?: number

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
        this.options = { validateTimeout: 5000, noMoreEventsTimeout: 500, ...options }

        this.watchService.addGlobalListener(e => this.capturedEvents.push(e))
    }

    /**
     * Resolves or rejects depending whether last captured watch events
     * equal `expectedEvents`
     */
    public async validateEvents(expectedEvents: IWatchEvent[]): Promise<void> {
        const { capturedEvents } = this
        const expected = expectedEvents.map(simplifyEvent)

        await waitFor(() => {
            const actual = capturedEvents.slice(-1 * expectedEvents.length).map(simplifyEvent)
            expect(actual).to.eql(expected)
        }, { timeout: this.options.validateTimeout, delay: 100 })

        this.capturedEvents.length = 0
    }

    /**
     * Assert no additional watch events came in, expect for validated ones.
     */
    public async noMoreEvents(): Promise<void> {
        await sleep(this.options.noMoreEventsTimeout)
        expect(this.capturedEvents.map(simplifyEvent)).to.eql([])
    }
}

/**
 * Converts watch event's stats to an easier to read/diff structure
 */
const simplifyEvent = ({ path, stats }: IWatchEvent) => ({
    path,
    stats: stats ? { birthtime: stats.birthtime.getTime(), mtime: stats.mtime.getTime() } : null
})
