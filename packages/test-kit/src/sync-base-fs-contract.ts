import { expect } from 'chai';
import { IBaseFileSystemSync, FileSystemConstants } from '@file-services/types';
import type { ITestInput } from './types';
import { WatchEventsValidator } from './watch-events-validator';

const SAMPLE_CONTENT = 'content';
const DIFFERENT_CONTENT = 'another content';

export function syncBaseFsContract(testProvider: () => Promise<ITestInput<IBaseFileSystemSync>>): void {
  describe('SYNC file system contract', () => {
    let testInput: ITestInput<IBaseFileSystemSync>;

    beforeEach(async () => (testInput = await testProvider()));
    afterEach(async () => await testInput.dispose());

    describe('writing files', () => {
      it('can write a new file into an existing directory', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file');

        fs.writeFileSync(filePath, SAMPLE_CONTENT);

        expect(fs.statSync(filePath).isFile()).to.equal(true);
        expect(fs.readFileSync(filePath, 'utf8')).to.eql(SAMPLE_CONTENT);
      });

      it('can overwrite an existing file', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file');

        fs.writeFileSync(filePath, SAMPLE_CONTENT);
        fs.writeFileSync(filePath, DIFFERENT_CONTENT);

        expect(fs.statSync(filePath).isFile()).to.equal(true);
        expect(fs.readFileSync(filePath, 'utf8')).to.eql(DIFFERENT_CONTENT);
      });

      it('fails if writing a file to a non-existing directory', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'missing-dir', 'file');

        const expectedToFail = () => fs.writeFileSync(filePath, SAMPLE_CONTENT);

        expect(expectedToFail).to.throw('ENOENT');
      });

      it('fails if writing a file to a path already pointing to a directory', () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.mkdirSync(directoryPath);
        const expectedToFail = () => fs.writeFileSync(directoryPath, SAMPLE_CONTENT);

        expect(expectedToFail).to.throw('EISDIR');
      });

      it('fails if writing to a file without a name', () => {
        const { fs } = testInput;
        expect(() => fs.writeFileSync('', SAMPLE_CONTENT)).to.throw('ENOENT');
      });
    });

    describe('reading files', () => {
      it('can read the contents of a file', () => {
        const { fs, tempDirectoryPath } = testInput;

        const firstFilePath = fs.join(tempDirectoryPath, 'first-file');
        const secondFilePath = fs.join(tempDirectoryPath, 'second-file');

        fs.writeFileSync(firstFilePath, SAMPLE_CONTENT);
        fs.writeFileSync(secondFilePath, DIFFERENT_CONTENT);

        expect(fs.readFileSync(firstFilePath, 'utf8'), 'contents of first-file').to.eql(SAMPLE_CONTENT);
        expect(fs.readFileSync(secondFilePath, 'utf8'), 'contents of second-file').to.eql(DIFFERENT_CONTENT);
      });

      it('fails if reading a non-existing file', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'missing-file');

        const expectedToFail = () => fs.readFileSync(filePath, 'utf8');

        expect(expectedToFail).to.throw('ENOENT');
      });

      it('fails if reading a directory as a file', () => {
        const { fs, tempDirectoryPath } = testInput;
        const expectedToFail = () => fs.readFileSync(tempDirectoryPath, 'utf8');

        expect(expectedToFail).to.throw('EISDIR');
      });
    });

    describe('removing files', () => {
      it('can remove files', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file');

        fs.writeFileSync(filePath, SAMPLE_CONTENT);
        fs.unlinkSync(filePath);

        expect(() => fs.statSync(filePath)).to.throw('ENOENT');
      });

      it('fails if trying to remove a non-existing file', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'missing-file');

        const expectedToFail = () => fs.unlinkSync(filePath);

        expect(expectedToFail).to.throw('ENOENT');
      });

      it('fails if trying to remove a directory as a file', () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.mkdirSync(directoryPath);
        const expectedToFail = () => fs.unlinkSync(directoryPath);

        expect(expectedToFail).to.throw(); // linux throws `EISDIR`, mac throws `EPERM`
      });
    });

    describe('watching files', function () {
      this.timeout(10000);

      let validator: WatchEventsValidator;
      let testFilePath: string;

      beforeEach('create temp fixture file and intialize validator', async () => {
        const { fs, tempDirectoryPath } = testInput;
        const { watchService } = fs;
        validator = new WatchEventsValidator(watchService);

        testFilePath = fs.join(tempDirectoryPath, 'test-file');

        fs.writeFileSync(testFilePath, SAMPLE_CONTENT);
        await watchService.watchPath(testFilePath);
      });

      it('emits watch event when a watched file changes', async () => {
        const { fs } = testInput;

        fs.writeFileSync(testFilePath, DIFFERENT_CONTENT);

        await validator.validateEvents([{ path: testFilePath, stats: fs.statSync(testFilePath) }]);
        await validator.noMoreEvents();
      });

      it('emits watch event when a watched file is removed', async () => {
        const { fs } = testInput;

        fs.unlinkSync(testFilePath);

        await validator.validateEvents([{ path: testFilePath, stats: null }]);
        await validator.noMoreEvents();
      });

      it('keeps watching if file is deleted and recreated immediately', async () => {
        const { fs } = testInput;

        fs.writeFileSync(testFilePath, SAMPLE_CONTENT);
        fs.unlinkSync(testFilePath);
        fs.writeFileSync(testFilePath, SAMPLE_CONTENT);

        await validator.validateEvents([{ path: testFilePath, stats: fs.statSync(testFilePath) }]);

        fs.writeFileSync(testFilePath, SAMPLE_CONTENT);

        await validator.validateEvents([{ path: testFilePath, stats: fs.statSync(testFilePath) }]);
        await validator.noMoreEvents();
      });
    });

    describe('creating directories', () => {
      it('can create an empty directory inside an existing one', () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, 'new-dir');

        fs.mkdirSync(directoryPath);

        expect(fs.statSync(directoryPath).isDirectory()).to.equal(true);
        expect(fs.readdirSync(directoryPath)).to.eql([]);
      });

      it('fails if creating in a path pointing to an existing directory', () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.mkdirSync(directoryPath);
        const expectedToFail = () => fs.mkdirSync(directoryPath);

        expect(expectedToFail).to.throw('EEXIST');
      });

      it('fails if creating in a path pointing to an existing file', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file');

        fs.writeFileSync(filePath, SAMPLE_CONTENT);
        const expectedToFail = () => fs.mkdirSync(filePath);

        expect(expectedToFail).to.throw('EEXIST');
      });

      it('fails if creating a directory inside a non-existing directory', () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, 'outer', 'inner');

        const expectedToFail = () => fs.mkdirSync(directoryPath);

        expect(expectedToFail).to.throw('ENOENT');
      });

      it('fails if creating a directory inside of a file', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file');

        fs.writeFileSync(filePath, SAMPLE_CONTENT);
        const expectedToFail = () => fs.mkdirSync(fs.join(filePath, 'dir'));

        expect(expectedToFail).to.throw(/ENOTDIR|ENOENT/); // posix / windows
      });

      describe('recursively', () => {
        it('can create an empty directory inside an existing one', () => {
          const { fs, tempDirectoryPath } = testInput;
          const directoryPath = fs.join(tempDirectoryPath, 'new-dir');

          fs.mkdirSync(directoryPath, { recursive: true });

          expect(fs.statSync(directoryPath).isDirectory()).to.equal(true);
          expect(fs.readdirSync(directoryPath)).to.eql([]);
        });

        it('creates parent directory chain when possible', () => {
          const { fs, tempDirectoryPath } = testInput;
          const directoryPath = fs.join(tempDirectoryPath, 'missing', 'also-missing', 'new-dir');

          fs.mkdirSync(directoryPath, { recursive: true });

          expect(fs.statSync(directoryPath).isDirectory()).to.equal(true);
          expect(fs.readdirSync(directoryPath)).to.eql([]);
        });

        it('succeeds if creating in a path pointing to an existing directory', () => {
          const { fs, tempDirectoryPath } = testInput;
          const directoryPath = fs.join(tempDirectoryPath, 'dir');
          fs.mkdirSync(directoryPath);

          expect(() => fs.mkdirSync(directoryPath, { recursive: true })).to.not.throw();
        });

        it('fails if creating in a path pointing to an existing file', () => {
          const { fs, tempDirectoryPath } = testInput;
          const filePath = fs.join(tempDirectoryPath, 'file');
          fs.writeFileSync(filePath, SAMPLE_CONTENT);

          expect(() => fs.mkdirSync(filePath, { recursive: true })).to.throw('EEXIST');
        });

        it('fails if creating a directory inside of a file', () => {
          const { fs, tempDirectoryPath } = testInput;
          const filePath = fs.join(tempDirectoryPath, 'file');
          fs.writeFileSync(filePath, SAMPLE_CONTENT);

          expect(() => fs.mkdirSync(fs.join(filePath, 'dir'), { recursive: true })).to.throw('ENOTDIR');
        });
      });
    });

    describe('listing directories', () => {
      it('can list an existing directory', () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.mkdirSync(directoryPath);
        fs.writeFileSync(fs.join(directoryPath, 'file1'), SAMPLE_CONTENT);
        fs.writeFileSync(fs.join(directoryPath, 'camelCasedName'), SAMPLE_CONTENT);

        expect(fs.readdirSync(tempDirectoryPath)).to.eql(['dir']);
        const directoryContents = fs.readdirSync(directoryPath);
        expect(directoryContents).to.have.lengthOf(2);
        expect(directoryContents).to.contain('file1');
        expect(directoryContents).to.contain('camelCasedName');
      });

      it('fails if listing a non-existing directory', () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, 'missing-dir');

        const expectedToFail = () => fs.readdirSync(directoryPath);

        expect(expectedToFail).to.throw('ENOENT');
      });

      it('fails if listing a path pointing to a file', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file');

        fs.writeFileSync(filePath, SAMPLE_CONTENT);
        const expectedToFail = () => fs.readdirSync(filePath);

        expect(expectedToFail).to.throw('ENOTDIR');
      });
    });

    describe('removing directories', () => {
      it('can remove an existing directory', () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.mkdirSync(directoryPath);
        fs.rmdirSync(directoryPath);

        expect(() => fs.statSync(directoryPath)).to.throw('ENOENT');
      });

      it('fails if removing a non-empty directory', () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, 'dir');

        fs.mkdirSync(directoryPath);
        fs.writeFileSync(fs.join(directoryPath, 'file'), SAMPLE_CONTENT);
        const expectedToFail = () => fs.rmdirSync(directoryPath);

        expect(expectedToFail).to.throw('ENOTEMPTY');
      });

      it('fails if removing a non-existing directory', () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, 'missing-dir');

        const expectedToFail = () => fs.rmdirSync(directoryPath);

        expect(expectedToFail).to.throw('ENOENT');
      });

      it('fails if removing a path pointing to a file', () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, 'file');

        fs.writeFileSync(filePath, SAMPLE_CONTENT);
        const expectedToFail = () => fs.rmdirSync(filePath);

        expect(expectedToFail).to.throw();
      });
    });

    describe('watching directories', function () {
      this.timeout(10000);

      let validator: WatchEventsValidator;
      let testDirectoryPath: string;

      beforeEach('create temp fixture directory and intialize validator', async () => {
        const { fs, tempDirectoryPath } = testInput;
        validator = new WatchEventsValidator(fs.watchService);

        testDirectoryPath = fs.join(tempDirectoryPath, 'test-directory');
        fs.mkdirSync(testDirectoryPath);
      });

      it('fires a watch event when a file is added inside a watched directory', async () => {
        const { fs } = testInput;

        await fs.watchService.watchPath(testDirectoryPath);

        const testFilePath = fs.join(testDirectoryPath, 'test-file');
        fs.writeFileSync(testFilePath, SAMPLE_CONTENT);

        await validator.validateEvents([{ path: testFilePath, stats: fs.statSync(testFilePath) }]);
        await validator.noMoreEvents();
      });

      it('fires a watch event when a file is changed inside a watched directory', async () => {
        const { fs } = testInput;

        const testFilePath = fs.join(testDirectoryPath, 'test-file');
        fs.writeFileSync(testFilePath, SAMPLE_CONTENT);
        await fs.watchService.watchPath(testDirectoryPath);

        fs.writeFileSync(testFilePath, SAMPLE_CONTENT);

        await validator.validateEvents([{ path: testFilePath, stats: fs.statSync(testFilePath) }]);
        await validator.noMoreEvents();
      });

      it('fires a watch event when a file is removed inside a watched directory', async () => {
        const { fs } = testInput;

        const testFilePath = fs.join(testDirectoryPath, 'test-file');
        fs.writeFileSync(testFilePath, SAMPLE_CONTENT);
        await fs.watchService.watchPath(testDirectoryPath);

        fs.unlinkSync(testFilePath);

        await validator.validateEvents([{ path: testFilePath, stats: null }]);
        await validator.noMoreEvents();
      });
    });

    describe('watching both directories and files', function () {
      this.timeout(10000);

      let validator: WatchEventsValidator;
      let testDirectoryPath: string;
      let testFilePath: string;

      beforeEach('create temp fixture directory and intialize watchService', async () => {
        const { fs, tempDirectoryPath } = testInput;
        validator = new WatchEventsValidator(fs.watchService);

        testDirectoryPath = fs.join(tempDirectoryPath, 'test-directory');
        fs.mkdirSync(testDirectoryPath);
        testFilePath = fs.join(testDirectoryPath, 'test-file');
        fs.writeFileSync(testFilePath, SAMPLE_CONTENT);
      });

      it('allows watching a file and its containing directory', async () => {
        const { fs } = testInput;
        const { watchService } = fs;

        await watchService.watchPath(testFilePath);
        await watchService.watchPath(testDirectoryPath);

        fs.writeFileSync(testFilePath, SAMPLE_CONTENT);

        await validator.validateEvents([{ path: testFilePath, stats: fs.statSync(testFilePath) }]);
        await validator.noMoreEvents();
      });

      it('allows watching in any order', async () => {
        const { fs } = testInput;
        const { watchService } = fs;

        await watchService.watchPath(testDirectoryPath);
        await watchService.watchPath(testFilePath);

        fs.writeFileSync(testFilePath, SAMPLE_CONTENT);

        await validator.validateEvents([{ path: testFilePath, stats: fs.statSync(testFilePath) }]);
        await validator.noMoreEvents();
      });
    });

    describe('renaming directories and files', () => {
      it('moves a file', () => {
        const { fs, tempDirectoryPath } = testInput;

        const sourcePath = fs.join(tempDirectoryPath, 'file');
        const destinationPath = fs.join(tempDirectoryPath, 'dir', 'subdir', 'movedFile');

        fs.writeFileSync(sourcePath, SAMPLE_CONTENT);
        fs.mkdirSync(fs.join(tempDirectoryPath, 'dir'));
        fs.mkdirSync(fs.join(tempDirectoryPath, 'dir', 'subdir'));

        fs.renameSync(sourcePath, destinationPath);

        expect(fs.statSync(destinationPath).isFile()).to.equal(true);
        expect(fs.readFileSync(destinationPath, 'utf8')).to.eql(SAMPLE_CONTENT);
        expect(() => fs.statSync(sourcePath)).to.throw('ENOENT');
      });

      it('updates mtime', () => {
        const { fs, tempDirectoryPath } = testInput;

        const sourcePath = fs.join(tempDirectoryPath, 'file');
        const destinationPath = fs.join(tempDirectoryPath, 'file2');

        fs.writeFileSync(sourcePath, SAMPLE_CONTENT);
        const sourceMtime = fs.statSync(sourcePath).mtime;
        fs.renameSync(sourcePath, destinationPath);

        expect(fs.statSync(destinationPath).mtime).not.to.equal(sourceMtime);
      });

      it(`throws if source path doesn't exist`, () => {
        const { fs, tempDirectoryPath } = testInput;

        const sourcePath = fs.join(tempDirectoryPath, 'file');

        expect(() => fs.renameSync(sourcePath, fs.join(tempDirectoryPath, 'file2'))).to.throw('ENOENT');
      });

      it(`throws if the containing directory of the source path doesn't exist`, () => {
        const { fs, tempDirectoryPath } = testInput;

        const sourcePath = fs.join(tempDirectoryPath, 'unicorn', 'file');

        expect(() => fs.renameSync(sourcePath, fs.join(tempDirectoryPath, 'file2'))).to.throw('ENOENT');
      });

      it(`throws if destination containing path doesn't exist`, () => {
        const { fs, tempDirectoryPath } = testInput;

        const sourcePath = fs.join(tempDirectoryPath, 'file');

        fs.writeFileSync(sourcePath, SAMPLE_CONTENT);

        expect(() => fs.renameSync(sourcePath, fs.join(tempDirectoryPath, 'dir', 'file2'))).to.throw('ENOENT');
      });

      it('updates the parent directory of a renamed entry', () => {
        const { fs, tempDirectoryPath } = testInput;

        const sourcePath = fs.join(tempDirectoryPath, 'sourceDir');
        const destPath = fs.join(tempDirectoryPath, 'destDir');

        fs.mkdirSync(sourcePath);
        fs.writeFileSync(fs.join(sourcePath, 'file'), SAMPLE_CONTENT);

        fs.renameSync(sourcePath, destPath);

        expect(fs.readdirSync(tempDirectoryPath)).to.include('destDir');
      });

      describe('renaming directories', () => {
        it('allows renaming a complex directory structure to another destination', () => {
          const { fs, tempDirectoryPath } = testInput;

          const sourcePath = fs.join(tempDirectoryPath, 'dir');
          const destinationPath = fs.join(tempDirectoryPath, 'anotherDir', 'subdir', 'movedDir');
          fs.mkdirSync(fs.join(tempDirectoryPath, 'dir'));
          fs.mkdirSync(fs.join(tempDirectoryPath, 'anotherDir'));
          fs.mkdirSync(fs.join(tempDirectoryPath, 'anotherDir', 'subdir'));
          fs.writeFileSync(fs.join(sourcePath, 'file'), SAMPLE_CONTENT);

          fs.renameSync(sourcePath, destinationPath);

          expect(fs.statSync(destinationPath).isDirectory()).to.equal(true);
          expect(fs.readFileSync(fs.join(destinationPath, 'file'), 'utf8')).to.eql(SAMPLE_CONTENT);
          expect(() => fs.statSync(sourcePath)).to.throw('ENOENT');
        });

        it(`allows renaming a directory over a non-existing directory`, () => {
          const { fs, tempDirectoryPath } = testInput;

          const sourcePath = fs.join(tempDirectoryPath, 'sourceDir');

          fs.mkdirSync(sourcePath);
          fs.writeFileSync(fs.join(sourcePath, 'file'), SAMPLE_CONTENT);

          expect(() => fs.renameSync(sourcePath, fs.join(tempDirectoryPath, 'destDir'))).not.to.throw('EEXIST');
        });

        it(`allows renaming a directory over an empty directory`, () => {
          const { fs, tempDirectoryPath } = testInput;

          const sourcePath = fs.join(tempDirectoryPath, 'sourceDir');
          const destPath = fs.join(tempDirectoryPath, 'destDir');

          fs.mkdirSync(sourcePath);
          fs.mkdirSync(destPath);
          fs.writeFileSync(fs.join(sourcePath, 'file'), SAMPLE_CONTENT);

          expect(() => fs.renameSync(sourcePath, destPath)).not.to.throw('EEXIST');
        });
      });
    });

    it('correctly exposes whether it is case sensitive', () => {
      const { fs, tempDirectoryPath } = testInput;

      const filePath = fs.join(tempDirectoryPath, 'file');
      const upperCaseFilePath = filePath.toUpperCase();

      fs.writeFileSync(filePath, SAMPLE_CONTENT);

      if (fs.caseSensitive) {
        expect(() => fs.statSync(upperCaseFilePath)).to.throw('ENOENT');
      } else {
        expect(fs.statSync(upperCaseFilePath).isFile()).to.equal(true);
      }
    });

    describe('copying files/directories', () => {
      const SOURCE_FILE_NAME = 'file.txt';
      let targetDirectoryPath: string;
      let sourceFilePath: string;

      beforeEach(() => {
        const { fs, tempDirectoryPath } = testInput;

        targetDirectoryPath = fs.join(tempDirectoryPath, 'dir');
        fs.mkdirSync(targetDirectoryPath);
        sourceFilePath = fs.join(tempDirectoryPath, SOURCE_FILE_NAME);
        fs.writeFileSync(sourceFilePath, SAMPLE_CONTENT);
      });

      it('can copy file', () => {
        const { fs } = testInput;
        const targetPath = fs.join(targetDirectoryPath, SOURCE_FILE_NAME);
        fs.copyFileSync(sourceFilePath, targetPath);
        expect(fs.readFileSync(targetPath, 'utf8')).to.be.eql(SAMPLE_CONTENT);
      });

      it('fails if source does not exist', () => {
        const { fs, tempDirectoryPath } = testInput;
        const sourcePath = fs.join(tempDirectoryPath, 'nonExistingFileName.txt');
        const targetPath = fs.join(targetDirectoryPath, SOURCE_FILE_NAME);
        expect(() => fs.copyFileSync(sourcePath, targetPath)).to.throw('ENOENT');
      });

      it('fails if target containing directory does not exist', () => {
        const { fs } = testInput;
        const targetPath = fs.join(targetDirectoryPath, 'nonExistingDirectory', SOURCE_FILE_NAME);
        expect(() => fs.copyFileSync(sourceFilePath, targetPath)).to.throw('ENOENT');
      });

      it('overwrites destination file by default', () => {
        const { fs } = testInput;
        const targetPath = fs.join(targetDirectoryPath, SOURCE_FILE_NAME);
        fs.writeFileSync(targetPath, 'content to be overwritten');
        fs.copyFileSync(sourceFilePath, targetPath);
        expect(fs.readFileSync(targetPath, 'utf8')).to.be.eql(SAMPLE_CONTENT);
      });

      it('fails if destination exists and flag COPYFILE_EXCL passed', () => {
        const { fs } = testInput;
        const targetPath = fs.join(targetDirectoryPath, SOURCE_FILE_NAME);
        fs.writeFileSync(targetPath, 'content to be overwritten');
        expect(() => fs.copyFileSync(sourceFilePath, targetPath, FileSystemConstants.COPYFILE_EXCL)).to.throw('EEXIST');
      });
    });

    describe('symlinks', () => {
      const SOURCE_FILE_NAME = 'file.txt';
      const SYMBOL_FILE_NAME = 'symbol.txt';

      it('creates a link to a file', () => {
        const { fs, tempDirectoryPath } = testInput;
        const targetFilePath = fs.join(tempDirectoryPath, SOURCE_FILE_NAME);
        fs.writeFileSync(targetFilePath, SAMPLE_CONTENT);

        const sourceFilePath = fs.join(tempDirectoryPath, SYMBOL_FILE_NAME);

        fs.symlinkSync(targetFilePath, sourceFilePath);
        const fileContens = fs.readFileSync(sourceFilePath, 'utf8');
        expect(fileContens).to.eq(SAMPLE_CONTENT);
      });

      it('creates a link to a directory', () => {
        const { fs, tempDirectoryPath } = testInput;
        const dirPath = fs.join(tempDirectoryPath, 'dir');
        const symDirPath = fs.join(tempDirectoryPath, 'sym');
        const innerFolderPath = fs.join('dir', 'inner-dir');
        fs.mkdirSync(dirPath);
        fs.mkdirSync(fs.join(tempDirectoryPath, innerFolderPath));
        fs.writeFileSync(fs.join(dirPath, SOURCE_FILE_NAME), SAMPLE_CONTENT);
        fs.writeFileSync(fs.join(tempDirectoryPath, innerFolderPath, SOURCE_FILE_NAME), SAMPLE_CONTENT);

        fs.symlinkSync(dirPath, symDirPath, 'junction');
        const fileContens = fs.readFileSync(fs.join(symDirPath, SOURCE_FILE_NAME), 'utf8');
        const innerFileContens = fs.readFileSync(fs.join(symDirPath, 'inner-dir', SOURCE_FILE_NAME), 'utf8');
        expect(fileContens).to.eq(SAMPLE_CONTENT);
        expect(innerFileContens).to.eq(SAMPLE_CONTENT);
      });

      it('retrieves real path of symlinks properly', () => {
        const { fs, tempDirectoryPath: tempPath } = testInput;
        const tempDirectoryPath = fs.realpathSync(tempPath);
        const dirPath = fs.join(tempDirectoryPath, 'dir');
        const symDirPath = fs.join(tempDirectoryPath, 'sym');
        const innerFolderPath = fs.join('dir', 'inner-dir');
        const sourceFilePath = fs.join(dirPath, SOURCE_FILE_NAME);
        const innerSourcePath = fs.join(tempDirectoryPath, innerFolderPath, SOURCE_FILE_NAME);

        fs.mkdirSync(dirPath);
        fs.mkdirSync(fs.join(tempDirectoryPath, innerFolderPath));
        fs.writeFileSync(sourceFilePath, SAMPLE_CONTENT);
        fs.writeFileSync(innerSourcePath, SAMPLE_CONTENT);

        fs.symlinkSync(dirPath, symDirPath, 'junction');

        const fileContens = fs.realpathSync(fs.join(symDirPath, SOURCE_FILE_NAME));
        const innerFileContens = fs.realpathSync(fs.join(symDirPath, 'inner-dir', SOURCE_FILE_NAME));
        expect(fileContens).to.eq(sourceFilePath);
        expect(innerFileContens).to.eq(innerSourcePath);
      });

      it('retrieves link stats', () => {
        const { fs, tempDirectoryPath } = testInput;
        const targetFilePath = fs.join(tempDirectoryPath, SOURCE_FILE_NAME);
        fs.writeFileSync(targetFilePath, SAMPLE_CONTENT);

        const sourceFilePath = fs.join(tempDirectoryPath, SYMBOL_FILE_NAME);
        fs.symlinkSync(targetFilePath, sourceFilePath);
        const stats = fs.lstatSync(sourceFilePath);
        expect(stats.isSymbolicLink()).to.equal(true);
      });

      it('retrieves real file stats trough symlink', () => {
        const { fs, tempDirectoryPath } = testInput;
        const targetFilePath = fs.join(tempDirectoryPath, SOURCE_FILE_NAME);
        fs.writeFileSync(targetFilePath, SAMPLE_CONTENT);
        const realStats = fs.statSync(targetFilePath);

        const sourceFilePath = fs.join(tempDirectoryPath, SYMBOL_FILE_NAME);
        fs.symlinkSync(targetFilePath, sourceFilePath);
        const stats = fs.statSync(sourceFilePath);
        expect(stats.isSymbolicLink()).to.equal(false);
        expect(stats.isFile()).to.equal(true);
        expect(stats.birthtime.getTime()).to.equal(realStats.birthtime.getTime());
      });

      it('linking breaks after target file is deleted, but stmlink remains', () => {
        const { fs, tempDirectoryPath } = testInput;
        const targetFilePath = fs.join(tempDirectoryPath, SOURCE_FILE_NAME);
        fs.writeFileSync(targetFilePath, SAMPLE_CONTENT);
        const symbolFilePath = fs.join(tempDirectoryPath, SYMBOL_FILE_NAME);
        fs.symlinkSync(targetFilePath, symbolFilePath, 'file');
        fs.unlinkSync(targetFilePath);
        const stats = fs.lstatSync(symbolFilePath);
        expect(stats.isSymbolicLink()).to.eq(true);
        expect(() => fs.statSync(symbolFilePath)).to.throw('ENOENT');
      });

      it('fails linking to a directory in a non existing path', () => {
        const { fs, tempDirectoryPath } = testInput;
        const targetFilePath = fs.join(tempDirectoryPath, SOURCE_FILE_NAME);
        fs.writeFileSync(targetFilePath, SAMPLE_CONTENT);

        const dirPath = fs.join(tempDirectoryPath, 'dir');
        const symDirPath = fs.join(tempDirectoryPath, 'sym', 'another');

        fs.mkdirSync(dirPath);
        fs.copyFileSync(targetFilePath, fs.join(dirPath, SOURCE_FILE_NAME));

        expect(() => fs.symlinkSync(dirPath, symDirPath, 'junction')).to.throw('ENOENT');
      });

      it('fails linking to a file in a non existing path', () => {
        const { fs, tempDirectoryPath } = testInput;
        const targetFilePath = fs.join(tempDirectoryPath, SOURCE_FILE_NAME);

        const path = fs.join(tempDirectoryPath, 'inner', SYMBOL_FILE_NAME);
        expect(() => fs.symlinkSync(targetFilePath, path)).to.throw('ENOENT');
      });

      it('fails linking a file to an existing file', () => {
        const { fs, tempDirectoryPath } = testInput;
        const targetFilePath = fs.join(tempDirectoryPath, SOURCE_FILE_NAME);
        fs.writeFileSync(targetFilePath, SAMPLE_CONTENT);

        const path = fs.join(tempDirectoryPath, SYMBOL_FILE_NAME);
        fs.writeFileSync(path, SAMPLE_CONTENT);

        expect(() => fs.symlinkSync(targetFilePath, path)).to.throw('EEXIST');
      });

      it('links a file to an existing directory', () => {
        const { fs, tempDirectoryPath } = testInput;
        const targetFilePath = fs.join(tempDirectoryPath, SOURCE_FILE_NAME);
        const dirPath = fs.join(tempDirectoryPath, 'dir');

        fs.mkdirSync(dirPath);
        fs.symlinkSync(dirPath, targetFilePath, 'junction');

        expect(fs.lstatSync(targetFilePath).isSymbolicLink()).to.eq(true);
        expect(fs.statSync(targetFilePath).isSymbolicLink()).to.eq(false);
        expect(fs.statSync(targetFilePath).isDirectory()).to.eq(true);
      });

      it('fails linking a directory to an existing directory', () => {
        const { fs, tempDirectoryPath } = testInput;

        const dirPath = fs.join(tempDirectoryPath, 'dir');
        const linkedPath = fs.join(tempDirectoryPath, 'link');

        fs.mkdirSync(dirPath);
        fs.mkdirSync(linkedPath);

        expect(() => fs.symlinkSync(dirPath, linkedPath, 'junction')).to.throw('EEXIST');
      });

      it('fails linking a directory to an existing file', () => {
        const { fs, tempDirectoryPath } = testInput;
        const targetFilePath = fs.join(tempDirectoryPath, SOURCE_FILE_NAME);
        fs.writeFileSync(targetFilePath, SAMPLE_CONTENT);

        const dirPath = fs.join(tempDirectoryPath, 'dir');

        fs.mkdirSync(dirPath);

        expect(() => fs.symlinkSync(dirPath, targetFilePath, 'junction')).to.throw('EEXIST');
      });

      it('read links properly', () => {
        const { fs, tempDirectoryPath } = testInput;
        const targetFilePath = fs.join(tempDirectoryPath, SOURCE_FILE_NAME);
        const symbolPath = fs.join(tempDirectoryPath, SYMBOL_FILE_NAME);
        const dirPath = fs.join(tempDirectoryPath, 'dir');
        fs.writeFileSync(targetFilePath, SAMPLE_CONTENT);
        fs.symlinkSync(targetFilePath, symbolPath);
        expect(fs.readlinkSync(symbolPath)).to.equal(fs.resolve(symbolPath, targetFilePath));
        /** on Linux ans macos the EINVAL error will show, but in Windows, UNKOWN error is thrown */
        expect(() => fs.readlinkSync(targetFilePath)).to.throw();
        expect(() => fs.readlinkSync(dirPath)).to.throw('ENOENT');
      });
    });
  });
}
