declare namespace Chai {
    export interface Assertion {
        resolvedTo(filePath: string | undefined): Assertion;
    }
}
