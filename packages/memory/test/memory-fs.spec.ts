import { syncBaseFsContract, asyncBaseFsContract, syncFsContract, asyncFsContract } from '@file-services/test-kit'
import { createMemoryFs } from '../src'
import { expect } from 'chai'
import { sleep } from 'promise-assist'
import { IFileSystem } from '@file-services/types'

describe('In-memory File System Implementation', () => {
    const testProvider = async () => {
        const fs = createMemoryFs()

        return {
            fs,
            dispose: async () => undefined,
            tempDirectoryPath: '/'
        }
    }

    syncBaseFsContract(testProvider)
    asyncBaseFsContract(testProvider)
    syncFsContract(testProvider)
    asyncFsContract(testProvider)

    describe('path.resolve', () => {
        it('resolves non-absolute paths relative to root /', () => {
            const fs = createMemoryFs()

            expect(fs.path.resolve('test')).to.equal('/test')
            expect(fs.path.resolve('some/deep/path')).to.equal('/some/deep/path')
        })
    })

    // these behaviors cannot be tested consistently across OSs,
    // so we test them for the memory implementation separately
    describe('copying files/directories', () => {
        const sourceFilePath = '/file.txt'
        const emptyDirectoryPath = '/empty_dir'

        let fs: IFileSystem

        beforeEach(async () => fs = createMemoryFs({
            [sourceFilePath]: 'test content',
            [emptyDirectoryPath]: {}
        }))

        it('preserves birthtime and updates mtime', async () => {
            const sourceFileStats = fs.statSync(sourceFilePath)
            const destFilePath = fs.path.join(emptyDirectoryPath, 'dest')
            // postpone copying for 1s to make sure timestamps can be different
            await sleep(100)

            fs.copyFileSync(sourceFilePath, destFilePath)

            const destFileStats = fs.statSync(destFilePath)

            expect(sourceFileStats.birthtime).to.eql(destFileStats.birthtime)
            expect(sourceFileStats.mtime).to.not.be.eql(destFileStats.mtime)
        })

        it('fails if source is a directory', () => {
            expect(() => fs.copyFileSync(emptyDirectoryPath, '/some_other_folder')).to.throw('EISDIR')
        })

        it('fails if target is a directory', () => {
            expect(() => fs.copyFileSync(sourceFilePath, emptyDirectoryPath)).to.throw('EISDIR')
        })
    })
})
