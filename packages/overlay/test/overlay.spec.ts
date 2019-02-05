import { expect } from 'chai'
import { createMemoryFs } from '@file-services/memory'
import { FsErrorCodes } from '@file-services/memory'
import { asyncBaseFsContract, asyncFsContract, syncBaseFsContract, syncFsContract } from '@file-services/test-kit'

import { createOverlayFs } from '../src/overlay'

describe('async overlay', () => {
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

    it('writes file to overlay based on file path that exists only in origin', async () => {
        const testFilePath = '/src/components/menu.js'
        const originFs = createMemoryFs({
            src: {
                components: {
                    'button.js': testOriginContent
                }
            }
        })
        const overlayFs = createMemoryFs({})
        const overlay = createOverlayFs(originFs, overlayFs)

        expect(await overlay.fileExists(testFilePath)).to.eql(false)

        await overlay.writeFile(testFilePath, testCustomContent)

        expect(await overlay.fileExists(testFilePath)).to.eql(true)
        expect(await originFs.fileExists(testFilePath), 'ensure that file was not created origin').to.eql(false)
    })

    it('throws when writing file to directory that does not exist in origin', async () => {
        const testFilePath = '/src/components/menu.js'
        const originFs = createMemoryFs({})
        const overlayFs = createMemoryFs({})
        const overlay = createOverlayFs(originFs, overlayFs)

        expect(await overlay.fileExists(testFilePath)).to.eql(false)

        await expect(overlay.writeFile(testFilePath, testCustomContent)).to.be.rejectedWith(
            `${testFilePath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`
        )
    })

    it('copies file to a directory in overlay based on path that exists only in origin', async () => {
        const testFilePath = '/utils/index.js'
        const originFs = createMemoryFs({
            utils: {}
        })
        const overlayFs = createMemoryFs({
            src: {
                'index.js': testOverlayContent
            }
        })
        const overlay = createOverlayFs(originFs, overlayFs)

        expect(await overlay.fileExists(testFilePath)).to.eql(false)

        await overlay.copyFile('/src/index.js', '/utils/index.js')

        expect(await overlay.fileExists(testFilePath)).to.eql(true)
        expect(await originFs.fileExists(testFilePath), 'ensure that file was not copied to origin').to.eql(false)
    })

    it('throws when copying file to directory that does not exist in both file systems', async () => {
        const testFilePath = '/utils/index.js'
        const originFs = createMemoryFs({})
        const overlayFs = createMemoryFs({
            src: {
                'index.js': testOverlayContent
            }
        })
        const overlay = createOverlayFs(originFs, overlayFs)

        expect(await overlay.fileExists(testFilePath)).to.eql(false)

        await expect(overlay.copyFile('/src/index.js', '/utils/index.js')).to.be.rejectedWith(
            FsErrorCodes.CONTAINING_NOT_EXISTS
        )
    })

    it('creates a directory in overlay based on path that exists only in origin', async () => {
        const testFilePath = '/src/components'
        const originFs = createMemoryFs({
            src: {}
        })
        const overlayFs = createMemoryFs({})
        const overlay = createOverlayFs(originFs, overlayFs)

        expect(await overlay.directoryExists(testFilePath)).to.eql(false)

        await overlay.mkdir(testFilePath)

        expect(await overlay.directoryExists(testFilePath)).to.eql(true)
        expect(await originFs.directoryExists(testFilePath)).to.eql(
            false,
            'ensure that directory was not created in origin'
        )
    })

    it('throws when creating a directory in a directory that does not exist in both file systems', async () => {
        const testFilePath = '/src/components'
        const originFs = createMemoryFs({})
        const overlayFs = createMemoryFs({})
        const overlay = createOverlayFs(originFs, overlayFs)

        expect(await overlay.directoryExists(testFilePath)).to.eql(false)

        await expect(overlay.mkdir(testFilePath)).to.be.rejectedWith(FsErrorCodes.CONTAINING_NOT_EXISTS)
    })
})

