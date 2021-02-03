import type webpack from 'webpack';
import type { IFileSystem, CallbackFnVoid } from '@file-services/types';

export type WebpackInputFileSystem = webpack.Compiler['inputFileSystem'];
export type WebpackOutputFileSystem = webpack.Compiler['outputFileSystem'];

export interface IWebpackDirent {
  isFile: () => boolean;
  isDirectory: () => boolean;
  isBlockDevice: () => boolean;
  isCharacterDevice: () => boolean;
  isSymbolicLink: () => boolean;
  isFIFO: () => boolean;
  isSocket: () => boolean;
  name: string | Buffer;
}

export interface IWebpackFileSystem extends WebpackInputFileSystem, WebpackOutputFileSystem {
  readdir: (path: string, callback: (arg0?: Error, arg1?: (string | Buffer)[] | IWebpackDirent[]) => void) => void;
  readJsonSync(filePath: string): unknown;
  mkdirp(path: string, callback: CallbackFnVoid): void;
}

export function createWebpackFs(fs: IFileSystem): IWebpackFileSystem {
  const {
    readJsonFileSync,
    promises: { ensureDirectory, readJsonFile },
  } = fs;

  // webpack@5 doesn't like our circular fields (IFileSystem contains the path api)
  const fsNoCircular = {
    ...fs,
    win32: undefined,
    posix: undefined,
  };

  return {
    ...((fsNoCircular as unknown) as IWebpackFileSystem),
    readJsonSync: readJsonFileSync,
    readJson(filePath, callback) {
      readJsonFile(filePath)
        .then((value) => callback(undefined, value))
        .catch((e) => callback(e, undefined));
    },
    mkdirp(directoryPath, callback) {
      ensureDirectory(directoryPath)
        .then(() => callback(null))
        .catch(callback);
    },
  };
}
