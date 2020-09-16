import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { createMemoryFs } from '@file-services/memory';
import { createDependencyResolver, createRequestResolver } from '../src';

chai.use(sinonChai);

describe('dependency resolver', () => {
  // three sample files in the same /src directory
  const firstFilePath = '/src/first-file.js';
  const secondFilePath = '/src/second-file.js';
  const thirdFilePath = '/src/third-file.js';
  const fourthFilePath = '/src/fourth-file.js';

  // node-like requests to be resolved by our node resolver below
  const requestFirstFile = './first-file';
  const requestSecondFile = './second-file';
  const requestThirdFile = './third-file';
  const requestMissingFile = './missing-file';

  // first  -> second -> third -> (recursive back to first)
  //        |         -> missing
  //        -> third  -> (recursive back to first)
  //
  // fourth -> first (requested twice) -> ...
  //
  // we stringify the requests, and later parse them in our naive test extractor
  const fs = createMemoryFs({
    [firstFilePath]: JSON.stringify([requestSecondFile, requestThirdFile]),
    [secondFilePath]: JSON.stringify([requestThirdFile, requestMissingFile]),
    [thirdFilePath]: JSON.stringify([requestFirstFile]),
    [fourthFilePath]: JSON.stringify([requestFirstFile, requestFirstFile]),
  });

  // using our cross-module node-like resolver
  const resolveRequest = sinon.spy(createRequestResolver({ fs }));

  // actual dependency resolver used in tests below.
  const resolveDependencies = createDependencyResolver({
    extractRequests(filePath) {
      // the requests were saved as the stringified content
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as string[];
    },
    resolveRequest(filePath, request) {
      // the node resolver requires directory path, not the origin file path
      return resolveRequest(fs.dirname(filePath), request).resolvedFile;
    },
  });

  it('uses provided request extractor/resolver and resolves all requests by a file', () => {
    // file with two requests
    expect(resolveDependencies(firstFilePath)).to.eql({
      [firstFilePath]: {
        [requestSecondFile]: secondFilePath,
        [requestThirdFile]: thirdFilePath,
      },
    });

    // file with a request resolving to undefined
    expect(resolveDependencies(secondFilePath)).to.eql({
      [secondFilePath]: {
        [requestThirdFile]: thirdFilePath,
        [requestMissingFile]: undefined,
      },
    });

    // record of both files
    expect(resolveDependencies([firstFilePath, secondFilePath])).to.eql({
      [firstFilePath]: {
        [requestSecondFile]: secondFilePath,
        [requestThirdFile]: thirdFilePath,
      },
      [secondFilePath]: {
        [requestThirdFile]: thirdFilePath,
        [requestMissingFile]: undefined,
      },
    });

    // file with two requests to the same target
    resolveRequest.resetHistory();
    expect(resolveDependencies(fourthFilePath)).to.eql({
      [fourthFilePath]: {
        [requestFirstFile]: firstFilePath,
      },
    });
    expect(resolveRequest).to.have.callCount(1);
  });

  it('follows request chain when deep is set to true', () => {
    expect(resolveDependencies(firstFilePath, true /* deep */)).to.eql({
      [firstFilePath]: {
        [requestSecondFile]: secondFilePath,
        [requestThirdFile]: thirdFilePath,
      },
      [secondFilePath]: {
        [requestThirdFile]: thirdFilePath,
        [requestMissingFile]: undefined,
      },
      [thirdFilePath]: {
        [requestFirstFile]: firstFilePath,
      },
    });
  });
});
