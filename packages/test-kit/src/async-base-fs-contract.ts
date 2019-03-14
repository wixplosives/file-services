import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { IBaseFileSystemAsync, FileSystemConstants } from '@file-services/types';
import { ITestInput } from './types';
import { WatchEventsValidator } from './watch-events-validator';

chai.use(chaiAsPromised);

const SAMPLE_CONTENT = 'content';
const DIFFERENT_CONTENT = 'another content';

export function asyncBaseFsContract(testProvider: () => Promise<ITestInput<IBaseFileSystemAsync>>): void {
    describe('ASYNC file system contract', async () => {
        let testInput: ITestInput<IBaseFileSystemAsync>;

        beforeEach(async () => (testInput = await testProvider()));
        afterEach(async () => await testInput.dispose());

        describe('writing files', async () => {
            it('can write a new file into an existing directory', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { stat, readFile, writeFile }
                    }
                } = testInput;
                const filePath = path.join(tempDirectoryPath, 'file');

                await writeFile(filePath, SAMPLE_CONTENT);

                expect((await stat(filePath)).isFile()).to.equal(true);
                expect(await readFile(filePath, 'utf8')).to.eql(SAMPLE_CONTENT);
            });

            it('can overwrite an existing file', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { stat, readFile, writeFile }
                    }
                } = testInput;
                const filePath = path.join(tempDirectoryPath, 'file');

                await writeFile(filePath, SAMPLE_CONTENT);
                await writeFile(filePath, DIFFERENT_CONTENT);

                expect((await stat(filePath)).isFile()).to.equal(true);
                expect(await readFile(filePath, 'utf8')).to.eql(DIFFERENT_CONTENT);
            });

            it('fails if writing a file to a non-existing directory', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { writeFile }
                    }
                } = testInput;
                const filePath = path.join(tempDirectoryPath, 'missing-dir', 'file');

                await expect(writeFile(filePath, SAMPLE_CONTENT)).to.be.rejectedWith('ENOENT');
            });

            it('fails if writing a file to a path already pointing to a directory', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { writeFile, mkdir }
                    }
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'dir');

                await mkdir(directoryPath);

                await expect(writeFile(directoryPath, SAMPLE_CONTENT)).to.be.rejectedWith('EISDIR');
            });
        });

        describe('reading files', async () => {
            it('can read the contents of a file', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { readFile, writeFile }
                    }
                } = testInput;
                const firstFilePath = path.join(tempDirectoryPath, 'first-file');
                const secondFilePath = path.join(tempDirectoryPath, 'second-file');

                await writeFile(firstFilePath, SAMPLE_CONTENT);
                await writeFile(secondFilePath, DIFFERENT_CONTENT);

                expect(await readFile(firstFilePath, 'utf8'), 'contents of first-file').to.eql(SAMPLE_CONTENT);
                expect(await readFile(secondFilePath, 'utf8'), 'contents of second-file').to.eql(DIFFERENT_CONTENT);
            });

            it('fails if reading a non-existing file', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { readFile }
                    }
                } = testInput;
                const filePath = path.join(tempDirectoryPath, 'missing-file');

                await expect(readFile(filePath, 'utf8')).to.be.rejectedWith('ENOENT');
            });

            it('fails if reading a directory as a file', async () => {
                const {
                    fs: {
                        promises: { readFile }
                    },
                    tempDirectoryPath
                } = testInput;

                await expect(readFile(tempDirectoryPath, 'utf8')).to.be.rejectedWith('EISDIR');
            });
        });

        describe('removing files', async () => {
            it('can remove files', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { stat, unlink, writeFile }
                    }
                } = testInput;
                const filePath = path.join(tempDirectoryPath, 'file');

                await writeFile(filePath, SAMPLE_CONTENT);
                await unlink(filePath);

                await expect(stat(filePath)).to.be.rejectedWith('ENOENT');
            });

            it('fails if trying to remove a non-existing file', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { unlink }
                    }
                } = testInput;
                const filePath = path.join(tempDirectoryPath, 'missing-file');

                await expect(unlink(filePath)).to.be.rejectedWith('ENOENT');
            });

            it('fails if trying to remove a directory as a file', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { mkdir, unlink }
                    }
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'dir');

                await mkdir(directoryPath);

                await expect(unlink(directoryPath)).to.be.rejectedWith(); // linux throws `EISDIR`, mac throws `EPERM`
            });
        });

        describe('watching files', function() {
            this.timeout(10000);

            let validator: WatchEventsValidator;
            let testFilePath: string;

            beforeEach('create temp fixture file and intialize validator', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { writeFile },
                        watchService
                    }
                } = testInput;
                validator = new WatchEventsValidator(watchService);

                testFilePath = path.join(tempDirectoryPath, 'test-file');

                await writeFile(testFilePath, SAMPLE_CONTENT);
                await watchService.watchPath(testFilePath);
            });

            it('emits watch event when a watched file changes', async () => {
                const {
                    fs: {
                        promises: { writeFile, stat }
                    }
                } = testInput;

                await writeFile(testFilePath, DIFFERENT_CONTENT);

                await validator.validateEvents([{ path: testFilePath, stats: await stat(testFilePath) }]);
                await validator.noMoreEvents();
            });

            it('emits watch event when a watched file is removed', async () => {
                const {
                    fs: {
                        promises: { unlink }
                    }
                } = testInput;

                await unlink(testFilePath);

                await validator.validateEvents([{ path: testFilePath, stats: null }]);
                await validator.noMoreEvents();
            });

            it('keeps watching if file is deleted and recreated immediately', async () => {
                const {
                    fs: {
                        promises: { unlink, writeFile, stat }
                    }
                } = testInput;

                await writeFile(testFilePath, SAMPLE_CONTENT);
                await unlink(testFilePath);
                await writeFile(testFilePath, SAMPLE_CONTENT);

                await validator.validateEvents([{ path: testFilePath, stats: await stat(testFilePath) }]);

                await writeFile(testFilePath, SAMPLE_CONTENT);

                await validator.validateEvents([{ path: testFilePath, stats: await stat(testFilePath) }]);
                await validator.noMoreEvents();
            });
        });

        describe('creating directories', async () => {
            it('can create an empty directory inside an existing one', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { mkdir, stat, readdir }
                    }
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'new-dir');

                await mkdir(directoryPath);

                expect((await stat(directoryPath)).isDirectory()).to.equal(true);
                expect(await readdir(directoryPath)).to.eql([]);
            });

            it('fails if creating in a path pointing to an existing directory', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { mkdir }
                    }
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'dir');

                await mkdir(directoryPath);

                await expect(mkdir(directoryPath)).to.be.rejectedWith('EEXIST');
            });

            it('fails if creating in a path pointing to an existing file', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { mkdir, writeFile }
                    }
                } = testInput;
                const filePath = path.join(tempDirectoryPath, 'file');

                await writeFile(filePath, SAMPLE_CONTENT);

                await expect(mkdir(filePath)).to.be.rejectedWith('EEXIST');
            });

            it('fails if creating a directory inside a non-existing directory', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { mkdir }
                    }
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'outer', 'inner');

                await expect(mkdir(directoryPath)).to.be.rejectedWith('ENOENT');
            });
        });

        describe('listing directories', async () => {
            it('can list an existing directory', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { mkdir, writeFile, readdir }
                    }
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'dir');

                await mkdir(directoryPath);
                await writeFile(path.join(directoryPath, 'file1'), SAMPLE_CONTENT);
                await writeFile(path.join(directoryPath, 'camelCasedName'), SAMPLE_CONTENT);

                expect(await readdir(tempDirectoryPath)).to.eql(['dir']);
                const directoryContents = await readdir(directoryPath);
                expect(directoryContents).to.have.lengthOf(2);
                expect(directoryContents).to.contain('file1');
                expect(directoryContents).to.contain('camelCasedName');
            });

            it('fails if listing a non-existing directory', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { readdir }
                    }
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'missing-dir');

                await expect(readdir(directoryPath)).to.be.rejectedWith('ENOENT');
            });

            it('fails if listing a path pointing to a file', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { writeFile, readdir }
                    }
                } = testInput;
                const filePath = path.join(tempDirectoryPath, 'file');

                await writeFile(filePath, SAMPLE_CONTENT);

                await expect(readdir(filePath)).to.be.rejectedWith('ENOTDIR');
            });
        });

        describe('removing directories', async () => {
            it('can remove an existing directory', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { mkdir, rmdir, stat }
                    }
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'dir');

                await mkdir(directoryPath);
                await rmdir(directoryPath);

                await expect(stat(directoryPath)).to.be.rejectedWith('ENOENT');
            });

            it('fails if removing a non-empty directory', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { mkdir, writeFile, rmdir }
                    }
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'dir');

                await mkdir(directoryPath);
                await writeFile(path.join(directoryPath, 'file'), SAMPLE_CONTENT);

                await expect(rmdir(directoryPath)).to.be.rejectedWith('ENOTEMPTY');
            });

            it('fails if removing a non-existing directory', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { rmdir }
                    }
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'missing-dir');

                await expect(rmdir(directoryPath)).to.be.rejectedWith('ENOENT');
            });

            it('fails if removing a path pointing to a file', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { rmdir, writeFile }
                    }
                } = testInput;
                const filePath = path.join(tempDirectoryPath, 'file');

                await writeFile(filePath, SAMPLE_CONTENT);

                await expect(rmdir(filePath)).to.be.rejectedWith();
            });
        });

        describe('watching directories', function() {
            this.timeout(10000);

            let validator: WatchEventsValidator;
            let testDirectoryPath: string;

            beforeEach('create temp fixture directory and intialize validator', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        promises: { mkdir },
                        path,
                        watchService
                    }
                } = testInput;
                validator = new WatchEventsValidator(watchService);

                testDirectoryPath = path.join(tempDirectoryPath, 'test-directory');
                await mkdir(testDirectoryPath);
            });

            it('fires a watch event when a file is added inside a watched directory', async () => {
                const {
                    fs: {
                        promises: { writeFile, stat },
                        path,
                        watchService
                    }
                } = testInput;

                await watchService.watchPath(testDirectoryPath);

                const testFilePath = path.join(testDirectoryPath, 'test-file');
                await writeFile(testFilePath, SAMPLE_CONTENT);

                await validator.validateEvents([{ path: testFilePath, stats: await stat(testFilePath) }]);
                await validator.noMoreEvents();
            });

            it('fires a watch event when a file is changed inside a watched directory', async () => {
                const {
                    fs: {
                        promises: { writeFile, stat },
                        path,
                        watchService
                    }
                } = testInput;

                const testFilePath = path.join(testDirectoryPath, 'test-file');
                await writeFile(testFilePath, SAMPLE_CONTENT);
                await watchService.watchPath(testDirectoryPath);

                await writeFile(testFilePath, SAMPLE_CONTENT);

                await validator.validateEvents([{ path: testFilePath, stats: await stat(testFilePath) }]);
                await validator.noMoreEvents();
            });

            it('fires a watch event when a file is removed inside a watched directory', async () => {
                const {
                    fs: {
                        promises: { writeFile, unlink },
                        path,
                        watchService
                    }
                } = testInput;

                const testFilePath = path.join(testDirectoryPath, 'test-file');
                await writeFile(testFilePath, SAMPLE_CONTENT);
                await watchService.watchPath(testDirectoryPath);

                await unlink(testFilePath);

                await validator.validateEvents([{ path: testFilePath, stats: null }]);
                await validator.noMoreEvents();
            });
        });

        describe('watching both directories and files', function() {
            this.timeout(10000);

            let validator: WatchEventsValidator;
            let testDirectoryPath: string;
            let testFilePath: string;

            beforeEach('create temp fixture directory and intialize watch service', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        promises: { writeFile, mkdir },
                        path,
                        watchService
                    }
                } = testInput;
                validator = new WatchEventsValidator(watchService);

                testDirectoryPath = path.join(tempDirectoryPath, 'test-directory');
                await mkdir(testDirectoryPath);
                testFilePath = path.join(testDirectoryPath, 'test-file');
                await writeFile(testFilePath, SAMPLE_CONTENT);
            });

            it('allows watching a file and its containing directory', async () => {
                const {
                    fs: {
                        promises: { writeFile, stat },
                        watchService
                    }
                } = testInput;

                await watchService.watchPath(testFilePath);
                await watchService.watchPath(testDirectoryPath);

                await writeFile(testFilePath, SAMPLE_CONTENT);

                await validator.validateEvents([{ path: testFilePath, stats: await stat(testFilePath) }]);
                await validator.noMoreEvents();
            });

            it('allows watching in any order', async () => {
                const {
                    fs: {
                        promises: { writeFile, stat },
                        watchService
                    }
                } = testInput;

                await watchService.watchPath(testDirectoryPath);
                await watchService.watchPath(testFilePath);

                await writeFile(testFilePath, SAMPLE_CONTENT);

                await validator.validateEvents([{ path: testFilePath, stats: await stat(testFilePath) }]);
                await validator.noMoreEvents();
            });
        });

        describe('renaming directories and files', () => {
            it('moves a file', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { writeFile, stat, mkdir, rename, readFile }
                    }
                } = testInput;
                const sourcePath = path.join(tempDirectoryPath, 'file');
                const destinationPath = path.join(tempDirectoryPath, 'dir', 'subdir', 'movedFile');

                await writeFile(sourcePath, SAMPLE_CONTENT);
                await mkdir(path.join(tempDirectoryPath, 'dir'));
                await mkdir(path.join(tempDirectoryPath, 'dir', 'subdir'));

                const sourceStats = await stat(sourcePath);

                await rename(sourcePath, destinationPath);

                const destStats = await stat(destinationPath);
                expect(destStats.isFile()).to.equal(true);
                expect(destStats.mtime).not.to.equal(sourceStats.mtime);
                expect(await readFile(destinationPath, 'utf8')).to.eql(SAMPLE_CONTENT);
                await expect(stat(sourcePath)).to.be.rejectedWith('ENOENT');
            });

            it(`throws if source path doesn't exist`, async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { rename }
                    }
                } = testInput;
                const sourcePath = path.join(tempDirectoryPath, 'file');
                const destPath = path.join(tempDirectoryPath, 'file2');

                await expect(rename(sourcePath, destPath)).to.be.rejectedWith('ENOENT');
            });

            it(`throws if the containing directory of the source path doesn't exist`, async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { rename }
                    }
                } = testInput;
                const sourcePath = path.join(tempDirectoryPath, 'unicorn', 'file');
                const destPath = path.join(tempDirectoryPath, 'file2');

                await expect(rename(sourcePath, destPath)).to.be.rejectedWith('ENOENT');
            });

            it(`throws if destination containing path doesn't exist`, async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { rename, writeFile }
                    }
                } = testInput;
                const sourcePath = path.join(tempDirectoryPath, 'file');
                const destPath = path.join(tempDirectoryPath, 'dir', 'file2');

                await writeFile(sourcePath, SAMPLE_CONTENT);

                await expect(rename(sourcePath, destPath)).to.be.rejectedWith('ENOENT');
            });

            it('updates the parent directory of a renamed entry', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { rename, mkdir, readdir, writeFile }
                    }
                } = testInput;
                const sourcePath = path.join(tempDirectoryPath, 'sourceDir');
                const destPath = path.join(tempDirectoryPath, 'destDir');

                await mkdir(sourcePath);
                await writeFile(path.join(sourcePath, 'file'), SAMPLE_CONTENT);

                await rename(sourcePath, destPath);

                expect(await readdir(tempDirectoryPath)).to.include('destDir');
            });

            describe('renaming directories', () => {
                it('moves a directory', async () => {
                    const {
                        tempDirectoryPath,
                        fs: {
                            path,
                            promises: { rename, mkdir, writeFile, stat, readFile }
                        }
                    } = testInput;
                    const sourcePath = path.join(tempDirectoryPath, 'dir');
                    const destinationPath = path.join(tempDirectoryPath, 'anotherDir', 'subdir', 'movedDir');
                    await mkdir(path.join(tempDirectoryPath, 'dir'));
                    await mkdir(path.join(tempDirectoryPath, 'anotherDir'));
                    await mkdir(path.join(tempDirectoryPath, 'anotherDir', 'subdir'));
                    await writeFile(path.join(sourcePath, 'file'), SAMPLE_CONTENT);

                    await rename(sourcePath, destinationPath);

                    expect((await stat(destinationPath)).isDirectory()).to.equal(true);
                    expect(await readFile(path.join(destinationPath, 'file'), 'utf8')).to.eql(SAMPLE_CONTENT);
                    await expect(stat(sourcePath)).to.be.rejectedWith('ENOENT');
                });

                it(`allows copying a directory over a non-existing directory`, async () => {
                    const {
                        tempDirectoryPath,
                        fs: {
                            path,
                            promises: { rename, mkdir, writeFile }
                        }
                    } = testInput;
                    const sourcePath = path.join(tempDirectoryPath, 'sourceDir');

                    await mkdir(sourcePath);
                    await writeFile(path.join(sourcePath, 'file'), SAMPLE_CONTENT);

                    await expect(rename(sourcePath, path.join(tempDirectoryPath, 'destDir'))).to.not.be.rejectedWith(
                        'EEXIST'
                    );
                });

                it(`allows copying copying a directory over an empty directory`, async () => {
                    const {
                        tempDirectoryPath,
                        fs: {
                            path,
                            promises: { rename, mkdir, writeFile }
                        }
                    } = testInput;
                    const sourcePath = path.join(tempDirectoryPath, 'sourceDir');
                    const destPath = path.join(tempDirectoryPath, 'destDir');

                    await mkdir(sourcePath);
                    await mkdir(destPath);
                    await writeFile(path.join(sourcePath, 'file'), SAMPLE_CONTENT);

                    await expect(rename(sourcePath, destPath)).to.not.be.rejectedWith('EEXIST');
                });
            });
        });

        it('correctly exposes whether it is case sensitive', async () => {
            const {
                tempDirectoryPath,
                fs: {
                    path,
                    caseSensitive,
                    promises: { writeFile, stat }
                }
            } = testInput;
            const filePath = path.join(tempDirectoryPath, 'file');
            const upperCaseFilePath = filePath.toUpperCase();

            await writeFile(filePath, SAMPLE_CONTENT);

            if (caseSensitive) {
                await expect(stat(upperCaseFilePath)).to.be.rejectedWith('ENOENT');
            } else {
                await expect((await stat(upperCaseFilePath)).isFile()).to.equal(true);
            }
        });

        describe('copying files/directories', () => {
            const SOURCE_FILE_NAME = 'file.txt';
            let targetDirectoryPath: string;
            let sourceFilePath: string;

            beforeEach(async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { writeFile, mkdir }
                    }
                } = testInput;
                targetDirectoryPath = path.join(tempDirectoryPath, 'dir');

                await mkdir(targetDirectoryPath);
                sourceFilePath = path.join(tempDirectoryPath, SOURCE_FILE_NAME);
                await writeFile(sourceFilePath, SAMPLE_CONTENT);
            });

            it('can copy file', async () => {
                const {
                    fs: {
                        path,
                        promises: { copyFile, readFile }
                    }
                } = testInput;
                const targetPath = path.join(targetDirectoryPath, SOURCE_FILE_NAME);

                await copyFile(sourceFilePath, targetPath);

                expect(await readFile(targetPath, 'utf8')).to.be.eql(SAMPLE_CONTENT);
            });

            it('fails if source does not exist', async () => {
                const {
                    tempDirectoryPath,
                    fs: {
                        path,
                        promises: { copyFile }
                    }
                } = testInput;
                const sourcePath = path.join(tempDirectoryPath, 'nonExistingFileName.txt');
                const targetPath = path.join(targetDirectoryPath, SOURCE_FILE_NAME);

                await expect(copyFile(sourcePath, targetPath)).to.be.rejectedWith('ENOENT');
            });

            it('fails if target containing directory does not exist', async () => {
                const {
                    fs: {
                        path,
                        promises: { copyFile }
                    }
                } = testInput;
                const targetPath = path.join(targetDirectoryPath, 'nonExistingDirectory', SOURCE_FILE_NAME);

                await expect(copyFile(sourceFilePath, targetPath)).to.be.rejectedWith('ENOENT');
            });

            it('overwrites destination file by default', async () => {
                const {
                    fs: {
                        path,
                        promises: { copyFile, readFile, writeFile }
                    }
                } = testInput;
                const targetPath = path.join(targetDirectoryPath, SOURCE_FILE_NAME);

                await writeFile(targetPath, 'content to be overwritten');
                await copyFile(sourceFilePath, targetPath);

                expect(await readFile(targetPath, 'utf8')).to.be.eql(SAMPLE_CONTENT);
            });

            it('fails if destination exists and flag COPYFILE_EXCL passed', async () => {
                const {
                    fs: {
                        path,
                        promises: { copyFile, writeFile }
                    }
                } = testInput;
                const targetPath = path.join(targetDirectoryPath, SOURCE_FILE_NAME);

                await writeFile(targetPath, 'content to be overwritten');

                await expect(
                    copyFile(sourceFilePath, targetPath, FileSystemConstants.COPYFILE_EXCL)
                ).to.be.rejectedWith('EEXIST');
            });
        });
    });
}
