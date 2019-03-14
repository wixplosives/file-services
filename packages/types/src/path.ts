/**
 * Path API exposed by each file system, and handles path
 * operations relevant to that system.
 */
export interface IFileSystemPath {
    /**
     * Platform-specific file separator. usually '\\' or '/'
     */
    sep: string;

    /**
     * Platform-specific file delimiter. usually ';' or ':'.
     */
    delimiter: string;

    /**
     * Return the last portion of a path. Similar to the Unix basename command.
     * Often used to extract the file name from a fully qualified path.
     *
     * @param path the path to evaluate.
     * @param ext optionally, an extension to remove from the result.
     */
    basename(path: string, ext?: string): string;

    /**
     * Return the directory name of a path. Similar to the Unix dirname command.
     *
     * @param path the path to evaluate.
     */
    dirname(path: string): string;

    /**
     * Return the extension of the path, from the last '.' to end of string in the last portion of the path.
     * If there is no '.' in the last portion of the path or the first character of it is '.',
     * then it returns an empty string.
     *
     * @param path the path to evaluate.
     */
    extname(path: string): string;

    /**
     * Join all arguments together and normalize the resulting path.
     *
     * @param paths paths to join.
     */
    join(...paths: string[]): string;

    /**
     * Normalize a string path, reducing '..' and '.' parts.
     * When multiple slashes are found, they're replaced by a single one;
     * when the path contains a trailing slash, it is preserved. On Windows backslashes are used.
     *
     * @param path string path to normalize.
     */
    normalize(path: string): string;

    /**
     * The right-most parameter is considered {to}. Other parameters are considered an array of {from}.
     * Starting from leftmost {from} paramter, resolves {to} to an absolute path.
     *
     * If {to} isn't already absolute, {from} arguments are prepended in right to left order,
     * until an absolute path is found.
     * If after using all {from} paths still no absolute path is found, the current working directory is used as well.
     * The resulting path is normalized, and trailing slashes are removed unless the path gets resolved to the
     * root directory.
     *
     * @param pathSegments string paths to join.
     */

    resolve(...pathSegments: string[]): string;

    /**
     * Solve the relative path from {from} to {to}.
     * At times we have two absolute paths, and we need to derive the relative path from one to the other.
     * This is actually the reverse transform of resolve().
     */
    relative(from: string, to: string): string;

    /**
     * Determines whether {path} is an absolute path.
     * An absolute path will always resolve to the same location, regardless of the working directory.
     *
     * @param path path to test.
     */
    isAbsolute(path: string): boolean;
}
