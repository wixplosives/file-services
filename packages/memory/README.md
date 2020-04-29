# @file-services/memory

[![npm version](https://img.shields.io/npm/v/@file-services/memory.svg)](https://www.npmjs.com/package/@file-services/memory)
[![package size](https://badgen.net/bundlephobia/minzip/@file-services/memory)](https://bundlephobia.com/result?p=@file-services/memory)

An in-memory, sync/async, file system implementation.

Contains a subset of node's `fs` API with additional helper functions.

Features:

- Tiny.
- Isomorphic. Works in both Node.js and web-browsers.
- Implements the watch service API (for events).
- Case insensitive.

## Getting started

Install library in project:

```sh
yarn add @file-services/memory
```

Then, use the programmatic API:

```ts
import { createMemoryFs } from '@file-services/memory';

const fs = createMemoryFs();

// library uses `posix`-style paths
// and exposes a subset of `fs` API
fs.writeFileSync('/file-in-root', 'file contents');

// several helper functions are included
fs.populateDirectorySync('/src', {
  'index.ts': '/* source code */',
  'another-file.ts': '/* more source code */',
});

fs.fileExistsSync('/src/another-file.ts'); // returns true
```

## License

MIT
