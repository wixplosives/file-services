export default {
  pinnedPackages: [
    { name: "chai", reason: "esm-only" },
    { name: "@types/chai", reason: "esm-only" },
    { name: "chai-as-promised", reason: "esm-only" },
    { name: "@types/chai-as-promised", reason: "esm-only" },
    { name: "sinon-chai", reason: "esm-only" },
    { name: "@types/sinon-chai", reason: "esm-only" },

    { name: "rimraf", reason: "drops node 18 support" },
    { name: "mocha-web", reason: "drops node 18 support" },
  ],
};
