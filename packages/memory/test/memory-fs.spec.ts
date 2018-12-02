import { syncBaseFsContract, asyncBaseFsContract, syncFsContract, asyncFsContract } from '@file-services/test-kit'
import { createMemoryFs } from '../src'

describe('In-memory File System Implementation', () => {
    const testProvider = async () => {
        const fs = createMemoryFs()

        return {
            fs,
            dispose: async () => undefined,
            tempDirectoryPath: '/'
        }
    }

    syncBaseFsContract(testProvider)
    asyncBaseFsContract(testProvider)
    syncFsContract(testProvider)
    asyncFsContract(testProvider)
})
