import { join } from 'path'
import { writeFileSync, stat, mkdir, rmdir } from 'proper-fs'
import { createTempDirectory, ITempDirectory } from 'create-temp-directory'
import { IWatchService } from '@file-services/types'
import { sleep } from 'promise-assist'
import { WatchEventsValidator } from '@file-services/test-kit'

import { NodeWatchService } from '../src'

const debounceWait = 500
const SAMPLE_CONTENT = `sample file content`

describe('Node Watch Service', function() {
    this.timeout(10000) // override mocha's 2s timeout to 10s

    let tempDir: ITempDirectory
    let watchService: IWatchService

    afterEach('delete temp directory and close watch service', async () => {
        watchService.clearGlobalListeners()
        await watchService.unwatchAllPaths()
        await tempDir.remove()
    })

    describe('watching files', () => {
        let validator: WatchEventsValidator
        let testFilePath: string

        beforeEach('create temp fixture file and intialize watch service', async () => {
            watchService = new NodeWatchService({ debounceWait })
            validator = new WatchEventsValidator(watchService)

            tempDir = await createTempDirectory()
            testFilePath = join(tempDir.path, 'test-file')

            writeFileSync(testFilePath, SAMPLE_CONTENT)
            await watchService.watchPath(testFilePath)
        })

        it('debounces several consecutive watch events as a single watch event', async () => {
            writeFileSync(testFilePath, SAMPLE_CONTENT)
            writeFileSync(testFilePath, SAMPLE_CONTENT)
            writeFileSync(testFilePath, SAMPLE_CONTENT)

            await validator.validateEvents([{ path: testFilePath, stats: await stat(testFilePath) }])
            await validator.noMoreEvents()
        })

        it(`emits two different watch events when changes are >${debounceWait}ms appart`, async () => {
            writeFileSync(testFilePath, SAMPLE_CONTENT)

            await sleep(debounceWait)

            const firstWriteStats = await stat(testFilePath)

            writeFileSync(testFilePath, SAMPLE_CONTENT)

            const secondWriteStats = await stat(testFilePath)

            await validator.validateEvents([
                { path: testFilePath, stats: firstWriteStats },
                { path: testFilePath, stats: secondWriteStats }
            ])
            await validator.noMoreEvents()
        })
    })

    describe('watching directories', () => {
        let validator: WatchEventsValidator
        let testDirectoryPath: string

        beforeEach('create temp fixture directory and intialize watch service', async () => {
            watchService = new NodeWatchService({ debounceWait })
            validator = new WatchEventsValidator(watchService)

            tempDir = await createTempDirectory()
            testDirectoryPath = join(tempDir.path, 'test-directory')
            await mkdir(testDirectoryPath)
        })

        // fails on Mac. should be investigated. possibly node/libuv bug.
        it.skip('fires a watch event when a watched directory is removed', async () => {
            await watchService.watchPath(testDirectoryPath)

            await rmdir(testDirectoryPath)

            await validator.validateEvents([{ path: testDirectoryPath, stats: null }])
            await validator.noMoreEvents()
        })
    })

    describe('mixing watch of directories and files', () => {
        let validator: WatchEventsValidator
        let testDirectoryPath: string
        let testFilePath: string

        beforeEach('create temp fixture directory and intialize watch service', async () => {
            watchService = new NodeWatchService({ debounceWait })
            validator = new WatchEventsValidator(watchService)

            tempDir = await createTempDirectory()
            testDirectoryPath = join(tempDir.path, 'test-directory')
            await mkdir(testDirectoryPath)
            testFilePath = join(testDirectoryPath, 'test-file')
            writeFileSync(testFilePath, SAMPLE_CONTENT)
        })

        it('allows watching a file and its containing directory', async () => {
            await watchService.watchPath(testFilePath)
            await watchService.watchPath(testDirectoryPath)

            writeFileSync(testFilePath, SAMPLE_CONTENT)

            await validator.validateEvents([{ path: testFilePath, stats: await stat(testFilePath) }])
            await validator.noMoreEvents()
        })

        it('allows watching in any order', async () => {
            await watchService.watchPath(testDirectoryPath)
            await watchService.watchPath(testFilePath)

            writeFileSync(testFilePath, SAMPLE_CONTENT)

            await validator.validateEvents([{ path: testFilePath, stats: await stat(testFilePath) }])
            await validator.noMoreEvents()
        })
    })
})
