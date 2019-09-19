import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { asyncBaseFsContract, syncBaseFsContract } from '@file-services/test-kit';
import { createMemoryFs } from '@file-services/memory';
import { createCachedFs } from '../src';

chai.use(chaiAsPromised);

describe('createCachedFs', () => {
    const SAMPLE_CONTENT = 'content';

    it('can access a file using an absolute path relative to scoped directory', async () => {
        const filePath = '/file';
        const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });
        // spy on stat/statSync/promises.stat
        const fs = createCachedFs(memFs);

        const stats = fs.statSync(filePath);
        const stats2 = fs.statSync(filePath);

        expect(stats).to.equal(stats2);
        expect(memFs.statSync).to.have.been.calledOnce();
    });

    const testProvider = async () => {
        const fs = createCachedFs(createMemoryFs());
        return {
            fs,
            dispose: async () => undefined,
            tempDirectoryPath: fs.cwd()
        };
    };

    asyncBaseFsContract(testProvider);
    syncBaseFsContract(testProvider);
});
