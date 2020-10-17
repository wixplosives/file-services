import path from 'path';
import { expect } from 'chai';
import nodeFs from '@file-services/node';
import { createDirectoryFs } from '@file-services/directory';

describe(`directoryFs with Node's fs`, () => {
  it('returns scoped paths for realpath/Sync', async () => {
    const currentFileName = path.basename(__filename);
    const fs = createDirectoryFs(nodeFs, __dirname);
    const filePath = `/${currentFileName}`;

    expect(fs.realpathSync(filePath)).to.equal(filePath);
    expect(await fs.promises.realpath(filePath)).to.equal(filePath);
  });
});
