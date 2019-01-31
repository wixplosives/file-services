declare namespace Chai {
    export interface Assertion {
        resolvedTo(filePath: string | null): Assertion;
    }
}
