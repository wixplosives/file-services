# @file-services/overlay

An in-memory based layered file-system that bridges between two file systems

## Motivation
Using a layered file system allows users to manipulate files without mutating the original file system. 
Overlay can be used as a virtual layer and provide a solution for storing and manipulating temporary data.

## Getting started

Install library in project:
```sh
yarn add @file-services/overlay
```

Then, use the programmatic API:
```ts
import { createMemoryFs } from '@file-services/memory'
import { createOverlay } from '@file-services/overlay'

const myFs = createMemoryFs({
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

`createOverlay` returns a new combined file system that includes an overlaying and origin file systems.
The origin file system (`myFs` in the example above) acts as a `readonly` file system in the combined one while the overlaying 
file system (`overlayingFs` in the example above) is dynamic.

## License

MIT