describe('sync overlay', () => {
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

    syncBaseFsContract(testProvider)
    syncFsContract(testProvider)

    const testOriginContent = `module.exports = 'Tik'`
    const testOverlayContent = `module.exports = 'Tak'`
    const testCustomContent = `module.exports = 'Tok'`

    it('writes file to overlay based on file path that exists only in origin', () => {
        const testFilePath = '/src/components/menu.js'
        const originFs = createMemoryFs({
            src: {
                components: {
                    'button.js': testOriginContent
                }
            }
        })
        const overlayFs = createMemoryFs({})
        const overlay = createOverlayFs(originFs, overlayFs)

        expect(overlay.fileExistsSync(testFilePath)).to.eql(false)

        overlay.writeFileSync(testFilePath, testCustomContent)

        expect(overlay.fileExistsSync(testFilePath)).to.eql(true)
        expect(originFs.fileExistsSync(testFilePath), 'ensure that file was not created origin').to.eql(false)
    })

    it('throws when writing file to directory that does not exist in origin', () => {
        const testFilePath = '/src/components/menu.js'
        const originFs = createMemoryFs({})
        const overlayFs = createMemoryFs({})
        const overlay = createOverlayFs(originFs, overlayFs)

        expect(overlay.fileExistsSync(testFilePath)).to.eql(false)

        expect(() => overlay.writeFileSync(testFilePath, testCustomContent)).to.throw(
            `${testFilePath} ${FsErrorCodes.CONTAINING_NOT_EXISTS}`
        )
    })

    it('copies file to a directory in overlay based on path that exists only in origin', () => {
        const testFilePath = '/utils/index.js'
        const originFs = createMemoryFs({
            utils: {}
        })
        const overlayFs = createMemoryFs({
            src: {
                'index.js': testOverlayContent
            }
        })
        const overlay = createOverlayFs(originFs, overlayFs)

        expect(overlay.fileExistsSync(testFilePath)).to.eql(false)

        overlay.copyFileSync('/src/index.js', '/utils/index.js')

        expect(overlay.fileExistsSync(testFilePath)).to.eql(true)
        expect(originFs.fileExistsSync(testFilePath), 'ensure that file was not copied to origin').to.eql(false)
    })

    it('throws when copying file to directory that does not exist in both file systems', () => {
        const testFilePath = '/utils/index.js'
        const originFs = createMemoryFs({})
        const overlayFs = createMemoryFs({
            src: {
                'index.js': testOverlayContent
            }
        })
        const overlay = createOverlayFs(originFs, overlayFs)

        expect(overlay.fileExistsSync(testFilePath)).to.eql(false)

        expect(() => overlay.copyFileSync('/src/index.js', '/utils/index.js')).to.throw(
            FsErrorCodes.CONTAINING_NOT_EXISTS
        )
    })

    it('creates a directory in overlay based on path that exists only in origin', () => {
        const testFilePath = '/src/components'
        const originFs = createMemoryFs({
            src: {}
        })
        const overlayFs = createMemoryFs({})
        const overlay = createOverlayFs(originFs, overlayFs)

        expect(overlay.directoryExistsSync(testFilePath)).to.eql(false)

        overlay.mkdirSync(testFilePath)

        expect(overlay.directoryExistsSync(testFilePath)).to.eql(true)
        expect(originFs.directoryExistsSync(testFilePath)).to.eql(
            false,
            'ensure that directory was not created in origin'
        )
    })

    it('throws when creating a directory in a directory that does not exist in both file systems', () => {
        const testFilePath = '/src/components'
        const originFs = createMemoryFs({})
        const overlayFs = createMemoryFs({})
        const overlay = createOverlayFs(originFs, overlayFs)

        expect(overlay.directoryExistsSync(testFilePath)).to.eql(false)

        expect(() => overlay.mkdirSync(testFilePath)).to.throw(FsErrorCodes.CONTAINING_NOT_EXISTS)
    })
})
