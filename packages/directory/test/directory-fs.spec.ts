import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { asyncBaseFsContract, syncBaseFsContract } from '@file-services/test-kit';
import { createMemoryFs } from '@file-services/memory';
import { createDirectoryFs } from '../src';

chai.use(chaiAsPromised);

describe('createDirectoryFs', () => {
    const scopedDirectoryPath = '/test-directory';
    const SAMPLE_CONTENT = 'content';
    const createPreloadedMemFs = () =>
        createMemoryFs({
            [scopedDirectoryPath]: {
                src: {
                    'index.ts': SAMPLE_CONTENT
                }
            },
            'outside-scope-file.ts': SAMPLE_CONTENT
        });

    it('can access a file using an absolute path relative to scoped directory', async () => {
        const fs = createDirectoryFs(createPreloadedMemFs(), scopedDirectoryPath);
        const filePath = '/src/index.ts';

        expect((await fs.promises.stat(filePath)).isFile()).to.equal(true);
        expect(await fs.promises.readFile(filePath)).to.eql(SAMPLE_CONTENT);
    });

    it('cannot use a relative path to access a file outside of the scoped directory path', async () => {
        const fs = createDirectoryFs(createPreloadedMemFs(), scopedDirectoryPath);
        const filePath = '../outside-scope-file.ts';

        await expect(fs.promises.readFile(filePath)).to.be.rejectedWith(
            `/test-directory/outside-scope-file.ts ENOENT: no such file`
        );
    });

    it('cannot access a file outside of scoped directory using original absolute path', async () => {
        const fs = createDirectoryFs(createPreloadedMemFs(), scopedDirectoryPath);
        const filePath = '/outside-scope-file.ts';

        await expect(fs.promises.readFile(filePath)).to.be.rejectedWith(`ENOENT`);
    });

    const testProvider = async () => {
        const memFs = createMemoryFs({
            [scopedDirectoryPath]: {},
            'file-outside.js': ''
        });
        const scopedFs = createDirectoryFs(memFs, scopedDirectoryPath);

        return {
            fs: scopedFs,
            dispose: async () => undefined,
            tempDirectoryPath: '/' // for the scoped fs user, root is empty folder
        };
    };

    asyncBaseFsContract(testProvider);
    syncBaseFsContract(testProvider);
});
