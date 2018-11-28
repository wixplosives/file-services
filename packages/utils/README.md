# @file-services/utils
[![npm version](https://img.shields.io/npm/v/@file-services/utils.svg)](https://www.npmjs.com/package/@file-services/utils)

Common file system utility functions.

# API

- `syncToAsyncFs`: convert a sync-only file system implementation into an async one.
- `createDirectoryFs`: A file system wrapper that adds directory scoping to any sync/async, base file system implementation.

# Usage

## Directory scoped file system
Install library in project:
```sh
yarn add @file-services/utils
```

Then, use the programmatic API:
```ts
import { fs } from '@file-services/node'
import { createDirectoryFs } from '@file-services/utils'

const basePath = '/path/to/some/folder'
const directoryFs = createDirectoryFs(fs, basePath)

// This content will be written to /Projects/secret-folder/file.js
directoryFs.writeFileSync('/file.js', 'file contents')

// These will throw, as the files we are trying to reach are outside
// of the base path
directoryFs.readFileSync('/Projects/other-folder/file.js')
directoryFs.readFileSync('../other-folder/file.js')
```
