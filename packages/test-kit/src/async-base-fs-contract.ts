import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { IBaseFileSystemAsync, FileSystemConstants } from '@file-services/types'
import { ITestInput } from './types'
import { WatchEventsValidator } from './watch-events-validator'

chai.use(chaiAsPromised)

const SAMPLE_CONTENT = 'content'
const DIFFERENT_CONTENT = 'another content'

export function asyncBaseFsContract(testProvider: () => Promise<ITestInput<IBaseFileSystemAsync>>): void {
    describe('ASYNC file system contract', async () => {
        let testInput: ITestInput<IBaseFileSystemAsync>

        beforeEach(async () => testInput = await testProvider())
        afterEach(async () => await testInput.dispose())

        describe('writing files', async () => {
            it('can write a new file into an existing directory', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const filePath = path.join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)

                expect((await fs.stat(filePath)).isFile()).to.equal(true)
                expect(await fs.readFile(filePath)).to.eql(SAMPLE_CONTENT)
            })

            it('can overwrite an existing file', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const filePath = path.join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)
                await fs.writeFile(filePath, DIFFERENT_CONTENT)

                expect((await fs.stat(filePath)).isFile()).to.equal(true)
                expect(await fs.readFile(filePath)).to.eql(DIFFERENT_CONTENT)
            })

            it('fails if writing a file to a non-existing directory', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const filePath = path.join(tempDirectoryPath, 'missing-dir', 'file')

                await expect(fs.writeFile(filePath, SAMPLE_CONTENT)).to.be.rejectedWith('ENOENT')
            })

            it('fails if writing a file to a path already pointing to a directory', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)

                await expect(fs.writeFile(directoryPath, SAMPLE_CONTENT)).to.be.rejectedWith('EISDIR')
            })
        })

        describe('reading files', async () => {
            it('can read the contents of a file', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const firstFilePath = path.join(tempDirectoryPath, 'first-file')
                const secondFilePath = path.join(tempDirectoryPath, 'second-file')

                await fs.writeFile(firstFilePath, SAMPLE_CONTENT)
                await fs.writeFile(secondFilePath, DIFFERENT_CONTENT)

                expect(await fs.readFile(firstFilePath), 'contents of first-file').to.eql(SAMPLE_CONTENT)
                expect(await fs.readFile(secondFilePath), 'contents of second-file').to.eql(DIFFERENT_CONTENT)
            })

            it('fails if reading a non-existing file', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const filePath = path.join(tempDirectoryPath, 'missing-file')

                await expect(fs.readFile(filePath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if reading a directory as a file', async () => {
                const { fs, tempDirectoryPath } = testInput

                await expect(fs.readFile(tempDirectoryPath)).to.be.rejectedWith('EISDIR')
            })

        })

        describe('removing files', async () => {
            it('can remove files', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const filePath = path.join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)
                await fs.unlink(filePath)

                await expect(fs.stat(filePath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if trying to remove a non-existing file', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const filePath = path.join(tempDirectoryPath, 'missing-file')

                await expect(fs.unlink(filePath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if trying to remove a directory as a file', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)

                await expect(fs.unlink(directoryPath)).to.be.rejectedWith() // linux throws `EISDIR`, mac throws `EPERM`
            })
        })

        describe('watching files', function() {
            this.timeout(10000)

            let validator: WatchEventsValidator
            let testFilePath: string

            beforeEach('create temp fixture file and intialize validator', async () => {
                const { fs, tempDirectoryPath, fs: { path, watchService } } = testInput
                validator = new WatchEventsValidator(watchService)

                testFilePath = path.join(tempDirectoryPath, 'test-file')

                await fs.writeFile(testFilePath, SAMPLE_CONTENT)
                await watchService.watchPath(testFilePath)
            })

            it('emits watch event when a watched file changes', async () => {
                const { fs } = testInput

                await fs.writeFile(testFilePath, DIFFERENT_CONTENT)

                await validator.validateEvents([{ path: testFilePath, stats: await fs.stat(testFilePath) }])
                await validator.noMoreEvents()
            })

            it('emits watch event when a watched file is removed', async () => {
                const { fs } = testInput

                await fs.unlink(testFilePath)

                await validator.validateEvents([{ path: testFilePath, stats: null }])
                await validator.noMoreEvents()
            })

            it('keeps watching if file is deleted and recreated immediately', async () => {
                const { fs } = testInput

                await fs.writeFile(testFilePath, SAMPLE_CONTENT)
                await fs.unlink(testFilePath)
                await fs.writeFile(testFilePath, SAMPLE_CONTENT)

                await validator.validateEvents([{ path: testFilePath, stats: await fs.stat(testFilePath) }])

                await fs.writeFile(testFilePath, SAMPLE_CONTENT)

                await validator.validateEvents([{ path: testFilePath, stats: await fs.stat(testFilePath) }])
                await validator.noMoreEvents()
            })
        })

        describe('creating directories', async () => {
            it('can create an empty directory inside an existing one', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'new-dir')

                await fs.mkdir(directoryPath)

                expect((await fs.stat(directoryPath)).isDirectory()).to.equal(true)
                expect((await fs.readdir(directoryPath))).to.eql([])
            })

            it('fails if creating in a path pointing to an existing directory', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)

                await expect(fs.mkdir(directoryPath)).to.be.rejectedWith('EEXIST')
            })

            it('fails if creating in a path pointing to an existing file', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const filePath = path.join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)

                await expect(fs.mkdir(filePath)).to.be.rejectedWith('EEXIST')
            })

            it('fails if creating a directory inside a non-existing directory', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'outer', 'inner')

                await expect(fs.mkdir(directoryPath)).to.be.rejectedWith('ENOENT')
            })
        })

        describe('listing directories', async () => {
            it('can list an existing directory', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)
                await fs.writeFile(path.join(directoryPath, 'file1'), SAMPLE_CONTENT)
                await fs.writeFile(path.join(directoryPath, 'camelCasedName'), SAMPLE_CONTENT)

                expect(await fs.readdir(tempDirectoryPath)).to.eql(['dir'])
                const directoryContents = await fs.readdir(directoryPath)
                expect(directoryContents).to.have.lengthOf(2)
                expect(directoryContents).to.contain('file1')
                expect(directoryContents).to.contain('camelCasedName')
            })

            it('fails if listing a non-existing directory', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'missing-dir')

                await expect(fs.readdir(directoryPath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if listing a path pointing to a file', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const filePath = path.join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)

                await expect(fs.readdir(filePath)).to.be.rejectedWith('ENOTDIR')
            })
        })

        describe('removing directories', async () => {
            it('can remove an existing directory', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)
                await fs.rmdir(directoryPath)

                await expect(fs.stat(directoryPath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if removing a non-empty directory', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const { join } = fs.path
                const directoryPath = path.join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)
                await fs.writeFile(join(directoryPath, 'file'), SAMPLE_CONTENT)

                await expect(fs.rmdir(directoryPath)).to.be.rejectedWith('ENOTEMPTY')
            })

            it('fails if removing a non-existing directory', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const directoryPath = path.join(tempDirectoryPath, 'missing-dir')

                await expect(fs.rmdir(directoryPath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if removing a path pointing to a file', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const filePath = path.join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)

                await expect(fs.rmdir(filePath)).to.be.rejectedWith()
            })
        })

        describe('watching directories', function() {
            this.timeout(10000)

            let validator: WatchEventsValidator
            let testDirectoryPath: string

            beforeEach('create temp fixture directory and intialize validator', async () => {
                const { fs, tempDirectoryPath, fs: { path, watchService } } = testInput
                validator = new WatchEventsValidator(watchService)

                testDirectoryPath = path.join(tempDirectoryPath, 'test-directory')
                await fs.mkdir(testDirectoryPath)
            })

            it('fires a watch event when a file is added inside a watched directory', async () => {
                const { fs, fs: { path, watchService } } = testInput

                await watchService.watchPath(testDirectoryPath)

                const testFilePath = path.join(testDirectoryPath, 'test-file')
                await fs.writeFile(testFilePath, SAMPLE_CONTENT)

                await validator.validateEvents([{ path: testFilePath, stats: await fs.stat(testFilePath) }])
                await validator.noMoreEvents()
            })

            it('fires a watch event when a file is changed inside a watched directory', async () => {
                const { fs, fs: { path, watchService } } = testInput

                const testFilePath = path.join(testDirectoryPath, 'test-file')
                await fs.writeFile(testFilePath, SAMPLE_CONTENT)
                await watchService.watchPath(testDirectoryPath)

                await fs.writeFile(testFilePath, SAMPLE_CONTENT)

                await validator.validateEvents([{ path: testFilePath, stats: await fs.stat(testFilePath) }])
                await validator.noMoreEvents()
            })

            it('fires a watch event when a file is removed inside a watched directory', async () => {
                const { fs, fs: { path, watchService } } = testInput

                const testFilePath = path.join(testDirectoryPath, 'test-file')
                await fs.writeFile(testFilePath, SAMPLE_CONTENT)
                await watchService.watchPath(testDirectoryPath)

                await fs.unlink(testFilePath)

                await validator.validateEvents([{ path: testFilePath, stats: null }])
                await validator.noMoreEvents()
            })
        })

        describe('watching both directories and files', function() {
            this.timeout(10000)

            let validator: WatchEventsValidator
            let testDirectoryPath: string
            let testFilePath: string

            beforeEach('create temp fixture directory and intialize watch service', async () => {
                const { fs, tempDirectoryPath, fs: { path, watchService } } = testInput
                validator = new WatchEventsValidator(watchService)

                testDirectoryPath = path.join(tempDirectoryPath, 'test-directory')
                await fs.mkdir(testDirectoryPath)
                testFilePath = path.join(testDirectoryPath, 'test-file')
                await fs.writeFile(testFilePath, SAMPLE_CONTENT)
            })

            it('allows watching a file and its containing directory', async () => {
                const { fs, fs: { watchService } } = testInput

                await watchService.watchPath(testFilePath)
                await watchService.watchPath(testDirectoryPath)

                await fs.writeFile(testFilePath, SAMPLE_CONTENT)

                await validator.validateEvents([{ path: testFilePath, stats: await fs.stat(testFilePath) }])
                await validator.noMoreEvents()
            })

            it('allows watching in any order', async () => {
                const { fs, fs: { watchService } } = testInput

                await watchService.watchPath(testDirectoryPath)
                await watchService.watchPath(testFilePath)

                await fs.writeFile(testFilePath, SAMPLE_CONTENT)

                await validator.validateEvents([{ path: testFilePath, stats: await fs.stat(testFilePath) }])
                await validator.noMoreEvents()
            })
        })

        describe('renaming directories and files', () => {
            it('moves a file', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const sourcePath = path.join(tempDirectoryPath, 'file')
                const destinationPath = path.join(tempDirectoryPath, 'dir', 'subdir', 'movedFile')

                await fs.writeFile(sourcePath, SAMPLE_CONTENT)
                await fs.mkdir(path.join(tempDirectoryPath, 'dir'))
                await fs.mkdir(path.join(tempDirectoryPath, 'dir', 'subdir'))

                const sourceStats = await fs.stat(sourcePath)

                await fs.rename(sourcePath, destinationPath)

                const destStats = await fs.stat(destinationPath)
                expect(destStats.isFile()).to.equal(true)
                expect(destStats.mtime).not.to.equal(sourceStats.mtime)
                expect(await fs.readFile(destinationPath)).to.eql(SAMPLE_CONTENT)
                await expect(fs.stat(sourcePath)).to.be.rejectedWith('ENOENT')
            })

            it(`throws if source path doesn't exist`, async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const sourcePath = path.join(tempDirectoryPath, 'file')
                const destPath = path.join(tempDirectoryPath, 'file2')

                await expect(fs.rename(sourcePath, destPath)).to.be.rejectedWith('ENOENT')
            })

            it(`throws if the containing directory of the source path doesn't exist`, async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const sourcePath = path.join(tempDirectoryPath, 'unicorn', 'file')
                const destPath = path.join(tempDirectoryPath, 'file2')

                await expect(fs.rename(sourcePath, destPath)).to.be.rejectedWith('ENOENT')
            })

            it(`throws if destination containing path doesn't exist`, async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const sourcePath = path.join(tempDirectoryPath, 'file')
                const destPath = path.join(tempDirectoryPath, 'dir', 'file2')

                await fs.writeFile(sourcePath, SAMPLE_CONTENT)

                await expect(fs.rename(sourcePath, destPath)).to.be.rejectedWith('ENOENT')
            })

            it('updates the parent directory of a renamed entry', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const sourcePath = join(tempDirectoryPath, 'sourceDir')
                const destPath = join(tempDirectoryPath, 'destDir')

                await fs.mkdir(sourcePath)
                await fs.writeFile(join(sourcePath, 'file'), SAMPLE_CONTENT)

                await fs.rename(sourcePath, destPath)

                expect(await fs.readdir(tempDirectoryPath)).to.include('destDir')
            })

            describe('renaming directories', () => {
                it('moves a directory', async () => {
                    const { fs, tempDirectoryPath } = testInput
                    const { join } = fs.path
                    const sourcePath = join(tempDirectoryPath, 'dir')
                    const destinationPath = join(tempDirectoryPath, 'anotherDir', 'subdir', 'movedDir')
                    await fs.mkdir(join(tempDirectoryPath, 'dir'))
                    await fs.mkdir(join(tempDirectoryPath, 'anotherDir'))
                    await fs.mkdir(join(tempDirectoryPath, 'anotherDir', 'subdir'))
                    await fs.writeFile(join(sourcePath, 'file'), SAMPLE_CONTENT)

                    await fs.rename(sourcePath, destinationPath)

                    expect((await fs.stat(destinationPath)).isDirectory()).to.equal(true)
                    expect(await fs.readFile(join(destinationPath, 'file'))).to.eql(SAMPLE_CONTENT)
                    await expect(fs.stat(sourcePath)).to.be.rejectedWith('ENOENT')
                })

                it(`allows copying a directory over a non-existing directory`, async () => {
                    const { fs, tempDirectoryPath } = testInput
                    const { join } = fs.path
                    const sourcePath = join(tempDirectoryPath, 'sourceDir')

                    await fs.mkdir(sourcePath)
                    await fs.writeFile(join(sourcePath, 'file'), SAMPLE_CONTENT)

                    await expect(fs.rename(sourcePath, join(tempDirectoryPath, 'destDir')))
                        .to.not.be.rejectedWith('EEXIST')
                })

                it(`allows copying copying a directory over an empty directory`, async () => {
                    const { fs, tempDirectoryPath } = testInput
                    const { join } = fs.path
                    const sourcePath = join(tempDirectoryPath, 'sourceDir')
                    const destPath = join(tempDirectoryPath, 'destDir')

                    await fs.mkdir(sourcePath)
                    await fs.mkdir(destPath)
                    await fs.writeFile(join(sourcePath, 'file'), SAMPLE_CONTENT)

                    await expect(fs.rename(sourcePath, destPath)).to.not.be.rejectedWith('EEXIST')
                })
            })
        })

        it('correctly exposes whether it is case sensitive', async () => {
            const { fs, tempDirectoryPath, fs: { path } } = testInput
            const filePath = path.join(tempDirectoryPath, 'file')
            const upperCaseFilePath = filePath.toUpperCase()

            await fs.writeFile(filePath, SAMPLE_CONTENT)

            if (fs.caseSensitive) {
                await expect(fs.stat(upperCaseFilePath)).to.be.rejectedWith('ENOENT')
            } else {
                await expect((await fs.stat(upperCaseFilePath)).isFile()).to.equal(true)
            }
        })

        describe('copying files/directories', () => {
            const SOURCE_FILE_NAME = 'file.txt'
            let targetDirectoryPath: string
            let sourceFilePath: string

            beforeEach(async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                targetDirectoryPath = path.join(tempDirectoryPath, 'dir')
                await fs.mkdir(targetDirectoryPath)
                sourceFilePath = path.join(tempDirectoryPath, SOURCE_FILE_NAME)
                await fs.writeFile(sourceFilePath, SAMPLE_CONTENT)
            })

            it('can copy file', async () => {
                const { fs, fs: { path } } = testInput
                const targetPath = path.join(targetDirectoryPath, SOURCE_FILE_NAME)

                await fs.copyFile(sourceFilePath, targetPath)

                expect(await fs.readFile(targetPath)).to.be.eql(SAMPLE_CONTENT)
            })

            it('fails if source does not exist', async () => {
                const { fs, tempDirectoryPath, fs: { path } } = testInput
                const sourcePath = path.join(tempDirectoryPath, 'nonExistingFileName.txt')
                const targetPath = path.join(targetDirectoryPath, SOURCE_FILE_NAME)

                await expect(fs.copyFile(sourcePath, targetPath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if target containing directory does not exist', async () => {
                const { fs, fs: { path } } = testInput
                const targetPath = path.join(targetDirectoryPath, 'nonExistingDirectory', SOURCE_FILE_NAME)

                await expect(fs.copyFile(sourceFilePath, targetPath)).to.be.rejectedWith('ENOENT')
            })

            it('overwrites destination file by default', async () => {
                const { fs, fs: { path } } = testInput
                const targetPath = path.join(targetDirectoryPath, SOURCE_FILE_NAME)

                await fs.writeFile(targetPath, 'content to be overwritten')
                await fs.copyFile(sourceFilePath, targetPath)

                expect(await fs.readFile(targetPath)).to.be.eql(SAMPLE_CONTENT)
            })

            it('fails if destination exists and flag COPYFILE_EXCL passed', async () => {
                const { fs, fs: { path } } = testInput
                const targetPath = path.join(targetDirectoryPath, SOURCE_FILE_NAME)

                await fs.writeFile(targetPath, 'content to be overwritten')

                await expect(fs.copyFile(sourceFilePath, targetPath, FileSystemConstants.COPYFILE_EXCL))
                    .to.be.rejectedWith('EEXIST')
            })
        })
    })
}
