import { join } from 'path'
import { expect } from 'chai'
import webpack from 'webpack'

describe('@file-services/typescript', () => {

    it('can be bundled using webpack', async () => {
        const webpackCompiler = webpack({
            mode: 'development',
            devtool: false,
            entry: join(__dirname, '..'), // use root so package.json is picked,
            module: {
                rules: [],
                noParse: /typescript\.js$/
            }
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
})

const noopOutputFileSystem: webpack.OutputFileSystem = {
    join,
    mkdir(_path, callback) { callback(null) },
    mkdirp(_path, callback) { callback(null) },
    rmdir(_path, callback) { callback(null) },
    unlink(_path, callback) { callback(null) },
    writeFile(_path, _data, callback) { callback(null) }
}
