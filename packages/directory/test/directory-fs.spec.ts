import {directoryFsContract} from './directory-fs-contract'
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
            }
        }
        const fs = createDirectoryFs(createMemoryFs(rootContents), basePath)

        return {
            fs,
            dispose: async () => undefined,
            baseDirectoryPath: basePath
        }
    }

    directoryFsContract(memTestProvider)
})
