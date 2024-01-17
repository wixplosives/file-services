import { createNodeFs } from "./node-fs";
import type { IFileSystem } from "@file-services/types";

export * from "./node-fs";
export * from "./watch-service";

export const nodeFs: IFileSystem = createNodeFs();
export default nodeFs;
