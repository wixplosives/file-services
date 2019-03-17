import {
    IBaseFileSystemAsync,
    IBaseFileSystemSync,
    IFileSystemAsync,
    IFileSystemSync,
    IDirectoryContents,
    IWalkOptions,
    IFileSystemDescriptor,
    BufferEncoding,
    IBaseFileSystem,
    IFileSystem,
    IFileSystemExtendedSyncActions,
    IFileSystemExtendedPromiseActions
} from '@file-services/types';

const returnsTrue = () => true;

export function createFileSystem(baseFs: IBaseFileSystem): IFileSystem {
    return {
        ...baseFs,
        ...createExtendedSyncActions(baseFs),
        promises: {
            ...baseFs.promises,
            ...createExtendedFileSystemPromiseActions(baseFs)
        }
    };
}

export function createSyncFileSystem(baseFs: IBaseFileSystemSync): IFileSystemSync {
    return {
        ...baseFs,
        ...createExtendedSyncActions(baseFs)
    };
}

export function createExtendedSyncActions(baseFs: IBaseFileSystemSync): IFileSystemExtendedSyncActions {
    const {
        statSync,
        path,
        mkdirSync,
        writeFileSync,
        unlinkSync,
        rmdirSync,
        lstatSync,
        readdirSync,
        readFileSync
    } = baseFs;

    function fileExistsSync(filePath: string, statFn = statSync): boolean {
        try {
            return statFn(filePath).isFile();
        } catch {
            return false;
        }
    }

    function readJsonFileSync(
        filePath: string,
        encoding: BufferEncoding | { encoding: BufferEncoding } | null
    ): unknown {
        return JSON.parse(readFileSync(filePath, encoding || 'utf8'));
    }

    function directoryExistsSync(directoryPath: string, statFn = statSync): boolean {
        try {
            return statFn(directoryPath).isDirectory();
        } catch {
            return false;
        }
    }

    function ensureDirectorySync(directoryPath: string): void {
        if (directoryExistsSync(directoryPath)) {
            return;
        }
        try {
            mkdirSync(directoryPath);
        } catch (e) {
            const parentPath = path.dirname(directoryPath);
            if (parentPath === directoryPath) {
                throw e;
            }
            ensureDirectorySync(parentPath);
            mkdirSync(directoryPath);
        }
    }

    function populateDirectorySync(directoryPath: string, contents: IDirectoryContents): string[] {
        const filePaths: string[] = [];
        ensureDirectorySync(directoryPath);
        for (const [nodeName, nodeValue] of Object.entries(contents)) {
            const nodePath = path.join(directoryPath, nodeName);
            if (typeof nodeValue === 'string') {
                ensureDirectorySync(path.dirname(nodePath));
                writeFileSync(nodePath, nodeValue);
                filePaths.push(nodePath);
            } else {
                populateDirectorySync(nodePath, nodeValue);
            }
        }
        return filePaths;
    }

    function removeSync(entryPath: string): void {
        const stats = lstatSync(entryPath);
        if (stats.isDirectory()) {
            const directoryItems = readdirSync(entryPath);
            for (const entryName of directoryItems) {
                removeSync(path.join(entryPath, entryName));
            }
            rmdirSync(entryPath);
        } else if (stats.isFile() || stats.isSymbolicLink()) {
            unlinkSync(entryPath);
        } else {
            throw new Error(`unknown node type, cannot delete ${entryPath}`);
        }
    }

    function findFilesSync(rootDirectory: string, options: IWalkOptions = {}, filePaths: string[] = []): string[] {
        const { filterFile = returnsTrue, filterDirectory = returnsTrue } = options;

        for (const nodeName of readdirSync(rootDirectory)) {
            const nodePath = path.join(rootDirectory, nodeName);
            const nodeStats = statSync(nodePath);
            const nodeDesc: IFileSystemDescriptor = { name: nodeName, path: nodePath, stats: nodeStats };
            if (nodeStats.isFile() && filterFile(nodeDesc)) {
                filePaths.push(nodePath);
            } else if (nodeStats.isDirectory() && filterDirectory(nodeDesc)) {
                findFilesSync(nodePath, options, filePaths);
            }
        }

        return filePaths;
    }

    function findClosestFileSync(initialDirectoryPath: string, fileName: string): string | null {
        let currentPath = path.resolve(initialDirectoryPath);
        let lastPath: string | undefined;

        while (currentPath !== lastPath) {
            const filePath = path.join(currentPath, fileName);
            if (fileExistsSync(filePath)) {
                return filePath;
            }
            lastPath = currentPath;
            currentPath = path.dirname(currentPath);
        }

        return null;
    }

    function findFilesInAncestorsSync(initialDirectoryPath: string, fileName: string): string[] {
        const filePaths: string[] = [];
        let currentPath = path.resolve(initialDirectoryPath);
        let lastPath: string | undefined;

        while (currentPath !== lastPath) {
            const filePath = path.join(currentPath, fileName);
            if (fileExistsSync(filePath)) {
                filePaths.push(filePath);
            }
            lastPath = currentPath;
            currentPath = path.dirname(currentPath);
        }

        return filePaths;
    }

    return {
        fileExistsSync,
        directoryExistsSync,
        // resolve path once for recursive functions
        ensureDirectorySync: directoryPath => ensureDirectorySync(path.resolve(directoryPath)),
        populateDirectorySync: (directoryPath, contents) =>
            populateDirectorySync(path.resolve(directoryPath), contents),
        removeSync: entryPath => removeSync(path.resolve(entryPath)),
        findFilesSync: (rootDirectory, options) => findFilesSync(path.resolve(rootDirectory), options),
        findClosestFileSync,
        findFilesInAncestorsSync,
        readJsonFileSync
    };
}

