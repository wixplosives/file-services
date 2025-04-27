import * as chai from "chai";
import { expect } from "chai";
import fs from "@file-services/node";
import { createRequestResolver } from "@file-services/resolve";
import { resolutionMatchers } from "./resolution-matchers.js";
import { fileURLToPath } from "node:url";

chai.use(resolutionMatchers);

describe("request resolver node integration", () => {
  it("resolves symlinks to realpath", () => {
    const resolveRequest = createRequestResolver({ fs });
    const requestViaLink = "@file-services/node/package.json";

    expect(resolveRequest(import.meta.dirname, requestViaLink)).to.be.resolvedTo(
      fileURLToPath(import.meta.resolve(requestViaLink)),
    );
  });

  it("returns symlink path if realpathSync throws", () => {
    const resolveRequest = createRequestResolver({
      fs: {
        ...fs,
        realpathSync: () => {
          throw new Error(`always throws`);
        },
      },
    });
    const requestViaLink = "@file-services/node/package.json";
    expect(resolveRequest(import.meta.dirname, requestViaLink).resolvedFile).to.include(
      fs.join("node_modules", requestViaLink),
    );
  });
});
