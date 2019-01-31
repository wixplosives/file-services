# @file-services/commonjs
[![npm version](https://img.shields.io/npm/v/@file-services/commonjs.svg)](https://www.npmjs.com/package/@file-services/commonjs)
[![package size](https://badgen.net/bundlephobia/minzip/@file-services/commonjs)](https://bundlephobia.com/result?p=@file-services/commonjs)

Isomorphic, fs-agnostic implementation of Node's CommonJS module system.

## Getting started

Install library in project:
```sh
yarn add @file-services/commonjs
```

Then, use the programmatic API:
```ts
import { createCjsModuleSystem } from '@file-services/commonjs'
import { createMemoryFs } from '@file-services/memory'

const fs = createMemoryFs({
    'some-folder': {
        'index.js': `module.exports = 'exported value'`
    }
})

const moduleSystem = createCjsModuleSystem({ fs })

const evaluated = moduleSystem.require('/some-folder/index.js')
// evaluated === 'exported value'

```

## License

MIT
