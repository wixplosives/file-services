import ts from 'typescript'
import { IFileSystemSync } from '@file-services/types'

const identity = (val: string) => val
const toLowerCase = (val: string) => val.toLowerCase()

/**
 * Combines all required functionality for parsing config files,
 * formatting diagnostics, and resolving modules using TypeScript.
 */
export interface IBaseHost extends ts.ParseConfigHost, ts.FormatDiagnosticsHost, ts.ModuleResolutionHost {
    readDirectory(
        path: string,
        extensions?: ReadonlyArray<string>,
        exclude?: ReadonlyArray<string>,
        include?: ReadonlyArray<string>,
        depth?: number
    ): string[]
    getCurrentDirectory(): string
    directoryExists(directoryPath: string): boolean
    getDirectories(path: string): string[]

    dirname(path: string): string
    normalize(path: string): string
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
export function createBaseHost(fs: IFileSystemSync, cwd: string): IBaseHost {
    const {
        caseSensitive, statSync, readFileSync, readdirSync, fileExistsSync, directoryExistsSync,
        path: { join, dirname, normalize }
    } = fs

    function getFileSystemEntries(path: string): { files: string[], directories: string[] } {
        const files: string[] = []
        const directories: string[] = []

        const dirEntries = readdirSync(path)
        for (const entryName of dirEntries) {
            const entryStats = statSync(join(path, entryName))
            if (!entryStats) {
                continue
            }
            if (entryStats.isFile()) {
                files.push(entryName)
            } else if (entryStats.isDirectory()) {
                directories.push(entryName)
            }
        }
        return { files, directories }
    }

    return {
        readDirectory(rootDir, extensions, excludes, includes, depth) {
            return ts.matchFiles(
                rootDir, extensions, excludes, includes, caseSensitive, rootDir, depth, getFileSystemEntries
            )
        },
        getDirectories(path) {
            return getFileSystemEntries(path).directories
        },
        fileExists: fileExistsSync,
        directoryExists: directoryExistsSync,
        readFile(filePath) {
            try {
                return readFileSync(filePath)
            } catch {
                return undefined
            }
        },
        useCaseSensitiveFileNames: caseSensitive,
        getCanonicalFileName: caseSensitive ? identity : toLowerCase,
        getCurrentDirectory: () => cwd,
        getNewLine: () => ts.sys ? ts.sys.newLine : '\n',
        dirname,
        normalize
    }
}

/**
 * Create a TypeScript `LanguageServiceHost` using provided file system.
 *
 * @param fs the file system used as host backend
 * @param baseHost created using `createBaseHost()`
 * @param fileNames list of absolute paths to `.ts/tsx` files included in this transpilation
 * @param compilerOptions compilerOptions to use when transpiling or type checking
 * @param defaultLibsDirectory absolute path to the directory that contains TypeScript's built-in `.d.ts` files
 *                             `path.dirname(ts.getDefaultLibFilePath({}))` in node,
 *                             or custom directory with `@file-services/memory`
 * @param customTransformers optional custom transformers to apply during transpilation
 */
export function createLanguageServiceHost(
    fs: IFileSystemSync,
    baseHost: IBaseHost,
    fileNames: string[],
    compilerOptions: ts.CompilerOptions,
    defaultLibsDirectory: string,
    customTransformers?: ts.CustomTransformers,
): ts.LanguageServiceHost {
    const { statSync, readFileSync, path: { join }, caseSensitive } = fs
    const targetNewLine = ts.getNewLineCharacter(compilerOptions, baseHost.getNewLine)

    return {
        ...baseHost,
        getCompilationSettings: () => compilerOptions,
        getScriptFileNames: () => fileNames,
        getScriptVersion(filePath) {
            try {
                const stats = statSync(filePath)
                return `${stats.mtime.getTime()}`
            } catch {
                return `${Date.now()}`
            }
        },
        getScriptSnapshot(filePath) {
            try {
                const fileContents = readFileSync(filePath)
                return ts.ScriptSnapshot.fromString(fileContents)
            } catch {
                return undefined
            }
        },
        getDefaultLibFileName: options => join(defaultLibsDirectory, ts.getDefaultLibFileName(options)),
        useCaseSensitiveFileNames: () => caseSensitive,
        getCustomTransformers: customTransformers ? () => customTransformers : undefined,
        getNewLine: () => targetNewLine // override baseHost's method
    }
}
