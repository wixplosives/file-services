import { expect } from 'chai'
import { IFileSystemSync } from '@file-services/types'
import { ITestInput } from './types'

const SAMPLE_CONTENT = 'content'

export function syncFsContract(testProvider: () => Promise<ITestInput<IFileSystemSync>>): void {
    describe('SYNC file system contract', () => {
        let testInput: ITestInput<IFileSystemSync>

        beforeEach(async () => testInput = await testProvider())
        afterEach(async () => await testInput.dispose())

        describe('fileExistsSync', () => {
            it('returns true if path points to a file', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, SAMPLE_CONTENT)

                expect(fs.fileExistsSync(filePath)).to.equal(true)
            })

            it('returns false is path does not exist', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'non-existing-file')

                expect(fs.fileExistsSync(filePath)).to.equal(false)
            })

            it('returns false is path points to a directory', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)

                expect(fs.fileExistsSync(directoryPath)).to.equal(false)
            })
        })

        describe('directoryExistsSync', () => {
            it('returns true if path points to a directory', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)

                expect(fs.directoryExistsSync(directoryPath)).to.equal(true)
            })

            it('returns false is path does not exist', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'non-existing-directory')

                expect(fs.directoryExistsSync(filePath)).to.equal(false)
            })

            it('returns false is path points to a file', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, SAMPLE_CONTENT)

                expect(fs.directoryExistsSync(filePath)).to.equal(false)
            })
        })

        describe('rmrf', () => {
            it('should delete directory recursively', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)
                fs.mkdirSync(join(directoryPath, '/dir1'))
                fs.mkdirSync(join(directoryPath, '/dir2'))
                fs.writeFileSync(join(directoryPath, '/file1'), '')
                fs.writeFileSync(join(directoryPath, '/file2'), '')
                fs.writeFileSync(join(directoryPath, '/dir1/file1'), '')
                fs.writeFileSync(join(directoryPath, '/dir1/file2'), '')
                fs.writeFileSync(join(directoryPath, '/dir1/file3'), '')
                fs.writeFileSync(join(directoryPath, '/dir2/file1'), '')

                expect(fs.readdirSync(directoryPath)).to.deep.equal(['dir1', 'dir2', 'file1', 'file2'])

                fs.removeSync(directoryPath)

                expect(fs.readdirSync(tempDirectoryPath)).to.deep.equal([])
            })

            it('should delete a file', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, '')

                expect(fs.readdirSync(tempDirectoryPath)).to.deep.equal(['file'])

                fs.removeSync(filePath)

                expect(fs.readdirSync(tempDirectoryPath)).to.deep.equal([])
            })

            it('should fail on nonexistant', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                function thrower() {
                    fs.removeSync(filePath)
                }
                expect(thrower).to.throw(/ENOENT/)
            })
        })
    })
}
