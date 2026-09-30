import type { IngredientInfo } from "@/__generated__/graphql";
import type { EditableRecipe } from "../edit-recipe-draft";

export const storedRecipe: EditableRecipe = {
  __typename: "Recipe",
  id: "pie",
  mine: true,
  name: "Apple pie",
  externalUrl: "https://example.test/pie",
  yield: 8,
  totalTime: 4_800_123,
  calories: 0,
  directions: "Bake.\nLet cool.  ",
  labels: ["Dessert"],
  photo: {
    __typename: "Photo",
    url: "https://photos.example.test/pie.jpg",
    focus: [0.2, 0.8],
  },
  ingredients: [
    {
      __typename: "IngredientRef",
      raw: "2 cups apples, sliced",
      preparation: "sliced",
      quantity: {
        __typename: "Quantity",
        quantity: 2,
        units: { __typename: "UnitOfMeasure", id: "cup" },
      },
      ingredient: { __typename: "PantryItem", id: "apple" },
    },
    {
      __typename: "IngredientRef",
      raw: "pinch of mystery spice",
      preparation: null,
      quantity: null,
      ingredient: null,
    },
  ],
  sections: [
    {
      __typename: "Section",
      id: "crust",
      name: "Crust",
      directions: null,
      labels: ["Hidden section label"],
      sectionOf: { __typename: "Recipe", id: "pie" },
      ingredients: [
        {
          __typename: "IngredientRef",
          raw: "0.5 cup flour",
          preparation: "sifted",
          quantity: {
            __typename: "Quantity",
            quantity: 0.5,
            units: { __typename: "UnitOfMeasure", id: "cup" },
          },
          ingredient: { __typename: "PantryItem", id: "flour" },
        },
      ],
    },
    {
      __typename: "Section",
      id: "topping",
      name: "Borrowed topping",
      directions: "Whip.",
      labels: ["Other"],
      sectionOf: { __typename: "Recipe", id: "other-recipe" },
      ingredients: [],
    },
  ],
};

export const storedInfo: IngredientInfo = {
  type: "Recipe",
  name: "Apple pie",
  externalUrl: "https://example.test/pie",
  yield: 8,
  totalTime: 4_800_123,
  calories: 0,
  directions: "Bake.\nLet cool.  ",
  labels: ["Dessert"],
  ingredients: [
    {
      raw: "2 cups apples, sliced",
      quantity: 2,
      uomId: "cup",
      ingredientId: "apple",
      preparation: "sliced",
    },
    {
      raw: "pinch of mystery spice",
      quantity: null,
      uomId: null,
      ingredientId: null,
      preparation: null,
    },
  ],
  sections: [
    {
      id: "crust",
      name: "Crust",
      directions: null,
      labels: ["Hidden section label"],
      ingredients: [
        {
          raw: "0.5 cup flour",
          quantity: 0.5,
          uomId: "cup",
          ingredientId: "flour",
          preparation: "sifted",
        },
      ],
    },
    { id: "topping" },
  ],
};
