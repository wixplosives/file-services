# @file-services/resolve

Strictly-typed, tightly tested, synchronous, module resolution.
Implements the following behaviors:
- https://nodejs.org/api/modules.html#modules_all_together
- https://github.com/defunctzombie/package-browser-field-spec


## Getting started

Install library in project:
```sh
yarn add @file-services/resolve
```

Then, use the programmatic API:
```ts
import { createRequestResolver } from '@file-services/resolve'
import { createMemoryFs } from '@file-services/memory'

const fs = createMemoryFs({
    'some-folder': {
        'index.js': 'some content'
    }
})

const resolveRequest = createRequestResolver({ host: fs })

resolveRequest('/', './some-folder')
// === '/some-folder/index.js'
```

`createRequestResolver` accepts other options as well

```ts
interface IRequestResolverOptions {
    /**
     * Required environment APIs for resolution.
     */
    host: IResolutionHost

    /**
     * Folders to use when searching for packages.
     *
     * @default ['node_modules']
     */
    packageRoots?: string[]

    /**
     * File extensions to try resolving the request with.
     *
     * @default ['.js', '.json']
     */
    extensions?: string[]

    /**
     * Whether to prefer the 'browser' field or 'main' field
     * in `package.json`.
     */
    target?: 'node' | 'browser'
}
```

## License

MIT
