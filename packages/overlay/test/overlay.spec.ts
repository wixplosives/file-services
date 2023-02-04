import { expect } from 'chai';
import {
  asyncBaseFsContract,
  asyncFsContract,
  syncBaseFsContract,
  syncFsContract,
  WatchEventsValidator,
  validateEvents,
} from '@file-services/test-kit';
import { createMemoryFs } from '@file-services/memory';
import { createOverlayFs } from '@file-services/overlay';
import { describe } from 'mocha';
import type { IWatchEvent, WatchEventListener } from '@file-services/types';

const sampleContent1 = `111`;
const sampleContent2 = `222`;
const sampleContent3 = `333`;

describe('overlay fs', () => {
  const testProvider = async () => {
    return {
      fs: createOverlayFs(createMemoryFs(), createMemoryFs()),
      dispose: async () => undefined,
      tempDirectoryPath: '/',
    };
  };

  syncBaseFsContract(testProvider);
  asyncBaseFsContract(testProvider);
  syncFsContract(testProvider);
  asyncFsContract(testProvider);

  it('overlays higher fs files and folders over lower fs', async () => {
    const srcFile1Path = '/src/file1.js';
    const srcFile2Path = '/src/file2.js';
    const rootFile1Path = '/src/file2.js';
    const folderPath = '/empty-folder';

    const lower = createMemoryFs({
      [srcFile1Path]: sampleContent1,
      [srcFile2Path]: sampleContent2,
    });
    const upper = createMemoryFs({
      [rootFile1Path]: sampleContent3,
      [srcFile2Path]: sampleContent3,
      [folderPath]: {},
    });

    const {
      readFileSync,
      fileExistsSync,
      directoryExistsSync,
      existsSync,
      promises: { readFile, fileExists, directoryExists, exists },
    } = createOverlayFs(lower, upper);

    expect(readFileSync(srcFile1Path, 'utf8')).to.equal(sampleContent1);
    expect(readFileSync(srcFile2Path, 'utf8')).to.equal(sampleContent3);
    expect(readFileSync(rootFile1Path, 'utf8')).to.equal(sampleContent3);

    expect(await readFile(srcFile1Path, 'utf8')).to.equal(sampleContent1);
    expect(await readFile(srcFile2Path, 'utf8')).to.equal(sampleContent3);
    expect(await readFile(rootFile1Path, 'utf8')).to.equal(sampleContent3);

    expect(fileExistsSync(srcFile1Path)).to.equal(true);
    expect(fileExistsSync(srcFile2Path)).to.equal(true);
    expect(fileExistsSync(rootFile1Path)).to.equal(true);
    expect(directoryExistsSync(folderPath)).to.equal(true);
    expect(existsSync(folderPath)).to.equal(true);

    expect(await fileExists(srcFile1Path)).to.equal(true);
    expect(await fileExists(srcFile2Path)).to.equal(true);
    expect(await fileExists(rootFile1Path)).to.equal(true);
    expect(await directoryExists(folderPath)).to.equal(true);
    expect(await exists(folderPath)).to.equal(true);
  });

  it('combines child nodes from both higher and lower file systems', async () => {
    const commonFolder = '/src';
    const fileInLower = '/src/file1.js';
    const fileInHigher = '/src/file2.js';
    const folderInLower = '/src/folder-1';
    const folderInHigher = '/src/folder-2';

    const lower = createMemoryFs({
      [fileInLower]: sampleContent1,
      [folderInLower]: {},
    });

    const higher = createMemoryFs({
      [fileInHigher]: sampleContent1,
      [folderInHigher]: {},
    });

    const {
      readdirSync,
      promises: { readdir },
    } = createOverlayFs(lower, higher);

    expect(readdirSync(commonFolder)).to.eql(['file1.js', 'folder-1', 'file2.js', 'folder-2']);
    expect(await readdir(commonFolder)).to.eql(['file1.js', 'folder-1', 'file2.js', 'folder-2']);
  });

  it('returns a single instance when both lower and higher contain an item', async () => {
    const srcPath = '/src';
    const fileInSrc = '/src/file.js';

    const lower = createMemoryFs({
      [fileInSrc]: sampleContent1,
    });

    const higher = createMemoryFs({
      [fileInSrc]: sampleContent1,
    });

    const {
      readdirSync,
      promises: { readdir },
    } = createOverlayFs(lower, higher);

    expect(readdirSync(srcPath)).to.eql(['file.js']);
    expect(await readdir(srcPath)).to.eql(['file.js']);

    expect(readdirSync(srcPath, { withFileTypes: true })).to.have.lengthOf(1);
    expect(await readdir(srcPath, { withFileTypes: true })).to.have.lengthOf(1);
  });

  it(`resolves real path when given the parent dir of the base dir`, async function () {
    const upper = createMemoryFs({
      '/src/a': {},
    });
    const lower = createMemoryFs({
      '/src': {},
    });

    const {
      realpathSync,
      promises: { realpath },
    } = createOverlayFs(lower, upper, '/src/a');

    expect(realpathSync('/src')).to.eql('/src');
    expect(await realpath('/src')).to.eql('/src');
  });
});

