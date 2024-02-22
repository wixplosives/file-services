import type { IFileSystem } from "@file-services/types";
import { createNodeFs } from "./node-fs";

export * from "./node-fs";
export * from "./watch-service";

export const nodeFs: IFileSystem = createNodeFs();
export default nodeFs;
