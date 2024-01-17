import fs from "node:fs";
import path from "node:path";
import { chdir, cwd, argv } from "node:process";
import { promisify } from "node:util";

import type { IBaseFileSystem, IFileSystem, IFileSystemPath } from "@file-services/types";
import { createFileSystem } from "@file-services/utils";
import { INodeWatchServiceOptions, NodeWatchService } from "./watch-service";

const caseSensitive = !fs.existsSync(argv[0]!.toUpperCase());
const fsPromisesExists = promisify(fs.exists);

export interface ICreateNodeFsOptions {
  watchOptions?: INodeWatchServiceOptions;
}

export function createNodeFs(options?: ICreateNodeFsOptions): IFileSystem {
  return createFileSystem(createBaseNodeFs(options));
}

export function createBaseNodeFs(options?: ICreateNodeFsOptions): IBaseFileSystem {
  return {
    ...(path as IFileSystemPath),
    chdir,
    cwd,
    watchService: new NodeWatchService(options && options.watchOptions),
    caseSensitive,
    ...fs,
    promises: {
      ...fs.promises,
      exists: fsPromisesExists,
    },
  };
}
