import { RequestResolver, IResolutionHost, IResolutionOutput } from './types'

export interface IRequestResolverOptions {
    /**
     * Required environment APIs for resolution.
     */
    host: IResolutionHost

    /**
     * Folders to use when searching for packages.
     *
     * @default ['node_modules']
     */
    packageRoots?: string[]

    /**
     * File extensions to try resolving the request with.
     *
     * @default ['.js', '.json']
     */
    extensions?: string[]

    /**
     * Whether to prefer the 'browser' field or 'main' field
     * in `package.json`.
     */
    target?: 'node' | 'browser'
}

export function createRequestResolver(options: IRequestResolverOptions): RequestResolver {
    const {
        host: { fileExistsSync, readFileSync, path: { dirname, join, resolve, isAbsolute, basename } },
        packageRoots = ['node_modules'],
        extensions = ['.js', '.json'],
        target = 'browser'
    } = options

    return resolveImport

    function resolveImport(contextPath: string, request: string, ): IResolutionOutput | null {
        if (request.startsWith('./') || request.startsWith('../') || isAbsolute(request)) {
            const importPath = resolve(contextPath, request)
            return resolveAsFile(importPath) || resolveAsDirectory(importPath)
        } else {
            return resolveAsPackage(contextPath, request)
        }
    }

    function resolveAsFile(importPath: string): IResolutionOutput | null {
        if (fileExistsSync(importPath)) {
            return { resolvedFile: importPath }
        } else {
            for (const ext of extensions) {
                const pathWithExt = importPath + ext
                if (fileExistsSync(pathWithExt)) {
                    return { resolvedFile: pathWithExt }
                }
            }
        }
        return null
    }

    function resolveAsDirectory(importPath: string): IResolutionOutput | null {
        const packageJsonPath = join(importPath, 'package.json')
        if (fileExistsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(readFileSync(packageJsonPath))
                const browserField = packageJson && packageJson.browser
                const mainField = packageJson && packageJson.main
                if (target === 'browser' && typeof browserField === 'string') {
                    const targetPath = join(importPath, browserField)
                    return resolveAsFile(targetPath) || resolveAsFile(join(targetPath, 'index'))
                } else if (typeof mainField === 'string') {
                    const targetPath = join(importPath, mainField)
                    return resolveAsFile(targetPath) || resolveAsFile(join(targetPath, 'index'))
                }
            } catch {/* we don't reject, just return null */ }
        }
        return resolveAsFile(join(importPath, 'index'))
    }

    function resolveAsPackage(initialPath: string, request: string): IResolutionOutput | null {
        for (const packageRoot of packageRoots) {
            let currentPath = initialPath
            let lastPath: string | undefined
            while (lastPath !== currentPath) {
                const isPackagesRoot = basename(currentPath) === packageRoot
                const packagesPath = isPackagesRoot ? currentPath : resolve(currentPath, packageRoot)
                const requestInPackages = join(packagesPath, request)
                const resolved = resolveAsFile(requestInPackages) || resolveAsDirectory(requestInPackages)
                if (resolved) {
                    return resolved
                }
                lastPath = currentPath
                currentPath = isPackagesRoot ? dirname(dirname(currentPath)) : dirname(currentPath)
            }
        }
        return null
    }
}
