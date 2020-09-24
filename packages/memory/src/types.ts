import type {
  IBaseFileSystemSync,
  IBaseFileSystemAsync,
  IFileSystemAsync,
  IFileSystemSync,
  IFileSystemStats,
} from '@file-services/types';

export interface IMemFileSystem extends IFileSystemSync, IFileSystemAsync {
  root: IFsMemDirectoryNode;
}

export interface IBaseMemFileSystem extends IBaseFileSystemSync, IBaseFileSystemAsync {
  root: IFsMemDirectoryNode;
}

export interface IBaseMemFileSystemSync extends IBaseFileSystemSync {
  root: IFsMemDirectoryNode;
}

export interface IFsMemNode {
  type: 'file' | 'dir' | 'symlink';
  name: string;
  stats: IFileSystemStats;
}

export type IFsMemNodeType = IFsMemFileNode | IFsMemDirectoryNode | IFsMemSymlinkNode;

export interface IFsMemFileNode extends IFsMemNode {
  type: 'file';
  contents: string;
}

export interface IFsMemDirectoryNode extends IFsMemNode {
  type: 'dir';
  contents: Map<string, IFsMemNodeType>;
}

export interface IFsMemSymlinkNode extends IFsMemNode {
  type: 'symlink';
  target: string;
}
