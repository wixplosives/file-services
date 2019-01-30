import { IFileSystemSync } from '@file-services/types'

export interface IModuleSystemOptions {
    fs: IFileSystemSync
}

export interface ICommonJsModuleSystem {
    /**
     * Map of file path to a loaded module.
     */
    loadedModules: Map<string, IModule>

    /**
     * Require a module using an absolute file path.
     */
    requireModule(filePath: string): unknown

    /**
     * Require a module from some context (directory path).
     */
    requireFrom(contextPath: string, request: string): unknown

    /**
     * Resolve a module request from some context (directory path).
     */
    resolveFrom(contextPath: string, request: string): string
}

export interface IModule {
    /**
     * Absolute path to module's source file.
     */
    filename: string

    /**
     * Exported values of module.
     */
    exports: unknown
}

export type ModuleEvalFn = (
    module: IModule,
    exports: unknown,
    // tslint:disable:variable-name
    __filename: string,
    __dirname: string,
    // tslint:enable:variable-name
    process: {
        env: Record<string, string | undefined>
    },
    require: (request: string) => unknown,
    global: unknown
) => void
