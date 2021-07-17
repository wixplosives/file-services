declare namespace Chai {
  export interface Assertion {
    resolvedTo(filePath: string | false | undefined): Assertion;
    linkedFrom(expectedLinkedFrom: string | undefined): Assertion;
  }
}
