# @file-services/overlay

An in-memory `memoryFs` based layered file-system that bridges between two file systems

## Motivation
Using a layered file system allows users to manipulate files without mutating the original file system. Overlay can be used as a virtual layer and provide a solution for storing and manipulating temporary data.

## Getting started

Install library in project:
```sh
yarn add @file-services/overlay
```

Then, use the programmatic API:
```ts
import { createMemoryFs } from '@file-services/memory'
import { createOverlay } from '@file-services/overlay'

const fs = createMemoryFs({
    src: {
        'a.js': `module.exports = 'a'`,
        'b.js': `module.exports = 'b'`
    }
})

const overlayingFs = createMemoryFs({
    src: {
        'c.js': `module.exports = 'c'`,
        'd.js': `module.exports = 'd'`
    }
})

const overlay = createOverlay(fs, overlayedFs)
```

`createOverlay` returns a new combined file system that includes the overlaying and the origin file systems.

When calling a method on the created overlay file system, overlay will try to execute it on the overlaying file system first (`overlayingFs`). If the requested file/directory is missing, overlay will try to execute this method on the origin file system (`fs`).

## License

MIT

