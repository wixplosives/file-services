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

    const testOriginContent = `module.exports = 'Hi!'`
    const testOverlayContent = `module.exports = 'Bye!'`

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

    it('exposes file content from origin based on a path that does not exist in overlay', async () => {
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
                'b.js': testOverlayContent
            }
        })

        const overlay = createOverlayFs(originFs, overlayFs)

        expect(await overlay.readFile('/src/b.js')).to.eql(testOverlayContent)
    })

    it('removes file based on file path of overlay', async () => {
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
        await overlay.remove('/src/b.js')

        expect(await overlay.fileExists('/src/b.js')).to.eql(false)
    })

    it('removes file based on file path of origin', async () => {
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

        await overlay.remove('/src/a.js')

        expect(await overlay.fileExists('/src/a.js')).to.eql(false)
    })

    it('throws ENOENT when deleting a file that does not exists in both file systems', async () => {
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

        let removeOverlayFileErrorMessage: string = ''

        try {
            await overlay.remove('/src/c.js')
        } catch (e) {
            removeOverlayFileErrorMessage = e.message
        }

        expect(removeOverlayFileErrorMessage).to.eql(`/src/c.js ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`)
    })
})
