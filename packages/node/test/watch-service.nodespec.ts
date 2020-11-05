import { sleep } from 'promise-assist';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import type { IWatchService } from '@file-services/types';
import { WatchEventsValidator } from '@file-services/test-kit';
import { NodeWatchService, nodeFs } from '@file-services/node';

const { writeFile, stat, mkdir, rmdir } = nodeFs.promises;

const debounceWait = 500;
const SAMPLE_CONTENT = `sample file content`;

describe('Node Watch Service', function () {
  this.timeout(10_000);

  let tempDir: ITempDirectory;
  let watchService: IWatchService;

  afterEach('delete temp directory and close watch service', async () => {
    watchService.clearGlobalListeners();
    await watchService.unwatchAllPaths();
    await tempDir.remove();
  });

  describe('watching files', () => {
    let validator: WatchEventsValidator;
    let testFilePath: string;

    beforeEach('create temp fixture file and intialize watch service', async () => {
      watchService = new NodeWatchService({ debounceWait });
      validator = new WatchEventsValidator(watchService);

      tempDir = await createTempDirectory();
      testFilePath = nodeFs.join(tempDir.path, 'test-file');

      await writeFile(testFilePath, SAMPLE_CONTENT);
      await watchService.watchPath(testFilePath);
    });

    it('debounces several consecutive watch events as a single watch event', async () => {
      await writeFile(testFilePath, SAMPLE_CONTENT);
      await writeFile(testFilePath, SAMPLE_CONTENT);
      await writeFile(testFilePath, SAMPLE_CONTENT);

      await validator.validateEvents(async () => [{ path: testFilePath, stats: await stat(testFilePath) }]);
      await validator.noMoreEvents();
    });

    it(`emits two different watch events when changes are >${debounceWait}ms appart`, async () => {
      await writeFile(testFilePath, SAMPLE_CONTENT);

      await sleep(debounceWait * 1.1);

      const firstWriteStats = await stat(testFilePath);

      await writeFile(testFilePath, SAMPLE_CONTENT);

      await validator.validateEvents(async () => [
        { path: testFilePath, stats: firstWriteStats },
        { path: testFilePath, stats: await stat(testFilePath) },
      ]);
      await validator.noMoreEvents();
    });
  });

  describe('watching directories', () => {
    let validator: WatchEventsValidator;
    let testDirectoryPath: string;

    beforeEach('create temp fixture directory and intialize watch service', async () => {
      watchService = new NodeWatchService({ debounceWait });
      validator = new WatchEventsValidator(watchService);

      tempDir = await createTempDirectory();
      testDirectoryPath = nodeFs.join(tempDir.path, 'test-directory');
      await mkdir(testDirectoryPath);
    });

    it('fires a watch event when a watched directory is removed', async () => {
      await watchService.watchPath(tempDir.path);

      await rmdir(testDirectoryPath);

      await validator.validateEvents([{ path: testDirectoryPath, stats: null }]);
      await validator.noMoreEvents();
    });
  });

  describe('mixing watch of directories and files', () => {
    let validator: WatchEventsValidator;
    let testDirectoryPath: string;
    let testFilePath: string;

    beforeEach('create temp fixture directory and intialize watch service', async () => {
      watchService = new NodeWatchService({ debounceWait });
      validator = new WatchEventsValidator(watchService);

      tempDir = await createTempDirectory();
      testDirectoryPath = nodeFs.join(tempDir.path, 'test-directory');
      await mkdir(testDirectoryPath);
      testFilePath = nodeFs.join(testDirectoryPath, 'test-file');
      await writeFile(testFilePath, SAMPLE_CONTENT);
    });

    it('allows watching a file and its containing directory', async () => {
      await watchService.watchPath(testFilePath);
      await watchService.watchPath(testDirectoryPath);

      await writeFile(testFilePath, SAMPLE_CONTENT);

      await validator.validateEvents(async () => [{ path: testFilePath, stats: await stat(testFilePath) }]);
      await validator.noMoreEvents();
    });

    it('allows watching in any order', async () => {
      await watchService.watchPath(testDirectoryPath);
      await watchService.watchPath(testFilePath);

      await writeFile(testFilePath, SAMPLE_CONTENT);

      await validator.validateEvents(async () => [{ path: testFilePath, stats: await stat(testFilePath) }]);
      await validator.noMoreEvents();
    });
  });
});
