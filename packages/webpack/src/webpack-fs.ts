import webpack from 'webpack';
import { IFileSystem, CallbackFn } from '@file-services/types';

export interface IWebpackFileSystem extends webpack.InputFileSystem, webpack.OutputFileSystem {
  readJson(filePath: string, callback: CallbackFn<unknown>): void;
  readJsonSync(filePath: string): unknown;
}

export function createWebpackFs(fs: IFileSystem): IWebpackFileSystem {
  const {
    watchService,
    readJsonFileSync,
    promises: { ensureDirectory, readJsonFile },
  } = fs;

  return {
    ...fs,
    readJsonSync: readJsonFileSync,
    readJson(filePath, callback) {
      readJsonFile(filePath)
        .then((value) => callback(undefined, value))
        .catch((e) => callback(e, undefined));
    },
    mkdirp(directoryPath, callback) {
      ensureDirectory(directoryPath)
        .then(() => callback(undefined))
        .catch(callback);
    },
    async purge() {
      watchService.clearGlobalListeners();
      await watchService.unwatchAllPaths();
    },
  };
}
