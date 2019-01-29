import { IFileSystemSync } from '@file-services/types'

export interface IModuleSystemOptions {
    fs: IFileSystemSync
}

export interface ICommonJsModuleSystem {
    requireModule(filePath: string): unknown
}
export interface IModule {
    id: string
    filename: string
    exports: unknown
}

export type ModuleEvalFn = (
    module: IModule,
    exports: unknown,
    // tslint:disable:variable-name
    __filename: string,
    __dirname: string
    // tslint:enable:variable-name

    // require, process, global
) => void
