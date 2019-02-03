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

    it('deletes file based on file path of overlay', async () => {
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

        expect(await overlay.fileExists('/src/a.js')).to.eql(false)
    })

    it('throws ENOENT when deleting a file that does not exists in overlay but exists in origin', async () => {
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

        let errorThrown: string = ''

        try {
            await overlay.remove('/src/a.js')
        } catch (e) {
            errorThrown = e.message
        }

        expect(errorThrown).to.eql(`/src/a.js ${FsErrorCodes.NO_FILE_OR_DIRECTORY}`)
    })
})
