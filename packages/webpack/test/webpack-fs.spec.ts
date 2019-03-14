import { expect } from 'chai';
import webpack from 'webpack';
import { createMemoryFs } from '@file-services/memory';
import { createWebpackFs } from '@file-services/webpack';

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
});
