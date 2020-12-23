import { expect } from 'chai';
import webpack from 'webpack';
import nodeFs from '@file-services/node';
import { createMemoryFs } from '@file-services/memory';
import { createOverlayFs } from '@file-services/overlay';
import { createWebpackFs } from '@file-services/webpack';

describe('createWebpackFs', function () {
  this.timeout(10_000);

  it('allows bundling from and to memory file system', async () => {
    const memFs = createMemoryFs({
      src: {
        'index.js': `import {a} from './some-file'
                             console.log(a)`,
        'some-file.js': `export const a = 123`,
      },
    });

    const webpackFs = createWebpackFs(memFs);
    const compiler = webpack({
      mode: 'development',
      context: memFs.cwd(),
      output: {
        path: memFs.resolve('dist'), // otherwise it defaults to join(process.cwd(), 'dist')
      },
    });

    compiler.inputFileSystem = webpackFs;
    compiler.outputFileSystem = webpackFs;

    const webpackStats = await new Promise<webpack.Stats>((res, rej) =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      compiler.run((e, stats) => (e ? rej(e) : res(stats!)))
    );

    expect(webpackStats.hasWarnings() || webpackStats.hasErrors(), webpackStats.toString()).to.equal(false);
    expect(memFs.fileExistsSync(memFs.resolve('dist', 'main.js')), 'bundle exists').to.equal(true);
  });

  it('allows bundling with memory fs over node fs', async () => {
    const memFs = createMemoryFs({
      fixture: {
        'index.js': `import value from './some-file'
                             console.log(value)`,
      },
    });

    const webpackFs = createWebpackFs(createOverlayFs(nodeFs, memFs, __dirname));
    const compiler = webpack({
      entry: nodeFs.join(__dirname, 'fixture'),
      mode: 'development',
      context: __dirname,
      output: {
        path: memFs.resolve('dist'), // otherwise it defaults to join(process.cwd(), 'dist')
      },
    });

    compiler.inputFileSystem = webpackFs;
    compiler.outputFileSystem = createWebpackFs(memFs);

    const webpackStats = await new Promise<webpack.Stats>((res, rej) =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      compiler.run((e, stats) => (e ? rej(e) : res(stats!)))
    );

    expect(webpackStats.hasWarnings() || webpackStats.hasErrors(), webpackStats.toString()).to.equal(false);
    expect(memFs.fileExistsSync(memFs.resolve('dist', 'main.js')), 'bundle exists').to.equal(true);
  });
});
