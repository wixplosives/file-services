import {IBaseFileSystem} from '../../types/src'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { ITestInput } from './types'

chai.use(chaiAsPromised)

const SAMPLE_CONTENT = 'content'

export function directoryFsContract(testProvider: () => Promise<ITestInput<IBaseFileSystem>>): void {
    describe('Directory file system contract', async () => {
        let testInput: ITestInput<IBaseFileSystem>

        beforeEach(async () => testInput = await testProvider())
        afterEach(async () => await testInput.dispose())

        it('Can access a file from a relative path', async () => {
            const { fs } = testInput
            const filePath = 'src/index.ts'

            expect((await fs.stat(filePath)).isFile()).to.equal(true)
            expect(await fs.readFile(filePath)).to.eql(SAMPLE_CONTENT)
        })

        it('Cannot access a file outside of the base path', async () => {
            const { fs } = testInput
            const filePath = '../illegalFile.ts'

            expect((await fs.stat(filePath)).isFile()).to.equal(false)
            expect(fs.readFile(filePath)).to.be.rejectedWith('ENOENT')
            // expect(await fs.readFile(filePath)).to.eql(SAMPLE_CONTENT)
        })
    })
}
