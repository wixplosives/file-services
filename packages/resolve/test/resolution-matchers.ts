export function resolutionMatchers(chai: any, util: any) {
    chai.Assertion.addMethod('resolvedTo', function(this: any, expectedFilePath: string | null) {
        const { flag } = util;
        const resolutionOutput = flag(this, 'object');
        const resolvedFilePath = (resolutionOutput && resolutionOutput.resolvedFile) || resolutionOutput;

        this.assert(
            resolvedFilePath === expectedFilePath,
            `Expected request to be resolved to ${expectedFilePath}`,
            `Expected request to not be resolved to ${expectedFilePath}`,
            expectedFilePath || JSON.stringify(expectedFilePath),
            resolvedFilePath || JSON.stringify(resolvedFilePath)
        );
    });
}
