import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { asyncBaseFsContract, syncBaseFsContract } from '@file-services/test-kit';
import { createMemoryFs } from '@file-services/memory';
import { createCachedFs } from '../src';
import sinon from 'sinon';

chai.use(chaiAsPromised);

describe('createCachedFs', () => {
    const SAMPLE_CONTENT = 'content';

    it('caches statsSync calls', async () => {
        const filePath = '/file';
        const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });

        const statSyncSpy = sinon.spy(memFs, 'statSync');

        const fs = createCachedFs(memFs);

        const stats = fs.statSync(filePath);
        const stats2 = fs.statSync(filePath);

        expect(stats).to.equal(stats2);
        expect(statSyncSpy.callCount).to.equal(1);
    });

    it('caches statsSync calls with invalidation', async () => {
        const filePath = '/file';
        const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });

        const statSyncSpy = sinon.spy(memFs, 'statSync');

        const fs = createCachedFs(memFs);

        const stats = fs.statSync(filePath);
        fs.invalidate(filePath);
        const stats2 = fs.statSync(filePath);

        expect(stats).to.not.equal(stats2);
        expect(statSyncSpy.callCount).to.equal(2);
    });

    it('caches statsSync calls - through fileExists', async () => {
        const filePath = '/file';
        const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });

        const statSyncSpy = sinon.spy(memFs, 'statSync');

        const fs = createCachedFs(memFs);

        const exists = fs.fileExistsSync(filePath);
        const exists2 = fs.fileExistsSync(filePath);

        expect(exists).to.equal(exists2);
        expect(statSyncSpy.callCount).to.equal(1);
    });

    it('caches stats (async) calls', async () => {
        const filePath = '/file';
        const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });

        const statSpy = sinon.spy(memFs, 'stat');

        const fs = createCachedFs(memFs);

        expect(statSpy.callCount).to.equal(0);

        fs.stat(filePath, (_error, stats) => {
            fs.stat(filePath, (_error2, stats2) => {
                expect(stats).to.equal(stats2);
                expect(statSpy.callCount).to.equal(1);
            });
        });
    });

    it('caches stats (async) calls with invalidation', async () => {
        const filePath = '/file';
        const memFs = createMemoryFs({ [filePath]: SAMPLE_CONTENT });

        const statSpy = sinon.spy(memFs, 'stat');

        const fs = createCachedFs(memFs);

        expect(statSpy.callCount).to.equal(0);

        fs.stat(filePath, (_error, stats) => {
            fs.invalidate(filePath);
            fs.stat(filePath, (_error2, stats2) => {
                expect(stats).to.not.equal(stats2);
                expect(statSpy.callCount).to.equal(2);
            });
        });
    });

    // with mixing relatives

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
