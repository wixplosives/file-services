import { CHAR_FORWARD_SLASH } from './constants';

export function dirname(path: string) {
    if (path.length === 0) {
        return '.';
    }
    const hasRoot = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    let end = -1;
    let matchedSlash = true;
    for (let i = path.length - 1; i >= 1; --i) {
        if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
            if (!matchedSlash) {
                end = i;
                break;
            }
        } else {
            // We saw the first non-path separator
            matchedSlash = false;
        }
    }
    if (end === -1) {
        return hasRoot ? '/' : '.';
    }
    if (hasRoot && end === 1) {
        return '//';
    }
    return path.slice(0, end);
}
