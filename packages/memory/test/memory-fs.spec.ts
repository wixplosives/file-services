import { join } from 'path'
import { expect } from 'chai'
import webpack from 'webpack'
import { syncBaseFsContract, asyncBaseFsContract, syncFsContract, asyncFsContract } from '@file-services/test-kit'
import { createMemoryFs } from '../src'

describe('In-memory File System Implementation', () => {

    it('can be bundled using webpack', async () => {
        const webpackCompiler = webpack({
            mode: 'development',
            devtool: false,
            entry: join(__dirname, '..'), // use root so package.json is picked
        })

        // don't output to disk
        webpackCompiler.outputFileSystem = noopOutputFileSystem

        const webpackStats = await new Promise<webpack.Stats>((res, rej) =>
            webpackCompiler.run((e, s) => e ? rej(e) : res(s))
        )

        const statsOutputText = webpackStats.toString()

        expect(webpackStats.hasErrors(), statsOutputText).to.equal(false)
        expect(webpackStats.hasWarnings(), statsOutputText).to.equal(false)

    }).timeout(10000) // bundling can take time (especially on CI), so increase timeout for specific test

    const testProvider = async () => {
        const fs = createMemoryFs()

        return {
            fs,
            dispose: async () => undefined,
            tempDirectoryPath: '/'
        }
    }

    syncBaseFsContract(testProvider)
    asyncBaseFsContract(testProvider)
    syncFsContract(testProvider)
    asyncFsContract(testProvider)
})

const noopOutputFileSystem: webpack.OutputFileSystem = {
    join,
    mkdir(_path, callback) { callback(null) },
    mkdirp(_path, callback) { callback(null) },
    rmdir(_path, callback) { callback(null) },
    unlink(_path, callback) { callback(null) },
    writeFile(_path, _data, callback) { callback(null) }
}
