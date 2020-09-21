import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { IBaseFileSystemAsync, FileSystemConstants } from '@file-services/types';
import type { ITestInput } from './types';
import { WatchEventsValidator } from './watch-events-validator';

chai.use(chaiAsPromised);

const SAMPLE_CONTENT = 'content';
const DIFFERENT_CONTENT = 'another content';

export function asyncBaseFsContract(testProvider: () => Promise<ITestInput<IBaseFileSystemAsync>>): void {
  describe('ASYNC file system contract', () => {
    let testInput: ITestInput<IBaseFileSystemAsync>;

    beforeEach(async () => (testInput = await testProvider()));
    afterEach(async () => await testInput.dispose());

    describe('writing files', () => {
      it('can write a new file into an existing directory', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { stat, readFile, writeFile },
          },
        } = testInput;
        const filePath = join(tempDirectoryPath, 'file');

        await writeFile(filePath, SAMPLE_CONTENT);

        expect((await stat(filePath)).isFile()).to.equal(true);
        expect(await readFile(filePath, 'utf8')).to.eql(SAMPLE_CONTENT);
      });

      it('can overwrite an existing file', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { stat, readFile, writeFile },
          },
        } = testInput;
        const filePath = join(tempDirectoryPath, 'file');

        await writeFile(filePath, SAMPLE_CONTENT);
        await writeFile(filePath, DIFFERENT_CONTENT);

        expect((await stat(filePath)).isFile()).to.equal(true);
        expect(await readFile(filePath, 'utf8')).to.eql(DIFFERENT_CONTENT);
      });

      it('fails if writing a file to a non-existing directory', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { writeFile },
          },
        } = testInput;
        const filePath = join(tempDirectoryPath, 'missing-dir', 'file');

        await expect(writeFile(filePath, SAMPLE_CONTENT)).to.be.rejectedWith('ENOENT');
      });

      it('fails if writing a file to a path already pointing to a directory', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { writeFile, mkdir },
          },
        } = testInput;
        const directoryPath = join(tempDirectoryPath, 'dir');

        await mkdir(directoryPath);

        await expect(writeFile(directoryPath, SAMPLE_CONTENT)).to.be.rejectedWith('EISDIR');
      });

      it('fails if writing to a file without a name', async () => {
        const {
          fs: {
            promises: { writeFile },
          },
        } = testInput;

        await expect(writeFile('', SAMPLE_CONTENT)).to.be.rejectedWith('ENOENT');
      });
    });

    describe('reading files', () => {
      it('can read the contents of a file', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { readFile, writeFile },
          },
        } = testInput;
        const firstFilePath = join(tempDirectoryPath, 'first-file');
        const secondFilePath = join(tempDirectoryPath, 'second-file');

        await writeFile(firstFilePath, SAMPLE_CONTENT);
        await writeFile(secondFilePath, DIFFERENT_CONTENT);

        expect(await readFile(firstFilePath, 'utf8'), 'contents of first-file').to.eql(SAMPLE_CONTENT);
        expect(await readFile(secondFilePath, 'utf8'), 'contents of second-file').to.eql(DIFFERENT_CONTENT);
      });

      it('fails if reading a non-existing file', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { readFile },
          },
        } = testInput;
        const filePath = join(tempDirectoryPath, 'missing-file');

        await expect(readFile(filePath, 'utf8')).to.be.rejectedWith('ENOENT');
      });

      it('fails if reading a directory as a file', async () => {
        const {
          fs: {
            promises: { readFile },
          },
          tempDirectoryPath,
        } = testInput;

        await expect(readFile(tempDirectoryPath, 'utf8')).to.be.rejectedWith('EISDIR');
      });
    });

    describe('removing files', () => {
      it('can remove files', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { stat, unlink, writeFile },
          },
        } = testInput;
        const filePath = join(tempDirectoryPath, 'file');

        await writeFile(filePath, SAMPLE_CONTENT);
        await unlink(filePath);

        await expect(stat(filePath)).to.be.rejectedWith('ENOENT');
      });

      it('fails if trying to remove a non-existing file', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { unlink },
          },
        } = testInput;
        const filePath = join(tempDirectoryPath, 'missing-file');

        await expect(unlink(filePath)).to.be.rejectedWith('ENOENT');
      });

      it('fails if trying to remove a directory as a file', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { mkdir, unlink },
          },
        } = testInput;
        const directoryPath = join(tempDirectoryPath, 'dir');

        await mkdir(directoryPath);

        await expect(unlink(directoryPath)).to.be.rejectedWith(); // linux throws `EISDIR`, mac throws `EPERM`
      });
    });

    describe('watching files', function () {
      this.timeout(10000);

      let validator: WatchEventsValidator;
      let testFilePath: string;

      beforeEach('create temp fixture file and intialize validator', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { writeFile },
            watchService,
          },
        } = testInput;
        validator = new WatchEventsValidator(watchService);

        testFilePath = join(tempDirectoryPath, 'test-file');

        await writeFile(testFilePath, SAMPLE_CONTENT);
        await watchService.watchPath(testFilePath);
      });

      it('emits watch event when a watched file changes', async () => {
        const {
          fs: {
            promises: { writeFile, stat },
          },
        } = testInput;

        await writeFile(testFilePath, DIFFERENT_CONTENT);

        await validator.validateEvents([{ path: testFilePath, stats: await stat(testFilePath) }]);
        await validator.noMoreEvents();
      });

      it('emits watch event when a watched file is removed', async () => {
        const {
          fs: {
            promises: { unlink },
          },
        } = testInput;

        await unlink(testFilePath);

        await validator.validateEvents([{ path: testFilePath, stats: null }]);
        await validator.noMoreEvents();
      });

      it('keeps watching if file is deleted and recreated immediately', async () => {
        const {
          fs: {
            promises: { unlink, writeFile, stat },
          },
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

    describe('creating directories', () => {
      it('can create an empty directory inside an existing one', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { mkdir, stat, readdir },
          },
        } = testInput;
        const directoryPath = join(tempDirectoryPath, 'new-dir');

        await mkdir(directoryPath);

        expect((await stat(directoryPath)).isDirectory()).to.equal(true);
        expect(await readdir(directoryPath)).to.eql([]);
      });

      it('fails if creating in a path pointing to an existing directory', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { mkdir },
          },
        } = testInput;
        const directoryPath = join(tempDirectoryPath, 'dir');

        await mkdir(directoryPath);

        await expect(mkdir(directoryPath)).to.be.rejectedWith('EEXIST');
      });

      it('fails if creating in a path pointing to an existing file', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { mkdir, writeFile },
          },
        } = testInput;
        const filePath = join(tempDirectoryPath, 'file');

        await writeFile(filePath, SAMPLE_CONTENT);

        await expect(mkdir(filePath)).to.be.rejectedWith('EEXIST');
      });

      it('fails if creating a directory inside a non-existing directory', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { mkdir },
          },
        } = testInput;
        const directoryPath = join(tempDirectoryPath, 'outer', 'inner');

        await expect(mkdir(directoryPath)).to.be.rejectedWith('ENOENT');
      });

      it('fails if creating a directory inside of a file', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { mkdir, writeFile },
          },
        } = testInput;

        const filePath = join(tempDirectoryPath, 'file');

        await writeFile(filePath, SAMPLE_CONTENT);

        await expect(mkdir(join(filePath, 'dir'))).to.be.rejectedWith(/ENOTDIR|ENOENT/); // posix / windows
      });

      describe('recursively', () => {
        it('can create an empty directory inside an existing one', async () => {
          const { fs, tempDirectoryPath } = testInput;
          const directoryPath = fs.join(tempDirectoryPath, 'new-dir');

          await fs.promises.mkdir(directoryPath, { recursive: true });

          expect((await fs.promises.stat(directoryPath)).isDirectory()).to.equal(true);
          expect(await fs.promises.readdir(directoryPath)).to.eql([]);
        });

        it('creates parent directory chain when possible', async () => {
          const { fs, tempDirectoryPath } = testInput;
          const directoryPath = fs.join(tempDirectoryPath, 'missing', 'also-missing', 'new-dir');

          await fs.promises.mkdir(directoryPath, { recursive: true });

          expect((await fs.promises.stat(directoryPath)).isDirectory()).to.equal(true);
          expect(await fs.promises.readdir(directoryPath)).to.eql([]);
        });

        it('succeeds if creating in a path pointing to an existing directory', async () => {
          const { fs, tempDirectoryPath } = testInput;
          const directoryPath = fs.join(tempDirectoryPath, 'dir');
          await fs.promises.mkdir(directoryPath);

          await expect(fs.promises.mkdir(directoryPath, { recursive: true })).to.eventually.become(undefined);
        });

        it('fails if creating in a path pointing to an existing file', async () => {
          const { fs, tempDirectoryPath } = testInput;
          const filePath = fs.join(tempDirectoryPath, 'file');
          await fs.promises.writeFile(filePath, SAMPLE_CONTENT);

          await expect(fs.promises.mkdir(filePath, { recursive: true })).to.eventually.be.rejectedWith('EEXIST');
        });

        it('fails if creating a directory inside of a file', async () => {
          const { fs, tempDirectoryPath } = testInput;
          const filePath = fs.join(tempDirectoryPath, 'file');
          await fs.promises.writeFile(filePath, SAMPLE_CONTENT);

          await expect(fs.promises.mkdir(fs.join(filePath, 'dir'), { recursive: true })).to.eventually.be.rejectedWith(
            'ENOTDIR'
          );
        });
      });
    });

    describe('listing directories', () => {
      it('can list an existing directory', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { mkdir, writeFile, readdir },
          },
        } = testInput;
        const directoryPath = join(tempDirectoryPath, 'dir');

        await mkdir(directoryPath);
        await writeFile(join(directoryPath, 'file1'), SAMPLE_CONTENT);
        await writeFile(join(directoryPath, 'camelCasedName'), SAMPLE_CONTENT);

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
            join,
            promises: { readdir },
          },
        } = testInput;
        const directoryPath = join(tempDirectoryPath, 'missing-dir');

        await expect(readdir(directoryPath)).to.be.rejectedWith('ENOENT');
      });

      it('fails if listing a path pointing to a file', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { writeFile, readdir },
          },
        } = testInput;
        const filePath = join(tempDirectoryPath, 'file');

        await writeFile(filePath, SAMPLE_CONTENT);

        await expect(readdir(filePath)).to.be.rejectedWith('ENOTDIR');
      });
    });

    describe('removing directories', () => {
      it('can remove an existing directory', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { mkdir, rmdir, stat },
          },
        } = testInput;
        const directoryPath = join(tempDirectoryPath, 'dir');

        await mkdir(directoryPath);
        await rmdir(directoryPath);

        await expect(stat(directoryPath)).to.be.rejectedWith('ENOENT');
      });

      it('fails if removing a non-empty directory', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { mkdir, writeFile, rmdir },
          },
        } = testInput;
        const directoryPath = join(tempDirectoryPath, 'dir');

        await mkdir(directoryPath);
        await writeFile(join(directoryPath, 'file'), SAMPLE_CONTENT);

        await expect(rmdir(directoryPath)).to.be.rejectedWith('ENOTEMPTY');
      });

      it('fails if removing a non-existing directory', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { rmdir },
          },
        } = testInput;
        const directoryPath = join(tempDirectoryPath, 'missing-dir');

        await expect(rmdir(directoryPath)).to.be.rejectedWith('ENOENT');
      });

      it('fails if removing a path pointing to a file', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { rmdir, writeFile },
          },
        } = testInput;
        const filePath = join(tempDirectoryPath, 'file');

        await writeFile(filePath, SAMPLE_CONTENT);

        await expect(rmdir(filePath)).to.be.rejectedWith();
      });
    });

    describe('watching directories', function () {
      this.timeout(10000);

      let validator: WatchEventsValidator;
      let testDirectoryPath: string;

      beforeEach('create temp fixture directory and intialize validator', async () => {
        const {
          tempDirectoryPath,
          fs: {
            promises: { mkdir },
            join,
            watchService,
          },
        } = testInput;
        validator = new WatchEventsValidator(watchService);

        testDirectoryPath = join(tempDirectoryPath, 'test-directory');
        await mkdir(testDirectoryPath);
      });

      it('fires a watch event when a file is added inside a watched directory', async () => {
        const {
          fs: {
            promises: { writeFile, stat },
            join,
            watchService,
          },
        } = testInput;

        await watchService.watchPath(testDirectoryPath);

        const testFilePath = join(testDirectoryPath, 'test-file');
        await writeFile(testFilePath, SAMPLE_CONTENT);

        await validator.validateEvents([{ path: testFilePath, stats: await stat(testFilePath) }]);
        await validator.noMoreEvents();
      });

      it('fires a watch event when a file is changed inside a watched directory', async () => {
        const {
          fs: {
            promises: { writeFile, stat },
            join,
            watchService,
          },
        } = testInput;

        const testFilePath = join(testDirectoryPath, 'test-file');
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
            join,
            watchService,
          },
        } = testInput;

        const testFilePath = join(testDirectoryPath, 'test-file');
        await writeFile(testFilePath, SAMPLE_CONTENT);
        await watchService.watchPath(testDirectoryPath);

        await unlink(testFilePath);

        await validator.validateEvents([{ path: testFilePath, stats: null }]);
        await validator.noMoreEvents();
      });
    });

    describe('watching both directories and files', function () {
      this.timeout(10000);

      let validator: WatchEventsValidator;
      let testDirectoryPath: string;
      let testFilePath: string;

      beforeEach('create temp fixture directory and intialize watch service', async () => {
        const {
          tempDirectoryPath,
          fs: {
            promises: { writeFile, mkdir },
            join,
            watchService,
          },
        } = testInput;
        validator = new WatchEventsValidator(watchService);

        testDirectoryPath = join(tempDirectoryPath, 'test-directory');
        await mkdir(testDirectoryPath);
        testFilePath = join(testDirectoryPath, 'test-file');
        await writeFile(testFilePath, SAMPLE_CONTENT);
      });

      it('allows watching a file and its containing directory', async () => {
        const {
          fs: {
            promises: { writeFile, stat },
            watchService,
          },
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
            watchService,
          },
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
            join,
            promises: { writeFile, stat, mkdir, rename, readFile },
          },
        } = testInput;
        const sourcePath = join(tempDirectoryPath, 'file');
        const destinationPath = join(tempDirectoryPath, 'dir', 'subdir', 'movedFile');

        await writeFile(sourcePath, SAMPLE_CONTENT);
        await mkdir(join(tempDirectoryPath, 'dir'));
        await mkdir(join(tempDirectoryPath, 'dir', 'subdir'));

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
            join,
            promises: { rename },
          },
        } = testInput;
        const sourcePath = join(tempDirectoryPath, 'file');
        const destPath = join(tempDirectoryPath, 'file2');

        await expect(rename(sourcePath, destPath)).to.be.rejectedWith('ENOENT');
      });

      it(`throws if the containing directory of the source path doesn't exist`, async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { rename },
          },
        } = testInput;
        const sourcePath = join(tempDirectoryPath, 'unicorn', 'file');
        const destPath = join(tempDirectoryPath, 'file2');

        await expect(rename(sourcePath, destPath)).to.be.rejectedWith('ENOENT');
      });

      it(`throws if destination containing path doesn't exist`, async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { rename, writeFile },
          },
        } = testInput;
        const sourcePath = join(tempDirectoryPath, 'file');
        const destPath = join(tempDirectoryPath, 'dir', 'file2');

        await writeFile(sourcePath, SAMPLE_CONTENT);

        await expect(rename(sourcePath, destPath)).to.be.rejectedWith('ENOENT');
      });

      it('updates the parent directory of a renamed entry', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { rename, mkdir, readdir, writeFile },
          },
        } = testInput;
        const sourcePath = join(tempDirectoryPath, 'sourceDir');
        const destPath = join(tempDirectoryPath, 'destDir');

        await mkdir(sourcePath);
        await writeFile(join(sourcePath, 'file'), SAMPLE_CONTENT);

        await rename(sourcePath, destPath);

        expect(await readdir(tempDirectoryPath)).to.include('destDir');
      });

      describe('renaming directories', () => {
        it('allows renaming a complex directory structure to another destination', async () => {
          const {
            tempDirectoryPath,
            fs: {
              join,
              promises: { rename, mkdir, writeFile, stat, readFile },
            },
          } = testInput;
          const sourcePath = join(tempDirectoryPath, 'dir');
          const destinationPath = join(tempDirectoryPath, 'anotherDir', 'subdir', 'movedDir');
          await mkdir(join(tempDirectoryPath, 'dir'));
          await mkdir(join(tempDirectoryPath, 'anotherDir'));
          await mkdir(join(tempDirectoryPath, 'anotherDir', 'subdir'));
          await writeFile(join(sourcePath, 'file'), SAMPLE_CONTENT);

          await rename(sourcePath, destinationPath);

          expect((await stat(destinationPath)).isDirectory()).to.equal(true);
          expect(await readFile(join(destinationPath, 'file'), 'utf8')).to.eql(SAMPLE_CONTENT);
          await expect(stat(sourcePath)).to.be.rejectedWith('ENOENT');
        });

        it(`allows renaming a directory over a non-existing directory`, async () => {
          const {
            tempDirectoryPath,
            fs: {
              join,
              promises: { rename, mkdir, writeFile },
            },
          } = testInput;
          const sourcePath = join(tempDirectoryPath, 'sourceDir');

          await mkdir(sourcePath);
          await writeFile(join(sourcePath, 'file'), SAMPLE_CONTENT);

          await expect(rename(sourcePath, join(tempDirectoryPath, 'destDir'))).to.not.be.rejectedWith('EEXIST');
        });

        it(`allows renaming a directory over an empty directory`, async () => {
          const {
            tempDirectoryPath,
            fs: {
              join,
              promises: { rename, mkdir, writeFile },
            },
          } = testInput;
          const sourcePath = join(tempDirectoryPath, 'sourceDir');
          const destPath = join(tempDirectoryPath, 'destDir');

          await mkdir(sourcePath);
          await mkdir(destPath);
          await writeFile(join(sourcePath, 'file'), SAMPLE_CONTENT);

          await expect(rename(sourcePath, destPath)).to.not.be.rejectedWith('EEXIST');
        });
      });
    });

    it('correctly exposes whether it is case sensitive', async () => {
      const {
        tempDirectoryPath,
        fs: {
          join,
          caseSensitive,
          promises: { writeFile, stat },
        },
      } = testInput;
      const filePath = join(tempDirectoryPath, 'file');
      const upperCaseFilePath = filePath.toUpperCase();

      await writeFile(filePath, SAMPLE_CONTENT);

      if (caseSensitive) {
        await expect(stat(upperCaseFilePath)).to.be.rejectedWith('ENOENT');
      } else {
        expect((await stat(upperCaseFilePath)).isFile()).to.equal(true);
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
            join,
            promises: { writeFile, mkdir },
          },
        } = testInput;
        targetDirectoryPath = join(tempDirectoryPath, 'dir');

        await mkdir(targetDirectoryPath);
        sourceFilePath = join(tempDirectoryPath, SOURCE_FILE_NAME);
        await writeFile(sourceFilePath, SAMPLE_CONTENT);
      });

      it('can copy file', async () => {
        const {
          fs: {
            join,
            promises: { copyFile, readFile },
          },
        } = testInput;
        const targetPath = join(targetDirectoryPath, SOURCE_FILE_NAME);

        await copyFile(sourceFilePath, targetPath);

        expect(await readFile(targetPath, 'utf8')).to.be.eql(SAMPLE_CONTENT);
      });

      it('fails if source does not exist', async () => {
        const {
          tempDirectoryPath,
          fs: {
            join,
            promises: { copyFile },
          },
        } = testInput;
        const sourcePath = join(tempDirectoryPath, 'nonExistingFileName.txt');
        const targetPath = join(targetDirectoryPath, SOURCE_FILE_NAME);

        await expect(copyFile(sourcePath, targetPath)).to.be.rejectedWith('ENOENT');
      });

      it('fails if target containing directory does not exist', async () => {
        const {
          fs: {
            join,
            promises: { copyFile },
          },
        } = testInput;
        const targetPath = join(targetDirectoryPath, 'nonExistingDirectory', SOURCE_FILE_NAME);

        await expect(copyFile(sourceFilePath, targetPath)).to.be.rejectedWith('ENOENT');
      });

      it('overwrites destination file by default', async () => {
        const {
          fs: {
            join,
            promises: { copyFile, readFile, writeFile },
          },
        } = testInput;
        const targetPath = join(targetDirectoryPath, SOURCE_FILE_NAME);

        await writeFile(targetPath, 'content to be overwritten');
        await copyFile(sourceFilePath, targetPath);

        expect(await readFile(targetPath, 'utf8')).to.be.eql(SAMPLE_CONTENT);
      });

      it('fails if destination exists and flag COPYFILE_EXCL passed', async () => {
        const {
          fs: {
            join,
            promises: { copyFile, writeFile },
          },
        } = testInput;
        const targetPath = join(targetDirectoryPath, SOURCE_FILE_NAME);

        await writeFile(targetPath, 'content to be overwritten');

        await expect(copyFile(sourceFilePath, targetPath, FileSystemConstants.COPYFILE_EXCL)).to.be.rejectedWith(
          'EEXIST'
        );
      });
    });

    describe('symlinks', () => {
      const SOURCE_FILE_NAME = 'file.txt';
      const SYMBOL_FILE_NAME = 'symbol.txt';

      it('creates a link to a file', async () => {
        const {
          fs: { promises, join },
          tempDirectoryPath,
        } = testInput;
        const { writeFile, symlink, readFile } = promises;
        const targetFilePath = join(tempDirectoryPath, SOURCE_FILE_NAME);
        await writeFile(targetFilePath, SAMPLE_CONTENT);

        const sourceFilePath = join(tempDirectoryPath, SYMBOL_FILE_NAME);

        await symlink(targetFilePath, sourceFilePath);
        const fileContens = await readFile(sourceFilePath, 'utf8');
        expect(fileContens).to.eq(SAMPLE_CONTENT);
      });

      it('creates a link to a directory', async () => {
        const {
          fs: { promises, join },
          tempDirectoryPath,
        } = testInput;
        const dirPath = join(tempDirectoryPath, 'dir');
        const symDirPath = join(tempDirectoryPath, 'sym');
        const innerFolderPath = join('dir', 'inner-dir');
        await promises.mkdir(dirPath);
        await promises.mkdir(join(tempDirectoryPath, innerFolderPath));
        await promises.writeFile(join(dirPath, SOURCE_FILE_NAME), SAMPLE_CONTENT);
        await promises.writeFile(join(tempDirectoryPath, innerFolderPath, SOURCE_FILE_NAME), SAMPLE_CONTENT);

        await promises.symlink(dirPath, symDirPath, 'junction');
        const fileContens = await promises.readFile(join(symDirPath, SOURCE_FILE_NAME), 'utf8');
        const innerFileContens = await promises.readFile(join(symDirPath, 'inner-dir', SOURCE_FILE_NAME), 'utf8');
        expect(fileContens).to.eq(SAMPLE_CONTENT);
        expect(innerFileContens).to.eq(SAMPLE_CONTENT);
      });

      it('retrieves real path of symlinks properly', async () => {
        const {
          fs: { promises, join },
          tempDirectoryPath: tempPath,
        } = testInput;
        const tempDirectoryPath = await promises.realpath(tempPath);
        const dirPath = join(tempDirectoryPath, 'dir');
        const symDirPath = join(tempDirectoryPath, 'sym');
        const innerFolderPath = join('dir', 'inner-dir');
        const sourceFilePath = join(dirPath, SOURCE_FILE_NAME);
        const innerSourcePath = join(tempDirectoryPath, innerFolderPath, SOURCE_FILE_NAME);

        await promises.mkdir(dirPath);
        await promises.mkdir(join(tempDirectoryPath, innerFolderPath));
        await promises.writeFile(sourceFilePath, SAMPLE_CONTENT);
        await promises.writeFile(innerSourcePath, SAMPLE_CONTENT);

        await promises.symlink(dirPath, symDirPath, 'junction');
        const realPath = await promises.realpath(join(symDirPath, SOURCE_FILE_NAME));
        const innerRealPath = await promises.realpath(join(symDirPath, 'inner-dir', SOURCE_FILE_NAME));
        expect(realPath).to.eq(sourceFilePath);
        expect(innerRealPath).to.eq(join(innerSourcePath));
      });

      it('retrieves link stats', async () => {
        const {
          fs: { promises, join },
          tempDirectoryPath,
        } = testInput;
        const { writeFile, symlink, lstat } = promises;
        const targetFilePath = join(tempDirectoryPath, SOURCE_FILE_NAME);
        await writeFile(targetFilePath, SAMPLE_CONTENT);

        const sourceFilePath = join(tempDirectoryPath, SYMBOL_FILE_NAME);
        await symlink(targetFilePath, sourceFilePath);
        const stats = await lstat(sourceFilePath);
        expect(stats.isSymbolicLink()).to.equal(true);
      });

      it('retrieves real file stats trough symlink', async () => {
        const {
          fs: { promises, join },
          tempDirectoryPath,
        } = testInput;
        const { stat, writeFile, symlink } = promises;
        const targetFilePath = join(tempDirectoryPath, SOURCE_FILE_NAME);
        await writeFile(targetFilePath, SAMPLE_CONTENT);
        const realStats = await stat(targetFilePath);

        const sourceFilePath = join(tempDirectoryPath, SYMBOL_FILE_NAME);
        await symlink(targetFilePath, sourceFilePath);
        const stats = await stat(sourceFilePath);
        expect(stats.isSymbolicLink()).to.equal(false);
        expect(stats.isFile()).to.equal(true);
        expect(stats.birthtime.getTime()).to.equal(realStats.birthtime.getTime());
      });

      it('linking breaks after target file is deleted, but stmlink remains', async () => {
        const {
          fs: { promises, join },
          tempDirectoryPath,
        } = testInput;
        promises;
        const targetFilePath = join(tempDirectoryPath, SOURCE_FILE_NAME);
        await promises.writeFile(targetFilePath, SAMPLE_CONTENT);
        const symbolFilePath = join(tempDirectoryPath, SYMBOL_FILE_NAME);
        await promises.symlink(targetFilePath, symbolFilePath, 'file');
        await promises.unlink(targetFilePath);
        const lstats = await promises.lstat(symbolFilePath);
        expect(lstats.isSymbolicLink()).to.eq(true);
        await expect(promises.stat(symbolFilePath)).to.eventually.be.rejectedWith('ENOENT');
      });

      it('fails linking to a directory in a non existing path', async () => {
        const {
          fs: { promises, join },
          tempDirectoryPath,
        } = testInput;
        const targetFilePath = join(tempDirectoryPath, SOURCE_FILE_NAME);
        await promises.writeFile(targetFilePath, SAMPLE_CONTENT);

        const dirPath = join(tempDirectoryPath, 'dir');
        const symDirPath = join(tempDirectoryPath, 'sym', 'another');

        await promises.mkdir(dirPath);
        await promises.copyFile(targetFilePath, join(dirPath, SOURCE_FILE_NAME));

        await expect(promises.symlink(dirPath, symDirPath, 'junction')).to.eventually.be.rejectedWith('ENOENT');
      });

      it('fails linking to a file in a non existing path', async () => {
        const {
          fs: { promises, join },
          tempDirectoryPath,
        } = testInput;
        const targetFilePath = join(tempDirectoryPath, SOURCE_FILE_NAME);

        const path = join(tempDirectoryPath, 'inner', SYMBOL_FILE_NAME);
        await expect(promises.symlink(targetFilePath, path)).to.eventually.be.rejectedWith('ENOENT');
      });

      it('fails linking a file to an existing file', async () => {
        const {
          fs: { promises, join },
          tempDirectoryPath,
        } = testInput;
        const targetFilePath = join(tempDirectoryPath, SOURCE_FILE_NAME);
        await promises.writeFile(targetFilePath, SAMPLE_CONTENT);

        const path = join(tempDirectoryPath, SYMBOL_FILE_NAME);
        await promises.writeFile(path, SAMPLE_CONTENT);

        await expect(promises.symlink(targetFilePath, path)).to.eventually.be.rejectedWith('EEXIST');
      });

      it('links a file to an existing directory', async () => {
        const {
          fs: { join, promises },
          tempDirectoryPath,
        } = testInput;
        const targetFilePath = join(tempDirectoryPath, SOURCE_FILE_NAME);
        const dirPath = join(tempDirectoryPath, 'dir');

        await promises.mkdir(dirPath);
        await promises.symlink(dirPath, targetFilePath, 'junction');
        const stats = await promises.stat(targetFilePath);
        const lstats = await promises.lstat(targetFilePath);
        expect(lstats.isSymbolicLink()).to.eq(true);
        expect(stats.isSymbolicLink()).to.eq(false);
        expect(stats.isDirectory()).to.eq(true);
      });

      it('fails linking a directory to an existing directory', async () => {
        const {
          fs: { join, promises },
          tempDirectoryPath,
        } = testInput;

        const dirPath = join(tempDirectoryPath, 'dir');
        const linkedPath = join(tempDirectoryPath, 'link');

        await promises.mkdir(dirPath);
        await promises.mkdir(linkedPath);

        await expect(promises.symlink(dirPath, linkedPath, 'junction')).to.eventually.be.rejectedWith('EEXIST');
      });

      it('fails linking a directory to an existing file', async () => {
        const {
          fs: { join, promises },
          tempDirectoryPath,
        } = testInput;
        const targetFilePath = join(tempDirectoryPath, SOURCE_FILE_NAME);
        await promises.writeFile(targetFilePath, SAMPLE_CONTENT);

        const dirPath = join(tempDirectoryPath, 'dir');

        await promises.mkdir(dirPath);

        await expect(promises.symlink(dirPath, targetFilePath, 'junction')).to.eventually.be.rejectedWith('EEXIST');
      });

      it('read links properly', async () => {
        const {
          fs: { promises, join, resolve },
          tempDirectoryPath,
        } = testInput;
        const targetFilePath = join(tempDirectoryPath, SOURCE_FILE_NAME);
        const symbolPath = join(tempDirectoryPath, SYMBOL_FILE_NAME);
        const dirPath = join(tempDirectoryPath, 'dir');
        await promises.writeFile(targetFilePath, SAMPLE_CONTENT);
        await promises.symlink(targetFilePath, symbolPath);
        expect(await promises.readlink(symbolPath)).to.equal(resolve(symbolPath, targetFilePath));
        /** on Linux ans macos the EINVAL error will show, but in Windows, UNKOWN error is thrown */
        await expect(promises.readlink(targetFilePath)).to.eventually.be.rejectedWith();
        await expect(promises.readlink(dirPath)).to.eventually.be.rejectedWith('ENOENT');
      });
    });
  });
}
