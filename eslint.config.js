import globals from "globals";
import tseslint from "typescript-eslint";

const sharedGlobals = {
  ...globals.browser,
  ...globals.node,
  Deno: "readonly",
  EdgeRuntime: "readonly",
};

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      ".vercel/**",
      ".wrangler/**",
      "audit/*.json",
      "audit/sbom.cdx.json",
      "audit/release-manifest.unsigned.json",
    ],
  },
  {
    files: [
      "**/*.{js,mjs,cjs,ts,tsx}",
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: sharedGlobals,
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "no-empty": [
        "error",
        {
          allowEmptyCatch: true,
        },
      ],
      "no-console": "off",
      "no-debugger": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-prototype-builtins": "error",
      "no-script-url": "error",
      "no-throw-literal": "error",
      "no-unsafe-finally": "error",
      "no-with": "error",
    },
  },
];
