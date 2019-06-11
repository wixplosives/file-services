import { expect } from 'chai';
import nodeFs from '@file-services/node';
import { createDirectoryFs } from '../src';
const monoRepoRootPath = nodeFs.dirname(require.resolve('../../../package.json'));

describe(`directoryFs with Node's fs`, () => {
    it('returns scoped paths for realpath/Sync', async () => {
        const fs = createDirectoryFs(nodeFs, monoRepoRootPath);
        const filePath = '/package.json';

        expect(fs.realpathSync(filePath)).to.equal('/package.json');
        expect(await fs.promises.realpath(filePath)).to.equal('/package.json');
    });
});
