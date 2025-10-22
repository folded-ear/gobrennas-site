import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
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
