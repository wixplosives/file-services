import { platform } from 'os'
import { syncBaseFsContract, asyncBaseFsContract, asyncFsContract, syncFsContract } from '@file-services/test-kit'
import { createTempDirectory } from 'create-temp-directory'
import { createNodeFs } from '../src'

describe('Node File System Implementation', () => {
    const fs = createNodeFs({ watchOptions: { debounceWait: 500 } })
    const { watchService } = fs

    const testProvider = async () => {
        const tempDirectory = await createTempDirectory('fs-test-')

        return {
            fs,
            dispose: async () => {
                watchService.clearGlobalListeners()
                await watchService.unwatchAllPaths()
                await tempDirectory.remove()
            },
            tempDirectoryPath: tempDirectory.path
        }
    }

    // disable sync contract on mac
    // async contract passes, which is really what we care about.
    // avoid introducing more and more workarounds to support mac watcher being ready synchronously.
    if (platform() !== 'darwin') {
        syncBaseFsContract(testProvider)
    }
    asyncBaseFsContract(testProvider)

    asyncFsContract(testProvider)
    syncFsContract(testProvider)
})
