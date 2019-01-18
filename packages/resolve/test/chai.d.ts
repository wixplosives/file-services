declare namespace Chai {
    export interface Assertion {
        resolvedTo(filePath: string | null): Assertion;
        mapping(mapping: {[filePath: string]: string}): Assertion;
    }
}
