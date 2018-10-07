export enum FsErrorCodes {
    NO_FILE = 'ENOENT: No such file',
    NO_DIRECTORY = 'ENOENT: No such directory',
    NO_FILE_OR_DIRECTORY = 'ENOENT: No such file or directory',

    PATH_IS_FILE = 'ENOTDIR: Path points to a file',
    PATH_IS_DIRECTORY = 'EISDIR: Path points to a directory',

    CONTAINING_NOT_EXISTS = 'ENOENT: Containing directory does not exist',
    DIRECTORY_NOT_EMPTY = 'ENOTEMPTY: Directory is not empty',

    PATH_ALREADY_EXISTS = 'EEXIST: Path already exists'
}
