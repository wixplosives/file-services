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
} from "@file-services/types";

const returnsTrue = () => true;
const statsNoThrowOptions = { throwIfNoEntry: false } as const;

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
  const { statSync, mkdirSync, writeFileSync, readdirSync, readFileSync, copyFileSync, dirname, join, resolve } =
    baseFs;

  function fileExistsSync(filePath: string, statFn = statSync): boolean {
    try {
      return !!statFn(filePath, statsNoThrowOptions)?.isFile();
    } catch {
      return false;
    }
  }

  function readJsonFileSync(filePath: string, options?: BufferEncoding | { encoding: BufferEncoding } | null): unknown {
    return JSON.parse(readFileSync(filePath, options || "utf8")) as unknown;
  }

  function directoryExistsSync(directoryPath: string, statFn = statSync): boolean {
    try {
      return !!statFn(directoryPath, statsNoThrowOptions)?.isDirectory();
    } catch {
      return false;
    }
  }

  function ensureDirectorySync(directoryPath: string): void {
    try {
      mkdirSync(directoryPath);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "EISDIR") {
        return;
      } else if (code === "EEXIST") {
        if (directoryExistsSync(directoryPath)) {
          return;
        } else {
          throw e;
        }
      } else if (code === "ENOTDIR" || !code) {
        throw e;
      }

      const parentPath = dirname(directoryPath);
      if (parentPath === directoryPath) {
        throw e;
      }

      ensureDirectorySync(parentPath);
      try {
        mkdirSync(directoryPath);
      } catch (e) {
        const code = (e as { code?: string })?.code;
        const isDirectoryExistsError = code === "EISDIR" || (code === "EEXIST" && directoryExistsSync(directoryPath));
        if (!isDirectoryExistsError) {
          throw e;
        }
      }
    }
  }

  function populateDirectorySync(directoryPath: string, contents: IDirectoryContents<string | Uint8Array>): string[] {
    const filePaths: string[] = [];
    ensureDirectorySync(directoryPath);
    for (const [nodeName, nodeValue] of Object.entries(contents)) {
      const nodePath = join(directoryPath, nodeName);
      if (typeof nodeValue === "string" || nodeValue instanceof Uint8Array) {
        ensureDirectorySync(dirname(nodePath));
        writeFileSync(nodePath, nodeValue);
        filePaths.push(nodePath);
      } else {
        populateDirectorySync(nodePath, nodeValue);
      }
    }
    return filePaths;
  }

  function findFilesSync(rootDirectory: string, options: IWalkOptions = {}, filePaths: string[] = []): string[] {
    const { filterFile = returnsTrue, filterDirectory = returnsTrue } = options;

    for (const item of readdirSync(rootDirectory, { withFileTypes: true })) {
      const nodePath = join(rootDirectory, item.name);
      const nodeDesc: IFileSystemDescriptor = { name: item.name, path: nodePath };
      if (item.isFile() && filterFile(nodeDesc)) {
        filePaths.push(nodePath);
      } else if (item.isDirectory() && filterDirectory(nodeDesc)) {
        findFilesSync(nodePath, options, filePaths);
      } else if (item.isSymbolicLink() && options.includeSymbolicLinks) {
        const stat = statSync(nodePath);
        if (stat.isFile() && filterFile(nodeDesc)) {
          filePaths.push(nodePath);
        } else if (stat.isDirectory() && filterDirectory(nodeDesc)) {
          findFilesSync(nodePath, options, filePaths);
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
  baseFs: IBaseFileSystemAsync,
): IFileSystemExtendedPromiseActions {
  const {
    dirname,
    resolve,
    join,
    promises: { stat, mkdir, writeFile, readdir, readFile, copyFile },
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
    options?: BufferEncoding | { encoding: BufferEncoding } | null,
  ): Promise<unknown> {
    return JSON.parse(await readFile(filePath, options || "utf8")) as unknown;
  }

  async function ensureDirectory(directoryPath: string): Promise<void> {
    try {
      await mkdir(directoryPath);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "EISDIR") {
        return;
      } else if (code === "EEXIST") {
        if (await directoryExists(directoryPath)) {
          return;
        } else {
          throw e;
        }
      } else if (code === "ENOTDIR" || !code) {
        throw e;
      }

      const parentPath = dirname(directoryPath);
      if (parentPath === directoryPath) {
        throw e;
      }

      await ensureDirectory(parentPath);
      try {
        await mkdir(directoryPath);
      } catch (e) {
        const code = (e as { code?: string })?.code;
        const isDirectoryExistsError =
          code === "EISDIR" || (code === "EEXIST" && (await directoryExists(directoryPath)));
        if (!isDirectoryExistsError) {
          throw e;
        }
      }
    }
  }

  async function populateDirectory(
    directoryPath: string,
    contents: IDirectoryContents<string | Uint8Array>,
  ): Promise<string[]> {
    const filePaths: string[] = [];
    await ensureDirectory(directoryPath);
    for (const [nodeName, nodeValue] of Object.entries(contents)) {
      const nodePath = join(directoryPath, nodeName);
      if (typeof nodeValue === "string" || nodeValue instanceof Uint8Array) {
        await ensureDirectory(dirname(nodePath));
        await writeFile(nodePath, nodeValue);
        filePaths.push(nodePath);
      } else {
        await populateDirectory(nodePath, nodeValue);
      }
    }
    return filePaths;
  }

  async function findFiles(
    rootDirectory: string,
    options: IWalkOptions = {},
    filePaths: string[] = [],
  ): Promise<string[]> {
    const { filterFile = returnsTrue, filterDirectory = returnsTrue } = options;

    for (const item of await readdir(rootDirectory, { withFileTypes: true })) {
      const nodePath = join(rootDirectory, item.name);
      const nodeDesc: IFileSystemDescriptor = { name: item.name, path: nodePath };
      if (item.isFile() && filterFile(nodeDesc)) {
        filePaths.push(nodePath);
      } else if (item.isDirectory() && filterDirectory(nodeDesc)) {
        await findFiles(nodePath, options, filePaths);
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
    findFiles: (rootDirectory, options) => findFiles(resolve(rootDirectory), options),
    copyDirectory: (sourcePath, destinationPath) => copyDirectory(resolve(sourcePath), resolve(destinationPath)),
    findClosestFile,
    findFilesInAncestors,
    readJsonFile,
  };
}
