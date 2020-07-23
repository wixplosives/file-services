import { expect } from 'chai';
import type { IFileSystemSync } from '@file-services/types';
import type { ITestInput } from './types';

export function syncUtilsContract(testProvider: () => Promise<ITestInput<IFileSystemSync>>): void {
  describe('SYNC utilities contract', () => {
    let testInput: ITestInput<IFileSystemSync>;

    beforeEach(async () => (testInput = await testProvider()));
    afterEach(async () => await testInput.dispose());

    describe('ensureDirectorySync', () => {
      it(`creates intermediate directories`, () => {
        const { fs, tempDirectoryPath } = testInput;

        fs.populateDirectorySync(tempDirectoryPath, { a: {} });
        const newDirPath = fs.join(tempDirectoryPath, 'animals', 'mammals', 'chiroptera');
        fs.ensureDirectorySync(newDirPath);

        expect(fs.directoryExistsSync(newDirPath)).to.equal(true);
      });

      it(`succeeds if directory already exists, preserves its contents`, () => {
        const { fs, tempDirectoryPath } = testInput;
        fs.populateDirectorySync(tempDirectoryPath, { animals: { mammals: { 'vesper-bat.txt': '🦇' } } });
        fs.ensureDirectorySync(fs.join(tempDirectoryPath, 'animals', 'mammals'));

        expect(
          fs.readFileSync(fs.join(tempDirectoryPath, 'animals', 'mammals', 'vesper-bat.txt'), { encoding: 'utf-8' })
        ).to.equal('🦇');
      });

      it(`throws when attempting to overwrite existing file`, () => {
        const { fs, tempDirectoryPath } = testInput;

        fs.populateDirectorySync(tempDirectoryPath, { 'vesper-bat.txt': '🦇' });
        const newDirPath = fs.join(tempDirectoryPath, 'vesper-bat.txt');

        expect(() => fs.ensureDirectorySync(newDirPath)).to.throw('EEXIST');
      });

      it(`throws when attempting to create a directory inside of a file`, () => {
        const { fs, tempDirectoryPath } = testInput;

        fs.populateDirectorySync(tempDirectoryPath, { 'vesper-bat.txt': '🦇' });
        const newDirPath = fs.join(tempDirectoryPath, 'vesper-bat.txt', 'habitat');

        expect(() => fs.ensureDirectorySync(newDirPath)).to.throw('ENOTDIR');
      });

      it('handles special paths gracefully', () => {
        const { fs, tempDirectoryPath } = testInput;

        fs.chdir(tempDirectoryPath);
        expect(() => fs.ensureDirectorySync('.')).to.not.throw();
        expect(() => fs.ensureDirectorySync('..')).to.not.throw();

        // This doesn't match node fs, which considers '' to be different from '.',
        // fs.statSync('') throws ENOENT, but fs.statSync('.') succeeds.
        expect(() => fs.ensureDirectorySync('')).to.not.throw();
      });
    });
  });
}
