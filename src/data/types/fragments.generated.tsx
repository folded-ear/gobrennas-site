import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";

export type RecipeCardFragment = {
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

export type RecipeCoreFragment = {
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
};

export const RecipeCardFragmentDoc = {
  kind: "Document",
  definitions: [
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
} as unknown as DocumentNode<RecipeCardFragment, unknown>;
export const RecipeCoreFragmentDoc = {
  kind: "Document",
  definitions: [
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
} as unknown as DocumentNode<RecipeCoreFragment, unknown>;
