import globals from "globals";
import pluginJs from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import compat from "eslint-plugin-compat";
import vitest from "@vitest/eslint-plugin";

export default defineConfig([
  globalIgnores(["**/coverage/**"]),
  {
    languageOptions: {
      globals: {
        ...globals.node, //eslint formatting for Node
        ...vitest.environments.env.globals, //eslint formatting for unit tests
      },
    },
    extends: [
      compat.configs["flat/recommended"], //compatibility with browsers listed in package.json
      pluginJs.configs.recommended, //eslint formatting for basic Javascript syntax
    ],
  },
  {
    //override defaults
    rules: {
      "no-unused-vars": [
        "warn",
        {
          caughtErrors: "none",
        },
      ],
    },
  },
]);
