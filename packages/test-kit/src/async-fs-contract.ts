import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { IBaseFileSystemAsync } from '@file-services/types'
import { IFileSystemTestbed } from './types'

chai.use(chaiAsPromised)

const sampleContent = 'content'
const differentContent = 'another content'

export function asyncFsContract(testProvider: () => Promise<IFileSystemTestbed<IBaseFileSystemAsync>>): void {
    describe('ASYNC file system contract', async () => {
        let testbed: IFileSystemTestbed<IBaseFileSystemAsync>

        beforeEach(async () => testbed = await testProvider())
        afterEach(async () => await testbed.dispose())

        describe('writing files', async () => {
            it('can write a new file into an existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, sampleContent)

                expect((await fs.stat(filePath)).isFile()).to.equal(true)
                expect(await fs.readFile(filePath)).to.eql(sampleContent)
            })

            it('can overwrite an existing file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, sampleContent)
                await fs.writeFile(filePath, differentContent)

                expect((await fs.stat(filePath)).isFile()).to.equal(true)
                expect(await fs.readFile(filePath)).to.eql(differentContent)
            })

            it('fails if writing a file to a non-existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'missing-dir', 'file')

                expect(fs.writeFile(filePath, sampleContent)).to.be.rejectedWith('ENOENT')
            })

            it('fails if writing a file to a path already pointing to a directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)

                expect(fs.writeFile(directoryPath, sampleContent)).to.be.rejectedWith('EISDIR')
            })
        })

        describe('reading files', async () => {
            it('can read the contents of a file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const firstFilePath = join(tempDirectoryPath, 'first-file')
                const secondFilePath = join(tempDirectoryPath, 'second-file')

                await fs.writeFile(firstFilePath, sampleContent)
                await fs.writeFile(secondFilePath, differentContent)

                expect(await fs.readFile(firstFilePath), 'contents of first-file').to.eql(sampleContent)
                expect(await fs.readFile(secondFilePath), 'contents of second-file').to.eql(differentContent)
            })

            it('fails if reading a non-existing file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'missing-file')

                expect(fs.readFile(filePath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if reading a directory as a file', async () => {
                const { fs, tempDirectoryPath } = testbed

                expect(fs.readFile(tempDirectoryPath)).to.be.rejectedWith('EISDIR')
            })

        })

        describe('removing files', async () => {
            it('can remove files', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, sampleContent)
                await fs.unlink(filePath)

                expect(fs.stat(filePath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if trying to remove a non-existing file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'missing-file')

                expect(fs.unlink(filePath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if trying to remove a directory as a file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)

                expect(fs.unlink(directoryPath)).to.be.rejectedWith() // linux throws `EISDIR`, mac throws `EPERM`
            })
        })

        describe('creating directories', async () => {
            it('can create an empty directory inside an existing one', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'new-dir')

                await fs.mkdir(directoryPath)

                expect((await fs.stat(directoryPath)).isDirectory()).to.equal(true)
                expect((await fs.readdir(directoryPath))).to.eql([])
            })

            it('fails if creating in a path pointing to an existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)

                expect(fs.mkdir(directoryPath)).to.be.rejectedWith('EEXIST')
            })

            it('fails if creating in a path pointing to an existing file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, sampleContent)

                expect(fs.mkdir(filePath)).to.be.rejectedWith('EEXIST')
            })

            it('fails if creating a directory inside a non-existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'outer', 'inner')

                expect(fs.mkdir(directoryPath)).to.be.rejectedWith('ENOENT')
            })
        })

        describe('listing directories', async () => {
            it('can list an existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)
                await fs.writeFile(join(directoryPath, 'file1'), sampleContent)
                await fs.writeFile(join(directoryPath, 'camelCasedName'), sampleContent)

                expect(await fs.readdir(tempDirectoryPath)).to.eql(['dir'])
                const directoryContents = await fs.readdir(directoryPath)
                expect(directoryContents).to.have.lengthOf(2)
                expect(directoryContents).to.contain('file1')
                expect(directoryContents).to.contain('camelCasedName')
            })

            it('fails if listing a non-existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'missing-dir')

                expect(fs.readdir(directoryPath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if listing a path pointing to a file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, sampleContent)

                expect(fs.readdir(filePath)).to.be.rejectedWith('ENOTDIR')
            })
        })

        describe('removing directories', async () => {
            it('can remove an existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)
                await fs.rmdir(directoryPath)

                expect(fs.stat(directoryPath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if removing a non-empty directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                await fs.mkdir(directoryPath)
                await fs.writeFile(join(directoryPath, 'file'), sampleContent)

                expect(fs.rmdir(directoryPath)).to.be.rejectedWith('ENOTEMPTY')
            })

            it('fails if removing a non-existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'missing-dir')

                expect(fs.rmdir(directoryPath)).to.be.rejectedWith('ENOENT')
            })

            it('fails if removing a path pointing to a file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, sampleContent)

                expect(fs.rmdir(filePath)).to.be.rejectedWith()
            })
        })

        it('correctly exposes whether it is case sensitive', async () => {
            const { fs, tempDirectoryPath } = testbed
            const { join } = fs.path
            const filePath = join(tempDirectoryPath, 'file')
            const upperCaseFilePath = filePath.toUpperCase()

            await fs.writeFile(filePath, sampleContent)

            if (fs.isCaseSensitive) {
                expect(fs.stat(upperCaseFilePath)).to.be.rejectedWith('ENOENT')
            } else {
                expect((await fs.stat(upperCaseFilePath)).isFile()).to.equal(true)
            }
        })
    })
}
