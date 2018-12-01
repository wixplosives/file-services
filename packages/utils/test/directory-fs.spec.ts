import { asyncBaseFsContract, syncBaseFsContract } from '@file-services/test-kit'
import { createMemoryFs } from '@file-services/memory'
import { createDirectoryFs } from '../src'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised)
const directoryName = 'test-directory'
const basePath = `/${directoryName}`
const SAMPLE_CONTENT = 'content'

describe('createDirectoryFs', () => {
    const createPreloadedMemFs = () => createMemoryFs({
        [directoryName]: {
            src: {
                'index.ts': SAMPLE_CONTENT
            }
        },
        'outside-scope-file.ts': SAMPLE_CONTENT
    })

    it('can access a file using an absolute path relative to scoped directory', async () => {
        const fs = createDirectoryFs(createPreloadedMemFs(), basePath)
        const filePath = '/src/index.ts'

        expect((await fs.stat(filePath)).isFile()).to.equal(true)
        expect(await fs.readFile(filePath)).to.eql(SAMPLE_CONTENT)
    })

    it('cannot use a relative path to access a file outside of the scoped directory path', async () => {
        const fs = createDirectoryFs(createPreloadedMemFs(), basePath)
        const filePath = '../outside-scope-file.ts'

        await expect(fs.readFile(filePath)).to.be.rejectedWith(`path ${filePath} is outside of scoped directory`)
    })

    it('cannot access a file outside of scoped directory using original absolute path', async () => {
        const fs = createDirectoryFs(createPreloadedMemFs(), basePath)
        const filePath = '/outside-scope-file.ts'

        await expect(fs.readFile(filePath)).to.be.rejectedWith(`ENOENT`)
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
            tempDirectoryPath: '/'
        }
    }

    asyncBaseFsContract(testProvider)
    syncBaseFsContract(testProvider)
})
