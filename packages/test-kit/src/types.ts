/**
 * Represents everything required to run a single contract test.
 */
export interface IFileSystemTestbed<T> {
    /**
     * file system to be tested
     */
    fs: T

    /**
     * Absolute path to an empty directory
     */
    tempDirectoryPath: string

    /**
     * Post-test cleanup
     */
    dispose(): Promise<void>
}
