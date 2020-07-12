import chai, { expect } from 'chai';
import fs from '@file-services/node';
import { createRequestResolver } from '../src';
import { resolutionMatchers } from './resolution-matchers';

chai.use(resolutionMatchers);

describe('request resolver node integration', () => {
  it('resolves symlinks to realpath', () => {
    const resolveRequest = createRequestResolver({ fs });
    const requestViaLink = '@file-services/resolve/package.json';

    expect(resolveRequest(__dirname, requestViaLink)).to.be.resolvedTo(require.resolve(requestViaLink));
  });
});
