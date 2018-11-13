// // import { FsErrorCodes } from './error-codes'
import {createMemoryFs} from '@file-services/memory'
import {IBaseFileSystem} from '@file-services/types'

export function createDirectoryFs(): IBaseFileSystem {
    return createMemoryFs()
}
