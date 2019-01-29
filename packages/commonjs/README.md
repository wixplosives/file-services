# @file-services/commonjs

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
