import { PlanItemStatus } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import { buildCookRecipe } from "./model";
import {
  apples,
  crust,
  ingredients,
  item,
  pie,
  ref,
  savedRecipe,
} from "./test/recipe";

describe("buildCookRecipe", () => {
  it("uses the planned quantities, preserves unknown wording and falls back to saved directions", () => {
    const recipe = buildCookRecipe([pie, ...ingredients], "pie");
    expect(recipe?.main.title).toBe("Holiday apple pie");
    expect(recipe?.main.ingredients).toEqual([
      {
        text: "4 cups apples, sliced",
        quantity: 4,
        unit: "cup",
        name: "apples",
        preparation: "sliced",
      },
      { text: "a pinch of mystery spice" },
    ]);
    expect(recipe?.main.directions).toBe(savedRecipe.directions);
    expect(recipe?.sections.map((section) => section.title)).toEqual([
      "Crust for Friday",
    ]);
  });

  it("includes moved and completed prep through its cooking link, once per planned occurrence", () => {
    const root = {
      ...pie,
      children: [ref("apples"), ref("salt")],
      components: [ref("apples"), ref("crust")],
    };
    const completedCrust = { ...crust, status: PlanItemStatus.COMPLETED };
    const recipe = buildCookRecipe(
      [
        root,
        ...ingredients.filter((entry) => entry.id !== "crust"),
        completedCrust,
      ],
      "pie",
    );
    expect(recipe?.sections.map((section) => section.item.id)).toEqual([
      "crust",
    ]);
    expect(recipe?.sections[0].ingredients[0].quantity).toBe(3);
    expect(recipe?.sections[0].directions).toBe("Chill the dough.");
  });

  it("keeps distinct planned instances of the same library recipe and traverses nested prep in order", () => {
    const first = item("sauce-one", "Mild sauce", {
      ingredient: savedRecipe,
      notes: "No chili.",
      children: [ref("prep")],
    });
    const second = item("sauce-two", "Hot sauce", {
      ingredient: savedRecipe,
      notes: "Extra chili.",
    });
    const prep = item("prep", "Roast peppers", {
      notes: "Roast for 20 minutes.",
    });
    const root = {
      ...pie,
      children: [ref(first.id), ref(second.id)],
      components: [ref(first.id)],
    };
    const recipe = buildCookRecipe([root, first, second, prep], root.id);
    expect(
      recipe?.sections.map(({ title, directions }) => ({ title, directions })),
    ).toEqual([
      { title: "Mild sauce", directions: "No chili." },
      { title: "Roast peppers", directions: "Roast for 20 minutes." },
      { title: "Hot sauce", directions: "Extra chili." },
    ]);
  });

  it("omits deleted ingredients without reviving them from the saved recipe", () => {
    const root = {
      ...pie,
      children: [ref("apples")],
      components: [ref("apples")],
    };
    const recipe = buildCookRecipe(
      [root, { ...apples, status: PlanItemStatus.DELETED }],
      root.id,
    );
    expect(recipe?.main.ingredients).toEqual([]);
    expect(recipe?.sections).toEqual([]);
  });

  it("shows an ingredient not yet parsed as its text", () => {
    const root = { ...pie, children: [ref("apples")], components: [] };
    expect(
      buildCookRecipe(
        [root, { ...apples, name: "6 pears", ingredient: null }],
        "pie",
      )?.main.ingredients,
    ).toEqual([{ text: "6 pears" }]);
  });

  it("reads a recipe without a library link and does not loop over repeated references", () => {
    const root = item("pie", "My pie", {
      notes: "Bake gently.",
      children: [ref("prep")],
    });
    const prep = item("prep", "Prep", { children: [ref("pie")] });
    const result = buildCookRecipe([root, prep], "pie");
    expect(result?.main.directions).toBe("Bake gently.");
    expect(result?.sections.map((section) => section.item.id)).toEqual([
      "prep",
    ]);
    expect(buildCookRecipe([root], "missing")).toBeUndefined();
    expect(
      buildCookRecipe([{ ...root, status: PlanItemStatus.DELETED }], "pie"),
    ).toBeUndefined();
  });
});
