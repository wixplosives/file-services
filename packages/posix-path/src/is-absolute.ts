import { CHAR_FORWARD_SLASH } from './constants';

export function isAbsolute(path: string) {
    return path.length > 0 && path.charCodeAt(0) === CHAR_FORWARD_SLASH;
}
