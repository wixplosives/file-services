declare namespace Chai {
  export interface Assertion {
    resolvedTo(filePath: string | false | undefined): Assertion;
    linkedFrom(expectedLinkedFrom: { path: string; target: string; type: 'dir' | 'file' }): Assertion;
  }
}
