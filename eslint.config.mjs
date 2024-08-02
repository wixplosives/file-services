import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import configPrettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ["**/dist/", "**/*.{js,mjs,cjs}"] },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  { languageOptions: { parserOptions: { projectService: true } } },
  {
    rules: {
      "no-console": "error",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
  configPrettier,
];
