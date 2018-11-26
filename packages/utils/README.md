# @file-services/utils
[![npm version](https://img.shields.io/npm/v/@file-services/utils.svg)](https://www.npmjs.com/package/@file-services/utils)

Common file system utility functions.

# API

- `syncToAsyncFs`: convert a sync-only file system implementation into an async one.
- `directory-fs`: A file system wrapper that adds scoping to any sync/async, file system implementation.

# Usage

## Directory file system
Install library in project:
```sh
yarn add @file-services/directory
```

Then, use the programmatic API:
```ts
import { fs } from 'some-fs'
import { createDirectoryFs } from '@file-services/directory'

const basePath = '/projects/secret-folder'
const dFs = createDirectoryFs(fs, basePath)

// This content will be written to /Projects/secret-folder/file.js
dFs.writeFileSync('/file.js', 'file contents')

// These will throw, as the files we are trying to reach are outside
// of the base path
dFs.readFileSync('/Projects/other-folder/file.js')
dFs.readFileSync('../other-folder/file.js')
```
