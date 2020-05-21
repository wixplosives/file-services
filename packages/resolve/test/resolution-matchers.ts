export const resolutionMatchers: Chai.ChaiPlugin = (chai, util) => {
  chai.Assertion.addMethod('resolvedTo', function (expectedFilePath: string | undefined) {
    const { flag } = util;
    const resolutionOutput = flag(this, 'object') as Record<string, unknown>;
    const resolvedFilePath = (resolutionOutput && resolutionOutput.resolvedFile) || resolutionOutput;

    this.assert(
      resolvedFilePath === expectedFilePath,
      `Expected request to be resolved to ${expectedFilePath ?? 'undefined'}`,
      `Expected request to not be resolved to ${expectedFilePath ?? 'undefined'}`,
      expectedFilePath || JSON.stringify(expectedFilePath),
      resolvedFilePath || JSON.stringify(resolvedFilePath)
    );
  });
};
