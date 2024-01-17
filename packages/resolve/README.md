# @file-services/resolve

[![npm version](https://img.shields.io/npm/v/@file-services/resolve.svg)](https://www.npmjs.com/package/@file-services/resolve)
[![package size](https://img.shields.io/bundlephobia/minzip/@file-services/resolve)](https://bundlephobia.com/result?p=@file-services/resolve)

Isomorphic, fs-agnostic implementation of the Node resolution algorithm.

Implements the following behaviors:

- https://nodejs.org/api/modules.html#modules_all_together
- https://github.com/defunctzombie/package-browser-field-spec

## Getting started

Install library in project:

```sh
npm i @file-services/resolve
```

Then, use the programmatic API:

```ts
import { createRequestResolver } from "@file-services/resolve";
import { createMemoryFs } from "@file-services/memory";

const fs = createMemoryFs({
  "some-folder": {
    "index.js": "some content",
  },
});

const resolveRequest = createRequestResolver({ fs });

resolveRequest("/", "./some-folder");
// === '/some-folder/index.js'
```

## License

MIT
