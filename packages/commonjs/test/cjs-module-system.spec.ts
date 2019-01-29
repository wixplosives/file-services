import { expect } from 'chai'
import { createMemoryFs } from '@file-services/memory'
import { createCjsModuleSystem } from '../src'

describe('commonjs module system', () => {
    const sampleString = 'named'
    const sampleNumber = 123
    const sampleObject = { five: 5, running: true }
    const sampleFilePath = '/test/file.js'

    it('exposes values that replaced the "exports" key on "module"', () => {
        const fs = createMemoryFs({
            'numeric.js': `module.exports = ${sampleNumber}`,
            'object.js': `module.exports = ${JSON.stringify(sampleObject)}`,
            'string.js': `module.exports = ${JSON.stringify(sampleString)}`,
        })
        const { requireModule } = createCjsModuleSystem({ fs })

        expect(requireModule('/numeric.js')).to.equal(sampleNumber)
        expect(requireModule('/object.js')).to.eql(sampleObject)
        expect(requireModule('/string.js')).to.eql(sampleString)
    })

    it('exposes named keys set on the default "exports" object', () => {
        const fs = createMemoryFs({
            [sampleFilePath]: `
                    module.exports.a = ${sampleNumber}
                    module.exports.b = ${JSON.stringify(sampleObject)}
                `,
        })
        const { requireModule } = createCjsModuleSystem({ fs })

        expect(requireModule(sampleFilePath)).to.eql({ a: sampleNumber, b: sampleObject })
    })

    it('exposes values set directly on exports', () => {
        const fs = createMemoryFs({
            [sampleFilePath]: `
                    exports.a = ${sampleNumber}
                    exports.b = ${JSON.stringify(sampleObject)}
                `
        })
        const { requireModule } = createCjsModuleSystem({ fs })

        expect(requireModule(sampleFilePath)).to.eql({ a: sampleNumber, b: sampleObject })
    })

    it('caches module evaluation and returns same exported instances', () => {
        const fs = createMemoryFs({
            [sampleFilePath]: `module.exports = {}`
        })
        const { requireModule } = createCjsModuleSystem({ fs })

        // using `equals` to ensure strict reference equality check
        expect(requireModule(sampleFilePath)).to.equals(requireModule(sampleFilePath))
    })

    it('allows access to current file path via __filename', () => {
        const fs = createMemoryFs({
            [sampleFilePath]: `module.exports = __filename`
        })
        const { requireModule } = createCjsModuleSystem({ fs })

        expect(requireModule(sampleFilePath)).to.eql(sampleFilePath)
    })

    it('allows access to current file path via __dirname', () => {
        const fs = createMemoryFs({
            [sampleFilePath]: `module.exports = __dirname`
        })
        const { requireModule } = createCjsModuleSystem({ fs })

        expect(requireModule(sampleFilePath)).to.eql(fs.path.dirname(sampleFilePath))
    })
})