export function createAsyncFileSystem(baseFs: IBaseFileSystemAsync): IFileSystemAsync {
    return {
        ...baseFs,
        promises: {
            ...baseFs.promises,
            ...createExtendedFileSystemPromiseActions(baseFs)
        }
    };
}

export function createExtendedFileSystemPromiseActions(
    baseFs: IBaseFileSystemAsync
): IFileSystemExtendedPromiseActions {
    const {
        path,
        promises: { stat, mkdir, writeFile, lstat, rmdir, unlink, readdir, readFile }
    } = baseFs;

    async function fileExists(filePath: string, statFn = stat): Promise<boolean> {
        try {
            return (await statFn(filePath)).isFile();
        } catch {
            return false;
        }
    }

    async function directoryExists(directoryPath: string, statFn = stat): Promise<boolean> {
        try {
            return (await statFn(directoryPath)).isDirectory();
        } catch {
            return false;
        }
    }

    async function readJsonFile(
        filePath: string,
        encoding: BufferEncoding | { encoding: BufferEncoding } | null
    ): Promise<unknown> {
        return JSON.parse(await readFile(filePath, encoding || 'utf8'));
    }

    async function ensureDirectory(directoryPath: string): Promise<void> {
        if (await directoryExists(directoryPath)) {
            return;
        }
        try {
            await mkdir(directoryPath);
        } catch (e) {
            const parentPath = path.dirname(directoryPath);
            if (parentPath === directoryPath) {
                throw e;
            }
            await ensureDirectory(parentPath);
            await mkdir(directoryPath);
        }
    }

    async function populateDirectory(directoryPath: string, contents: IDirectoryContents): Promise<string[]> {
        const filePaths: string[] = [];
        await ensureDirectory(directoryPath);
        for (const [nodeName, nodeValue] of Object.entries(contents)) {
            const nodePath = path.join(directoryPath, nodeName);
            if (typeof nodeValue === 'string') {
                await ensureDirectory(path.dirname(nodePath));
                await writeFile(nodePath, nodeValue);
                filePaths.push(nodePath);
            } else {
                await populateDirectory(nodePath, nodeValue);
            }
        }
        return filePaths;
    }

    async function remove(entryPath: string): Promise<void> {
        const stats = await lstat(entryPath);
        if (stats.isDirectory()) {
            const directoryItems = await readdir(entryPath);
            await Promise.all(directoryItems.map(entryName => remove(path.join(entryPath, entryName))));
            await rmdir(entryPath);
        } else if (stats.isFile() || stats.isSymbolicLink()) {
            await unlink(entryPath);
        } else {
            throw new Error(`unknown node type, cannot delete ${entryPath}`);
        }
    }

    async function findFiles(
        rootDirectory: string,
        options: IWalkOptions = {},
        filePaths: string[] = []
    ): Promise<string[]> {
        const { filterFile = returnsTrue, filterDirectory = returnsTrue } = options;

        for (const nodeName of await readdir(rootDirectory)) {
            const nodePath = path.join(rootDirectory, nodeName);
            const nodeStats = await stat(nodePath);
            const nodeDesc: IFileSystemDescriptor = { name: nodeName, path: nodePath, stats: nodeStats };
            if (nodeStats.isFile() && filterFile(nodeDesc)) {
                filePaths.push(nodePath);
            } else if (nodeStats.isDirectory() && filterDirectory(nodeDesc)) {
                await findFiles(nodePath, options, filePaths);
            }
        }

        return filePaths;
    }
    async function findClosestFile(initialDirectoryPath: string, fileName: string): Promise<string | null> {
        let currentPath = path.resolve(initialDirectoryPath);
        let lastPath: string | undefined;

        while (currentPath !== lastPath) {
            const filePath = path.join(currentPath, fileName);
            if (await fileExists(filePath)) {
                return filePath;
            }
            lastPath = currentPath;
            currentPath = path.dirname(currentPath);
        }

        return null;
    }

    async function findFilesInAncestors(initialDirectoryPath: string, fileName: string): Promise<string[]> {
        const filePaths: string[] = [];
        let currentPath = path.resolve(initialDirectoryPath);
        let lastPath: string | undefined;

        while (currentPath !== lastPath) {
            const filePath = path.join(currentPath, fileName);
            if (await fileExists(filePath)) {
                filePaths.push(filePath);
            }
            lastPath = currentPath;
            currentPath = path.dirname(currentPath);
        }

        return filePaths;
    }

    return {
        fileExists,
        directoryExists,
        ensureDirectory: directoryPath => ensureDirectory(path.resolve(directoryPath)),
        populateDirectory: (directoryPath, contents) => populateDirectory(path.resolve(directoryPath), contents),
        remove: entryPath => remove(path.resolve(entryPath)),
        findFiles: (rootDirectory, options) => findFiles(path.resolve(rootDirectory), options),
        findClosestFile,
        findFilesInAncestors,
        readJsonFile
    };
}
