import type { Unmasked } from "@apollo/client";
import type { GetRecipeDetailQuery } from "../__generated__/getRecipeDetail.generated";

export const recipe: Unmasked<GetRecipeDetailQuery>["library"]["getRecipeById"] =
  {
    __typename: "Recipe",
    id: "pie",
    name: "Apple pie",
    mine: true,
    ownedBy: null,
    photo: null,
    externalUrl: "https://example.test/pie",
    yield: 8,
    totalTime: 80,
    calories: 0,
    labels: ["Dessert"],
    directions: "Bake until golden.\n\nLet cool before slicing.",
    ingredients: [
      {
        __typename: "IngredientRef",
        raw: "2 cups apples, sliced (save the peels)",
        preparation: "sliced",
        quantity: {
          __typename: "Quantity",
          quantity: 2,
          units: { __typename: "UnitOfMeasure", id: "cup", name: "cup" },
        },
        ingredient: { __typename: "PantryItem", id: "apple", name: "apples" },
      },
      {
        __typename: "IngredientRef",
        raw: "pinch of mystery spice",
        quantity: null,
        ingredient: null,
        preparation: null,
      },
      {
        __typename: "IngredientRef",
        raw: "",
        quantity: {
          __typename: "Quantity",
          quantity: 0.5,
          units: { __typename: "UnitOfMeasure", id: "cup", name: "cup" },
        },
        ingredient: { __typename: "PantryItem", id: "sugar", name: "sugar" },
        preparation: "divided",
      },
    ],
    sections: [
      {
        __typename: "Section",
        id: "crust",
        name: "Crust",
        sectionOf: { __typename: "Recipe", id: "pie" },
        directions: "Chill the dough.",
        ingredients: [
          {
            __typename: "IngredientRef",
            raw: "1 cup flour",
            quantity: null,
            ingredient: null,
            preparation: null,
          },
        ],
      },
      {
        __typename: "Section",
        id: "topping",
        name: "Whipped cream",
        sectionOf: { __typename: "Recipe", id: "cream" },
        directions: "Whip to soft peaks.",
        ingredients: [],
      },
    ],
  };
