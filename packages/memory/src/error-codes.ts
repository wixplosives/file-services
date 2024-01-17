export enum FsErrorCodes {
  NO_FILE = "ENOENT: no such file",
  NO_DIRECTORY = "ENOENT: no such directory",
  NO_FILE_OR_DIRECTORY = "ENOENT: no such file or directory",

  PATH_IS_FILE = "ENOTDIR: path points to a file",
  PATH_IS_DIRECTORY = "EISDIR: path points to a directory",
  PATH_IS_INVALID = "EINVAL: invalid argument",

  CONTAINING_NOT_EXISTS = "ENOENT: containing directory does not exist",
  DIRECTORY_NOT_EMPTY = "ENOTEMPTY: directory is not empty",

  PATH_ALREADY_EXISTS = "EEXIST: path already exists",
}
