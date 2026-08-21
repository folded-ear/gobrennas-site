import { expect, test } from "vitest";
import {
  buildIngredientRef,
  buildOwnedSection,
  emptyRecipeFormValues,
  RecipeFormValues,
} from "./schema";
import { toIngredientInfo } from "./to-ingredient-info";

const draft = (over: Partial<RecipeFormValues> = {}): RecipeFormValues => ({
  ...emptyRecipeFormValues(),
  name: "Tomato Soup",
  ...over,
});

test("drops blank ingredient rows and trims the rest", () => {
  const info = toIngredientInfo(
    draft({
      ingredients: [
        buildIngredientRef("  2 tomatoes  "),
        buildIngredientRef("   "),
        buildIngredientRef(""),
        buildIngredientRef("1 onion"),
      ],
    }),
  );

  expect(info.ingredients).toEqual([{ raw: "2 tomatoes" }, { raw: "1 onion" }]);
});

test("sends only the id for a reference section", () => {
  // `SectionInfo.id` documents that by-reference sections carry no other
  // fields; the legacy client ships a fully hydrated body instead.
  const info = toIngredientInfo(
    draft({
      sections: [
        {
          kind: "reference",
          clientId: "ref-1",
          id: "42",
          name: "Pesto",
          ofRecipeName: "Nonna's Pasta",
        },
      ],
    }),
  );

  expect(info.sections).toEqual([{ id: "42" }]);
});

test("sends a full body with a null id for an unsaved owned section", () => {
  const info = toIngredientInfo(
    draft({
      sections: [
        {
          ...buildOwnedSection(),
          name: "  Dressing  ",
          directions: "Whisk.",
          ingredients: [
            buildIngredientRef("olive oil"),
            buildIngredientRef(""),
          ],
        },
      ],
    }),
  );

  expect(info.sections).toEqual([
    {
      id: null,
      name: "Dressing",
      directions: "Whisk.",
      ingredients: [{ raw: "olive oil" }],
    },
  ]);
});

test("client ids never reach the server", () => {
  const serialized = JSON.stringify(
    toIngredientInfo(
      draft({
        ingredients: [buildIngredientRef("2 tomatoes")],
        sections: [buildOwnedSection()],
      }),
    ),
  );

  expect(serialized).not.toContain("clientId");
});
