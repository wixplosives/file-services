import type { IResolutionOutput } from '@file-services/resolve';

export const resolutionMatchers: Chai.ChaiPlugin = (chai, util) => {
  chai.Assertion.addMethod('resolvedTo', function (expectedFilePath: string | false | undefined) {
    const { flag } = util;
    const resolutionOutput = flag(this, 'object') as unknown;

    if (typeof resolutionOutput !== 'object' || resolutionOutput === null) {
      throw new Error(`asserted result should be an object`);
    }
    const { resolvedFile } = resolutionOutput as IResolutionOutput;

    const stringifiedExpected = String(expectedFilePath);
    this.assert(
      resolvedFile === expectedFilePath,
      `Expected request to be resolved to ${stringifiedExpected}`,
      `Expected request to not be resolved to ${stringifiedExpected}`,
      stringifiedExpected,
      String(resolvedFile)
    );
  });

  chai.Assertion.addMethod(
    'linkedFrom',
    function (expectedLinkedFrom: { path: string; target: string; type: 'dir' | 'file' }) {
      const { flag } = util;
      const resolutionOutput = flag(this, 'object') as unknown;

      if (typeof resolutionOutput !== 'object' || resolutionOutput === null) {
        throw new Error(`asserted result should be an object`);
      }
      const { linkedFrom } = resolutionOutput as IResolutionOutput;

      this.assert(
        linkedFrom?.path === expectedLinkedFrom.path,
        `Expected request to be linked from ${expectedLinkedFrom.path}`,
        `Expected request not to be linked from ${expectedLinkedFrom.path}`,
        JSON.stringify(expectedLinkedFrom, null, 2),
        JSON.stringify(linkedFrom, null, 2)
      );

      this.assert(
        linkedFrom?.type === expectedLinkedFrom.type,
        `Expected link to be of type: ${expectedLinkedFrom.type}`,
        `Expected link not to be of type: ${expectedLinkedFrom.type}`,
        JSON.stringify(expectedLinkedFrom, null, 2),
        JSON.stringify(linkedFrom, null, 2)
      );
    }
  );
};
