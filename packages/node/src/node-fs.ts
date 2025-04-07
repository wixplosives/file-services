import fs from "node:fs";
import path from "node:path";
import { argv, chdir, cwd } from "node:process";
import { promisify } from "node:util";

import type { IBaseFileSystem, IFileSystem } from "@file-services/types";
import { createFileSystem } from "@file-services/utils";

const caseSensitive = !fs.existsSync(argv[0]!.toUpperCase());
const fsPromisesExists = promisify(fs.exists);

export function createNodeFs(): IFileSystem {
  return createFileSystem(createBaseNodeFs());
}

export function createBaseNodeFs(): IBaseFileSystem {
  return {
    ...path,
    chdir,
    cwd,
    caseSensitive,
    ...fs,
    promises: {
      ...fs.promises,
      exists: fsPromisesExists,
    },
  };
}
