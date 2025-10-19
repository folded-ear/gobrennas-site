import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...compat.config({
    ignorePatterns: [
      "node_modules/",
      "dist/",
      "build/",
      "*.config.js",
      "**/__generated__/**",
    ],
    rules: {
      "no-console": "warn",
    },
  }),
];

export default eslintConfig;
