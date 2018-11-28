import { asyncBaseFsContract, syncBaseFsContract } from '@file-services/test-kit'
import { createMemoryFs } from '@file-services/memory'
import { IBaseFileSystem } from '@file-services/types'
import { createDirectoryFs } from '../src'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised)
const directoryName = 'test-directory'
const basePath = `/${directoryName}`
const SAMPLE_CONTENT = 'content'

describe('File system directory scoping utility', () => {
    let fs: IBaseFileSystem
    beforeEach(async () => {
        fs = createDirectoryFs(
            createMemoryFs({
                [directoryName]: {
                    src: {
                        'index.ts': SAMPLE_CONTENT
                    }
                },
                'outside-scope-file.ts': SAMPLE_CONTENT
            }),
            basePath
        )
    })

    it('can access a file using a relative path', async () => {
        const filePath = '/src/index.ts'

        expect((await fs.stat(filePath)).isFile()).to.equal(true)
        expect(await fs.readFile(filePath)).to.eql(SAMPLE_CONTENT)
    })

    it('cannot use a relative path to access a file outside of the scoped directory path', async () => {
        const filePath = '../outside-scope-file.ts'

        expect(fs.readFile(filePath)).to.be.rejectedWith(`path ${filePath} is outside of home directory`)
    })

    it('cannot access a file outside of the scoped directory path', async () => {
        const filePath = '/outside-scope-file.ts'

        expect(fs.readFile(filePath)).to.be.rejectedWith(`path ${filePath} is outside of home directory`)
    })

    const testProvider = async () => {
        const testFs = createDirectoryFs(
            createMemoryFs({
                [directoryName]: {}
            }),
            basePath
        )
        return {
            fs: testFs,
            dispose: async () => undefined,
            tempDirectoryPath: ''
        }
    }

    asyncBaseFsContract(testProvider)
    syncBaseFsContract(testProvider)
})
