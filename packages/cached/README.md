# @file-services/cached
[![npm version](https://img.shields.io/npm/v/@file-services/cached.svg)](https://www.npmjs.com/package/@file-services/cached)
[![package size](https://badgen.net/bundlephobia/minzip/@file-services/cached)](https://bundlephobia.com/result?p=@file-services/cached)

A file system wrapper that adds cache to any `IFileSystem` implementation.

## Getting started

Install library in project:
```sh
yarn add @file-services/cached
```

Then, use the programmatic API:
```ts
import { nodeFs } from '@file-services/node'
import { createCachedFs } from '@file-services/cached'

const cachedFs = createCachedFs(nodeFs)
cachedFs.writeFileSync('/file.js', 'CONTENT')

// calls fs
cachedFs.statSync('/file.js')
// cached
cachedFs.statSync('/file.js')

cachedFs.invalidate('/file.js')
```

## License

MIT
