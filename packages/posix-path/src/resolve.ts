import { CHAR_FORWARD_SLASH } from './constants';
import { normalizeString } from './normalize';

export function resolve(...args: string[]) {
    let resolvedPath = '';
    let resolvedAbsolute = false;

    for (let i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        const path = i >= 0 ? args[i] : '/';

        // Skip empty entries
        if (path.length === 0) {
            continue;
        }

        resolvedPath = `${path}/${resolvedPath}`;
        resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
        return `/${resolvedPath}`;
    }
    return resolvedPath.length > 0 ? resolvedPath : '.';
}
