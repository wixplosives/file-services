# @file-services/typescript

[![npm version](https://img.shields.io/npm/v/@file-services/typescript.svg)](https://www.npmjs.com/package/@file-services/typescript)
[![package size](https://badgen.net/bundlephobia/minzip/@file-services/typescript)](https://bundlephobia.com/result?p=@file-services/typescript)

Helpers for creation of TypeScript hosts.

## Installation

Install library in project:

```sh
npm i @file-services/typescript
```

## API

```ts
/**
 * Create an IBaseHost, which is actually three interfaces combined:
 * - `ts.ParseConfigHost` - for parsing of `tsconfig.json` files
 * - `ts.FormatDiagnosticsHost` - for formatting of `ts.Diagnostic` instances
 * - `ts.ModuleResolutionHost` - for resolution of imports using TypeScript's built-in mechanism
 *
 * @param fs the file system to use as host backend
 */
export function createBaseHost(fs: IFileSystemSync): IBaseHost;

/**
 * Create a TypeScript `LanguageServiceHost` using provided file system.
 *
 * @param fs the file system used as host backend
 * @param baseHost created using `createBaseHost()`
 * @param fileNames list of absolute paths to `.ts/tsx` files included in this transpilation
 * @param compilerOptions compilerOptions to use when transpiling or type checking
 * @param defaultLibsDirectory absolute path to the directory that contains TypeScript's built-in `.d.ts` files
 *                             `path.dirname(ts.getDefaultLibFilePath({}))` in node,
 *                             or custom directory with `@file-services/memory`
 * @param customTransformers optional custom transformers to apply during transpilation
 */
export function createLanguageServiceHost(
  fs: IFileSystemSync,
  baseHost: IBaseHost,
  fileNames: string[],
  compilerOptions: ts.CompilerOptions,
  defaultLibsDirectory: string,
  customTransformers?: ts.CustomTransformers
): ts.LanguageServiceHost;
```

## License

MIT
