import { expect } from 'chai'
import { IFileSystemAsync } from '@file-services/types'
import { ITestInput } from './types'

const SAMPLE_CONTENT = 'content'

export function asyncFsContract(testProvider: () => Promise<ITestInput<IFileSystemAsync>>): void {
    describe('ASYNC file system contract', () => {
        let testInput: ITestInput<IFileSystemAsync>

        beforeEach(async () => testInput = await testProvider())
        afterEach(async () => await testInput.dispose())

        describe('fileExists', () => {
            it('returns true if path points to a file', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)

                expect(await fs.fileExists(filePath)).to.equal(true)
            })

            it('returns false is path does not exist', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'non-existing-file')

                expect(await fs.fileExists(filePath)).to.equal(false)
            })

            it('returns false is path points to a directory', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)

                expect(await fs.fileExists(directoryPath)).to.equal(false)
            })
        })

        describe('directoryExists', () => {
            it('returns true if path points to a directory', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)

                expect(await fs.directoryExists(directoryPath)).to.equal(true)
            })

            it('returns false is path does not exist', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'non-existing-directory')

                expect(await fs.directoryExists(filePath)).to.equal(false)
            })

            it('returns false is path points to a file', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)

                expect(await fs.directoryExists(filePath)).to.equal(false)
            })
        })

        describe('rmrf', () => {
            it('should delete directory recursively', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)
                await fs.mkdir(join(directoryPath, '/dir1'))
                await fs.mkdir(join(directoryPath, '/dir2'))
                await fs.writeFile(join(directoryPath, '/file1'), '')
                await fs.writeFile(join(directoryPath, '/file2'), '')
                await fs.writeFile(join(directoryPath, '/dir1/file1'), '')
                await fs.writeFile(join(directoryPath, '/dir1/file2'), '')
                await fs.writeFile(join(directoryPath, '/dir1/file3'), '')
                await fs.writeFile(join(directoryPath, '/dir2/file1'), '')

                expect(await fs.readdir(directoryPath)).to.deep.equal(['dir1', 'dir2', 'file1', 'file2'])

                await fs.remove(directoryPath)

                expect(await fs.readdir(tempDirectoryPath)).to.deep.equal([])
            })
        })

        it('should delete a file', async () => {
            const { fs, tempDirectoryPath } = testInput
            const { join } = fs.path
            const filePath = join(tempDirectoryPath, 'file')

            await fs.writeFile(filePath, '')

            expect(await fs.readdir(tempDirectoryPath)).to.deep.equal(['file'])

            await fs.remove(filePath)

            expect(await fs.readdir(tempDirectoryPath)).to.deep.equal([])
        })

        it('should fail on nonexistant', async () => {
            const { fs, tempDirectoryPath } = testInput
            const { join } = fs.path
            const filePath = await join(tempDirectoryPath, 'file')

            await fs.remove(filePath).catch(err => {
                expect(err).to.match(/ENOENT/)
            })
        })
    })
}
