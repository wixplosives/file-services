import { RequestResolver, IResolutionOutput, IRequestResolverOptions } from './types'

const isRelative = (request: string) => request.startsWith('./') || request.startsWith('../')

export function createRequestResolver(options: IRequestResolverOptions): RequestResolver {
    const {
        fs: { fileExistsSync, readFileSync, path: { dirname, join, resolve, isAbsolute, basename } },
        packageRoots = ['node_modules'],
        extensions = ['.js', '.json'],
        target = 'browser'
    } = options

    return resolveRequest

    function resolveRequest(contextPath: string, request: string, ): IResolutionOutput | null {
        if (isRelative(request) || isAbsolute(request)) {
            const requestPath = resolve(contextPath, request)
            return resolveAsFile(requestPath) || resolveAsDirectory(requestPath)
        } else {
            return resolveAsPackage(contextPath, request)
        }
    }

    function resolveAsFile(requestPath: string): IResolutionOutput | null {
        if (fileExistsSync(requestPath)) {
            return { resolvedFile: requestPath }
        } else {
            for (const ext of extensions) {
                const pathWithExt = requestPath + ext
                if (fileExistsSync(pathWithExt)) {
                    return { resolvedFile: pathWithExt }
                }
            }
        }
        return null
    }

    function resolveAsDirectory(requestPath: string): IResolutionOutput | null {
        const packageJsonPath = join(requestPath, 'package.json')
        if (fileExistsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(readFileSync(packageJsonPath))
                const browserField = packageJson && packageJson.browser
                const mainField = packageJson && packageJson.main
                if (target === 'browser' && typeof browserField === 'string') {
                    const targetPath = join(requestPath, browserField)
                    return resolveAsFile(targetPath) || resolveAsFile(join(targetPath, 'index'))
                } else if (typeof mainField === 'string') {
                    const targetPath = join(requestPath, mainField)
                    return resolveAsFile(targetPath) || resolveAsFile(join(targetPath, 'index'))
                }
            } catch {/* we don't reject, just return null */ }
        }
        return resolveAsFile(join(requestPath, 'index'))
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

                // if in /some/path/node_modules, jump directly to /some/node_modules (dirname twice)
                currentPath = isPackagesRoot ? dirname(dirname(currentPath)) : dirname(currentPath)
            }
        }
        return null
    }
}
