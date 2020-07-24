import type {
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
  IFileSystemExtendedPromiseActions,
} from '@file-services/types';

const returnsTrue = () => true;

export function createFileSystem(baseFs: IBaseFileSystem): IFileSystem {
  return {
    ...baseFs,
    ...createExtendedSyncActions(baseFs),
    promises: {
      ...baseFs.promises,
      ...createExtendedFileSystemPromiseActions(baseFs),
    },
  };
}

export function createSyncFileSystem(baseFs: IBaseFileSystemSync): IFileSystemSync {
  return {
    ...baseFs,
    ...createExtendedSyncActions(baseFs),
  };
}

export function createExtendedSyncActions(baseFs: IBaseFileSystemSync): IFileSystemExtendedSyncActions {
  const {
    statSync,
    mkdirSync,
    writeFileSync,
    unlinkSync,
    rmdirSync,
    lstatSync,
    readdirSync,
    readFileSync,
    copyFileSync,
    dirname,
    join,
    resolve,
  } = baseFs;

  function fileExistsSync(filePath: string, statFn = statSync): boolean {
    try {
      return statFn(filePath).isFile();
    } catch {
      return false;
    }
  }

  function readJsonFileSync(filePath: string, options?: BufferEncoding | { encoding: BufferEncoding } | null): unknown {
    return JSON.parse(readFileSync(filePath, options || 'utf8')) as unknown;
  }

  function directoryExistsSync(directoryPath: string, statFn = statSync): boolean {
    try {
      return statFn(directoryPath).isDirectory();
    } catch {
      return false;
    }
  }

  function ensureDirectorySync(directoryPath: string): void {
    try {
      mkdirSync(directoryPath);
    } catch (e) {
      if (directoryExistsSync(directoryPath)) {
        return;
      }

      // Propagate the error, unless it's caused by missing the parent dir (ENOENT).
      if (!e || (e as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw e;
      }

      const parentPath = dirname(directoryPath);
      if (parentPath === directoryPath) {
        throw e;
      }

      // Windows also throws ENOENT when trying to create a directory inside of a file,
      // unlike Mac/Linux that throw ENOTDIR.
      if (fileExistsSync(parentPath)) {
        throw e;
      }

      ensureDirectorySync(parentPath);
      try {
        mkdirSync(directoryPath);
      } catch (e) {
        if (!directoryExistsSync(directoryPath)) {
          throw e;
        }
      }
    }
  }

  function populateDirectorySync(directoryPath: string, contents: IDirectoryContents): string[] {
    const filePaths: string[] = [];
    ensureDirectorySync(directoryPath);
    for (const [nodeName, nodeValue] of Object.entries(contents)) {
      const nodePath = join(directoryPath, nodeName);
      if (typeof nodeValue === 'string') {
        ensureDirectorySync(dirname(nodePath));
        writeFileSync(nodePath, nodeValue);
        filePaths.push(nodePath);
      } else {
        populateDirectorySync(nodePath, nodeValue);
      }
    }
    return filePaths;
  }

  // TODO: replace with rmdirSync(path, {recursive: true}) once Node 12+
  function removeSync(entryPath: string): void {
    const stats = lstatSync(entryPath);
    if (stats.isDirectory()) {
      const directoryItems = readdirSync(entryPath);
      for (const entryName of directoryItems) {
        removeSync(join(entryPath, entryName));
      }
      rmdirSync(entryPath);
    } else if (stats.isFile() || stats.isSymbolicLink()) {
      unlinkSync(entryPath);
    } else {
      throw new Error(`unknown node type, cannot delete ${entryPath}`);
    }
  }

  function findFilesSync(rootDirectory: string, options: IWalkOptions = {}, filePaths: string[] = []): string[] {
    const { filterFile = returnsTrue, filterDirectory = returnsTrue, printErrors } = options;

    for (const nodeName of readdirSync(rootDirectory)) {
      const nodePath = join(rootDirectory, nodeName);
      try {
        const nodeStats = statSync(nodePath);
        const nodeDesc: IFileSystemDescriptor = { name: nodeName, path: nodePath, stats: nodeStats };
        if (nodeStats.isFile() && filterFile(nodeDesc)) {
          filePaths.push(nodePath);
        } else if (nodeStats.isDirectory() && filterDirectory(nodeDesc)) {
          findFilesSync(nodePath, options, filePaths);
        }
      } catch (e) {
        if (printErrors) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }
    }

    return filePaths;
  }

  function findClosestFileSync(initialDirectoryPath: string, fileName: string): string | undefined {
    let currentPath = resolve(initialDirectoryPath);
    let lastPath: string | undefined;

    while (currentPath !== lastPath) {
      const filePath = join(currentPath, fileName);
      if (fileExistsSync(filePath)) {
        return filePath;
      }
      lastPath = currentPath;
      currentPath = dirname(currentPath);
    }

    return undefined;
  }

  function findFilesInAncestorsSync(initialDirectoryPath: string, fileName: string): string[] {
    const filePaths: string[] = [];
    let currentPath = resolve(initialDirectoryPath);
    let lastPath: string | undefined;

    while (currentPath !== lastPath) {
      const filePath = join(currentPath, fileName);
      if (fileExistsSync(filePath)) {
        filePaths.push(filePath);
      }
      lastPath = currentPath;
      currentPath = dirname(currentPath);
    }

    return filePaths;
  }

  function copyDirectorySync(sourcePath: string, destinationPath: string): void {
    ensureDirectorySync(destinationPath);
    for (const item of readdirSync(sourcePath, { withFileTypes: true })) {
      const sourceItemPath = join(sourcePath, item.name);
      const destinationItemPath = join(destinationPath, item.name);
      if (item.isFile()) {
        copyFileSync(sourceItemPath, destinationItemPath);
      } else if (item.isDirectory()) {
        copyDirectorySync(sourceItemPath, destinationItemPath);
      }
    }
  }

  return {
    fileExistsSync,
    directoryExistsSync,
    // resolve path once for recursive functions
    ensureDirectorySync: (directoryPath) => ensureDirectorySync(resolve(directoryPath)),
    populateDirectorySync: (directoryPath, contents) => populateDirectorySync(resolve(directoryPath), contents),
    removeSync: (entryPath) => removeSync(resolve(entryPath)),
    findFilesSync: (rootDirectory, options) => findFilesSync(resolve(rootDirectory), options),
    copyDirectorySync: (sourcePath, destinationPath) =>
      copyDirectorySync(resolve(sourcePath), resolve(destinationPath)),
    findClosestFileSync,
    findFilesInAncestorsSync,
    readJsonFileSync,
  };
}

export function createAsyncFileSystem(baseFs: IBaseFileSystemAsync): IFileSystemAsync {
  return {
    ...baseFs,
    promises: {
      ...baseFs.promises,
      ...createExtendedFileSystemPromiseActions(baseFs),
    },
  };
}

export function createExtendedFileSystemPromiseActions(
  baseFs: IBaseFileSystemAsync
): IFileSystemExtendedPromiseActions {
  const {
    dirname,
    resolve,
    join,
    promises: { stat, mkdir, writeFile, lstat, rmdir, unlink, readdir, readFile, copyFile },
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
    options?: BufferEncoding | { encoding: BufferEncoding } | null
  ): Promise<unknown> {
    return JSON.parse(await readFile(filePath, options || 'utf8')) as unknown;
  }

  async function ensureDirectory(directoryPath: string): Promise<void> {
    try {
      await mkdir(directoryPath);
    } catch (e) {
      if (e && ((e as NodeJS.ErrnoException).code === 'EEXIST' || (e as NodeJS.ErrnoException).code === 'EISDIR')) {
        return;
      }
      const parentPath = dirname(directoryPath);
      if (parentPath === directoryPath) {
        throw e;
      }
      await ensureDirectory(parentPath);
      try {
        await mkdir(directoryPath);
      } catch (e) {
        if (!e || ((e as NodeJS.ErrnoException).code !== 'EEXIST' && (e as NodeJS.ErrnoException).code !== 'EISDIR')) {
          throw e;
        }
      }
    }
  }

  async function populateDirectory(directoryPath: string, contents: IDirectoryContents): Promise<string[]> {
    const filePaths: string[] = [];
    await ensureDirectory(directoryPath);
    for (const [nodeName, nodeValue] of Object.entries(contents)) {
      const nodePath = join(directoryPath, nodeName);
      if (typeof nodeValue === 'string') {
        await ensureDirectory(dirname(nodePath));
        await writeFile(nodePath, nodeValue);
        filePaths.push(nodePath);
      } else {
        await populateDirectory(nodePath, nodeValue);
      }
    }
    return filePaths;
  }

  // TODO: replace with rmdir(path, {recursive: true}) once Node 12+
  async function remove(entryPath: string): Promise<void> {
    const stats = await lstat(entryPath);
    if (stats.isDirectory()) {
      const directoryItems = await readdir(entryPath);
      await Promise.all(directoryItems.map((entryName) => remove(join(entryPath, entryName))));
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
    const { filterFile = returnsTrue, filterDirectory = returnsTrue, printErrors } = options;

    for (const nodeName of await readdir(rootDirectory)) {
      const nodePath = join(rootDirectory, nodeName);
      try {
        const nodeStats = await stat(nodePath);
        const nodeDesc: IFileSystemDescriptor = { name: nodeName, path: nodePath, stats: nodeStats };
        if (nodeStats.isFile() && filterFile(nodeDesc)) {
          filePaths.push(nodePath);
        } else if (nodeStats.isDirectory() && filterDirectory(nodeDesc)) {
          await findFiles(nodePath, options, filePaths);
        }
      } catch (e) {
        if (printErrors) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }
    }

    return filePaths;
  }

  async function findClosestFile(initialDirectoryPath: string, fileName: string): Promise<string | undefined> {
    let currentPath = resolve(initialDirectoryPath);
    let lastPath: string | undefined;

    while (currentPath !== lastPath) {
      const filePath = join(currentPath, fileName);
      if (await fileExists(filePath)) {
        return filePath;
      }
      lastPath = currentPath;
      currentPath = dirname(currentPath);
    }

    return undefined;
  }

  async function findFilesInAncestors(initialDirectoryPath: string, fileName: string): Promise<string[]> {
    const filePaths: string[] = [];
    let currentPath = resolve(initialDirectoryPath);
    let lastPath: string | undefined;

    while (currentPath !== lastPath) {
      const filePath = join(currentPath, fileName);
      if (await fileExists(filePath)) {
        filePaths.push(filePath);
      }
      lastPath = currentPath;
      currentPath = dirname(currentPath);
    }

    return filePaths;
  }

  async function copyDirectory(sourcePath: string, destinationPath: string): Promise<void> {
    await ensureDirectory(destinationPath);
    for (const item of await readdir(sourcePath, { withFileTypes: true })) {
      const sourceItemPath = join(sourcePath, item.name);
      const destinationItemPath = join(destinationPath, item.name);
      if (item.isFile()) {
        await copyFile(sourceItemPath, destinationItemPath);
      } else if (item.isDirectory()) {
        await copyDirectory(sourceItemPath, destinationItemPath);
      }
    }
  }

  return {
    fileExists,
    directoryExists,
    ensureDirectory: (directoryPath) => ensureDirectory(resolve(directoryPath)),
    populateDirectory: (directoryPath, contents) => populateDirectory(resolve(directoryPath), contents),
    remove: (entryPath) => remove(resolve(entryPath)),
    findFiles: (rootDirectory, options) => findFiles(resolve(rootDirectory), options),
    copyDirectory: (sourcePath, destinationPath) => copyDirectory(resolve(sourcePath), resolve(destinationPath)),
    findClosestFile,
    findFilesInAncestors,
    readJsonFile,
  };
}
