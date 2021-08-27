import type {
  IBaseFileSystemSync,
  IBaseFileSystemAsync,
  IBaseFileSystemPromiseActions,
  CallbackFnVoid,
} from '@file-services/types';

export function syncToAsyncFs(syncFs: IBaseFileSystemSync): IBaseFileSystemAsync {
  return {
    ...syncFs,
    watchService: syncFs.watchService,
    caseSensitive: syncFs.caseSensitive,

    promises: {
      readFile: async function readFile(...args: [string]) {
        return syncFs.readFileSync(...args);
      } as IBaseFileSystemPromiseActions['readFile'],
      async writeFile(...args) {
        return syncFs.writeFileSync(...args);
      },
      async unlink(filePath) {
        return syncFs.unlinkSync(filePath);
      },
      readdir: async function readdir(...args: [string]) {
        return syncFs.readdirSync(...args);
      } as IBaseFileSystemPromiseActions['readdir'],
      async mkdir(directoryPath, ...args) {
        return syncFs.mkdirSync(directoryPath, ...args);
      },
      async rmdir(directoryPath) {
        return syncFs.rmdirSync(directoryPath);
      },
      async exists(nodePath) {
        return syncFs.existsSync(nodePath);
      },
      async stat(nodePath) {
        return syncFs.statSync(nodePath);
      },
      async lstat(nodePath) {
        return syncFs.lstatSync(nodePath);
      },
      async realpath(nodePath) {
        return syncFs.realpathSync(nodePath);
      },
      async rename(srcPath, destPath) {
        return syncFs.renameSync(srcPath, destPath);
      },
      async copyFile(...args) {
        return syncFs.copyFileSync(...args);
      },
      async readlink(path) {
        return syncFs.readlinkSync(path);
      },
      async symlink(...args) {
        return syncFs.symlinkSync(...args);
      },
    },
    exists(nodePath, callback) {
      callback(syncFs.existsSync(nodePath));
    },
    readFile: callbackify(syncFs.readFileSync) as IBaseFileSystemAsync['readFile'],
    writeFile: callbackify(syncFs.writeFileSync) as IBaseFileSystemAsync['writeFile'],
    copyFile: callbackify(syncFs.copyFileSync) as IBaseFileSystemAsync['copyFile'],
    unlink: callbackify(syncFs.unlinkSync),
    readdir: callbackify(syncFs.readdirSync) as IBaseFileSystemAsync['readdir'],
    mkdir: callbackify(syncFs.mkdirSync) as unknown as IBaseFileSystemAsync['mkdir'],
    rmdir: callbackify(syncFs.rmdirSync),
    stat: callbackify(syncFs.statSync),
    lstat: callbackify(syncFs.lstatSync),
    realpath: callbackify(syncFs.realpathSync),
    rename: callbackify(syncFs.renameSync),
    readlink: callbackify(syncFs.readlinkSync),
  };
}

function callbackify<T extends unknown[], R>(fn: (...args: [...T]) => R) {
  return (...args: [...T, (error: Error | null, value: R) => void]): void => {
    const callback = args.pop() as (error: Error | null, value: R) => void;
    if (typeof callback !== 'function') {
      throw new Error('callback is not a function');
    }
    try {
      const result = fn(...(args as unknown as [...T]));
      callback(null, result);
    } catch (e) {
      (callback as CallbackFnVoid)(e as Error | undefined | null);
    }
  };
}
