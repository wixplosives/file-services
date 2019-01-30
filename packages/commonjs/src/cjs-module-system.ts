import { createRequestResolver } from '@file-services/resolve'
import { IModuleSystemOptions, IModule, ModuleEvalFn, ICommonJsModuleSystem } from './types'

export function createCjsModuleSystem(options: IModuleSystemOptions): ICommonJsModuleSystem {
    const { fs, fs: { readFileSync, path: { dirname } } } = options

    const loadedModules = new Map<string, IModule>()
    const processShim = { env: { NODE_ENV: 'development' } }

    const resolveFrom = createRequestResolver({ fs })

    return {
        requireModule,
        requireFrom,
        resolveFrom,
        loadedModules
    }

    function requireFrom(contextPath: string, request: string): unknown {
        const resolvedRequest = resolveFrom(contextPath, request)
        if (!resolvedRequest) {
            throw new Error(`Cannot resolve "${request}" in ${contextPath}`)
        }
        return requireModule(resolvedRequest.resolvedFile)
    }

    function requireModule(filePath: string): unknown {
        const existingModule = loadedModules.get(filePath)
        if (existingModule) {
            return existingModule.exports
        }

        const newModule: IModule = { exports: {}, filename: filePath }
        loadedModules.set(filePath, newModule)

        const moduleCode = readFileSync(filePath, 'utf8')
        const containingDirPath = dirname(filePath)

        // tslint:disable-next-line:no-eval
        const moduleFn: ModuleEvalFn = eval(
            `(function (module, exports, __filename, __dirname, process, require, global){${moduleCode}\n})`
        )

        moduleFn(
            newModule,
            newModule.exports,
            filePath,
            containingDirPath,
            processShim,
            request => requireFrom(containingDirPath, request)
        )

        return newModule.exports
    }
}
