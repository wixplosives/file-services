import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { IBaseFileSystemAsync } from '@file-services/types'
import { ITestInput } from './types'
import { WatchEventsValidator } from './events-validator'

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
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)

                expect((await fs.stat(filePath)).isFile()).to.equal(true)
                expect(await fs.readFile(filePath)).to.eql(SAMPLE_CONTENT)
            })

            it('can overwrite an existing file', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)
                await fs.writeFile(filePath, DIFFERENT_CONTENT)

                expect((await fs.stat(filePath)).isFile()).to.equal(true)
                expect(await fs.readFile(filePath)).to.eql(DIFFERENT_CONTENT)
            })

            it('fails if writing a file to a non-existing directory', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'missing-dir', 'file')

                expect(fs.writeFile(filePath, SAMPLE_CONTENT)).to.be.rejectedWith('ENOENT')
            })

            it('fails if writing a file to a path already pointing to a directory', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)

                expect(fs.writeFile(directoryPath, SAMPLE_CONTENT)).to.be.rejectedWith('EISDIR')
            })
        })

        describe('reading files', async () => {
            it('can read the contents of a file', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const firstFilePath = join(tempDirectoryPath, 'first-file')
                const secondFilePath = join(tempDirectoryPath, 'second-file')

                await fs.writeFile(firstFilePath, SAMPLE_CONTENT)
                await fs.writeFile(secondFilePath, DIFFERENT_CONTENT)

                expect(await fs.readFile(firstFilePath), 'contents of first-file').to.eql(SAMPLE_CONTENT)
                expect(await fs.readFile(secondFilePath), 'contents of second-file').to.eql(DIFFERENT_CONTENT)
            })

            it('fails if reading a non-existing file', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'missing-file')

                expect(fs.readFile(filePath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if reading a directory as a file', async () => {
                const { fs, tempDirectoryPath } = testInput

                expect(fs.readFile(tempDirectoryPath)).to.be.rejectedWith('EISDIR')
            })

        })

        describe('removing files', async () => {
            it('can remove files', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)
                await fs.unlink(filePath)

                expect(fs.stat(filePath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if trying to remove a non-existing file', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'missing-file')

                expect(fs.unlink(filePath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if trying to remove a directory as a file', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)

                expect(fs.unlink(directoryPath)).to.be.rejectedWith() // linux throws `EISDIR`, mac throws `EPERM`
            })
        })

        describe('watching files', function() {
            this.timeout(10000)

            let validate: WatchEventsValidator
            let testFilePath: string

            beforeEach('create temp fixture file and intialize validator', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { watchService, path } = fs
                validate = new WatchEventsValidator(watchService)

                testFilePath = path.join(tempDirectoryPath, 'test-file')

                await fs.writeFile(testFilePath, SAMPLE_CONTENT)
                await watchService.watchPath(testFilePath)
            })

            it('emits watch event when a watched file changes', async () => {
                const { fs } = testInput

                await fs.writeFile(testFilePath, DIFFERENT_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: await fs.stat(testFilePath) })
                await validate.noMoreEvents()
            })

            it('emits watch event when a watched file is removed', async () => {
                const { fs } = testInput

                await fs.unlink(testFilePath)

                await validate.nextEvent({ path: testFilePath, stats: null })
                await validate.noMoreEvents()
            })

            it('keeps watching if file is deleted and recreated immediately', async () => {
                const { fs } = testInput

                await fs.writeFile(testFilePath, SAMPLE_CONTENT)
                await fs.unlink(testFilePath)
                await fs.writeFile(testFilePath, SAMPLE_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: await fs.stat(testFilePath) })

                await fs.writeFile(testFilePath, SAMPLE_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: await fs.stat(testFilePath) })
                await validate.noMoreEvents()
            })
        })

        describe('creating directories', async () => {
            it('can create an empty directory inside an existing one', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'new-dir')

                await fs.mkdir(directoryPath)

                expect((await fs.stat(directoryPath)).isDirectory()).to.equal(true)
                expect((await fs.readdir(directoryPath))).to.eql([])
            })

            it('fails if creating in a path pointing to an existing directory', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)

                expect(fs.mkdir(directoryPath)).to.be.rejectedWith('EEXIST')
            })

            it('fails if creating in a path pointing to an existing file', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)

                expect(fs.mkdir(filePath)).to.be.rejectedWith('EEXIST')
            })

            it('fails if creating a directory inside a non-existing directory', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'outer', 'inner')

                expect(fs.mkdir(directoryPath)).to.be.rejectedWith('ENOENT')
            })
        })

        describe('listing directories', async () => {
            it('can list an existing directory', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)
                await fs.writeFile(join(directoryPath, 'file1'), SAMPLE_CONTENT)
                await fs.writeFile(join(directoryPath, 'camelCasedName'), SAMPLE_CONTENT)

                expect(await fs.readdir(tempDirectoryPath)).to.eql(['dir'])
                const directoryContents = await fs.readdir(directoryPath)
                expect(directoryContents).to.have.lengthOf(2)
                expect(directoryContents).to.contain('file1')
                expect(directoryContents).to.contain('camelCasedName')
            })

            it('fails if listing a non-existing directory', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'missing-dir')

                expect(fs.readdir(directoryPath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if listing a path pointing to a file', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)

                expect(fs.readdir(filePath)).to.be.rejectedWith('ENOTDIR')
            })
        })

        describe('removing directories', async () => {
            it('can remove an existing directory', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)
                await fs.rmdir(directoryPath)

                expect(fs.stat(directoryPath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if removing a non-empty directory', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)
                await fs.writeFile(join(directoryPath, 'file'), SAMPLE_CONTENT)

                expect(fs.rmdir(directoryPath)).to.be.rejectedWith('ENOTEMPTY')
            })

            it('fails if removing a non-existing directory', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'missing-dir')

                expect(fs.rmdir(directoryPath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if removing a path pointing to a file', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, SAMPLE_CONTENT)

                expect(fs.rmdir(filePath)).to.be.rejectedWith()
            })
        })

        describe('watching directories', function() {
            this.timeout(10000)

            let validate: WatchEventsValidator
            let testDirectoryPath: string

            beforeEach('create temp fixture directory and intialize validator', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { watchService, path } = fs
                validate = new WatchEventsValidator(watchService)

                testDirectoryPath = path.join(tempDirectoryPath, 'test-directory')
                await fs.mkdir(testDirectoryPath)
            })

            it('fires a watch event when a file is added inside a watched directory', async () => {
                const { fs } = testInput
                const { watchService, path } = fs

                await watchService.watchPath(testDirectoryPath)

                const testFilePath = path.join(testDirectoryPath, 'test-file')
                await fs.writeFile(testFilePath, SAMPLE_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: await fs.stat(testFilePath) })
                await validate.noMoreEvents()
            })

            it('fires a watch event when a file is changed inside inside a watched directory', async () => {
                const { fs } = testInput
                const { watchService, path } = fs

                const testFilePath = path.join(testDirectoryPath, 'test-file')
                await fs.writeFile(testFilePath, SAMPLE_CONTENT)
                await watchService.watchPath(testDirectoryPath)

                await fs.writeFile(testFilePath, SAMPLE_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: await fs.stat(testFilePath) })
                await validate.noMoreEvents()
            })

            it('fires a watch event when a file is removed inside inside a watched directory', async () => {
                const { fs } = testInput
                const { watchService, path } = fs

                const testFilePath = path.join(testDirectoryPath, 'test-file')
                await fs.writeFile(testFilePath, SAMPLE_CONTENT)
                await watchService.watchPath(testDirectoryPath)

                await fs.unlink(testFilePath)

                await validate.nextEvent({ path: testFilePath, stats: null })
                await validate.noMoreEvents()
            })
        })

        describe('watching both directories and files', function() {
            this.timeout(10000)

            let validate: WatchEventsValidator
            let testDirectoryPath: string
            let testFilePath: string

            beforeEach('create temp fixture directory and intialize watch service', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { watchService, path } = fs
                validate = new WatchEventsValidator(watchService)

                testDirectoryPath = path.join(tempDirectoryPath, 'test-directory')
                await fs.mkdir(testDirectoryPath)
                testFilePath = path.join(testDirectoryPath, 'test-file')
                await fs.writeFile(testFilePath, SAMPLE_CONTENT)
            })

            it('allows watching a file and its containing directory', async () => {
                const { fs } = testInput
                const { watchService } = fs

                await watchService.watchPath(testFilePath)
                await watchService.watchPath(testDirectoryPath)

                await fs.writeFile(testFilePath, SAMPLE_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: await fs.stat(testFilePath) })
                await validate.noMoreEvents()
            })

            it('allows watching in any order', async () => {
                const { fs } = testInput
                const { watchService } = fs

                await watchService.watchPath(testDirectoryPath)
                await watchService.watchPath(testFilePath)

                await fs.writeFile(testFilePath, SAMPLE_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: await fs.stat(testFilePath) })
                await validate.noMoreEvents()
            })
        })

        it('correctly exposes whether it is case sensitive', async () => {
            const { fs, tempDirectoryPath } = testInput
            const { join } = fs.path
            const filePath = join(tempDirectoryPath, 'file')
            const upperCaseFilePath = filePath.toUpperCase()

            await fs.writeFile(filePath, SAMPLE_CONTENT)

            if (fs.caseSensitive) {
                expect(fs.stat(upperCaseFilePath)).to.be.rejectedWith('ENOENT')
            } else {
                expect((await fs.stat(upperCaseFilePath)).isFile()).to.equal(true)
            }
        })
    })
}
