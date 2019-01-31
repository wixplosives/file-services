# @file-services/utils
[![npm version](https://img.shields.io/npm/v/@file-services/utils.svg)](https://www.npmjs.com/package/@file-services/utils)
[![package size](https://badgen.net/bundlephobia/minzip/@file-services/utils)](https://bundlephobia.com/result?p=@file-services/utils)

Common file system utility functions.

# API

- `syncToAsyncFs`: convert a sync-only file system implementation into an async one.
- `createDirectoryFs`: A file system wrapper that adds directory scoping to any `IFileSystem` implementation.

# Usage

## Directory scoped file system
Install library in project:
```sh
yarn add @file-services/utils
```

Then, use the programmatic API:
```ts
import { nodeFs } from '@file-services/node'
import { createDirectoryFs } from '@file-services/utils'

const directoryFs = createDirectoryFs(nodeFs, '/path/to/some/folder')

// will be written to /path/to/some/folder/file.js
directoryFs.writeFileSync('/file.js', 'SAMPLE')

// returns 'SAMPLE'
directoryFs.readFileSync('/file.js')
```
