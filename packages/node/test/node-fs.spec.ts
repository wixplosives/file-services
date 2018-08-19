import { syncFsContract } from '@file-services/test-kit'
import { createTempDirectory } from 'create-temp-directory'
import { createBaseNodeFs } from '../src'

describe('Node File System Implementation', () => {
    const fs = createBaseNodeFs()

    syncFsContract(async () => {
        const tempDirectory = await createTempDirectory('fs-test-')

        return {
            fs,
            dispose: tempDirectory.remove,
            tempDirectoryPath: tempDirectory.path
        }
    })
})
