import { syncFsContract, asyncFsContract } from '@file-services/test-kit'
import { createTempDirectory } from 'create-temp-directory'
import { createBaseNodeFs } from '../src'

describe('Node File System Implementation', () => {
    const fs = createBaseNodeFs()
    const {watchService} = fs

    const testProvider = async () => {
        const tempDirectory = await createTempDirectory('fs-test-')

        return {
            fs,
            dispose: async () => {
                await watchService.unwatchAll()
                watchService.removeAllListeners()
                await tempDirectory.remove()
            },
            tempDirectoryPath: tempDirectory.path
        }
    }

    syncFsContract(testProvider)
    asyncFsContract(testProvider)
})
