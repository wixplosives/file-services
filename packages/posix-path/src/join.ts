import { normalize } from './normalize';

export function join(...args: string[]) {
    if (args.length === 0) {
        return '.';
    }
    let joined: string | undefined;
    for (const arg of args) {
        if (arg.length > 0) {
            if (joined === undefined) {
                joined = arg;
            } else {
                joined += `/${arg}`;
            }
        }
    }
    if (joined === undefined) {
        return '.';
    }
    return normalize(joined);
}
