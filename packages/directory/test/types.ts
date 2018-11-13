/**
 * Represents everything required to run a single contract test.
 */
export interface ITestInput<T> {
    /**
     * file system to be tested
     */
    fs: T

    /**
     * Absolute path to the base directory
     */
    baseDirectoryPath: string

    /**
     * Post-test cleanup
     */
    dispose(): Promise<void>
}
