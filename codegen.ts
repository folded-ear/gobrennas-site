import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  // schema: "./schema.graphql",
  schema: "http://localhost:8080/graphql",
  documents: ["src/**/*.tsx", "src/**/*.ts", "src/**/*.js"],
  generates: {
    "./src/__graphql/": {
      preset: "client",
      presetConfig: {
        fragmentMasking: false,
        gqlTagName: "graphql",
      },
      plugins: [],
      config: {
        scalars: {
          Date: "string",
          DateTime: "string",
          Long: "number",
          NonNegativeFloat: "number",
          NonNegativeInt: "number",
          PositiveInt: "number",
          Upload: "File",
        },
        avoidOptionals: true,
        dedupeFragments: true,
        immutableTypes: true,
        documentMode: "string",
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;
