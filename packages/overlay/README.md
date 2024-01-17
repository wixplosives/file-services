# @file-services/overlay

Overlay files and directories from one file system on top of another.

## Motivation

Overlay file system allows taking a native node file system ("lower fs") and overlay files and directories from an in-memory file system ("higher fs"). It can be used as a virtual layer providing a solution for storing and manipulating temporary data.

## Behavior

Read operations (`readFile`, `readdir`, `stat`, etc.) are checking higher fs first, and fallback to lower fs.

Currently, all write operations go directly to the original lower fs.

## Getting started

Install library in project:

```sh
npm i @file-services/overlay
```

Then, use the programmatic API:

```ts
import { createOverlayFs } from "@file-services/overlay";
import { createMemoryFs } from "@file-services/memory";
import { nodeFs } from "@file-services/node";

const memFs = createMemoryFs({
  src: {
    "a.txt": `A`,
    "b.txt": `B`,
  },
});

const overlayFs = createOverlayFs(nodeFs /* lower fs */, memFs /* higher fs */);

// overlayFs.readFileSync('src/a.txt', 'utf8') === 'A'
```

`createOverlayFs` also accepts a directory path as third parameter which specifies which directory in lower fs should be overlaid upon (defaults to `lowerFs.cwd()`). This is important when overlaying a memory fs over native node fs and running on Windows. Memory fs uses posix-style paths, so the base directory is where memory's root `/` begins to overlay.

## License

MIT
