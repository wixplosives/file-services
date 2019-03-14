import { expect } from 'chai';
import { IFileSystemSync } from '@file-services/types';
import { ITestInput } from './types';

const SAMPLE_CONTENT = 'content';

export function syncFsContract(testProvider: () => Promise<ITestInput<IFileSystemSync>>): void {
    describe('SYNC file system contract', () => {
        let testInput: ITestInput<IFileSystemSync>;

        beforeEach(async () => (testInput = await testProvider()));
        afterEach(async () => await testInput.dispose());

        describe('fileExistsSync', () => {
            it('returns true if path points to a file', () => {
                const { fs, tempDirectoryPath } = testInput;
                const { join } = fs.path;
                const filePath = join(tempDirectoryPath, 'file');

                fs.writeFileSync(filePath, SAMPLE_CONTENT);

                expect(fs.fileExistsSync(filePath)).to.equal(true);
            });

            it('returns false is path does not exist', () => {
                const { fs, tempDirectoryPath } = testInput;
                const { join } = fs.path;
                const filePath = join(tempDirectoryPath, 'non-existing-file');

                expect(fs.fileExistsSync(filePath)).to.equal(false);
            });

            it('returns false is path points to a directory', () => {
                const { fs, tempDirectoryPath } = testInput;
                const { join } = fs.path;
                const directoryPath = join(tempDirectoryPath, 'dir');

                fs.mkdirSync(directoryPath);

                expect(fs.fileExistsSync(directoryPath)).to.equal(false);
            });
        });

        describe('directoryExistsSync', () => {
            it('returns true if path points to a directory', () => {
                const { fs, tempDirectoryPath } = testInput;
                const { join } = fs.path;
                const directoryPath = join(tempDirectoryPath, 'dir');

                fs.mkdirSync(directoryPath);

                expect(fs.directoryExistsSync(directoryPath)).to.equal(true);
            });

            it('returns false is path does not exist', () => {
                const { fs, tempDirectoryPath } = testInput;
                const { join } = fs.path;
                const filePath = join(tempDirectoryPath, 'non-existing-directory');

                expect(fs.directoryExistsSync(filePath)).to.equal(false);
            });

            it('returns false is path points to a file', () => {
                const { fs, tempDirectoryPath } = testInput;
                const { join } = fs.path;
                const filePath = join(tempDirectoryPath, 'file');

                fs.writeFileSync(filePath, SAMPLE_CONTENT);

                expect(fs.directoryExistsSync(filePath)).to.equal(false);
            });
        });

        describe('readJsonFileSync', () => {
            it('parses contents of a json file and returns it', () => {
                const { fs, tempDirectoryPath } = testInput;
                const { join } = fs.path;
                const filePath = join(tempDirectoryPath, 'file.json');
                const jsonValue = { name: 'test', age: 99 };

                fs.writeFileSync(filePath, JSON.stringify(jsonValue));

                expect(fs.readJsonFileSync(filePath)).to.eql(jsonValue);
            });

            it('throws on file reading errors', () => {
                const { fs, tempDirectoryPath } = testInput;
                const { join } = fs.path;
                const filePath = join(tempDirectoryPath, 'file.json');

                expect(() => fs.readJsonFileSync(filePath)).to.throw(/ENOENT/);
            });

            it('throws on JSON parse errors', () => {
                const { fs, tempDirectoryPath } = testInput;
                const { join } = fs.path;
                const filePath = join(tempDirectoryPath, 'file.json');

                fs.writeFileSync(filePath, `#NON-JSON#`);

                expect(() => fs.readJsonFileSync(filePath)).to.throw(`Unexpected token # in JSON at position 0`);
            });
        });

        describe('removeSync', () => {
            it('should delete directory recursively', () => {
                const { fs, tempDirectoryPath } = testInput;
                const { join } = fs.path;
                const directoryPath = join(tempDirectoryPath, 'dir');

                fs.populateDirectorySync(directoryPath, {
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

                fs.removeSync(directoryPath);

                expect(fs.directoryExistsSync(directoryPath)).to.equal(false);
            });

            it('should delete a file', () => {
                const { fs, tempDirectoryPath } = testInput;
                const { join } = fs.path;
                const filePath = join(tempDirectoryPath, 'file');

                fs.writeFileSync(filePath, '');

                expect(fs.readdirSync(tempDirectoryPath)).to.deep.equal(['file']);

                fs.removeSync(filePath);

                expect(fs.fileExistsSync(tempDirectoryPath)).to.equal(false);
            });

            it('should fail on nonexistant', () => {
                const { fs, tempDirectoryPath } = testInput;
                const { join } = fs.path;
                const filePath = join(tempDirectoryPath, 'file');

                const thrower = () => fs.removeSync(filePath);
                expect(thrower).to.throw(/ENOENT/);
            });
        });

        const fileName = 'a.json';
        const anotherFileName = 'b.json';

        describe('findFilesSync', () => {
            it('finds all files recursively inside a directory', () => {
                const {
                    fs,
                    fs: { path },
                    tempDirectoryPath
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'dir');

                fs.populateDirectorySync(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: ''
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                });

                expect(fs.findFilesSync(directoryPath)).to.eql([
                    path.join(directoryPath, fileName),
                    path.join(directoryPath, 'folder1', fileName),
                    path.join(directoryPath, 'folder2', anotherFileName)
                ]);

                expect(fs.findFilesSync(path.join(directoryPath, 'folder1'))).to.eql([
                    path.join(directoryPath, 'folder1', fileName)
                ]);
            });

            it('allows specifying a file filtering callback', () => {
                const {
                    fs,
                    fs: { path },
                    tempDirectoryPath
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'dir');

                fs.populateDirectorySync(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: ''
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                });

                expect(fs.findFilesSync(directoryPath, { filterFile: ({ name }) => name === fileName })).to.eql([
                    path.join(directoryPath, fileName),
                    path.join(directoryPath, 'folder1', fileName)
                ]);

                expect(fs.findFilesSync(directoryPath, { filterFile: ({ name }) => name === anotherFileName })).to.eql([
                    path.join(directoryPath, 'folder2', anotherFileName)
                ]);
            });

            it('allows specifying a directory filtering callback', () => {
                const {
                    fs,
                    fs: { path },
                    tempDirectoryPath
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'dir');

                fs.populateDirectorySync(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: ''
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                });

                expect(fs.findFilesSync(directoryPath, { filterDirectory: ({ name }) => name === 'folder1' })).to.eql([
                    path.join(directoryPath, fileName),
                    path.join(directoryPath, 'folder1', fileName)
                ]);

                expect(fs.findFilesSync(directoryPath, { filterDirectory: ({ name }) => name === 'folder2' })).to.eql([
                    path.join(directoryPath, fileName),
                    path.join(directoryPath, 'folder2', anotherFileName)
                ]);
            });
        });

        describe('findClosestFileSync', () => {
            it('finds closest file in parent directory chain', () => {
                const {
                    fs,
                    fs: { path },
                    tempDirectoryPath
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'dir');

                fs.populateDirectorySync(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: ''
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                });

                expect(fs.findClosestFileSync(path.join(directoryPath, 'folder1'), fileName)).to.equal(
                    path.join(directoryPath, 'folder1', fileName)
                );

                expect(fs.findClosestFileSync(directoryPath, fileName)).to.equal(path.join(directoryPath, fileName));

                expect(fs.findClosestFileSync(path.join(directoryPath, 'folder2'), anotherFileName)).to.equal(
                    path.join(directoryPath, 'folder2', anotherFileName)
                );

                expect(fs.findClosestFileSync(directoryPath, anotherFileName)).to.equal(null);
            });
        });

        describe('findFilesInAncestorsSync', () => {
            it('finds files in parent directory chain', () => {
                const {
                    fs,
                    fs: { path },
                    tempDirectoryPath
                } = testInput;
                const directoryPath = path.join(tempDirectoryPath, 'dir');

                fs.populateDirectorySync(directoryPath, {
                    [fileName]: '',
                    folder1: {
                        [fileName]: ''
                    },
                    folder2: {
                        [anotherFileName]: ''
                    }
                });

                expect(fs.findFilesInAncestorsSync(path.join(directoryPath, 'folder1'), fileName)).to.eql([
                    path.join(directoryPath, 'folder1', fileName),
                    path.join(directoryPath, fileName)
                ]);

                expect(fs.findFilesInAncestorsSync(path.join(directoryPath, 'folder2'), anotherFileName)).to.eql([
                    path.join(directoryPath, 'folder2', anotherFileName)
                ]);
            });
        });
    });
}
