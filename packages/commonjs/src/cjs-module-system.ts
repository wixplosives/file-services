import { createRequestResolver } from '@file-services/resolve';
import { IModuleSystemOptions, ICommonJsModuleSystem } from './types';
import { createBaseCjsModuleSystem } from './base-cjs-module-system';

export function createCjsModuleSystem(options: IModuleSystemOptions): ICommonJsModuleSystem {
    const { fs, processEnv = { NODE_ENV: 'development' } } = options;
    const { dirname, readFileSync } = fs;

    const { resolver = createRequestResolver({ fs }) } = options;

    return createBaseCjsModuleSystem({
        processEnv,
        resolveFrom(contextPath, request, requestOrigin) {
            const resolvedRequest = resolver(contextPath, request, requestOrigin);
            return resolvedRequest && resolvedRequest.resolvedFile;
        },
        dirname,
        readFileSync: filePath => readFileSync(filePath, 'utf8')
    });
}
