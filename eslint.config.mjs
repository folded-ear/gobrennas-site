import nextVitals from "eslint-config-next/core-web-vitals";
import { defineConfig, globalIgnores } from "eslint/config";

const LUCIDE_MESSAGE = "Use the managed icons in @/components/icons.";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lucide-react",
              message: LUCIDE_MESSAGE,
              allowTypeImports: true,
            },
          ],
          patterns: [
            {
              group: ["lucide-react/*"],
              message: LUCIDE_MESSAGE,
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/icons.tsx"],
    rules: {
      "@typescript-eslint/no-restricted-imports": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
