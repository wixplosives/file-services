// instead of adding complete types for "dom", "node", and "webworker"
// define it locally
declare const window: object
declare const global: object
declare const self: object

export const globalThis = typeof self   !== 'undefined' ? self   : // browser main/iframe/worker
                          typeof window !== 'undefined' ? window : // browser main/iframe
                          typeof global !== 'undefined' ? global : // nodejs
                          undefined
