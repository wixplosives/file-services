import {
    IFileSystem,
    IBaseFileSystemSyncActions,
    IBaseFileSystemPromiseActions,
    IBaseFileSystemCallbackActions,
    CallbackFn,
    ReadFileOptions,
    IDirectoryEntry
} from '@file-services/types';
import { createFileSystem } from '@file-services/utils';

export function createOverlayFs(
    lowerFs: IFileSystem,
    upperFs: IFileSystem,
    baseDirectoryPath = lowerFs.cwd()
): IFileSystem {
    const { promises: lowerPromises, path: lowerPath } = lowerFs;
    const { promises: upperPromises } = upperFs;
    const lowerFsRelativeUp = `..${lowerPath.sep}`;

    // ensure base Directory is absolute
    baseDirectoryPath = lowerPath.resolve(baseDirectoryPath);

    function resolvePaths(path: string): { resolvedLowerPath: string; resolvedUpperPath?: string } {
        const resolvedLowerPath = lowerPath.resolve(path);
        const relativeToBase = lowerPath.relative(baseDirectoryPath, resolvedLowerPath);

        if (!relativeToBase.startsWith(lowerFsRelativeUp) && !lowerPath.isAbsolute(lowerFsRelativeUp)) {
            return { resolvedLowerPath, resolvedUpperPath: relativeToBase.replace(/\\/g, '/') };
        } else {
            return { resolvedLowerPath };
        }
    }

    const baseSyncActions: Partial<IBaseFileSystemSyncActions> = {
        existsSync(path) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                return upperFs.existsSync(resolvedUpperPath) || lowerFs.existsSync(resolvedLowerPath);
            } else {
                return lowerFs.existsSync(resolvedLowerPath);
            }
        },
        readFileSync: function readFileSync(path: string, ...args: [ReadFileOptions]): string | Buffer {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                try {
                    return upperFs.readFileSync(resolvedUpperPath, ...args);
                } catch {
                    /**/
                }
            }
            return lowerFs.readFileSync(resolvedLowerPath, ...args);
        } as IBaseFileSystemSyncActions['readFileSync'],
        statSync(path) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                try {
                    return upperFs.statSync(resolvedUpperPath);
                } catch {
                    /**/
                }
            }
            return lowerFs.statSync(resolvedLowerPath);
        },
        lstatSync(path) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                try {
                    return upperFs.lstatSync(resolvedUpperPath);
                } catch {
                    /**/
                }
            }
            return lowerFs.lstatSync(resolvedLowerPath);
        },
        realpathSync(path) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                try {
                    return lowerPath.join(baseDirectoryPath, upperFs.realpathSync(resolvedUpperPath));
                } catch {
                    /**/
                }
            }
            return lowerFs.realpathSync(resolvedLowerPath);
        },
        readlinkSync(path) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                try {
                    return upperFs.readlinkSync(resolvedUpperPath);
                } catch {
                    /**/
                }
            }
            return lowerFs.readlinkSync(resolvedLowerPath);
        },
        readdirSync: ((path: string, ...args: [{ withFileTypes: false }]) => {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                try {
                    const resInUpper = upperFs.readdirSync(resolvedUpperPath, ...args);
                    try {
                        return [...lowerFs.readdirSync(resolvedLowerPath, ...args), ...resInUpper];
                    } catch {
                        return resInUpper;
                    }
                } catch {
                    /**/
                }
            }
            return lowerFs.readdirSync(resolvedLowerPath, ...args);
        }) as IBaseFileSystemSyncActions['readdirSync']
    };

    const basePromiseActions: Partial<IBaseFileSystemPromiseActions> = {
        async exists(path) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                return (
                    (await upperPromises.exists(resolvedUpperPath)) || (await lowerPromises.exists(resolvedLowerPath))
                );
            } else {
                return lowerPromises.exists(resolvedLowerPath);
            }
        },
        readFile: async function readFile(path: string, ...args: [ReadFileOptions]) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                try {
                    return await upperPromises.readFile(resolvedUpperPath, ...args);
                } catch {
                    /**/
                }
            }
            return lowerPromises.readFile(resolvedLowerPath, ...args);
        } as IBaseFileSystemPromiseActions['readFile'],
        async stat(path) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                try {
                    return await upperPromises.stat(resolvedUpperPath);
                } catch {
                    /**/
                }
            }
            return lowerPromises.stat(resolvedLowerPath);
        },
        async lstat(path) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                try {
                    return await upperPromises.lstat(resolvedUpperPath);
                } catch {
                    /**/
                }
            }
            return lowerPromises.lstat(resolvedLowerPath);
        },
        async realpath(path) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                try {
                    return lowerPath.join(baseDirectoryPath, await upperPromises.realpath(resolvedUpperPath));
                } catch {
                    /**/
                }
            }
            return lowerPromises.realpath(resolvedLowerPath);
        },
        async readlink(path) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                try {
                    return await upperPromises.readlink(resolvedUpperPath);
                } catch {
                    /**/
                }
            }
            return lowerPromises.readlink(resolvedLowerPath);
        },
        readdir: async function readdir(path: string, ...args: [{ withFileTypes: false }]) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                try {
                    const resInUpper = await upperPromises.readdir(resolvedUpperPath, ...args);
                    try {
                        return [...(await lowerPromises.readdir(resolvedLowerPath, ...args)), ...resInUpper];
                    } catch {
                        /**/
                    }
                    return resInUpper;
                } catch {
                    /**/
                }
            }
            return lowerPromises.readdir(resolvedLowerPath, ...args);
        } as IBaseFileSystemPromiseActions['readdir']
    };

    const baseCallbackActions: Partial<IBaseFileSystemCallbackActions> = {
        exists(path, callback) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                upperFs.exists(resolvedUpperPath, pathExists => {
                    if (pathExists) {
                        callback(pathExists);
                    } else {
                        lowerFs.exists(resolvedLowerPath, callback);
                    }
                });
            } else {
                lowerFs.exists(resolvedLowerPath, callback);
            }
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
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                upperFs.readFile(resolvedUpperPath, options, (upperError, upperValue) => {
                    if (upperError) {
                        lowerFs.readFile(resolvedLowerPath, options as string, callback as CallbackFn<Buffer | string>);
                    } else {
                        (callback as CallbackFn<Buffer | string>)(upperError, upperValue);
                    }
                });
            } else {
                lowerFs.readFile(resolvedLowerPath, options, callback as CallbackFn<Buffer | string>);
            }
        },
        stat(path, callback) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                upperFs.stat(resolvedUpperPath, (e, stats) => {
                    if (e) {
                        lowerFs.stat(resolvedLowerPath, callback);
                    } else {
                        callback(e, stats);
                    }
                });
            } else {
                lowerFs.stat(resolvedLowerPath, callback);
            }
        },
        lstat(path, callback) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                upperFs.lstat(resolvedUpperPath, (e, stats) => {
                    if (e) {
                        lowerFs.lstat(resolvedLowerPath, callback);
                    } else {
                        callback(e, stats);
                    }
                });
            } else {
                lowerFs.lstat(resolvedLowerPath, callback);
            }
        },
        realpath(path, callback) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                upperFs.realpath(resolvedUpperPath, (e, realPath) => {
                    if (e) {
                        lowerFs.realpath(resolvedLowerPath, callback);
                    } else {
                        callback(e, lowerPath.join(baseDirectoryPath, realPath));
                    }
                });
            } else {
                lowerFs.realpath(resolvedLowerPath, callback);
            }
        },
        readlink(path, callback) {
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                upperFs.readlink(resolvedUpperPath, (e, linkPath) => {
                    if (e) {
                        lowerFs.readlink(resolvedLowerPath, callback);
                    } else {
                        callback(e, linkPath);
                    }
                });
            } else {
                lowerFs.readlink(resolvedLowerPath, callback);
            }
        },
        readdir(
            path: string,
            options: string | { withFileTypes?: boolean } | undefined | null | CallbackFn<string[]>,
            callback?: CallbackFn<string[]> | CallbackFn<IDirectoryEntry[]>
        ) {
            if (typeof options === 'function') {
                callback = options;
                options = undefined;
            } else if (typeof callback !== 'function') {
                throw new Error(`callback is not a function.`);
            }
            const { resolvedLowerPath, resolvedUpperPath } = resolvePaths(path);
            if (resolvedUpperPath !== undefined) {
                upperFs.readdir(resolvedUpperPath, options as { withFileTypes: true }, (upperError, upperItems) => {
                    if (upperError) {
                        lowerFs.readdir(
                            resolvedLowerPath,
                            options as { withFileTypes: true },
                            callback as CallbackFn<IDirectoryEntry[]>
                        );
                    } else {
                        lowerFs.readdir(
                            resolvedLowerPath,
                            options as { withFileTypes: true },
                            (lowerError, lowerItems) => {
                                if (lowerError) {
                                    (callback as CallbackFn<IDirectoryEntry[]>)(upperError, upperItems);
                                } else {
                                    (callback as CallbackFn<IDirectoryEntry[]>)(upperError, [
                                        ...lowerItems,
                                        ...upperItems
                                    ]);
                                }
                            }
                        );
                    }
                });
            } else {
                lowerFs.readdir(
                    resolvedLowerPath,
                    options as { withFileTypes: true },
                    callback as CallbackFn<IDirectoryEntry[]>
                );
            }
        }
    };

    return createFileSystem({
        ...lowerFs,
        ...baseSyncActions,
        ...baseCallbackActions,
        promises: { ...lowerPromises, ...basePromiseActions }
    });
}
