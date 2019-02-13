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

        describe('remove', () => {
            it('should delete directory recursively', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.populateDirectory(directoryPath, {
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

                await fs.remove(directoryPath)

                expect(await fs.directoryExists(directoryPath)).to.equal(false)
            })

            it('should delete a file', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, '')

                await fs.remove(filePath)

                expect(await fs.fileExists(tempDirectoryPath)).to.equal(false)
            })

            it('should fail on nonexistant', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = await join(tempDirectoryPath, 'file')

                return expect(fs.remove(filePath)).to.eventually.rejectedWith(/ENOENT/)
            })
        })

        const fileName = 'superman.json'
        const anotherFileName = 'spiderman.json'

        describe('findFiles', () => {
            it('finds all files recursively inside a directory', async () => {
                const { fs, fs: { path }, tempDirectoryPath } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'dir')

                await fs.populateDirectory(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: '',
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                })

                expect(await fs.findFiles(directoryPath)).to.eql([
                    path.join(directoryPath, fileName),
                    path.join(directoryPath, 'folder1', fileName),
                    path.join(directoryPath, 'folder2', anotherFileName)
                ])

                expect(await fs.findFiles(path.join(directoryPath, 'folder1'))).to.eql([
                    path.join(directoryPath, 'folder1', fileName),
                ])
            })

            it('allows specifying a file filtering callback', async () => {
                const { fs, fs: { path }, tempDirectoryPath } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'dir')

                await fs.populateDirectory(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: '',
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                })

                expect(await fs.findFiles(directoryPath, { filterFile: ({ name }) => name === fileName })).to.eql([
                    path.join(directoryPath, fileName),
                    path.join(directoryPath, 'folder1', fileName),
                ])

                expect(
                    await fs.findFiles(directoryPath, { filterFile: ({ name }) => name === anotherFileName })
                ).to.eql([
                    path.join(directoryPath, 'folder2', anotherFileName),
                ])
            })

            it('allows specifying a directory filtering callback', async () => {
                const { fs, fs: { path }, tempDirectoryPath } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'dir')

                await fs.populateDirectory(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: '',
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                })

                expect(
                    await fs.findFiles(directoryPath, { filterDirectory: ({ name }) => name === 'folder1' })
                ).to.eql([
                    path.join(directoryPath, fileName),
                    path.join(directoryPath, 'folder1', fileName),
                ])

                expect(
                    await fs.findFiles(directoryPath, { filterDirectory: ({ name }) => name === 'folder2' })
                ).to.eql([
                    path.join(directoryPath, fileName),
                    path.join(directoryPath, 'folder2', anotherFileName),
                ])
            })
        })

        describe('findClosestFile', () => {
            it('finds closest file in parent directory chain', async () => {
                const { fs, fs: { path }, tempDirectoryPath } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'dir')

                await fs.populateDirectory(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: '',
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                })

                expect(await fs.findClosestFile(path.join(directoryPath, 'folder1'), fileName)).to.equal(
                    path.join(directoryPath, 'folder1', fileName)
                )

                expect(await fs.findClosestFile(directoryPath, fileName)).to.equal(
                    path.join(directoryPath, fileName)
                )

                expect(await fs.findClosestFile(path.join(directoryPath, 'folder2'), anotherFileName)).to.equal(
                    path.join(directoryPath, 'folder2', anotherFileName),
                )

                expect(await fs.findClosestFile(directoryPath, anotherFileName)).to.equal(null)
            })
        })

        describe('findFilesInAncestors', () => {
            it('finds files in parent directory chain', async () => {
                const { fs, fs: { path }, tempDirectoryPath } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'dir')

                await fs.populateDirectory(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: '',
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                })

                expect(await fs.findFilesInAncestors(path.join(directoryPath, 'folder1'), fileName)).to.eql([
                    path.join(directoryPath, 'folder1', fileName),
                    path.join(directoryPath, fileName)
                ])

                expect(await fs.findFilesInAncestors(path.join(directoryPath, 'folder2'), anotherFileName)).to.eql([
                    path.join(directoryPath, 'folder2', anotherFileName)
                ])
            })
        })

    })
}
