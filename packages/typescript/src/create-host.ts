import ts from 'typescript';
import type { IFileSystemSync, IFileSystemPath } from '@file-services/types';

const UNIX_NEW_LINE = '\n';
const identity = (val: string) => val;
const toLowerCase = (val: string) => val.toLowerCase();
const defaultGetNewLine = ts.sys ? () => ts.sys.newLine : () => UNIX_NEW_LINE;
/**
 * Combines all required functionality for parsing config files,
 * formatting diagnostics, and resolving modules using TypeScript.
 */
export interface IBaseHost extends ts.ParseConfigHost, ts.FormatDiagnosticsHost, ts.ModuleResolutionHost {
  getCurrentDirectory: IFileSystemSync['cwd'];
  directoryExists: IFileSystemSync['directoryExistsSync'];

  readDirectory: NonNullable<ts.LanguageServiceHost['readDirectory']>;
  getDirectories: NonNullable<ts.ModuleResolutionHost['getDirectories']>;

  getScriptVersion: ts.LanguageServiceHost['getScriptVersion'];

  dirname: IFileSystemPath['dirname'];
  normalize: IFileSystemPath['normalize'];
  join: IFileSystemPath['join'];
}

/**
 * Create an IBaseHost, which is actually three interfaces combined:
 * - `ts.ParseConfigHost` - for parsing of `tsconfig.json` files
 * - `ts.FormatDiagnosticsHost` - for formatting of `ts.Diagnostic` instances
 * - `ts.ModuleResolutionHost` - for resolution of imports using TypeScript's built-in mechanism
 *
 * @param fs the file system to use as host backend
 * @param cwd current working directory to use
 */
export function createBaseHost(fs: IFileSystemSync): IBaseHost {
  const {
    caseSensitive,
    statSync,
    readFileSync,
    readdirSync,
    fileExistsSync,
    directoryExistsSync,
    cwd,
    realpathSync,
    join,
    dirname,
    normalize,
  } = fs;

  function getFileSystemEntries(path: string): { files: string[]; directories: string[] } {
    const files: string[] = [];
    const directories: string[] = [];

    const { stackTraceLimit } = Error;
    try {
      Error.stackTraceLimit = 0;
      const dirEntries = readdirSync(path);
      for (const entryName of dirEntries) {
        const entryStats = statSync(join(path, entryName));
        if (!entryStats) {
          continue;
        }
        if (entryStats.isFile()) {
          files.push(entryName);
        } else if (entryStats.isDirectory()) {
          directories.push(entryName);
        }
      }
    } catch {
      /* */
    } finally {
      Error.stackTraceLimit = stackTraceLimit;
    }

    return { files, directories };
  }

  function realpath(path: string): string {
    const { stackTraceLimit } = Error;
    try {
      Error.stackTraceLimit = 0;
      return realpathSync(path);
    } catch (e) {
      return path;
    } finally {
      Error.stackTraceLimit = stackTraceLimit;
    }
  }

  return {
    readDirectory(rootDir, extensions, excludes, includes, depth) {
      return ts.matchFiles(
        rootDir,
        extensions,
        excludes,
        includes,
        caseSensitive,
        rootDir,
        depth,
        getFileSystemEntries,
        realpath
      );
    },
    getDirectories(path) {
      return getFileSystemEntries(path).directories;
    },
    fileExists: fileExistsSync,
    directoryExists: directoryExistsSync,
    readFile(filePath) {
      const { stackTraceLimit } = Error;
      try {
        Error.stackTraceLimit = 0;
        return readFileSync(filePath, 'utf8');
      } catch {
        return undefined;
      } finally {
        Error.stackTraceLimit = stackTraceLimit;
      }
    },
    getScriptVersion(filePath) {
      const { stackTraceLimit } = Error;
      try {
        Error.stackTraceLimit = 0;
        return `${statSync(filePath).mtime.getTime()}`;
      } catch {
        return `${Date.now()}`;
      } finally {
        Error.stackTraceLimit = stackTraceLimit;
      }
    },
    useCaseSensitiveFileNames: caseSensitive,
    getCanonicalFileName: caseSensitive ? identity : toLowerCase,
    getCurrentDirectory: cwd,
    getNewLine: defaultGetNewLine,
    realpath,
    dirname,
    normalize,
    join,
  };
}

/**
 * Create a TypeScript `LanguageServiceHost` using provided base host, list of files, and compiler options.
 *
 * @param baseHost created using `createBaseHost()`
 * @param getScriptFileNames return a list of absolute paths to `.ts/tsx` files included in this transpilation.
 * @param getCompilationSettings returns `ts.CompilerOptions` to use when transpiling or type checking.
 * @param defaultLibsDirectory absolute path to the directory that contains TypeScript's built-in `.d.ts` files
 *                             `path.dirname(ts.getDefaultLibFilePath({}))` in node,
 *                             or custom directory with `@file-services/memory`
 * @param getCustomTransformers optional transformers to apply during transpilation
 */
export function createLanguageServiceHost(
  baseHost: IBaseHost,
  getScriptFileNames: () => string[],
  getCompilationSettings: () => ts.CompilerOptions,
  defaultLibsDirectory: string,
  getCustomTransformers?: () => ts.CustomTransformers | undefined
): ts.LanguageServiceHost {
  const { readFile, join, useCaseSensitiveFileNames, getNewLine } = baseHost;

  return {
    ...baseHost,
    getCompilationSettings,
    getScriptFileNames,
    getCustomTransformers,
    getScriptSnapshot(filePath) {
      const fileContents = readFile(filePath);
      return fileContents !== undefined ? ts.ScriptSnapshot.fromString(fileContents) : undefined;
    },
    getNewLine: () => ts.getNewLineCharacter(getCompilationSettings(), getNewLine),
    getDefaultLibFileName: (options) => join(defaultLibsDirectory, ts.getDefaultLibFileName(options)),
    useCaseSensitiveFileNames: () => useCaseSensitiveFileNames,
  };
}
