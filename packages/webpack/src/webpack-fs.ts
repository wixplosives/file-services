import type { IFileSystem, CallbackFn, CallbackFnVoid } from '@file-services/types';

export interface IWebpackFileSystem extends IFileSystem {
  readJson(filePath: string, callback: CallbackFn<unknown>): void;
  readJsonSync(filePath: string): unknown;
  purge(): void;
  mkdirp(path: string, callback: CallbackFnVoid): void;
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
        .then((value) => callback(null, value))
        .catch((e) => callback(e, undefined));
    },
    mkdirp(directoryPath, callback) {
      ensureDirectory(directoryPath)
        .then(() => callback(null))
        .catch(callback);
    },
    async purge() {
      watchService.clearGlobalListeners();
      await watchService.unwatchAllPaths();
    },
  };
}
