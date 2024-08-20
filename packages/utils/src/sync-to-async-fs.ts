import type { IBaseFileSystemAsync, IBaseFileSystemPromiseActions, IBaseFileSystemSync } from "@file-services/types";

export function syncToAsyncFs(syncFs: IBaseFileSystemSync): IBaseFileSystemAsync {
  return {
    ...syncFs,
    caseSensitive: syncFs.caseSensitive,

    promises: {
      readFile: async function readFile(...args: [string]) {
        return syncFs.readFileSync(...args);
      } as IBaseFileSystemPromiseActions["readFile"],
      async writeFile(...args) {
        return syncFs.writeFileSync(...args);
      },
      async unlink(filePath) {
        return syncFs.unlinkSync(filePath);
      },
      readdir: async function readdir(...args: [string]) {
        return syncFs.readdirSync(...args);
      } as IBaseFileSystemPromiseActions["readdir"],
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
      async rm(...args) {
        return syncFs.rmSync(...args);
      },
      async chmod(...args) {
        return syncFs.chmodSync(...args);
      },
    },
  };
}
