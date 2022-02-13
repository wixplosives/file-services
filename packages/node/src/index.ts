import type { IFileSystem } from '@file-services/types';
import { createNodeFs } from './node-fs.js';

export * from './node-fs.js';
export * from './watch-service.js';

export const nodeFs: IFileSystem = createNodeFs();
export default nodeFs;
