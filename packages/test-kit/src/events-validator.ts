import { IWatchEvent, IWatchService, IFileSystemStats } from '@file-services/types'

/**
 * Promise-based timeout.
 * we could have used util.promisify(setTimeout), but that is node.js specific
 */
export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

interface IDeferredEventAssertion {
    event: IWatchEvent
    resolve(): void
    reject(error: Error): void
}

export interface IWatchEventValidatorOptions {
    /**
     * Timeout (in ms) to wait for each event.
     *
     * @default 750
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

    // event expections (added via nextEvent() calls)
    private expectedEvents: IDeferredEventAssertion[] = []

    // resolved options (defaults + user overrides)
    private options: Required<IWatchEventValidatorOptions>

    constructor(private watchService: IWatchService, options?: IWatchEventValidatorOptions) {
        this.options = { singleEventTimeout: 750, noMoreEventsTimeout: 1000, ...options }

        this.watchService.addListener(e => {
            this.capturedEvents.push(e)
            if (this.expectedEvents.length >= this.capturedEvents.length) {
                this.validateEventsMatch(this.capturedEvents.length - 1)
            }
        })
    }

    /**
     * Assert next event. Returns a promise that resolves or rejects,
     * depending on the incoming (or already captured) watch events.
     *
     * Has a timeout in no events came in to validate
     */
    public nextEvent(expectedEvent: IWatchEvent): Promise<void> {
        return new Promise<void>((resolvePromise, rejectPromise) => {
            const nextIdx = this.expectedEvents.length

            const timeoutId = setTimeout(() => rejectPromise(
                new Error(`Timeout while waiting for watch event #${nextIdx}:\n${watchEventToSring(expectedEvent)}`)
            ), this.options.singleEventTimeout)

            this.expectedEvents.push({
                resolve() {
                    clearTimeout(timeoutId)
                    resolvePromise()
                },
                reject(error: Error) {
                    clearTimeout(timeoutId)
                    rejectPromise(error)
                },
                event: expectedEvent
            })

            // if we already captured events before nextEvent was called,
            // use them for validation
            if (this.capturedEvents.length >= this.expectedEvents.length) {
                this.validateEventsMatch(nextIdx)
            }
        })
    }

    /**
     * Assert no additional watch events came in, expect for validated ones.
     */
    public async noMoreEvents(): Promise<void> {
        await sleep(this.options.noMoreEventsTimeout)

        if (this.capturedEvents.length > this.expectedEvents.length) {
            const extraEvents = this.capturedEvents.length - this.expectedEvents.length
            throw new Error(
                `Expected no additional events, but captured ${extraEvents}:\n` +
                this.capturedEvents.slice(-extraEvents).map(watchEventToString).join(`\n`)
            )
        }
    }

    private validateEventsMatch(eventIdx: number): void {
        const actualEvent = this.capturedEvents[eventIdx]
        const expectedEventAssertion = this.expectedEvents[eventIdx]
        const { event: expectedEvent } = expectedEventAssertion

        const { path: actualPath, stats: actualStats } = actualEvent
        const { path: expectedPath, stats: expectedStats } = expectedEvent

        const getErrorMessage = () => `Watch event #${eventIdx} validation error\n` +
            `Expected: ${watchEventToString(expectedEvent)}\n` +
            `Actual  : ${watchEventToString(actualEvent)}`

        if (actualPath !== expectedPath) {
            expectedEventAssertion.reject(new Error(getErrorMessage()))
        } else if (actualStats === null || expectedStats === null) {
            if (actualStats !== expectedStats) {
                expectedEventAssertion.reject(new Error(getErrorMessage()))
            }
        } else if (
            actualStats.mtime.getTime() !== expectedStats.mtime.getTime() ||
            actualStats.birthtime.getTime() !== expectedStats.birthtime.getTime()
        ) {
            expectedEventAssertion.reject(new Error(getErrorMessage()))
        }
        expectedEventAssertion.resolve()
    }
}

// internal watch events stringifiers, for useful failure messages

const statsToString = (stats: IFileSystemStats | null) =>
    stats ? `{ birthtime: ${stats.birthtime.getTime()}, mtime: ${stats.mtime.getTime()} }` : `null`

const watchEventToString = (watchEvent: IWatchEvent) =>
    `{ path: ${watchEvent.path}, stats: ${statsToString(watchEvent.stats)} }`
