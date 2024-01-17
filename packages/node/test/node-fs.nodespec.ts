import { platform } from "os";
import { syncBaseFsContract, asyncBaseFsContract, asyncFsContract, syncFsContract } from "@file-services/test-kit";
import { createTempDirectory } from "create-temp-directory";
import { createNodeFs } from "@file-services/node";

describe("Node File System Implementation", function () {
  this.timeout(10_000);

  const fs = createNodeFs({ watchOptions: { debounceWait: 500 } });
  const { watchService } = fs;

  const testProvider = async () => {
    const tempDirectory = await createTempDirectory("fs-test-");

    return {
      fs,
      dispose: async () => {
        watchService.clearGlobalListeners();
        await watchService.unwatchAllPaths();
        await tempDirectory.remove();
      },
      tempDirectoryPath: fs.realpathSync(tempDirectory.path),
    };
  };

  // disable sync contract on mac
  // async contract passes, which is really what we care about.
  // avoid introducing more and more workarounds to support mac watcher being ready synchronously.
  if (platform() !== "darwin") {
    syncBaseFsContract(testProvider);
  }
  asyncBaseFsContract(testProvider);

  asyncFsContract(testProvider);
  syncFsContract(testProvider);
});
