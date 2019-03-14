import { IBaseFileSystemSync, IBaseFileSystemAsync, IFileSystemAsync, IFileSystemSync } from '@file-services/types';

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
    type: 'file' | 'dir';
    name: string;
    birthtime: Date;
    mtime: Date;
}

export interface IFsMemFileNode extends IFsMemNode {
    type: 'file';
    contents: string;
}

export interface IFsMemDirectoryNode extends IFsMemNode {
    type: 'dir';
    contents: Map<string, IFsMemDirectoryNode | IFsMemFileNode>;
}
