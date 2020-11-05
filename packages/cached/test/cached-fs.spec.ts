import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { asyncBaseFsContract, syncBaseFsContract } from '@file-services/test-kit';
import { createMemoryFs } from '@file-services/memory';
import { createCachedFs } from '@file-services/cached';

chai.use(chaiAsPromised);

describe('createCachedFs', () => {
  const SAMPLE_CONTENT = 'content';

  describe('cached api', () => {
    it('caches fs.statSync existing files', async () => {
      const memFs = createMemoryFs({ file: SAMPLE_CONTENT });
      const statSpy = sinon.spy(memFs, 'statSync');
      const fs = createCachedFs(memFs);

      const stats = fs.statSync('/file');
      const stats2 = fs.statSync('/file');
      const stats3 = fs.statSync('./file');
      const stats4 = fs.statSync('file');

      expect(statSpy.callCount).to.equal(1);
      expect(stats).to.equal(stats2);
      expect(stats).to.equal(stats3);
      expect(stats).to.equal(stats4);
    });

    it('caches fs.statSync for missing files', async () => {
      const memFs = createMemoryFs();
      const statSpy = sinon.spy(memFs, 'statSync');
      const fs = createCachedFs(memFs);

      expect(() => fs.statSync('/missing')).to.throw();
      expect(() => fs.statSync('/missing')).to.throw();
      expect(() => fs.statSync('./missing')).to.throw();
      expect(() => fs.statSync('missing')).to.throw();

      expect(statSpy.callCount).to.equal(1);
    });

    it('caches fs.stat for existing files', async () => {
      const memFs = createMemoryFs({ file: SAMPLE_CONTENT });
      const statSpy = sinon.spy(memFs, 'stat');
      const fs = createCachedFs(memFs);

      const stats = await new Promise((res, rej) => fs.stat('/file', (e, s) => (e ? rej(e) : res(s))));
      const stats2 = await new Promise((res, rej) => fs.stat('/file', (e, s) => (e ? rej(e) : res(s))));
      const stats3 = await new Promise((res, rej) => fs.stat('./file', (e, s) => (e ? rej(e) : res(s))));
      const stats4 = await new Promise((res, rej) => fs.stat('file', (e, s) => (e ? rej(e) : res(s))));

      expect(statSpy.callCount).to.equal(1);
      expect(stats).to.equal(stats2);
      expect(stats).to.equal(stats3);
      expect(stats).to.equal(stats4);
    });

    it('caches fs.stat for missing files', async () => {
      const memFs = createMemoryFs();
      const statSpy = sinon.spy(memFs, 'stat');
      const fs = createCachedFs(memFs);

      await expect(
        new Promise((res, rej) => fs.stat('/missing', (e, s) => (e ? rej(e) : res(s))))
      ).to.eventually.be.rejectedWith();
      await expect(
        new Promise((res, rej) => fs.stat('/missing', (e, s) => (e ? rej(e) : res(s))))
      ).to.eventually.be.rejectedWith();
      await expect(
        new Promise((res, rej) => fs.stat('./missing', (e, s) => (e ? rej(e) : res(s))))
      ).to.eventually.be.rejectedWith();
      await expect(
        new Promise((res, rej) => fs.stat('missing', (e, s) => (e ? rej(e) : res(s))))
      ).to.eventually.be.rejectedWith();

      expect(statSpy.callCount).to.equal(1);
    });

    it('caches fs.promises.stat for existing files', async () => {
      const memFs = createMemoryFs({ file: SAMPLE_CONTENT });
      const statSpy = sinon.spy(memFs.promises, 'stat');
      const fs = createCachedFs(memFs);

      const stats = await fs.promises.stat('/file');
      const stats2 = await fs.promises.stat('/file');
      const stats3 = await fs.promises.stat('./file');
      const stats4 = await fs.promises.stat('file');

      expect(statSpy.callCount).to.equal(1);
      expect(stats).to.equal(stats2);
      expect(stats).to.equal(stats3);
      expect(stats).to.equal(stats4);
    });

    it('caches fs.promises.stat for missing files', async () => {
      const memFs = createMemoryFs();
      const statSpy = sinon.spy(memFs.promises, 'stat');
      const fs = createCachedFs(memFs);

      await expect(fs.promises.stat('/missing')).to.eventually.be.rejectedWith();
      await expect(fs.promises.stat('/missing')).to.eventually.be.rejectedWith();
      await expect(fs.promises.stat('./missing')).to.eventually.be.rejectedWith();
      await expect(fs.promises.stat('missing')).to.eventually.be.rejectedWith();

      expect(statSpy.callCount).to.equal(1);
    });

    it('caches fs.realpathSync for existing files', async () => {
      const memFs = createMemoryFs({ file: SAMPLE_CONTENT });
      const realpathSpy = sinon.spy(memFs, 'realpathSync');
      const fs = createCachedFs(memFs);

      const actualPath = fs.realpathSync('/file');
      const actualPath2 = fs.realpathSync('/file');
      const actualPath3 = fs.realpathSync('./file');
      const actualPath4 = fs.realpathSync('file');

      expect(realpathSpy.callCount).to.equal(1);
      expect(actualPath).to.equal(actualPath2);
      expect(actualPath).to.equal(actualPath3);
      expect(actualPath).to.equal(actualPath4);
    });

    it('caches fs.realpath for existing files', async () => {
      const memFs = createMemoryFs({ file: SAMPLE_CONTENT });
      const realpathSpy = sinon.spy(memFs, 'realpath');
      const fs = createCachedFs(memFs);

      const actualPath = await new Promise((res, rej) => fs.realpath('/file', (e, p) => (e ? rej(e) : res(p))));
      const actualPath2 = await new Promise((res, rej) => fs.realpath('/file', (e, p) => (e ? rej(e) : res(p))));
      const actualPath3 = await new Promise((res, rej) => fs.realpath('./file', (e, p) => (e ? rej(e) : res(p))));
      const actualPath4 = await new Promise((res, rej) => fs.realpath('file', (e, p) => (e ? rej(e) : res(p))));

      expect(realpathSpy.callCount).to.equal(1);
      expect(actualPath).to.equal(actualPath2);
      expect(actualPath).to.equal(actualPath3);
      expect(actualPath).to.equal(actualPath4);
    });

    it('caches fs.promises.realpath for existing files', async () => {
      const memFs = createMemoryFs({ file: SAMPLE_CONTENT });
      const realpathSpy = sinon.spy(memFs.promises, 'realpath');
      const fs = createCachedFs(memFs);

      const actualPath = await fs.promises.realpath('/file');
      const actualPath2 = await fs.promises.realpath('/file');
      const actualPath3 = await fs.promises.realpath('./file');
      const actualPath4 = await fs.promises.realpath('file');

      expect(realpathSpy.callCount).to.equal(1);
      expect(actualPath).to.equal(actualPath2);
      expect(actualPath).to.equal(actualPath3);
      expect(actualPath).to.equal(actualPath4);
    });

    it('rebinds extended api to the cached base functions', () => {
      const memFs = createMemoryFs({ file: SAMPLE_CONTENT });
      const statSpy = sinon.spy(memFs, 'statSync');
      const fs = createCachedFs(memFs);

      expect(fs.fileExistsSync('/file')).to.equal(true);
      expect(fs.fileExistsSync('/file')).to.equal(true);
      expect(fs.fileExistsSync('./file')).to.equal(true);
      expect(fs.fileExistsSync('file')).to.equal(true);
      expect(statSpy.callCount).to.equal(1);
    });
  });

  describe('Cached readFile', () => {
    it('caches readFileSync calls', async () => {
      const filePath = '/file';
      const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });

      const readFileSyncSpy = sinon.spy(memFs, 'readFileSync');

      const fs = createCachedFs(memFs);

      const content = fs.readFileSync(filePath);
      const content2 = fs.readFileSync(filePath);

      expect(content).to.equal(content2);
      expect(readFileSyncSpy.callCount).to.equal(1);
    });

    it('Not caching readFileSync calls if file does not exist', async () => {
      const filePath = '/file';
      const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });

      const readFileSyncSpy = sinon.spy(memFs, 'readFileSync');

      const fs = createCachedFs(memFs);

      try {
        fs.readFileSync('/no-file');
      } catch (ex) {
        // NO-OP
      }
      try {
        fs.readFileSync('/no-file');
      } catch (ex) {
        // NO-OP
      }

      expect(readFileSyncSpy.callCount).to.equal(2);
    });

    it('allows invalidating cache of file path', async () => {
      const filePath = '/file';
      const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });

      const readFileSyncSpy = sinon.spy(memFs, 'readFileSync');

      const fs = createCachedFs(memFs);

      fs.readFileSync(filePath);
      fs.invalidate(filePath);
      fs.readFileSync(filePath);

      expect(readFileSyncSpy.callCount).to.equal(2);
    });

    it('allows invalidating cache of non existing file path', async () => {
      const filePath = '/file';
      const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });

      const readFileSyncSpy = sinon.spy(memFs, 'readFileSync');

      const fs = createCachedFs(memFs);

      try {
        fs.readFileSync(filePath);
      } catch (ex) {
        // NO-OP
      }
      fs.invalidate(filePath);
      try {
        fs.readFileSync(filePath);
      } catch (ex) {
        // NO-OP
      }

      expect(readFileSyncSpy.callCount).to.equal(2);
    });

    it('allows invalidating cache of all file paths', async () => {
      const filePath = '/file';
      const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });

      const readFileSyncSpy = sinon.spy(memFs, 'readFileSync');

      const fs = createCachedFs(memFs);

      fs.readFileSync(filePath);
      fs.invalidateAll();
      fs.readFileSync(filePath);

      expect(readFileSyncSpy.callCount).to.equal(2);
    });

    it('caches readfile (callback-style) calls - file exists', async () => {
      const filePath = '/file';
      const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });

      const readFileSpy = sinon.spy(memFs, 'readFile');

      const fs = createCachedFs(memFs);

      const content = await new Promise((res, rej) =>
        fs.readFile(filePath, (error, value) => (error ? rej(error) : res(value)))
      );

      const content2 = await new Promise((res, rej) =>
        fs.readFile(filePath, (error, value) => (error ? rej(error) : res(value)))
      );

      expect(content).to.equal(content2);
      expect(readFileSpy.callCount).to.equal(1);
    });

    it('not cachng readfile (callback-style) calls - if file does not exist', async () => {
      const filePath = '/file';
      const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });

      const readFileSpy = sinon.spy(memFs, 'readFile');

      const fs = createCachedFs(memFs);

      await new Promise((res) => fs.readFile('/no-file', res));

      await new Promise((res) => fs.readFile('/no-file', res));

      expect(readFileSpy.callCount).to.equal(2);
    });
  });

  describe('cache invalidation', () => {
    it('allows invalidating cache for existing files', async () => {
      const filePath = '/file';
      const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });
      const statSyncSpy = sinon.spy(memFs, 'statSync');
      const statSpy = sinon.spy(memFs, 'stat');
      const promiseStatSpy = sinon.spy(memFs.promises, 'stat');
      const fs = createCachedFs(memFs);

      fs.statSync(filePath);
      await new Promise((res, rej) => fs.stat(filePath, (e, s) => (e ? rej(e) : res(s))));
      await fs.promises.stat(filePath);

      fs.invalidate(filePath);

      fs.statSync(filePath);
      await new Promise((res, rej) => fs.stat(filePath, (e, s) => (e ? rej(e) : res(s))));
      await fs.promises.stat(filePath);

      expect(statSyncSpy.callCount).to.equal(2);
      expect(statSpy.callCount).to.equal(0);
      expect(promiseStatSpy.callCount).to.equal(0);
    });

    it('allows invalidating cache for missing files', async () => {
      const filePath = '/missing';
      const memFs = createMemoryFs();
      const statSyncSpy = sinon.spy(memFs, 'statSync');
      const statSpy = sinon.spy(memFs, 'stat');
      const promiseStatSpy = sinon.spy(memFs.promises, 'stat');
      const fs = createCachedFs(memFs);

      expect(() => fs.statSync(filePath)).to.throw();
      await expect(
        new Promise((res, rej) => fs.stat(filePath, (e, s) => (e ? rej(e) : res(s))))
      ).to.eventually.be.rejectedWith();
      await expect(fs.promises.stat(filePath)).to.eventually.be.rejectedWith();

      fs.invalidate(filePath);

      expect(() => fs.statSync(filePath)).to.throw();
      await expect(
        new Promise((res, rej) => fs.stat(filePath, (e, s) => (e ? rej(e) : res(s))))
      ).to.eventually.be.rejectedWith();
      await expect(fs.promises.stat(filePath)).to.eventually.be.rejectedWith();

      expect(statSyncSpy.callCount).to.equal(2);
      expect(statSpy.callCount).to.equal(0);
      expect(promiseStatSpy.callCount).to.equal(0);
    });

    it('allows invalidating cache for all file paths', async () => {
      const filePath = '/file';
      const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });
      const statSpy = sinon.spy(memFs, 'statSync');
      const promiseStatSpy = sinon.spy(memFs.promises, 'stat');
      const fs = createCachedFs(memFs);

      const stats = fs.statSync(filePath);
      fs.invalidateAll();
      const stats2 = fs.promises.stat(filePath);

      expect(statSpy.callCount).to.equal(1);
      expect(promiseStatSpy.callCount).to.equal(1);
      expect(stats).to.not.equal(stats2);
    });
  });

  const testProvider = async () => {
    const fs = createCachedFs(createMemoryFs());
    fs.watchService.addGlobalListener(({ path }) => fs.invalidate(path));
    return {
      fs,
      dispose: async () => undefined,
      tempDirectoryPath: fs.cwd(),
    };
  };

  asyncBaseFsContract(testProvider);
  syncBaseFsContract(testProvider);
});
