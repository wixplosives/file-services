import { expect } from 'chai';
import webpack from 'webpack';
import { nodeFs } from '@file-services/node';
import { createMemoryFs } from '@file-services/memory';
import { createWebpackFs } from '@file-services/webpack';
import { createOverlayFs } from '@file-services/overlay';

describe('createWebpackFs', () => {
    it('allows bundling from and to memory file system', async () => {
        const memFs = createMemoryFs({
            src: {
                'index.js': `import {a} from './some-file'
                             console.log(a)`,
                'some-file.js': `export const a = 123`
            }
        });
        const { path } = memFs;

        const webpackFs = createWebpackFs(memFs);
        const compiler = webpack({
            mode: 'development',
            context: memFs.cwd(),
            output: {
                path: path.resolve('dist') // otherwise it defaults to join(process.cwd(), 'dist')
            }
        });

        compiler.inputFileSystem = webpackFs;
        compiler.outputFileSystem = webpackFs;

        const webpackStats = await new Promise<webpack.Stats>((res, rej) => {
            compiler.run((e, stats) => {
                if (e) {
                    rej(e);
                } else {
                    res(stats);
                }
            });
        });

        expect(webpackStats.hasWarnings() || webpackStats.hasErrors(), webpackStats.toString()).to.equal(false);
        expect(memFs.fileExistsSync(path.resolve('dist', 'main.js')), 'bundle exists').to.equal(true);
    });

    it('allows bundling with memory fs over node fs', async () => {
        const memFs = createMemoryFs({
            fixture: {
                'index.js': `import value from './some-file'
                             console.log(a)`
            }
        });

        const webpackFs = createWebpackFs(createOverlayFs(nodeFs, memFs, __dirname));
        const compiler = webpack({
            entry: nodeFs.path.join(__dirname, 'fixture'),
            mode: 'development',
            context: __dirname,
            output: {
                path: memFs.path.resolve('dist') // otherwise it defaults to join(process.cwd(), 'dist')
            }
        });

        compiler.inputFileSystem = webpackFs;
        compiler.outputFileSystem = createWebpackFs(memFs);

        const webpackStats = await new Promise<webpack.Stats>((res, rej) => {
            compiler.run((e, stats) => {
                if (e) {
                    rej(e);
                } else {
                    res(stats);
                }
            });
        });

        expect(webpackStats.hasWarnings() || webpackStats.hasErrors(), webpackStats.toString()).to.equal(false);
        expect(memFs.fileExistsSync(memFs.path.resolve('dist', 'main.js')), 'bundle exists').to.equal(true);
    });
});
