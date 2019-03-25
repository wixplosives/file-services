import { CHAR_FORWARD_SLASH, CHAR_DOT, sep } from './constants';

export function normalize(path: string) {
    if (path.length === 0) {
        return '.';
    }

    const isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_FORWARD_SLASH;

    // Normalize the path
    path = normalizeString(path, !isAbsolute);

    if (path.length === 0) {
        if (isAbsolute) {
            return '/';
        }
        return trailingSeparator ? './' : '.';
    }
    if (trailingSeparator) {
        path += '/';
    }

    return isAbsolute ? `/${path}` : path;
}

// Resolves . and .. elements in a path with directory names
export function normalizeString(path: string, allowAboveRoot: boolean) {
    let res = '';
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let code: number | undefined;
    for (let i = 0; i <= path.length; ++i) {
        if (i < path.length) {
            code = path.charCodeAt(i);
        } else if (code === CHAR_FORWARD_SLASH) {
            // isPosixPathSeparator
            break;
        } else {
            code = CHAR_FORWARD_SLASH;
        }

        if (code === CHAR_FORWARD_SLASH) {
            // isPosixPathSeparator
            if (lastSlash === i - 1 || dots === 1) {
                // NOOP
            } else if (lastSlash !== i - 1 && dots === 2) {
                if (
                    res.length < 2 ||
                    lastSegmentLength !== 2 ||
                    res.charCodeAt(res.length - 1) !== CHAR_DOT ||
                    res.charCodeAt(res.length - 2) !== CHAR_DOT
                ) {
                    if (res.length > 2) {
                        const lastSlashIndex = res.lastIndexOf(sep);
                        if (lastSlashIndex === -1) {
                            res = '';
                            lastSegmentLength = 0;
                        } else {
                            res = res.slice(0, lastSlashIndex);
                            lastSegmentLength = res.length - 1 - res.lastIndexOf(sep);
                        }
                        lastSlash = i;
                        dots = 0;
                        continue;
                    } else if (res.length === 2 || res.length === 1) {
                        res = '';
                        lastSegmentLength = 0;
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                }
                if (allowAboveRoot) {
                    res += res.length > 0 ? `${sep}..` : '..';
                    lastSegmentLength = 2;
                }
            } else {
                res += (res.length > 0 ? sep : '') + path.slice(lastSlash + 1, i);
                lastSegmentLength = i - lastSlash - 1;
            }
            lastSlash = i;
            dots = 0;
        } else if (code === CHAR_DOT && dots !== -1) {
            ++dots;
        } else {
            dots = -1;
        }
    }
    return res;
}
