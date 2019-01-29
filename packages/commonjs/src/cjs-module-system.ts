import { IModuleSystemOptions, IModule, ModuleEvalFn, ICommonJsModuleSystem } from './types'

export function createCjsModuleSystem(options: IModuleSystemOptions): ICommonJsModuleSystem {
    const { fs: { readFileSync, path: { dirname } } } = options

    // const processShim = { env: {}, argv: [] }
    const loadedModules: Record<string, IModule> = {}

    return {
        requireModule
    }

    function requireModule(filePath: string): unknown {
        if (loadedModules[filePath]) {
            return loadedModules[filePath].exports
        }

        const newModule: IModule = loadedModules[filePath] = { exports: {}, id: filePath, filename: filePath }

        const moduleCode = readFileSync(filePath, 'utf8')
        const containingDirPath = dirname(filePath)

        // tslint:disable-next-line:no-eval
        const moduleFn: ModuleEvalFn = eval(
            `(function (module, exports, __filename, __dirname, require, process, global){${moduleCode}\n})`
        )

        moduleFn(newModule, newModule.exports, filePath, containingDirPath)

        return newModule.exports
    }
}
