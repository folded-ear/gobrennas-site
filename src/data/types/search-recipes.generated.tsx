import * as Types from "../../__generated__/graphql";

import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
export type GetSearchLibraryQueryVariables = Types.Exact<{
  query?: Types.Scalars["String"]["input"];
  scope?: Types.LibrarySearchScope;
  first?: Types.Scalars["NonNegativeInt"]["input"];
  after?: Types.InputMaybe<Types.Scalars["Cursor"]["input"]>;
}>;

export type GetSearchLibraryQuery = {
  library: {
    __typename: "LibraryQuery";
    recipes: {
      __typename: "RecipeConnection";
      edges: Array<{
        __typename: "RecipeConnectionEdge";
        cursor: unknown;
        node: {
          __typename: "Recipe";
          id: string;
          name: string;
          labels: Array<string> | null;
          externalUrl: string | null;
          calories: number | null;
          yield: number | null;
          totalTime: number | null;
          owner: {
            __typename: "User";
            id: string;
            imageUrl: string | null;
            email: string;
            name: string | null;
          };
          photo: {
            __typename: "Photo";
            url: string;
            focus: Array<number> | null;
          } | null;
        };
      }>;
      pageInfo: {
        __typename: "PageInfo";
        hasNextPage: boolean;
        endCursor: unknown | null;
      };
    };
  };
};

export const GetSearchLibraryDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "getSearchLibrary" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "query" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String" },
            },
          },
          defaultValue: { kind: "StringValue", value: "", block: false },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "scope" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "LibrarySearchScope" },
            },
          },
          defaultValue: { kind: "EnumValue", value: "MINE" },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "first" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "NonNegativeInt" },
            },
          },
          defaultValue: { kind: "IntValue", value: "9" },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "after" },
          },
          type: { kind: "NamedType", name: { kind: "Name", value: "Cursor" } },
          defaultValue: { kind: "NullValue" },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "library" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "recipes" },
                  arguments: [
                    {
                      kind: "Argument",
                      name: { kind: "Name", value: "first" },
                      value: {
                        kind: "Variable",
                        name: { kind: "Name", value: "first" },
                      },
                    },
                    {
                      kind: "Argument",
                      name: { kind: "Name", value: "query" },
                      value: {
                        kind: "Variable",
                        name: { kind: "Name", value: "query" },
                      },
                    },
                    {
                      kind: "Argument",
                      name: { kind: "Name", value: "scope" },
                      value: {
                        kind: "Variable",
                        name: { kind: "Name", value: "scope" },
                      },
                    },
                    {
                      kind: "Argument",
                      name: { kind: "Name", value: "after" },
                      value: {
                        kind: "Variable",
                        name: { kind: "Name", value: "after" },
                      },
                    },
                  ],
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "edges" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "cursor" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "node" },
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "id" },
                                  },
                                  {
                                    kind: "FragmentSpread",
                                    name: { kind: "Name", value: "recipeCard" },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "pageInfo" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "hasNextPage" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "endCursor" },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "recipeCard" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Recipe" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "owner" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "imageUrl" } },
                { kind: "Field", name: { kind: "Name", value: "email" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
              ],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "photo" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "url" } },
                { kind: "Field", name: { kind: "Name", value: "focus" } },
              ],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "labels" } },
          { kind: "Field", name: { kind: "Name", value: "externalUrl" } },
          { kind: "Field", name: { kind: "Name", value: "calories" } },
          { kind: "Field", name: { kind: "Name", value: "yield" } },
          { kind: "Field", name: { kind: "Name", value: "totalTime" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetSearchLibraryQuery,
  GetSearchLibraryQueryVariables
>;
