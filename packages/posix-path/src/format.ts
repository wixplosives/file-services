import { sep } from './constants';

export function format(pathObject: { dir?: string; root?: string; base?: string; name?: string; ext?: string }) {
    const dir = pathObject.dir || pathObject.root;
    const base = pathObject.base || `${pathObject.name || ''}${pathObject.ext || ''}`;
    if (!dir) {
        return base;
    }
    return dir === pathObject.root ? `${dir}${base}` : `${dir}${sep}${base}`;
}
