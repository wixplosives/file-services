export default {
  pinnedPackages: [
    { name: "chai", reason: "v5 is pure esm" },
    { name: "@types/chai", reason: "v8 is pure esm" },
    { name: "chai-as-promised", reason: "v8 is pure esm" },
    { name: "@types/chai-as-promised", reason: "v8 is pure esm" },
    { name: "sinon-chai", reason: "v4 requires chai@5" },
    { name: "@types/sinon-chai", reason: "v8 is pure esm" },
    { name: "rimraf", reason: "v6 drops node 18 support" },
    { name: "mocha-web", reason: "v2 drops node 18 support" },
  ],
};
