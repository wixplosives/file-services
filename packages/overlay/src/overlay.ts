import { IFileSystem } from '@file-services/types'

export function createOverlayFs(originFs: IFileSystem, overlayFs: IFileSystem) {
    async function readFile(filePath: string, encoding?: string): Promise<string> {
        const doesFileExistsInOverlay = await overlayFs.fileExists(filePath)

        return doesFileExistsInOverlay ? overlayFs.readFile(filePath) : originFs.readFile(filePath, encoding)
    }

    return { ...overlayFs, readFile }
}
