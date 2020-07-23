import type { IResolutionOutput } from '../src';

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
};
