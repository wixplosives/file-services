declare namespace Chai {
  export interface Assertion {
    resolvedTo(filePath: string | false | undefined): Assertion;
  }
}