describe('overlayFs watch service', function () {
  this.timeout(6000000_000);
  const baseDir = '/src';
  const folderInLower = `${baseDir}/folder-1`;
  const fileInLower = `${baseDir}/file1.js`;
  const fileInHigher = '/file2.js';
  const folderInHigher = '/folder-2';
  const higherFileInOverlayFs = `${baseDir}${fileInHigher}`;

  function getFileSystems() {
    const lowerFs = createMemoryFs({
      [fileInLower]: sampleContent1,
      [folderInLower]: {},
    });

    const higherFs = createMemoryFs({
      [fileInHigher]: sampleContent1,
      [folderInHigher]: {},
    });

    const overlayFs = createOverlayFs(lowerFs, higherFs, baseDir);

    return { overlayFs, higherFs, lowerFs };
  }

  it('watches change made with overlayFs in lowerFs', async () => {
    const { overlayFs } = getFileSystems();
    const validator = new WatchEventsValidator(overlayFs.watchService);

    overlayFs.writeFileSync(fileInLower, '123');
    const stats = overlayFs.statSync(fileInLower);
    await validator.validateEvents([{ path: fileInLower, stats }]);
    await validator.noMoreEvents();
  });

  it('watches change made with higherFs', async () => {
    const { higherFs, overlayFs } = getFileSystems();

    const validator = new WatchEventsValidator(overlayFs.watchService);

    higherFs.writeFileSync(fileInHigher, '123');
    const stats = overlayFs.statSync(higherFileInOverlayFs);
    await validator.validateEvents([{ path: higherFileInOverlayFs, stats }]);
    await validator.noMoreEvents();
  });

  it('watches path, change made with higherFs', async () => {
    const { higherFs, overlayFs } = getFileSystems();
    const actualPathEvents: IWatchEvent[] = [];
    const listener1: WatchEventListener = (event) => {
      actualPathEvents.push(event);
    };

    await overlayFs.watchService.watchPath(higherFileInOverlayFs, listener1);
    higherFs.writeFileSync(fileInHigher, '123');

    const stats = overlayFs.statSync(higherFileInOverlayFs);

    await validateEvents([{ path: higherFileInOverlayFs, stats }], actualPathEvents);
  });

  it('watches path, receives change made with higherFs, no events sent after unwatchPath with listener1', async () => {
    const { higherFs, overlayFs } = getFileSystems();
    const actualPathEvents: IWatchEvent[] = [];
    const listener1: WatchEventListener = (event) => {
      actualPathEvents.push(event);
    };

    await overlayFs.watchService.watchPath(higherFileInOverlayFs, listener1);
    higherFs.writeFileSync(fileInHigher, '123');
    const stats = overlayFs.statSync(higherFileInOverlayFs);
    await validateEvents([{ path: higherFileInOverlayFs, stats }], actualPathEvents);

    // clear collected events
    actualPathEvents.splice(0);

    await overlayFs.watchService.unwatchPath(higherFileInOverlayFs, listener1);
    higherFs.writeFileSync(fileInHigher, '456');
    await validateEvents([], actualPathEvents);
  });

  it('watches path with multiple listeners, receives change made with higherFs, no events sent after unwatchPath with listener1', async () => {
    const { higherFs, overlayFs } = getFileSystems();
    const actualPathEvents1: IWatchEvent[] = [];
    const listener1: WatchEventListener = (event) => {
      actualPathEvents1.push(event);
    };
    const actualPathEvents2: IWatchEvent[] = [];
    const listener2: WatchEventListener = (event) => {
      actualPathEvents2.push(event);
    };

    await overlayFs.watchService.watchPath(higherFileInOverlayFs, listener1);
    await overlayFs.watchService.watchPath(higherFileInOverlayFs, listener2);
    higherFs.writeFileSync(fileInHigher, '123');
    const stats = overlayFs.statSync(higherFileInOverlayFs);
    await validateEvents([{ path: higherFileInOverlayFs, stats }], actualPathEvents1);
    await validateEvents([{ path: higherFileInOverlayFs, stats }], actualPathEvents2);

    // clear collected events
    actualPathEvents1.splice(0);
    actualPathEvents2.splice(0);

    await overlayFs.watchService.unwatchPath(higherFileInOverlayFs, listener1);
    higherFs.writeFileSync(fileInHigher, '456');
    const stats2 = overlayFs.statSync(higherFileInOverlayFs);

    await validateEvents([], actualPathEvents1);
    await validateEvents([{ path: higherFileInOverlayFs, stats: stats2 }], actualPathEvents2);
  });
});
