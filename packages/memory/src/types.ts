import type {
  IBaseFileSystemSync,
  IBaseFileSystemAsync,
  IFileSystemAsync,
  IFileSystemSync,
  IFileSystemStats,
  IDirectoryEntry,
  BufferEncoding,
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

export interface IFsMemStatsEntry extends IFileSystemStats, IDirectoryEntry {}

export interface IFsMemNode {
  type: 'file' | 'dir' | 'symlink';
  entry: IFsMemStatsEntry;
}

export type IFsMemNodeType = IFsMemFileNode | IFsMemDirectoryNode | IFsMemSymlinkNode;

export type IEncodingKeys = Exclude<BufferEncoding, 'utf-8' | 'ucs-2'>;

export type IEncodingMap = Map<IEncodingKeys, Uint8Array | string>;

export interface IFsMemFileNode extends IFsMemNode {
  type: 'file';
  contents: IEncodingMap;
}

export interface IFsMemDirectoryNode extends IFsMemNode {
  type: 'dir';
  contents: Map<string, IFsMemNodeType>;
}

export interface IFsMemSymlinkNode extends IFsMemNode {
  type: 'symlink';
  target: string;
}
