import { CallbackFn, ErrorCallbackFn } from '@file-services/types'

// ugly types until https://github.com/Microsoft/TypeScript/issues/5453 is resolved
export function callbackify<T1, TResult>(fn: (arg1: T1) => TResult): (arg1: T1, callback: CallbackFn<TResult>) => void
export function callbackify<T1, T2>(
    fn: (arg1: T1, arg2: T2) => void
): (arg1: T1, arg2: T2, callback: (err: Error | undefined | null) => void) => void
export function callbackify<T1, T2, TResult>(
    fn: (arg1: T1, arg2: T2) => TResult
): (arg1: T1, arg2: T2, callback: CallbackFn<TResult>) => void
export function callbackify<T1, T2, T3>(
    fn: (arg1: T1, arg2: T2, arg3: T3) => void
): (arg1: T1, arg2: T2, arg3: T3, callback: (err: Error | undefined | null) => void) => void
export function callbackify<T1, T2, T3, TResult>(
    fn: (arg1: T1, arg2: T2, arg3: T3) => TResult
): (arg1: T1, arg2: T2, arg3: T3, callback: CallbackFn<TResult>) => void
export function callbackify<T1, T2, T3, T4>(
    fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => void
): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback: (err: Error | undefined | null) => void) => void
export function callbackify<T1, T2, T3, T4, TResult>(
    fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => TResult
): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback: CallbackFn<TResult>) => void
export function callbackify<F extends (...args: unknown[]) => unknown>(fn: F): unknown {
    return ((...args: unknown[]): void => {
        const callback = args.pop() as CallbackFn<unknown>
        if (typeof callback !== 'function') {
            throw new Error('callback is not a function')
        }
        try {
            const result = fn(...args)
            callback(undefined, result)
        } catch (e) {
            // tslint:disable-next-line: semicolon
            ;(callback as ErrorCallbackFn)(e)
        }
    }) as unknown
}
