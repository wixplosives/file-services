import { createNodeFs } from "@file-services/node";
import { asyncBaseFsContract, asyncFsContract, syncBaseFsContract, syncFsContract } from "@file-services/test-kit";
import { expect } from "chai";
import { createTempDirectory } from "create-temp-directory";
import { platform } from "node:os";

describe("Node File System Implementation", function () {
  this.timeout(10_000);

  const fs = createNodeFs();

  const testProvider = async () => {
    const tempDirectory = await createTempDirectory("fs-test-");

    return {
      fs,
      dispose: async () => {
        await tempDirectory.remove();
      },
      tempDirectoryPath: fs.realpathSync(tempDirectory.path),
    };
  };

  // disable sync contract on mac
  // async contract passes, which is really what we care about.
  // avoid introducing more and more workarounds to support mac watcher being ready synchronously.
  if (platform() !== "darwin") {
    const supportsRecursiveWatch = parseInt(process.versions.node, 10) >= 20 || platform() !== "linux";
    syncBaseFsContract(testProvider, supportsRecursiveWatch);
  }
  asyncBaseFsContract(testProvider);

  asyncFsContract(testProvider);
  syncFsContract(testProvider);

  it("returns instances of Buffer when reading binary", async () => {
    const fs = createNodeFs();
    expect(fs.readFileSync(__filename)).to.be.instanceOf(Buffer);
    expect(await fs.promises.readFile(__filename)).to.be.instanceOf(Buffer);
  });
});
