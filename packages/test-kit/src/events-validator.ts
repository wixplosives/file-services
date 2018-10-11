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

    // pending event expections (added via nextEvent() calls)
    private pendingExpects: IDeferredEventAssertion[] = []

    // resolved options (defaults + user overrides)
    private options: Required<IWatchEventValidatorOptions>

    constructor(private watchService: IWatchService, options?: IWatchEventValidatorOptions) {
        this.options = { singleEventTimeout: 5000, noMoreEventsTimeout: 1000, ...options }

        this.watchService.addListener(e => {
            this.capturedEvents.push(e)
            this.validatePendingExpects()
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
            const timeoutId = setTimeout(() => {
                rejectPromise(
                    new Error(
                        `Timeout while waiting for watch event:\n` +
                        `${watchEventToString(expectedEvent)}\n` +
                        `${this.capturedEvents.length} other captured events.\n` +
                        this.capturedEvents.map(watchEventToString).join('\n')
                    )
                )
            }, this.options.singleEventTimeout)

            this.pendingExpects.push({
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

            this.validatePendingExpects()
        })
    }

    /**
     * Assert no additional watch events came in, expect for validated ones.
     */
    public async noMoreEvents(): Promise<void> {
        await sleep(this.options.noMoreEventsTimeout)

        if (this.capturedEvents.length) {
            throw new Error(
                `Expected no additional events, but captured ${this.capturedEvents.length}:\n` +
                this.capturedEvents.map(watchEventToString).join(`\n`)
            )
        }
    }

    private validatePendingExpects(): void {
        if (!this.pendingExpects.length || !this.capturedEvents.length) {
            return
        }

        const [pendingExpect] = this.pendingExpects
        const { event: expectedEvent } = pendingExpect

        for (let idx = this.capturedEvents.length - 1; idx >= 0; --idx) {
            if (areEventsEqual(expectedEvent, this.capturedEvents[idx])) {
                this.capturedEvents.splice(0, idx + 1)
                this.pendingExpects.shift()
                pendingExpect.resolve()
                break
            }
        }
    }
}

const areEventsEqual = (first: IWatchEvent, second: IWatchEvent): boolean => {
    const { path: firstPath, stats: firstStats } = first
    const { path: secondPath, stats: secondStats } = second

    if (firstPath !== secondPath) {
        return false
    } else if (firstStats === null || secondStats === null) {
        return firstStats === secondStats
    }

    return firstStats.mtime.getTime() === secondStats.mtime.getTime() &&
        firstStats.birthtime.getTime() === secondStats.birthtime.getTime()
}

// internal watch events stringifiers, for useful failure messages
const statsToString = (stats: IFileSystemStats | null) =>
    stats ? `{ birthtime: ${stats.birthtime.getTime()}, mtime: ${stats.mtime.getTime()} }` : `null`

const watchEventToString = (watchEvent: IWatchEvent) =>
    `{ path: ${watchEvent.path}, stats: ${statsToString(watchEvent.stats)} }`
