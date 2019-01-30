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

    it('provides current file path via __filename', () => {
        const fs = createMemoryFs({
            [sampleFilePath]: `module.exports = __filename`
        })
        const { requireModule } = createCjsModuleSystem({ fs })

        expect(requireModule(sampleFilePath)).to.eql(sampleFilePath)
    })

    it('provides current file path via __dirname', () => {
        const fs = createMemoryFs({
            [sampleFilePath]: `module.exports = __dirname`
        })
        const { requireModule } = createCjsModuleSystem({ fs })

        expect(requireModule(sampleFilePath)).to.eql(fs.path.dirname(sampleFilePath))
    })

    it('sets and provides process.env.NODE_ENV === "development"', () => {
        const fs = createMemoryFs({
            [sampleFilePath]: `module.exports = process.env.NODE_ENV`
        })
        const { requireModule } = createCjsModuleSystem({ fs })

        expect(requireModule(sampleFilePath)).to.eql('development')
    })

    it('allows requiring other modules', () => {
        const fs = createMemoryFs({
            'index.js': `module.exports = require('./numeric')`,
            'numeric.js': `module.exports = ${sampleNumber}`,
        })
        const { requireModule } = createCjsModuleSystem({ fs })

        expect(requireModule('/index.js')).to.eql(sampleNumber)
    })

    it('allows resolving modules using require.resolve', () => {
        const fs = createMemoryFs({
            'index.js': `module.exports = require.resolve('./target')`,
            'target.js': ``,
        })
        const { requireModule } = createCjsModuleSystem({ fs })

        expect(requireModule('/index.js')).to.eql('/target.js')
    })

    it('supports recursive requires', () => {
        const fs = createMemoryFs({
            'a.js': `
                exports.before = ${sampleNumber}
                exports.bAtEval = require('./b').evalTime
                exports.after = ${JSON.stringify(sampleString)}
            `,
            'b.js': `
                const a = require('./a')

                exports.evalTime = {
                    beforeFromA: a.before,
                    afterFromA: a.after
                }
                exports.a = a
            `,
        })
        const { requireModule } = createCjsModuleSystem({ fs })

        expect(requireModule('/a.js')).to.eql({
            before: sampleNumber,
            bAtEval: {
                beforeFromA: sampleNumber,
                afterFromA: undefined,
            },
            after: sampleString
        })

        // after `a.js` completed evaluation, b has access to fields added post its evaluation
        const b = requireModule('/b.js') as { a: { after: string } }
        expect(b.a.after).to.equal(sampleString)
    })
})
