import { expect } from 'chai';
import { IFileSystemAsync } from '@file-services/types';
import { ITestInput } from './types';

const SAMPLE_CONTENT = 'content';

export function asyncFsContract(testProvider: () => Promise<ITestInput<IFileSystemAsync>>): void {
    describe('ASYNC file system contract', () => {
        let testInput: ITestInput<IFileSystemAsync>;

        beforeEach(async () => (testInput = await testProvider()));
        afterEach(async () => await testInput.dispose());

        describe('fileExists', () => {
            it('returns true if path points to a file', async () => {
                const { fs, tempDirectoryPath } = testInput;

                const filePath = fs.join(tempDirectoryPath, 'file');

                await fs.promises.writeFile(filePath, SAMPLE_CONTENT);

                expect(await fs.promises.fileExists(filePath)).to.equal(true);
            });

            it('returns false is path does not exist', async () => {
                const { fs, tempDirectoryPath } = testInput;

                const filePath = fs.join(tempDirectoryPath, 'non-existing-file');

                expect(await fs.promises.fileExists(filePath)).to.equal(false);
            });

            it('returns false is path points to a directory', async () => {
                const { fs, tempDirectoryPath } = testInput;

                const directoryPath = fs.join(tempDirectoryPath, 'dir');

                await fs.promises.mkdir(directoryPath);

                expect(await fs.promises.fileExists(directoryPath)).to.equal(false);
            });
        });

        describe('directoryExists', () => {
            it('returns true if path points to a directory', async () => {
                const { fs, tempDirectoryPath } = testInput;

                const directoryPath = fs.join(tempDirectoryPath, 'dir');

                await fs.promises.mkdir(directoryPath);

                expect(await fs.promises.directoryExists(directoryPath)).to.equal(true);
            });

            it('returns false is path does not exist', async () => {
                const { fs, tempDirectoryPath } = testInput;

                const filePath = fs.join(tempDirectoryPath, 'non-existing-directory');

                expect(await fs.promises.directoryExists(filePath)).to.equal(false);
            });

            it('returns false is path points to a file', async () => {
                const { fs, tempDirectoryPath } = testInput;

                const filePath = fs.join(tempDirectoryPath, 'file');

                await fs.promises.writeFile(filePath, SAMPLE_CONTENT);

                expect(await fs.promises.directoryExists(filePath)).to.equal(false);
            });
        });

        describe('readJsonFile', () => {
            it('parses contents of a json file and returns it', async () => {
                const { fs, tempDirectoryPath } = testInput;

                const filePath = fs.join(tempDirectoryPath, 'file.json');
                const jsonValue = { name: 'test', age: 99 };

                await fs.promises.writeFile(filePath, JSON.stringify(jsonValue));

                expect(await fs.promises.readJsonFile(filePath)).to.eql(jsonValue);
            });

            it('throws on file reading errors', async () => {
                const { fs, tempDirectoryPath } = testInput;

                const filePath = fs.join(tempDirectoryPath, 'file.json');

                await expect(fs.promises.readJsonFile(filePath)).to.eventually.be.rejectedWith(/ENOENT/);
            });

            it('throws on JSON parse errors', async () => {
                const { fs, tempDirectoryPath } = testInput;

                const filePath = fs.join(tempDirectoryPath, 'file.json');

                await fs.promises.writeFile(filePath, `#NON-JSON#`);

                await expect(fs.promises.readJsonFile(filePath)).to.eventually.be.rejectedWith(
                    `Unexpected token # in JSON at position 0`
                );
            });
        });

        describe('remove', () => {
            it('should delete directory recursively', async () => {
                const { fs, tempDirectoryPath } = testInput;

                const directoryPath = fs.join(tempDirectoryPath, 'dir');

                await fs.promises.populateDirectory(directoryPath, {
                    'file1.ts': '',
                    'file2.ts': '',
                    folder1: {
                        'file1.ts': '',
                        'file2.ts': '',
                        'file3.ts': ''
                    },
                    folder2: {
                        'file1.ts': '',
                        'file2.ts': '',
                        'file3.ts': ''
                    }
                });

                await fs.promises.remove(directoryPath);

                expect(await fs.promises.directoryExists(directoryPath)).to.equal(false);
            });

            it('should delete a file', async () => {
                const { fs, tempDirectoryPath } = testInput;

                const filePath = fs.join(tempDirectoryPath, 'file');

                await fs.promises.writeFile(filePath, '');

                await fs.promises.remove(filePath);

                expect(await fs.promises.fileExists(tempDirectoryPath)).to.equal(false);
            });

            it('should fail on nonexistant', async () => {
                const { fs, tempDirectoryPath } = testInput;

                const filePath = fs.join(tempDirectoryPath, 'file');

                return expect(fs.promises.remove(filePath)).to.eventually.rejectedWith(/ENOENT/);
            });
        });

        const fileName = 'a.json';
        const anotherFileName = 'b.json';

        describe('findFiles', () => {
            it('finds all files recursively inside a directory', async () => {
                const { fs, tempDirectoryPath } = testInput;
                const directoryPath = fs.join(tempDirectoryPath, 'dir');

                await fs.promises.populateDirectory(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: ''
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                });

                expect(await fs.promises.findFiles(directoryPath)).to.eql([
                    fs.join(directoryPath, fileName),
                    fs.join(directoryPath, 'folder1', fileName),
                    fs.join(directoryPath, 'folder2', anotherFileName)
                ]);

                expect(await fs.promises.findFiles(fs.join(directoryPath, 'folder1'))).to.eql([
                    fs.join(directoryPath, 'folder1', fileName)
                ]);
            });

            it('allows specifying a file filtering callback', async () => {
                const { fs, tempDirectoryPath } = testInput;
                const directoryPath = fs.join(tempDirectoryPath, 'dir');

                await fs.promises.populateDirectory(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: ''
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                });

                expect(
                    await fs.promises.findFiles(directoryPath, { filterFile: ({ name }) => name === fileName })
                ).to.eql([fs.join(directoryPath, fileName), fs.join(directoryPath, 'folder1', fileName)]);

                expect(
                    await fs.promises.findFiles(directoryPath, { filterFile: ({ name }) => name === anotherFileName })
                ).to.eql([fs.join(directoryPath, 'folder2', anotherFileName)]);
            });

            it('allows specifying a directory filtering callback', async () => {
                const { fs, tempDirectoryPath } = testInput;
                const directoryPath = fs.join(tempDirectoryPath, 'dir');

                await fs.promises.populateDirectory(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: ''
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                });

                expect(
                    await fs.promises.findFiles(directoryPath, { filterDirectory: ({ name }) => name === 'folder1' })
                ).to.eql([fs.join(directoryPath, fileName), fs.join(directoryPath, 'folder1', fileName)]);

                expect(
                    await fs.promises.findFiles(directoryPath, { filterDirectory: ({ name }) => name === 'folder2' })
                ).to.eql([fs.join(directoryPath, fileName), fs.join(directoryPath, 'folder2', anotherFileName)]);
            });
        });

        describe('findClosestFile', () => {
            it('finds closest file in parent directory chain', async () => {
                const { fs, tempDirectoryPath } = testInput;
                const directoryPath = fs.join(tempDirectoryPath, 'dir');

                await fs.promises.populateDirectory(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: ''
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                });

                expect(await fs.promises.findClosestFile(fs.join(directoryPath, 'folder1'), fileName)).to.equal(
                    fs.join(directoryPath, 'folder1', fileName)
                );

                expect(await fs.promises.findClosestFile(directoryPath, fileName)).to.equal(
                    fs.join(directoryPath, fileName)
                );

                expect(await fs.promises.findClosestFile(fs.join(directoryPath, 'folder2'), anotherFileName)).to.equal(
                    fs.join(directoryPath, 'folder2', anotherFileName)
                );

                expect(await fs.promises.findClosestFile(directoryPath, anotherFileName)).to.equal(undefined);
            });
        });

        describe('findFilesInAncestors', () => {
            it('finds files in parent directory chain', async () => {
                const { fs, tempDirectoryPath } = testInput;
                const directoryPath = fs.join(tempDirectoryPath, 'dir');

                await fs.promises.populateDirectory(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: ''
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                });

                expect(await fs.promises.findFilesInAncestors(fs.join(directoryPath, 'folder1'), fileName)).to.eql([
                    fs.join(directoryPath, 'folder1', fileName),
                    fs.join(directoryPath, fileName)
                ]);

                expect(
                    await fs.promises.findFilesInAncestors(fs.join(directoryPath, 'folder2'), anotherFileName)
                ).to.eql([fs.join(directoryPath, 'folder2', anotherFileName)]);
            });
        });

        describe('copyDirectory', () => {
            it('copies a directory and its children', async () => {
                const { fs, tempDirectoryPath } = testInput;
                const sourcePath = fs.join(tempDirectoryPath, 'src');
                const destinationPath = fs.join(tempDirectoryPath, 'dist');

                await fs.promises.populateDirectory(sourcePath, {
                    [fileName]: 'file in root',
                    folder1: {
                        [fileName]: 'file in sub-folder'
                    },
                    folder2: {
                        folder3: {
                            [anotherFileName]: 'file in deep folder'
                        }
                    },
                    empty: {
                        inside: {}
                    }
                });

                await fs.promises.copyDirectory(sourcePath, destinationPath);

                expect(await fs.promises.readFile(fs.join(destinationPath, fileName), 'utf8')).to.eql('file in root');
                expect(await fs.promises.readFile(fs.join(destinationPath, 'folder1', fileName), 'utf8')).to.eql(
                    'file in sub-folder'
                );
                expect(
                    await fs.promises.readFile(fs.join(destinationPath, 'folder2/folder3', anotherFileName), 'utf8')
                ).to.eql('file in deep folder');
                expect(await fs.promises.directoryExists(fs.join(destinationPath, 'empty/inside'))).to.eql(true);
            });
        });
    });
}
