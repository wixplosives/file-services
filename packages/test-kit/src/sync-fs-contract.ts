import { expect } from 'chai';
import type { IFileSystemSync } from '@file-services/types';
import type { ITestInput } from './types';

const SAMPLE_CONTENT = 'content';

export function syncFsContract(testProvider: () => Promise<ITestInput<IFileSystemSync>>): void {
  describe('SYNC file system contract', () => {
    let testInput: ITestInput<IFileSystemSync>;

    beforeEach(async () => (testInput = await testProvider()));
    afterEach(async () => await testInput.dispose());

    describe('fileExistsSync', () => {
      it('returns true if path points to a file', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file');

        fs.writeFileSync(filePath, SAMPLE_CONTENT);

        expect(fs.fileExistsSync(filePath)).to.equal(true);
      });

      it('returns false is path does not exist', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'non-existing-file');

        expect(fs.fileExistsSync(filePath)).to.equal(false);
      });

      it('returns false is path points to a directory', () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.mkdirSync(directoryPath);

        expect(fs.fileExistsSync(directoryPath)).to.equal(false);
      });
    });

    describe('directoryExistsSync', () => {
      it('returns true if path points to a directory', () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.mkdirSync(directoryPath);

        expect(fs.directoryExistsSync(directoryPath)).to.equal(true);
      });

      it('returns false is path does not exist', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'non-existing-directory');

        expect(fs.directoryExistsSync(filePath)).to.equal(false);
      });

      it('returns false is path points to a file', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file');

        fs.writeFileSync(filePath, SAMPLE_CONTENT);

        expect(fs.directoryExistsSync(filePath)).to.equal(false);
      });
    });

    describe('readJsonFileSync', () => {
      it('parses contents of a json file and returns it', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file.json');
        const jsonValue = { name: 'test', age: 99 };

        fs.writeFileSync(filePath, JSON.stringify(jsonValue));

        expect(fs.readJsonFileSync(filePath)).to.eql(jsonValue);
      });

      it('throws on file reading errors', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file.json');

        expect(() => fs.readJsonFileSync(filePath)).to.throw(/ENOENT/);
      });

      it('throws on JSON parse errors', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file.json');

        fs.writeFileSync(filePath, `#NON-JSON#`);

        expect(() => fs.readJsonFileSync(filePath)).to.throw(`Unexpected token # in JSON at position 0`);
      });
    });

    describe('removeSync', () => {
      it('should delete directory recursively', () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.populateDirectorySync(directoryPath, {
          'file1.ts': '',
          'file2.ts': '',
          folder1: {
            'file1.ts': '',
            'file2.ts': '',
            'file3.ts': '',
          },
          folder2: {
            'file1.ts': '',
            'file2.ts': '',
            'file3.ts': '',
          },
        });

        fs.removeSync(directoryPath);

        expect(fs.directoryExistsSync(directoryPath)).to.equal(false);
      });

      it('should delete a file', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file');

        fs.writeFileSync(filePath, '');

        expect(fs.readdirSync(tempDirectoryPath)).to.deep.equal(['file']);

        fs.removeSync(filePath);

        expect(fs.fileExistsSync(tempDirectoryPath)).to.equal(false);
      });

      it('should fail on nonexistant', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file');

        const thrower = () => fs.removeSync(filePath);
        expect(thrower).to.throw(/ENOENT/);
      });
    });

    const fileName = 'a.json';
    const anotherFileName = 'b.json';

    describe('findFilesSync', () => {
      it('finds all files recursively inside a directory', () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.populateDirectorySync(directoryPath, {
          [fileName]: '',
          folder1: {
            [fileName]: '',
          },
          folder2: {
            [anotherFileName]: '',
          },
        });

        expect(fs.findFilesSync(directoryPath)).to.eql([
          fs.join(directoryPath, fileName),
          fs.join(directoryPath, 'folder1', fileName),
          fs.join(directoryPath, 'folder2', anotherFileName),
        ]);

        expect(fs.findFilesSync(fs.join(directoryPath, 'folder1'))).to.eql([
          fs.join(directoryPath, 'folder1', fileName),
        ]);
      });

      it('allows specifying a file filtering callback', () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.populateDirectorySync(directoryPath, {
          [fileName]: '',
          folder1: {
            [fileName]: '',
          },
          folder2: {
            [anotherFileName]: '',
          },
        });

        expect(fs.findFilesSync(directoryPath, { filterFile: ({ name }) => name === fileName })).to.eql([
          fs.join(directoryPath, fileName),
          fs.join(directoryPath, 'folder1', fileName),
        ]);

        expect(fs.findFilesSync(directoryPath, { filterFile: ({ name }) => name === anotherFileName })).to.eql([
          fs.join(directoryPath, 'folder2', anotherFileName),
        ]);
      });

      it('allows specifying a directory filtering callback', () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.populateDirectorySync(directoryPath, {
          [fileName]: '',
          folder1: {
            [fileName]: '',
          },
          folder2: {
            [anotherFileName]: '',
          },
        });

        expect(fs.findFilesSync(directoryPath, { filterDirectory: ({ name }) => name === 'folder1' })).to.eql([
          fs.join(directoryPath, fileName),
          fs.join(directoryPath, 'folder1', fileName),
        ]);

        expect(fs.findFilesSync(directoryPath, { filterDirectory: ({ name }) => name === 'folder2' })).to.eql([
          fs.join(directoryPath, fileName),
          fs.join(directoryPath, 'folder2', anotherFileName),
        ]);
      });
    });

    describe('findClosestFileSync', () => {
      it('finds closest file in parent directory chain', () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.populateDirectorySync(directoryPath, {
          [fileName]: '',
          folder1: {
            [fileName]: '',
          },
          folder2: {
            [anotherFileName]: '',
          },
        });

        expect(fs.findClosestFileSync(fs.join(directoryPath, 'folder1'), fileName)).to.equal(
          fs.join(directoryPath, 'folder1', fileName)
        );

        expect(fs.findClosestFileSync(directoryPath, fileName)).to.equal(fs.join(directoryPath, fileName));

        expect(fs.findClosestFileSync(fs.join(directoryPath, 'folder2'), anotherFileName)).to.equal(
          fs.join(directoryPath, 'folder2', anotherFileName)
        );

        expect(fs.findClosestFileSync(directoryPath, anotherFileName)).to.equal(undefined);
      });
    });

    describe('findFilesInAncestorsSync', () => {
      it('finds files in parent directory chain', () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.populateDirectorySync(directoryPath, {
          [fileName]: '',
          folder1: {
            [fileName]: '',
          },
          folder2: {
            [anotherFileName]: '',
          },
        });

        expect(fs.findFilesInAncestorsSync(fs.join(directoryPath, 'folder1'), fileName)).to.eql([
          fs.join(directoryPath, 'folder1', fileName),
          fs.join(directoryPath, fileName),
        ]);

        expect(fs.findFilesInAncestorsSync(fs.join(directoryPath, 'folder2'), anotherFileName)).to.eql([
          fs.join(directoryPath, 'folder2', anotherFileName),
        ]);
      });
    });

    describe('copyDirectorySync', () => {
      it('copies a directory and its children', () => {
        const { fs, tempDirectoryPath } = testInput;
        const sourcePath = fs.join(tempDirectoryPath, 'src');
        const destinationPath = fs.join(tempDirectoryPath, 'dist');

        fs.populateDirectorySync(sourcePath, {
          [fileName]: 'file in root',
          folder1: {
            [fileName]: 'file in sub-folder',
          },
          folder2: {
            folder3: {
              [anotherFileName]: 'file in deep folder',
            },
          },
          empty: {
            inside: {},
          },
        });

        fs.copyDirectorySync(sourcePath, destinationPath);

        expect(fs.readFileSync(fs.join(destinationPath, fileName), 'utf8')).to.eql('file in root');
        expect(fs.readFileSync(fs.join(destinationPath, 'folder1', fileName), 'utf8')).to.eql('file in sub-folder');
        expect(fs.readFileSync(fs.join(destinationPath, 'folder2/folder3', anotherFileName), 'utf8')).to.eql(
          'file in deep folder'
        );
        expect(fs.directoryExistsSync(fs.join(destinationPath, 'empty/inside'))).to.eql(true);
      });
    });

    describe('Extended API', () => {
      describe('ensureDirectorySync', () => {
        it(`creates intermediate directories`, () => {
          const { fs, tempDirectoryPath } = testInput;

          fs.populateDirectorySync(tempDirectoryPath, { a: {} });
          const dirPath = fs.join(tempDirectoryPath, 'animals', 'mammals', 'chiroptera');
          fs.ensureDirectorySync(dirPath);

          expect(fs.directoryExistsSync(dirPath)).to.equal(true);
        });

        it(`succeeds if directory already exists, preserves its contents`, () => {
          const { fs, tempDirectoryPath } = testInput;
          fs.populateDirectorySync(tempDirectoryPath, { animals: { mammals: { 'bat.txt': '🦇' } } });
          fs.ensureDirectorySync(fs.join(tempDirectoryPath, 'animals', 'mammals'));

          const filePath = fs.join(tempDirectoryPath, 'animals', 'mammals', 'bat.txt');
          expect(fs.readFileSync(filePath, 'utf8')).to.equal('🦇');
        });

        it(`throws when attempting to overwrite existing file`, () => {
          const { fs, tempDirectoryPath } = testInput;

          fs.populateDirectorySync(tempDirectoryPath, { 'bat.txt': '🦇' });
          const dirPath = fs.join(tempDirectoryPath, 'bat.txt');

          expect(() => fs.ensureDirectorySync(dirPath)).to.throw('EEXIST');
        });

        it(`throws when attempting to create a directory inside of a file`, () => {
          const { fs, tempDirectoryPath } = testInput;

          fs.populateDirectorySync(tempDirectoryPath, { 'bat.txt': '🦇' });
          const dirPath = fs.join(tempDirectoryPath, 'bat.txt', 'habitat');

          expect(() => fs.ensureDirectorySync(dirPath)).to.throw(/ENOTDIR|ENOENT/); // posix / windows
        });

        it('handles special paths gracefully', () => {
          const { fs, tempDirectoryPath } = testInput;

          fs.populateDirectorySync(tempDirectoryPath, { animals: {} });
          const originalCwd = fs.cwd();

          try {
            fs.chdir(fs.join(tempDirectoryPath, 'animals'));
            expect(() => fs.ensureDirectorySync('.')).to.not.throw();
            expect(() => fs.ensureDirectorySync('..')).to.not.throw();
          } finally {
            fs.chdir(originalCwd);
          }
        });
      });
    });
  });
}
