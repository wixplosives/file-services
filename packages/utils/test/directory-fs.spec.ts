import { asyncBaseFsContract, syncBaseFsContract } from '@file-services/test-kit'
import { createMemoryFs } from '@file-services/memory'
import {IBaseFileSystem} from '../../types/src'
import {createDirectoryFs} from '../src'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised)
const basePath = 'basePath'
const SAMPLE_CONTENT = 'content'

describe('Directory File System Implementation', () => {
        let fs: IBaseFileSystem

        beforeEach(async () => {
            const rootContents = {
                [basePath]: {
                    src: {
                        'index.ts': 'content'
                    }
                },
                'illegalFile.ts': 'content'
            }
            fs = createDirectoryFs(createMemoryFs(rootContents), basePath)
        })

        it('Can access a file from a relative path', async () => {
            const filePath = 'src/index.ts'

            expect((await fs.stat(filePath)).isFile()).to.equal(true)
            expect(await fs.readFile(filePath)).to.eql(SAMPLE_CONTENT)
        })

        it('Cannot access a file outside of the base path', async () => {
            const filePath = '../illegalFile.ts'

            expect(fs.readFile(filePath)).to.be.rejectedWith(`path ${filePath} is outside of home directory`)
        })

        it('Cannot access a file outside of the base path (absolute path)', async () => {
            const filePath = '/illegalFile.ts'

            expect(fs.readFile(filePath)).to.be.rejectedWith(`path ${filePath} is outside of home directory`)
        })
    })

describe('Directory file system sanity tests', () => {

    const testProvider = async () => {
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

    asyncBaseFsContract(testProvider)
    syncBaseFsContract(testProvider)
})
