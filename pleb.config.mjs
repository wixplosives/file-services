export default {
  pinnedPackages: [
    { name: "chai", reason: "v5 is pure esm" },
    { name: "chai-as-promised", reason: "v8 is pure esm" },
    { name: "eslint", reason: "plugins are not yet compatible with v9" },
    { name: "rimraf", reason: "v6 drops node 18 support" },
  ],
};
