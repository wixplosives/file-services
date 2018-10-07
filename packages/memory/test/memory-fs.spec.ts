import { join } from 'path'
import { expect } from 'chai'
import webpack from 'webpack'
import { syncFsContract } from '@file-services/test-kit'
import { createBaseMemoryFs } from '../src'

describe('In-memory File System Implementation', () => {

    it('can be bundled using webpack', async () => {
        const webpackCompiler = webpack({
            mode: 'production',
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
    })

    syncFsContract(async () => {
        const fs = createBaseMemoryFs()

        return {
            fs,
            dispose: async () => undefined,
            tempDirectoryPath: '/'
        }
    })
})

const noopOutputFileSystem: webpack.OutputFileSystem = {
    join,
    mkdir(_path, callback) { callback(null) },
    mkdirp(_path, callback) { callback(null) },
    rmdir(_path, callback) { callback(null) },
    unlink(_path, callback) { callback(null) },
    writeFile(_path, _data, callback) { callback(null) }
}
