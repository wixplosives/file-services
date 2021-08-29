import ts from 'typescript';

declare module 'typescript' {
  // needed for custom readDirectory
  export function matchFiles(
    path: string,
    extensions: readonly string[] | undefined,
    excludes: readonly string[] | undefined,
    includes: readonly string[] | undefined,
    useCaseSensitiveFileNames: boolean,
    currentDirectory: string,
    depth: number | undefined,
    getFileSystemEntries: (path: string) => FileSystemEntries,
    realpath: (path: string) => string,
    directoryExists: (path: string) => boolean
  ): string[];

  // used by matchFiles above
  export interface FileSystemEntries {
    readonly files: ReadonlyArray<string>;
    readonly directories: ReadonlyArray<string>;
  }

  // needed to resolve newLine, while taking compilerOptions into consideration, for each `LanguageServiceHost`
  export function getNewLineCharacter(
    options: ts.CompilerOptions | ts.PrinterOptions,
    getNewLine?: () => string
  ): string;
}
