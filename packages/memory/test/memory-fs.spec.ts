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

    describe('copying files/directories timestamps', () => {
        const SOURCE_FILE_NAME = 'file.txt'
        const TEST_DIRECTORY_NAME = 'dir'
        const tempDirectoryPath = '/'
        let fs: IFileSystem
        let sourceFilePath: string
        let destFilePath: string
        let testDirectoryPath: string

        beforeEach(async () => {
            fs = createMemoryFs({
                [SOURCE_FILE_NAME]: 'testContent',
                [TEST_DIRECTORY_NAME]: {}
            })

            sourceFilePath = fs.path.join(tempDirectoryPath, SOURCE_FILE_NAME)
            testDirectoryPath = fs.path.join(tempDirectoryPath, TEST_DIRECTORY_NAME)
            destFilePath = fs.path.join(testDirectoryPath, SOURCE_FILE_NAME)
        })

        describe('sync', () => {
            it('fails if source is a directory', () => {
                expect(() => fs.copyFileSync(testDirectoryPath, destFilePath)).to.throw('EISDIR')
            })

            it('fails if target is a directory', () => {
                expect(() => fs.copyFileSync(sourceFilePath, testDirectoryPath)).to.throw('EISDIR')
            })

            it('should preserve birthtime and update mtime', async () => {
                const originalStat = fs.statSync(sourceFilePath)

                // postpone copying for 1s to make sure timestamps can be different
                await sleep(1000)

                fs.copyFileSync(sourceFilePath, destFilePath)
                const copiedStat = fs.statSync(destFilePath)

                expect(originalStat.birthtime).to.be.eql(copiedStat.birthtime)
                expect(originalStat.mtime).to.not.be.eql(copiedStat.mtime)
            })
        })

        describe('async', () => {
            it('fails if source is a directory', async () => {
                await expect(fs.copyFile(testDirectoryPath, destFilePath)).to.be.rejectedWith('EISDIR')
            })

            it('fails if target is a directory', async () => {
                await expect(fs.copyFile(sourceFilePath, testDirectoryPath)).to.be.rejectedWith('EISDIR')
            })

            it('should preserve birthtime and update mtime', async () => {
                const originalStat = await fs.stat(sourceFilePath)

                // postpone copying for 1s to make sure timestamps can be different
                await sleep(1000)

                await fs.copyFile(sourceFilePath, destFilePath)
                const copiedStat = await fs.stat(destFilePath)

                expect(originalStat.birthtime).to.be.eql(copiedStat.birthtime)
                expect(originalStat.mtime).to.not.be.eql(copiedStat.mtime)
            })
        })
    })
})
