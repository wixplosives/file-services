import { expect } from 'chai';
import { createMemoryFs } from '@file-services/memory';

describe('utils', () => {
  describe('ensureDirectorySync', () => {
    it(`creates intermediate directories`, () => {
      const fs = createMemoryFs({ a: {} });
      fs.ensureDirectorySync('/animals/mammals/chiroptera');

      expect(fs.directoryExistsSync('/animals/mammals/chiroptera')).to.equal(true);
    });

    it(`succeeds if directory already exists, preserves its contents`, () => {
      const fs = createMemoryFs({ animals: { mammals: { 'vesper-bat.txt': '🦇' } } });
      fs.ensureDirectorySync('/');
      fs.ensureDirectorySync('/animals/mammals');

      expect(fs.readFileSync('/animals/mammals/vesper-bat.txt')).to.equal('🦇');
    });

    it(`throws when attempting to overwrite existing file`, () => {
      const fs = createMemoryFs({ 'vesper-bat.txt': '🦇' });

      expect(() => fs.ensureDirectorySync('/vesper-bat.txt')).to.throw();
    });

    it(`throws when attempting to create a directory inside of a file`, () => {
      const fs = createMemoryFs({ 'vesper-bat.txt': '🦇' });

      expect(() => fs.ensureDirectorySync('/vesper-bat.txt/Reproduction')).to.throw();
    });

    it('handles abnormal paths gracefully', () => {
      const fs = createMemoryFs();

      // This doesn't match node fs, which considers '' to be different from '.',
      // fs.statSync('') throws ENOENT, but fs.statSync('.') succeeds.
      fs.ensureDirectorySync('');

      fs.ensureDirectorySync('/');
      fs.ensureDirectorySync('.');
      fs.ensureDirectorySync('..');

      // This doesn't match node fs.mkdirSync(), which throws EACCES when the
      // directory path is outside of root.
      fs.ensureDirectorySync('../TheUpsideDown');

      expect(fs.readdirSync('/')).to.have.members(['TheUpsideDown']);
    });
  });
});
