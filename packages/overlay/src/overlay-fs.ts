import {
    IFileSystem,
    IBaseFileSystemSyncActions,
    IBaseFileSystemPromiseActions,
    IBaseFileSystemCallbackActions,
    CallbackFn,
    ReadFileOptions
} from '@file-services/types';
import { createFileSystem } from '@file-services/utils';

export function createOverlayFs(lowerFs: IFileSystem, upperFs: IFileSystem): IFileSystem {
    const { promises: lowerPromises } = lowerFs;
    const { promises: upperPromises } = upperFs;

    const baseSyncActions: Partial<IBaseFileSystemSyncActions> = {
        existsSync(path) {
            return upperFs.existsSync(path) || lowerFs.existsSync(path);
        },
        readFileSync: function readFileSync(filePath: string, options?: ReadFileOptions): string | Buffer {
            try {
                return upperFs.readFileSync(filePath, options!);
            } catch (e) {
                return lowerFs.readFileSync(filePath, options!);
            }
        } as IBaseFileSystemSyncActions['readFileSync'],
        statSync(path) {
            try {
                return upperFs.statSync(path);
            } catch (e) {
                return lowerFs.statSync(path);
            }
        },
        lstatSync(path) {
            try {
                return upperFs.lstatSync(path);
            } catch (e) {
                return lowerFs.lstatSync(path);
            }
        },
        realpathSync(path) {
            try {
                return upperFs.realpathSync(path);
            } catch (e) {
                return lowerFs.realpathSync(path);
            }
        },
        readlinkSync(path) {
            try {
                return upperFs.readlinkSync(path);
            } catch (e) {
                return lowerFs.readlinkSync(path);
            }
        },
        readdirSync(path) {
            try {
                const resInUpper = upperFs.readdirSync(path);
                try {
                    return [...lowerFs.readdirSync(path), ...resInUpper];
                } catch {
                    return resInUpper;
                }
            } catch {
                return lowerFs.readdirSync(path);
            }
        }
    };

    const basePromiseActions: Partial<IBaseFileSystemPromiseActions> = {
        async exists(path) {
            return (await upperPromises.exists(path)) || (await lowerPromises.exists(path));
        },
        async readFile(path: string, ...restArgs: [ReadFileOptions]) {
            try {
                return (await upperPromises.readFile(path, ...restArgs)) as string;
            } catch (e) {
                return lowerPromises.readFile(path, ...restArgs) as Promise<string>;
            }
        },
        async stat(path) {
            try {
                return await upperPromises.stat(path);
            } catch (e) {
                return lowerPromises.stat(path);
            }
        },
        async lstat(path) {
            try {
                return await upperPromises.lstat(path);
            } catch (e) {
                return lowerPromises.lstat(path);
            }
        },
        async realpath(path) {
            try {
                return await upperPromises.realpath(path);
            } catch (e) {
                return lowerPromises.realpath(path);
            }
        },
        async readlink(path) {
            try {
                return await upperPromises.readlink(path);
            } catch (e) {
                return lowerPromises.readlink(path);
            }
        },
        async readdir(path) {
            try {
                const resInUpper = await upperPromises.readdir(path);
                try {
                    return [...(await lowerPromises.readdir(path)), ...resInUpper];
                } catch {
                    return resInUpper;
                }
            } catch {
                return lowerPromises.readdir(path);
            }
        }
    };

    const baseCallbackActions: Partial<IBaseFileSystemCallbackActions> = {
        exists(path, callback) {
            upperFs.exists(path, pathExists => {
                if (pathExists) {
                    callback(pathExists);
                } else {
                    lowerFs.exists(path, callback);
                }
            });
        },
        readFile(
            path: string,
            options: string | { encoding?: string | null; flag?: string } | undefined | null | CallbackFn<Buffer>,
            callback?: CallbackFn<string> | CallbackFn<Buffer> | CallbackFn<string | Buffer>
        ): void {
            if (typeof options === 'function') {
                callback = options;
                options = undefined;
            } else if (typeof callback !== 'function') {
                throw new Error(`callback is not a function.`);
            }
            upperFs.readFile(path, options, (upperError, upperValue) => {
                if (upperError) {
                    lowerFs.readFile(path, options as string, callback as CallbackFn<Buffer | string>);
                } else {
                    (callback as CallbackFn<Buffer | string>)(upperError, upperValue);
                }
            });
        },
        stat(path, callback) {
            upperFs.stat(path, (e, stats) => {
                if (e) {
                    lowerFs.stat(path, callback);
                } else {
                    callback(e, stats);
                }
            });
        },
        lstat(path, callback) {
            upperFs.lstat(path, (e, stats) => {
                if (e) {
                    lowerFs.lstat(path, callback);
                } else {
                    callback(e, stats);
                }
            });
        },
        realpath(path, callback) {
            upperFs.realpath(path, (e, realPath) => {
                if (e) {
                    lowerFs.realpath(path, callback);
                } else {
                    callback(e, realPath);
                }
            });
        },
        readlink(path, callback) {
            upperFs.readlink(path, (e, linkPath) => {
                if (e) {
                    lowerFs.readlink(path, callback);
                } else {
                    callback(e, linkPath);
                }
            });
        },
        readdir(directoryPath, callback) {
            upperFs.readdir(directoryPath, (upperError, upperItems) => {
                if (upperError) {
                    lowerFs.readdir(directoryPath, callback);
                } else {
                    lowerFs.readdir(directoryPath, (lowerError, lowerItems) => {
                        if (lowerError) {
                            callback(upperError, upperItems);
                        } else {
                            callback(upperError, [...lowerItems, ...upperItems]);
                        }
                    });
                }
            });
        }
    };

    return createFileSystem({
        ...lowerFs,
        ...baseSyncActions,
        ...baseCallbackActions,
        promises: { ...lowerPromises, ...basePromiseActions }
    });
}
