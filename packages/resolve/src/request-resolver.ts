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

export const defaultPackageRoots = ['node_modules']
export const defaultExtensions = ['.js', '.json']

export function createRequestResolver(options: IRequestResolverOptions): RequestResolver {
    const {
        host: { fileExistsSync, readFileSync, path: { dirname, join, resolve, isAbsolute, basename } },
        packageRoots = defaultPackageRoots,
        extensions = defaultExtensions,
        target = 'browser'
    } = options

    return resolveImport

    function resolveImport(
        contextPath: string,
        request: string,
        mapping?: Record<string, string>
    ): IResolutionOutput | null {
        if (request.startsWith('./') || request.startsWith('../') || isAbsolute(request)) {
            const importPath = resolve(contextPath, request)
            return resolveAsFile(importPath) || resolveAsDirectory(importPath, mapping)
        } else {
            return resolveAsPackage(contextPath, request, mapping)
        }
    }

    function resolveAsFile(importPath: string, mapping?: Record<string, string>): IResolutionOutput | null {
        if (fileExistsSync(importPath)) {
            return { resolvedFile: importPath, mapping }
        } else {
            for (const ext of extensions) {
                const pathWithExt = importPath + ext
                if (fileExistsSync(pathWithExt)) {
                    return { resolvedFile: pathWithExt, mapping }
                }
            }
        }
        return null
    }

    function resolveAsDirectory(importPath: string, mapping?: Record<string, string>): IResolutionOutput | null {
        const packageJsonPath = join(importPath, 'package.json')
        if (fileExistsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(readFileSync(packageJsonPath))
                const browserField = packageJson && packageJson.browser
                const mainField = packageJson && packageJson.main
                if (target === 'browser' && typeof browserField === 'string') {
                    const targetPath = join(importPath, browserField)
                    return resolveAsFile(targetPath, mapping) || resolveAsFile(join(targetPath, 'index'), mapping)
                } else if (typeof mainField === 'string') {
                    const targetPath = join(importPath, mainField)
                    return resolveAsFile(targetPath, mapping) || resolveAsFile(join(targetPath, 'index'), mapping)
                }
            } catch {/* we don't reject, just return null */ }
        }
        return resolveAsFile(join(importPath, 'index'), mapping)
    }

    function resolveAsPackage(
        initialPath: string,
        request: string,
        mapping?: Record<string, string>
    ): IResolutionOutput | null {
        for (const packageRoot of packageRoots) {
            let currentPath = initialPath
            let lastPath: string | undefined
            while (lastPath !== currentPath) {
                const isPackagesRoot = basename(currentPath) === packageRoot
                const packagesPath = isPackagesRoot ? currentPath : resolve(currentPath, packageRoot)
                const requestInPackages = join(packagesPath, request)
                const resolved = resolveAsFile(requestInPackages, mapping)
                    || resolveAsDirectory(requestInPackages, mapping)
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
