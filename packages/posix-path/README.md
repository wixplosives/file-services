# @file-services/posix-path
[![npm version](https://img.shields.io/npm/v/@file-services/posix-path.svg)](https://www.npmjs.com/package/@file-services/posix-path)
[![package size](https://badgen.net/bundlephobia/minzip/@file-services/posix-path)](https://bundlephobia.com/result?p=@file-services/posix-path)

Node's posix-`path` implementation converted to TypeScript and ready for the web.

Original code: https://github.com/nodejs/node/blob/master/lib/path.js

## Fork changes

- Dropped win32-related functionality.
- Ported to Typescript.
- Separated to files using `esm` imports/exports.
- `resolve` function assumes `cwd` is `/`.
- Removed runtime validation of parameters.
- Fixed shadowed `start` variable in `parse` function.
- Converted loops to `for-const-of`, where possible.
- Changed `var` statements to `const`/`let` statements.
- Applied prettier code formatting.

## License

MIT
