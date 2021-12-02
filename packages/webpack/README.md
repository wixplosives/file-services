# @file-services/webpack

[![npm version](https://img.shields.io/npm/v/@file-services/webpack.svg)](https://www.npmjs.com/package/@file-services/webpack)

Helpers for creation of webpack-compatible file systems.

## Installation

Install library in project:

```sh
npm i @file-services/webpack
```

## Usage

```ts
import webpack from 'webpack';
import { nodeFs } from '@file-services/node';
import { createWebpackFs } from '@file-services/webpack';

const compiler = webpack({
  /* webpack config */
});

const webpackFs = createWebpackFs(nodeFs);
compiler.inputFileSystem = webpackFs;
compiler.outputFileSystem = webpackFs;

compiler.run((e, stats) => {
  /* handle bundling result */
});
```

## License

MIT
