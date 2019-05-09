# @file-services/directory
[![npm version](https://img.shields.io/npm/v/@file-services/directory.svg)](https://www.npmjs.com/package/@file-services/directory)
[![package size](https://badgen.net/bundlephobia/minzip/@file-services/directory)](https://bundlephobia.com/result?p=@file-services/directory)

A file system wrapper that adds directory scoping to any `IFileSystem` implementation.

## Getting started

Install library in project:
```sh
yarn add @file-services/directory
```

Then, use the programmatic API:
```ts
import { nodeFs } from '@file-services/node'
import { createDirectoryFs } from '@file-services/directory'

const directoryFs = createDirectoryFs(nodeFs, '/path/to/some/folder')

// will be written to /path/to/some/folder/file.js
directoryFs.writeFileSync('/file.js', 'SAMPLE')

// returns 'SAMPLE'
directoryFs.readFileSync('/file.js')
```

## License

MIT
