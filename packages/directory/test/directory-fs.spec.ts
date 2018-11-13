import {directoryFsContract} from './directory-fs-contract'
import { createMemoryFs } from '@file-services/memory'

describe('Directory File System Implementation', () => {
    const memTestProvider = async () => {
        const rootContents = {
            somePath: {
                src: {
                    'index.ts': 'content'
                }
            }
        }
        const fs = createMemoryFs(rootContents)

        return {
            fs,
            dispose: async () => undefined,
            baseDirectoryPath: '/somePath/'
        }
    }

    directoryFsContract(memTestProvider)
})
