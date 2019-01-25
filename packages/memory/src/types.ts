import { IBaseFileSystemSync } from '@file-services/types'

export interface IBaseMemFileSystemSync extends IBaseFileSystemSync {
    root: IFsMemDirectoryNode
}

export interface IFsMemNode {
    type: 'file' | 'dir'
    name: string
    birthtime: Date
    mtime: Date
}

export interface IFsMemFileNode extends IFsMemNode {
    type: 'file'
    contents?: string
    rawContents: Buffer
}

export interface IFsMemDirectoryNode extends IFsMemNode {
    type: 'dir'
    contents: Map<string, IFsMemDirectoryNode | IFsMemFileNode>
}
