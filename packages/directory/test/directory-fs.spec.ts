import {directoryFsContract} from './directory-fs-contract'
import { asyncBaseFsContract, syncBaseFsContract } from '@file-services/test-kit'
import { createMemoryFs } from '@file-services/memory'
import {createDirectoryFs} from '../src'

describe('Directory File System Implementation', () => {
    const memTestProvider = async () => {
        const basePath = 'basePath'
        const rootContents = {
            [basePath]: {
                src: {
                    'index.ts': 'content'
                }
            },
            'illegalFile.ts': 'content'
        }
        const fs = createDirectoryFs(createMemoryFs(rootContents), basePath)

        return {
            fs,
            dispose: async () => undefined,
            baseDirectoryPath: basePath
        }
    }

    const asyncTestProvider = async () => {
        const basePath = 'basePath'
        const rootContents = {
            [basePath]: {}
        }
        const fs = createDirectoryFs(createMemoryFs(rootContents), basePath)
        return {
            fs,
            dispose: async () => undefined,
            tempDirectoryPath: ''
        }
    }

    directoryFsContract(memTestProvider)
    asyncBaseFsContract(asyncTestProvider)
    syncBaseFsContract(asyncTestProvider)
})
