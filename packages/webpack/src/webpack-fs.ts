import webpack from 'webpack';
import { IFileSystem } from '@file-services/types';

export function createWebpackFs(fs: IFileSystem): webpack.InputFileSystem & webpack.OutputFileSystem {
    const {
        watchService,
        promises: { ensureDirectory }
    } = fs;

    return {
        ...fs,
        ...fs.path,
        mkdirp(directoryPath, callback) {
            ensureDirectory(directoryPath).then(() => callback(undefined), callback);
        },
        async purge() {
            watchService.clearGlobalListeners();
            await watchService.unwatchAllPaths();
        }
    };
}
