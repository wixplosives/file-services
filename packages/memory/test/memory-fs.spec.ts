import { syncBaseFsContract, asyncBaseFsContract, syncFsContract, asyncFsContract,
    ITestInput } from '@file-services/test-kit'
import { sleep } from 'promise-assist'
import { expect } from 'chai'
import { createMemoryFs } from '../src'
import { IBaseFileSystemAsync, IBaseFileSystemSync } from '@file-services/types'

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
        const DEST_FILE_NAME = 'file.txt'
        let sourceFilePath: string

        it('sync: should preserve birthtime and change mtime', async () => {
            const testInput: ITestInput<IBaseFileSystemSync> = await testProvider()
            const { fs, tempDirectoryPath } = testInput
            sourceFilePath = fs.path.join(tempDirectoryPath, SOURCE_FILE_NAME)
            fs.writeFileSync(sourceFilePath, 'test')
            const targetPath = fs.path.join(tempDirectoryPath, DEST_FILE_NAME)
            const originalBirthtime = fs.statSync(sourceFilePath).birthtime
            const originalMtime = fs.statSync(sourceFilePath).mtime

            // postpone copying for 1s to make sure timestamps can be different
            await sleep(1000)

            fs.copyFileSync(sourceFilePath, targetPath)
            const copiedBirthtime = fs.statSync(targetPath).birthtime
            const copiedMtime = (await fs.statSync(targetPath)).mtime

            expect(originalBirthtime).to.be.eql(copiedBirthtime)
            expect(originalMtime).to.not.be.eql(copiedMtime)
        })

        it('async: should preserve birthtime and change mtime', async () => {
            const testInput: ITestInput<IBaseFileSystemAsync> = await testProvider()
            const { fs, tempDirectoryPath } = testInput
            sourceFilePath = fs.path.join(tempDirectoryPath, SOURCE_FILE_NAME)
            await fs.writeFile(sourceFilePath, 'test')

            const targetPath = fs.path.join(tempDirectoryPath, DEST_FILE_NAME)
            const originalBirthtime = (await fs.stat(sourceFilePath)).birthtime
            const originalMtime = (await fs.stat(sourceFilePath)).mtime

            // postpone copying for 1s to make sure timestamps can be different
            await sleep(1000)

            await fs.copyFile(sourceFilePath, targetPath)
            const copiedBirthtime = (await fs.stat(targetPath)).birthtime
            const copiedMtime = (await fs.stat(targetPath)).mtime

            expect(originalBirthtime).to.be.eql(copiedBirthtime)
            expect(originalMtime).to.not.be.eql(copiedMtime)
        })
    })
})
