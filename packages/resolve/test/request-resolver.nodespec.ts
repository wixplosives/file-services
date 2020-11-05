import chai, { expect } from 'chai';
import fs from '@file-services/node';
import { createRequestResolver } from '@file-services/resolve';
import { resolutionMatchers } from './resolution-matchers';

chai.use(resolutionMatchers);

describe('request resolver node integration', () => {
  it('resolves symlinks to realpath', () => {
    const resolveRequest = createRequestResolver({ fs });
    const requestViaLink = '@file-services/resolve/package.json';

    expect(resolveRequest(__dirname, requestViaLink)).to.be.resolvedTo(require.resolve(requestViaLink));
  });

  it('returns symlink path if realpathSync throws', () => {
    const resolveRequest = createRequestResolver({
      fs: {
        ...fs,
        realpathSync: () => {
          throw new Error(`always throws`);
        },
      },
    });
    const requestViaLink = '@file-services/resolve/package.json';
    expect(resolveRequest(__dirname, requestViaLink).resolvedFile).to.include(fs.join('node_modules', requestViaLink));
  });
});
