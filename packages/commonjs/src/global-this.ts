// to appease typescript without having to add types of all js environments
declare const window: unknown;
declare const global: unknown;
declare const self: unknown;

export const envGlobal =
  typeof globalThis !== "undefined"
    ? globalThis // latest js engines. node and browser.
    : typeof self !== "undefined"
      ? self // browser main/iframe/worker
      : typeof window !== "undefined"
        ? window // browser main/iframe
        : typeof global !== "undefined"
          ? global // nodejs
          : undefined;
