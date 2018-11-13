import {directoryFsContract} from './directory-fs-contract'
import { createMemoryFs } from '@file-services/memory'

describe('Directory File System Implementation', () => {
    const memTestProvider = async () => {
        const fs = createMemoryFs()

        return {
            fs,
            dispose: async () => undefined,
            baseDirectoryPath: '/somePath/'
        }
    }

    directoryFsContract(memTestProvider)
})
