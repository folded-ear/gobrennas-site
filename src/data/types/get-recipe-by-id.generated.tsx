import * as Types from "../../__generated__/graphql";

import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
export type GetRecipeByIdQueryVariables = Types.Exact<{
  id: Types.Scalars["ID"]["input"];
  secret?: Types.InputMaybe<Types.Scalars["String"]["input"]>;
}>;

export type GetRecipeByIdQuery = {
  library: {
    __typename: "LibraryQuery";
    getRecipeById: {
      __typename: "Recipe";
      yield: number | null;
      calories: number | null;
      externalUrl: string | null;
      labels: Array<string> | null;
      id: string;
      name: string;
      directions: string | null;
      totalTime: number | null;
      photo: {
        __typename: "Photo";
        url: string;
        focus: Array<number> | null;
      } | null;
      owner: {
        __typename: "User";
        id: string;
        name: string | null;
        email: string;
        imageUrl: string | null;
      };
      subrecipes: Array<{
        __typename: "Recipe";
        id: string;
        name: string;
        directions: string | null;
        totalTime: number | null;
        ingredients: Array<{
          __typename: "IngredientRef";
          raw: string;
          preparation: string | null;
          quantity: {
            __typename: "Quantity";
            quantity: number;
            units: { __typename: "UnitOfMeasure"; name: string } | null;
          } | null;
          ingredient:
            | { __typename: "PantryItem"; id: string; name: string }
            | { __typename: "Recipe"; id: string; name: string }
            | null;
        }>;
      }>;
      plannedHistory: Array<{
        __typename: "PlannedRecipeHistory";
        id: string;
        plannedAt: unknown;
        doneAt: unknown;
        status: Types.PlanItemStatus;
        notes: string | null;
        rating: unknown | null;
        owner: {
          __typename: "User";
          name: string | null;
          email: string;
          imageUrl: string | null;
        };
      }>;
      ingredients: Array<{
        __typename: "IngredientRef";
        raw: string;
        preparation: string | null;
        quantity: {
          __typename: "Quantity";
          quantity: number;
          units: { __typename: "UnitOfMeasure"; name: string } | null;
        } | null;
        ingredient:
          | { __typename: "PantryItem"; id: string; name: string }
          | { __typename: "Recipe"; id: string; name: string }
          | null;
      }>;
    };
  };
};

export const GetRecipeByIdDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "getRecipeById" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "secret" },
          },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
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
                  name: { kind: "Name", value: "getRecipeById" },
                  arguments: [
                    {
                      kind: "Argument",
                      name: { kind: "Name", value: "id" },
                      value: {
                        kind: "Variable",
                        name: { kind: "Name", value: "id" },
                      },
                    },
                    {
                      kind: "Argument",
                      name: { kind: "Name", value: "secret" },
                      value: {
                        kind: "Variable",
                        name: { kind: "Name", value: "secret" },
                      },
                    },
                  ],
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "FragmentSpread",
                        name: { kind: "Name", value: "recipeCore" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "yield" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "calories" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "externalUrl" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "labels" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "photo" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "url" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "focus" },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "owner" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "id" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "name" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "email" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "imageUrl" },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "subrecipes" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "FragmentSpread",
                              name: { kind: "Name", value: "recipeCore" },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "plannedHistory" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "id" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "plannedAt" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "doneAt" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "status" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "owner" },
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "name" },
                                  },
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "email" },
                                  },
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "imageUrl" },
                                  },
                                ],
                              },
                            },
                            {
                              kind: "Field",
                              alias: { kind: "Name", value: "rating" },
                              name: { kind: "Name", value: "ratingInt" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "notes" },
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
      name: { kind: "Name", value: "recipeCore" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Recipe" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "directions" } },
          { kind: "Field", name: { kind: "Name", value: "totalTime" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "ingredients" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "raw" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "quantity" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "quantity" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "units" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "name" },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "ingredient" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                    ],
                  },
                },
                { kind: "Field", name: { kind: "Name", value: "preparation" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetRecipeByIdQuery, GetRecipeByIdQueryVariables>;
