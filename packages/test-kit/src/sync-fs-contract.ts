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

        describe('remove', () => {
            it('should delete directory recursively', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.populateDirectorySync(directoryPath, {
                    'file1.ts': '',
                    'file2.ts': '',
                    'folder1': {
                        'file1.ts': '',
                        'file2.ts': '',
                        'file3.ts': ''
                    },
                    'folder2': {
                        'file1.ts': '',
                        'file2.ts': '',
                        'file3.ts': ''
                    }
                })

                fs.removeSync(directoryPath)

                expect(fs.directoryExistsSync(directoryPath)).to.equal(false)
            })

            it('should delete a file', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, '')

                expect(fs.readdirSync(tempDirectoryPath)).to.deep.equal(['file'])

                fs.removeSync(filePath)

                expect(fs.fileExistsSync(tempDirectoryPath)).to.equal(false)
            })

            it('should fail on nonexistant', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                const thrower = () => fs.removeSync(filePath)
                expect(thrower).to.throw(/ENOENT/)
            })
        })
    })
}
