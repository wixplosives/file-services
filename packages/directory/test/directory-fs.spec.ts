import {directoryFsContract} from './directory-fs-contract'
import { asyncBaseFsContract, syncBaseFsContract } from '@file-services/test-kit'
import { createMemoryFs } from '@file-services/memory'
import {createDirectoryFs} from '../src'

describe('Directory File System Implementation', () => {
    const directoryTestProvider = async () => {
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

    const baseTestProvider = async () => {
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

    directoryFsContract(directoryTestProvider)
    asyncBaseFsContract(baseTestProvider)
    syncBaseFsContract(baseTestProvider)
})
