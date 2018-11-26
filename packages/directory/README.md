# @file-services/directory

A file system wrapper that adds scoping to any sync/async, file system implementation.

It receives a fs and a directory path to serve as the base path and all fs methods will work using relative paths to the base path.  
If a path leads to a file / directory outside of the base path, it will throw an error.

## Getting started

Install library in project:
```sh
yarn add @file-services/directory
```

Then, use the programmatic API:
```ts
import { fs } from 'mySecretFs'
import { createDirectoryFs } from '@file-services/directory'

const basePath = '/Projects/secret-folder'
const dFs = createDirectoryFs(fs, basePath)

// This content will be written to /Projects/secret-folder/file.js
dFs.writeFileSync('/file.js', 'file contents')

// These will throw, as the files we are trying to reach are outside
// of the base path
dFs.readFileSync('/Projects/other-folder/file.js')
dFs.readFileSync('../other-folder/file.js')
```

## License

MIT
