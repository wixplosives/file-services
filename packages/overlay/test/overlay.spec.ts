import { expect } from 'chai'
import { createMemoryFs } from '@file-services/memory'
import { FsErrorCodes } from '@file-services/memory'
import { asyncBaseFsContract, asyncFsContract } from '@file-services/test-kit'

import { createOverlayFs } from '../src/overlay'

describe('overlay', () => {
    const testProvider = async () => {
        const originFs = createMemoryFs({})

        const overlayFs = createMemoryFs({})

        const overlay = createOverlayFs(originFs, overlayFs)
        return {
            fs: overlay,
            dispose: async () => undefined,
            tempDirectoryPath: '/'
        }
    }

    asyncBaseFsContract(testProvider)
    asyncFsContract(testProvider)

    const testOriginContent = `module.exports = 'Tik'`
    const testOverlayContent = `module.exports = 'Tak'`
    const testCustomContent = `module.exports = 'Tok'`

    it('exposes file content from origin based on a path that exist in overlay', async () => {
        const originFs = createMemoryFs({
            src: {
                'a.js': testOriginContent
            }
        })

        const overlayFs = createMemoryFs({
            src: {
                'b.js': testOverlayContent
            }
        })

        const overlay = createOverlayFs(originFs, overlayFs)

        expect(await overlay.readFile('/src/b.js')).to.eql(testOverlayContent)
    })

    it('exposes file content from origin based on a path that exists in origin', async () => {
        const originFs = createMemoryFs({
            src: {
                'a.js': testOriginContent
            }
        })

        const overlayFs = createMemoryFs({
            src: {
                'b.js': testOverlayContent
            }
        })

        const overlay = createOverlayFs(originFs, overlayFs)

        expect(await overlay.readFile('/src/a.js')).to.eql(testOriginContent)
    })

    it('exposes file content from overlay based on a path that exists in both file systems', async () => {
        const originFs = createMemoryFs({
            src: {
                'a.js': testOriginContent
            }
        })

        const overlayFs = createMemoryFs({
            src: {
                'a.js': testOverlayContent
            }
        })

        const overlay = createOverlayFs(originFs, overlayFs)

        expect(await overlay.readFile('/src/a.js')).to.eql(testOverlayContent)
    })

    it('writes file to overlay based on file path', async () => {
        const originFs = createMemoryFs({
            src: {
                'a.js': testOriginContent
            }
        })

        const overlayFs = createMemoryFs({
            src: {
                'a.js': testOverlayContent
            }
        })

        const overlay = createOverlayFs(originFs, overlayFs)

        expect(await overlay.fileExists('/src/b.js')).to.eql(false)

        await overlay.writeFile('/src/b.js', testCustomContent)

        expect(await overlay.fileExists('/src/b.js')).to.eql(true)
    })

    it('ensures and writes file to overlay based on file path that exists only in origin', async () => {
        const originFs = createMemoryFs({
            src: {
                components: {
                    'button.js': testOriginContent
                }
            }
        })

        const overlayFs = createMemoryFs({})

        const overlay = createOverlayFs(originFs, overlayFs)

        expect(await overlay.fileExists('/src/components/menu.js')).to.eql(false)

        await overlay.writeFile('/src/components/menu.js', testCustomContent)

        expect(await overlay.fileExists('/src/components/menu.js')).to.eql(true)
    })

    it('throws ENOENT when unlinking a file that does not exists in overlay', async () => {
        const originFs = createMemoryFs({
            src: {
                'a.js': testOriginContent
            }
        })

        const overlayFs = createMemoryFs({
            src: {
                'b.js': testOverlayContent
            }
        })

        const overlay = createOverlayFs(originFs, overlayFs)

        await expect(overlay.remove('/src/c.js')).to.be.rejectedWith(
            `/src/c.js ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`
        )
    })
})
